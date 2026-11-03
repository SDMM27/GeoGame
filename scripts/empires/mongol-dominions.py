# Traces the two stages of the Mongol dominions map (Shepherd, 1300-1405) into src/data/empires/mongol-dominions.json.
# Run by hand: py scripts/empires/mongol-dominions.py [debug folder]
# This map needs what scripts/trace-empire.py doesn't do, so it reuses its helpers (importlib: its main is guarded):
#   - the map's central meridian is about 88.8E, not 30 (a sixth projection parameter in mongol-dominions.json);
#   - stage 1300 is not a tint but the area enclosed by the red-pink line: a flood fill from "seed" with the line (plus the
#     bridges drawn over its gaps, and the blue tints of the sea and of the Ottoman lands) as barrier;
#   - stage 1405 is the grey tint.
# A control point may fix only a longitude (latitude null): the printed meridians are easier to read than the parallels.
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.optimize import least_squares

ROOT = Path(__file__).resolve().parent.parent.parent
spec = importlib.util.spec_from_file_location('trace_empire', ROOT / 'scripts/trace-empire.py')
te = importlib.util.module_from_spec(spec)
spec.loader.exec_module(te)

NAME = 'mongol-dominions'


def project(p, lon, lat):
    xc, y0, rho30, k, n, l0 = p
    theta = n * np.radians(np.asarray(lon) - l0)
    rho = rho30 - k * (np.asarray(lat) - 30)
    return xc + rho * np.sin(theta), y0 + rho * np.cos(theta)


def unproject(p, x, y):
    xc, y0, rho30, k, n, l0 = p
    dx, dy = np.asarray(x) - xc, np.asarray(y) - y0
    return l0 + np.degrees(np.arctan2(dx, dy)) / n, 30 + (rho30 - np.hypot(dx, dy)) / k


te.unproject = unproject  # to_multipolygon reads the outlines back through it


def fit(cfg):
    def residuals(p):
        out = []
        for (x, y), (lon, lat), *_ in cfg['control']:
            lo, la = unproject(p, x, y)
            out.append((lo - lon) * 17)
            if lat is not None:
                out.append((la - lat) * 17)
        return out

    # The meridians and few coast points leave the cone's apex and central meridian loosely tied (a free fit slides to a
    # worse one in the west), so "projection" holds the fit checked against the coasts and the points are only measured
    result = least_squares(residuals, cfg['projection'], loss='soft_l1', f_scale=6) if not cfg.get('fixed') else None
    result = result or type('Fixed', (), {'x': np.array(cfg['projection'], float)})
    print('projection', np.round(result.x, 3))
    errors = []
    for (x, y), (lon, lat), name in cfg['control']:
        if lat is None:
            lat = unproject(result.x, x, y)[1]
        px, py = project(result.x, lon, lat)
        errors.append(float(np.hypot(px - x, py - y)))
        print('  ', name, round(errors[-1], 1))
    print('pixel error (meridian points: along the meridian is free) mean', round(np.mean(errors), 1), 'worst', round(max(errors), 1))
    return result.x


def land_mask(p, size):
    data = json.loads((ROOT / 'src/data/countries.geo.json').read_text(encoding='utf-8'))
    mask = Image.new('1', size, 0)
    draw = ImageDraw.Draw(mask)
    for geometry in data:
        polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
        for polygon in polygons:
            ring = np.array(polygon[0])
            if ring[:, 0].max() < 20 or ring[:, 0].min() > 180 or ring[:, 1].max() < -5:
                continue
            x, y = project(p, ring[:, 0], ring[:, 1])
            draw.polygon(list(zip(x.tolist(), y.tolist())), fill=1)
    return np.array(mask)


def main():
    debug = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    cfg = json.loads((ROOT / 'scripts/empires' / f'{NAME}.json').read_text(encoding='utf-8'))
    image = np.array(Image.open(te.download(cfg['file'])).convert('RGB'))
    height, width = image.shape[:2]
    p = fit(cfg)
    land = land_mask(p, (width, height))
    r, g, b = (image[:, :, c].astype(int) for c in range(3))

    x0, y0, x1, y1 = cfg['frame']
    frame = np.zeros((height, width), bool)
    frame[y0:y1, x0:x1] = True
    for ex0, ey0, ex1, ey1 in cfg['exclude']:
        frame[ey0:ey1, ex0:ex1] = False

    # Colours: the line (pink, still pinkish over the grey), the grey of Timur, the blue tints
    red = (r > 110) & (g < 170) & (r - g > 22) & (r - b > 8)
    # Specks of the print are not the line: keep the strokes only
    pieces, count = ndi.label(red, structure=np.ones((3, 3)))
    red = np.isin(pieces, 1 + np.nonzero(ndi.sum(red, pieces, range(1, count + 1)) >= 60)[0])
    grey = (abs(r - g) < 22) & (b - r >= 0) & (b - r < 30) & (r > 70) & (r < 185)
    blue = ndi.median_filter(b - r, size=7) > 22

    # Stage 1405: the grey, text holes filled, ragged edges opened
    t = ndi.binary_closing(grey & frame, structure=np.ones((3, 3)), iterations=4)
    t = ndi.binary_fill_holes(t)
    t = ndi.binary_opening(t, structure=np.ones((3, 3)), iterations=5) & land & ~blue
    parts, count = ndi.label(t)
    sizes = ndi.sum(t, parts, range(1, count + 1))
    grey_mask = np.isin(parts, [i + 1 for i, s in enumerate(sizes) if s >= cfg['min_area'] * 4])

    # Stage 1300: flood fill inside the line
    bridge_img = Image.new('1', (width, height), 0)
    draw = ImageDraw.Draw(bridge_img)
    for points in cfg['bridges'].values():
        draw.line([tuple(q) for q in points], fill=1, width=3)
    barrier = ndi.binary_dilation(red, structure=np.ones((3, 3)), iterations=cfg['line_grow']) | np.array(bridge_img) | blue | ~frame
    parts, _ = ndi.label(~barrier)
    sx, sy = cfg['seed']
    assert parts[sy, sx], 'the seed is on the barrier'
    fill = parts == parts[sy, sx]
    inside = ndi.binary_dilation(fill, structure=np.ones((3, 3)), iterations=cfg['line_grow'] + 1) & ~blue & land & frame
    inside = ndi.binary_closing(inside, structure=np.ones((3, 3)), iterations=3) & land
    parts, count = ndi.label(inside)
    sizes = ndi.sum(inside, parts, range(1, count + 1))
    inside = np.isin(parts, [i + 1 for i, s in enumerate(sizes) if s >= cfg['min_area']])

    masks = {'1300': inside, '1405': grey_mask}
    features = []
    picture = np.full((height, width, 3), 255, np.uint8)
    for stage in cfg['stages']:
        mask = masks[stage['id']]
        picture[mask] = stage['tint']
        geometry = te.to_multipolygon(mask, p, cfg['min_area'], cfg['simplify'])
        features.append({'type': 'Feature', 'properties': {'stage': stage['id']}, 'geometry': geometry})
        print(stage['id'], 'pixels', int(mask.sum()), 'polygons', len(geometry['coordinates']))

    output = ROOT / 'src/data/empires' / f'{NAME}.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, 'w', encoding='utf-8', newline='\n') as file:
        file.write(json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')))
    print('written', output.relative_to(ROOT), output.stat().st_size // 1024, 'KB')

    if debug:
        debug.mkdir(parents=True, exist_ok=True)
        te.save_debug(picture, debug, 'traced')
        overlay = image.copy()
        overlay[land ^ ndi.binary_erosion(land, iterations=2)] = (255, 0, 255)
        te.save_debug(overlay, debug, 'coast-check')
        blend = (image.astype(float) * 0.45 + picture.astype(float) * 0.55).astype(np.uint8)
        te.save_debug(blend, debug, 'blend')
        fill_img = np.full((height, width, 3), 255, np.uint8)
        fill_img[barrier] = (180, 180, 180)
        fill_img[red] = (255, 0, 0)
        fill_img[fill] = (120, 200, 120)
        te.save_debug(fill_img, debug, 'fill')


if __name__ == '__main__':
    main()
