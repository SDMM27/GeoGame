# Traces the stages of an empire from a scan of Shepherd's Historical Atlas (or a similar printed map) into GeoJSON.
# Run by hand: py scripts/trace-empire.py <scrollId> [debug folder]
#
# The settings of each empire are in scripts/empires/<scrollId>.json:
#   file          name of the scan on Wikimedia Commons (downloaded once, to the temp folder)
#   projection    start values of the fit: [x of the central meridian, y of the cone's apex, rho at 30N, pixels per degree
#                 of latitude, cone constant n]. The map is read as an equidistant conic projection centred on longitude 30
#   control       [[pixel x, pixel y], [longitude, latitude], optional name]: cities and graticule crossings, to fit the model
#   samples       where each colour is printed: [x, y, half size] boxes in its territories, by stage id, plus "land" and
#                 "sea" (the tints of a scan vary too much for the legend alone, so each stage has several)
#   stages        in order: { id, tint: [r, g, b] for the debug picture, optional thin and min_area for this stage only }
#   drop          by stage id: [longitude, latitude] of a wrongly coloured piece to remove
#   islands       by stage id: [longitude, latitude] of a whole island the filters can't keep
#   frame         [x0, y0, x1, y1]: the map inside the scan's border; exclude: [x0, y0, x1, y1] boxes (the legend) to blank
#   ink_size      strokes thinner than this are ink (text, rivers, borders) and are filled from what surrounds them
#   thin          bands thinner than twice this are hand tinting along a border, not a territory
#   min_area      pixels; smaller pieces are dropped. simplify: tolerance of the outlines, in pixels
#
# Each pixel is matched to the colours of the samples, the ink is filled from what surrounds it, and the modern land mask
# (src/data/countries.geo.json) gives the coast (the sea of a scan can look too much like a colour). Writes
# src/data/empires/<scrollId>.json, one MultiPolygon per stage; add the empire to src/data/empires/index.js after.
# Needs numpy, Pillow and scipy.
import json
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.optimize import least_squares

ROOT = Path(__file__).resolve().parent.parent
# Commons asks for a contact in the user agent, and answers 429 when called too fast (as scripts/build-scrolls.mjs)
HEADERS = {'User-Agent': 'GeoGame scroll image builder (https://geo-game.app)'}
PAUSE_SECONDS = 5
DEBUG_SIZE = 1100  # longest side of the reduced JPEGs, so that they can be read


def get(url):
    for attempt in range(5):
        time.sleep(PAUSE_SECONDS + attempt * 15)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=120) as response:
                return response.read()
        except OSError as error:
            print('  ', error, ', retrying')
    raise SystemExit(f'could not fetch {url}')


def download(file):
    """The scan, at its original size as a JPEG or PNG Commons renders (a TIFF comes back as a JPEG); cached in the temp folder."""
    cache = Path(tempfile.gettempdir()) / 'geogame-empires'
    cache.mkdir(exist_ok=True)
    target = cache / file.replace('/', '_')
    if target.exists():
        return target
    title = urllib.parse.quote(f'File:{file}')
    size = json.loads(get(f'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=size|url&titles={title}'))
    info = next(iter(size['query']['pages'].values()))['imageinfo'][0]
    query = f'action=query&format=json&prop=imageinfo&iiprop=size|url&iiurlwidth={info["width"]}&titles={title}'
    info = next(iter(json.loads(get(f'https://commons.wikimedia.org/w/api.php?{query}'))['query']['pages'].values()))['imageinfo'][0]
    target.write_bytes(get(info.get('thumburl') or info['url']))
    print('downloaded', file, info['width'], 'x', info['height'])
    return target


def project(params, lon, lat):
    xc, y0, rho30, k, n = params
    theta = n * np.radians(np.asarray(lon) - 30)
    rho = rho30 - k * (np.asarray(lat) - 30)
    return xc + rho * np.sin(theta), y0 + rho * np.cos(theta)


def unproject(params, x, y):
    xc, y0, rho30, k, n = params
    dx, dy = np.asarray(x) - xc, np.asarray(y) - y0
    rho, theta = np.hypot(dx, dy), np.arctan2(dx, dy)
    return 30 + np.degrees(theta) / n, 30 + (rho30 - rho) / k


def fit(cfg):
    pixels = np.array([c[0] for c in cfg['control']], float)
    places = np.array([c[1] for c in cfg['control']], float)

    def residuals(params):
        x, y = project(params, places[:, 0], places[:, 1])
        return np.concatenate([x - pixels[:, 0], y - pixels[:, 1]])

    result = least_squares(residuals, cfg['projection'], loss='soft_l1', f_scale=8)
    errors = np.hypot(*residuals(result.x).reshape(2, -1))
    print('fit', np.round(result.x, 3), 'mean error', round(errors.mean(), 1), 'px, worst', round(errors.max(), 1), 'px')
    for control, error in zip(cfg['control'], errors):
        print('  ', control[2] if len(control) > 2 else control[1], round(error, 1))
    return result.x


def land_mask(params, size):
    # A list of geometries
    data = json.loads((ROOT / 'src/data/countries.geo.json').read_text(encoding='utf-8'))
    mask = Image.new('1', size, 0)
    draw = ImageDraw.Draw(mask)
    for geometry in data:
        polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
        for polygon in polygons:
            ring = np.array(polygon[0])
            if ring[:, 0].max() < -15 or ring[:, 0].min() > 75 or ring[:, 1].max() < 15 or ring[:, 1].min() > 65:
                continue
            x, y = project(params, ring[:, 0], ring[:, 1])
            draw.polygon(list(zip(x.tolist(), y.tolist())), fill=1)
    return np.array(mask)


def classify(image, cfg):
    samples = cfg['samples']
    names = list(samples)
    # A closing wipes out what is thin and dark (text, rivers, borders) without the halo a threshold leaves around letters,
    # then the print's dots are smoothed away
    paper = [ndi.grey_closing(image[:, :, c], size=cfg['ink_size']) for c in range(3)]
    smooth = np.stack([ndi.median_filter(p, size=13) for p in paper], axis=2).astype(float)

    best = np.full(image.shape[:2], np.inf)
    labels = np.zeros(image.shape[:2], int)
    for number, name in enumerate(names):
        for x, y, half in samples[name]:
            color = np.median(smooth[y - half:y + half, x - half:x + half].reshape(-1, 3), axis=0)
            print('  colour', name, (x, y), color)
            distance = np.linalg.norm(smooth - color, axis=2)
            closer = distance < best
            best[closer], labels[closer] = distance[closer], number
    # Land coloured like the sea is the small misfit of the coasts: it takes what is closest inland
    sea = labels == names.index('sea')
    index = ndi.distance_transform_edt(sea, return_distances=False, return_indices=True)
    return labels[tuple(index)], names


def rings_of(mask):
    """The boundaries of a binary mask as closed rings of pixel corners, outer rings counter-clockwise on screen."""
    padded = np.pad(mask, 1)
    edges = {}
    h, w = padded.shape
    ys, xs = np.nonzero(padded)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if not padded[y - 1, x]:
            edges.setdefault((x, y), []).append((x + 1, y))
        if not padded[y, x + 1]:
            edges.setdefault((x + 1, y), []).append((x + 1, y + 1))
        if not padded[y + 1, x]:
            edges.setdefault((x + 1, y + 1), []).append((x, y + 1))
        if not padded[y, x - 1]:
            edges.setdefault((x, y + 1), []).append((x, y))
    rings = []
    while edges:
        start = next(iter(edges))
        ring, point = [start], start
        while True:
            targets = edges[point]
            following = targets.pop()
            if not targets:
                del edges[point]
            point = following
            if point == start:
                break
            ring.append(point)
        rings.append(np.array(ring, float) - 1)
    return rings


def simplify(points, tolerance):
    if len(points) < 4:
        return points
    keep = np.zeros(len(points), bool)
    keep[[0, -1]] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        chord = points[b] - points[a]
        length = np.hypot(*chord)
        offset = points[a + 1:b] - points[a]
        dist = np.abs(chord[0] * offset[:, 1] - chord[1] * offset[:, 0]) / length if length else np.hypot(offset[:, 0], offset[:, 1])
        worst = dist.argmax()
        if dist[worst] > tolerance:
            middle = a + 1 + worst
            keep[middle] = True
            stack += [(a, middle), (middle, b)]
    return points[keep]


def area(ring):
    x, y = ring[:, 0], ring[:, 1]
    return 0.5 * np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y)


def inside(point, ring):
    x, y = point
    xs, ys = ring[:, 0], ring[:, 1]
    next_x, next_y = np.roll(xs, -1), np.roll(ys, -1)
    crossing = (ys > y) != (next_y > y)
    with np.errstate(divide='ignore', invalid='ignore'):
        at = xs + (y - ys) * (next_x - xs) / (next_y - ys)
    return np.count_nonzero(crossing & (x < at)) % 2 == 1


def to_multipolygon(mask, params, min_area, tolerance):
    rings = [simplify(np.vstack([r, r[:1]]), tolerance) for r in rings_of(mask)]
    rings = [r for r in rings if len(r) >= 4 and abs(area(r)) >= min_area / 4]
    outers = [r for r in rings if area(r) > 0]
    holes = [r for r in rings if area(r) < 0]
    polygons = [[r] for r in outers]
    for hole in holes:
        owners = [p for p in polygons if inside(hole[0] + 0.01, p[0])]
        if owners:
            min(owners, key=lambda p: abs(area(p[0]))).append(hole)

    def geo(ring):
        lon, lat = unproject(params, ring[:, 0], ring[:, 1])
        return np.round(np.column_stack([lon, lat]), 3).tolist()

    return {'type': 'MultiPolygon', 'coordinates': [[geo(r) for r in polygon] for polygon in polygons]}


def save_debug(array, folder, name):
    """The picture as a PNG, and reduced to DEBUG_SIZE as a JPEG, so that it can be read."""
    picture = Image.fromarray(array)
    picture.save(folder / f'{name}.png')
    picture.thumbnail((DEBUG_SIZE, DEBUG_SIZE))
    picture.save(folder / f'{name}-small.jpg', quality=85)


def main():
    if len(sys.argv) < 2:
        raise SystemExit('usage: py scripts/trace-empire.py <scrollId> [debug folder]')
    scroll_id = sys.argv[1]
    debug = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    cfg = json.loads((ROOT / 'scripts/empires' / f'{scroll_id}.json').read_text(encoding='utf-8'))
    output = ROOT / 'src/data/empires' / f'{scroll_id}.json'
    image = np.array(Image.open(download(cfg['file'])).convert('RGB'))
    params = fit(cfg)
    height, width = image.shape[:2]
    land = land_mask(params, (width, height))
    labels, names = classify(image, cfg)

    # Outside the map's frame, and the excluded boxes (the legend), hold nothing
    x0, y0, x1, y1 = cfg['frame']
    frame = np.zeros((height, width), bool)
    frame[y0:y1, x0:x1] = True
    for ex0, ey0, ex1, ey1 in cfg.get('exclude', []):
        frame[ey0:ey1, ex0:ex1] = False
    features = []
    picture = np.full((height, width, 3), 255, np.uint8)
    for stage in cfg['stages']:
        stage_id = stage['id']
        thin = stage.get('thin', cfg['thin'])
        min_area = stage.get('min_area', cfg['min_area'])
        mask = (labels == names.index(stage_id)) & land & frame
        mask = ndi.binary_opening(mask, structure=np.ones((3, 3)), iterations=thin)
        mask = ndi.binary_closing(mask, structure=np.ones((3, 3)), iterations=5) & land
        parts, count = ndi.label(mask)
        sizes = ndi.sum(mask, parts, range(1, count + 1))
        mask = np.isin(parts, [i + 1 for i, size in enumerate(sizes) if size >= min_area])
        for lon, lat in cfg.get('drop', {}).get(stage_id, []):
            x, y = project(params, lon, lat)
            parts, _ = ndi.label(mask)
            if parts[int(y), int(x)]:
                mask[parts == parts[int(y), int(x)]] = False
        # Whole islands the filters can't keep
        parts, _ = ndi.label(land)
        for lon, lat in cfg.get('islands', {}).get(stage_id, []):
            x, y = project(params, lon, lat)
            if parts[int(y), int(x)]:
                mask |= parts == parts[int(y), int(x)]
        picture[mask] = stage['tint']
        features.append({'type': 'Feature', 'properties': {'stage': stage_id}, 'geometry': to_multipolygon(mask, params, min_area, cfg['simplify'])})
        print(stage_id, 'pixels', int(mask.sum()), 'polygons', len(features[-1]['geometry']['coordinates']))

    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, 'w', encoding='utf-8', newline='\n') as file:
        file.write(json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
    print('written', output.relative_to(ROOT), output.stat().st_size // 1024, 'KB')

    if debug:
        debug.mkdir(parents=True, exist_ok=True)
        save_debug(picture, debug, 'traced')
        overlay = image.copy()
        edge = land ^ ndi.binary_erosion(land, iterations=2)
        overlay[edge] = (255, 0, 255)
        save_debug(overlay, debug, 'coast-check')
        blend = (image.astype(float) * 0.45 + picture.astype(float) * 0.55).astype(np.uint8)
        save_debug(blend, debug, 'blend')


if __name__ == '__main__':
    main()
