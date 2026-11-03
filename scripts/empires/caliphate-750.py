# Wrapper of trace-empire for the Califate map: the conic has another central meridian than the script's 30E, so it is
# fitted free (6 parameters) on the control points, then refined so that the modern coasts fall on the printed ones
# (sea = pale violet). Run: py scripts/empires/caliphate-750.py caliphate-750 <debug folder>
import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.optimize import least_squares

ROOT = Path(__file__).resolve().parent.parent.parent
spec = importlib.util.spec_from_file_location('trace_empire', ROOT / 'scripts/trace-empire.py')
te = importlib.util.module_from_spec(spec)
spec.loader.exec_module(te)

INVERSE = {}


def project(params, lon, lat):
    xc, y0, rho0, k, n, cm = params
    theta = n * np.radians(np.asarray(lon, float) - cm)
    rho = rho0 - k * (np.asarray(lat, float) - 30)
    return xc + rho * np.sin(theta), y0 + rho * np.cos(theta)


def unproject(params, x, y):
    xc, y0, rho0, k, n, cm = params
    dx, dy = np.asarray(x) - xc, np.asarray(y) - y0
    rho, theta = np.hypot(dx, dy), np.arctan2(dx, dy)
    return cm + np.degrees(theta) / n, 30 + (rho0 - rho) / k


def sea_mask(image):
    r, b = image[:, :, 0].astype(int), image[:, :, 2].astype(int)
    sea = (b - r > 25) & (b > 200)
    sea = ndi.binary_closing(sea, iterations=3)
    return ndi.binary_opening(sea, iterations=2)


def coast_points():
    data = json.loads((ROOT / 'src/data/countries.geo.json').read_text(encoding='utf-8'))
    res = 10  # cells per degree
    lon0, lat0, lon1, lat1 = -15, 8, 80, 58
    mask = Image.new('1', ((lon1 - lon0) * res, (lat1 - lat0) * res), 0)
    draw = ImageDraw.Draw(mask)
    for geometry in data:
        polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
        for polygon in polygons:
            ring = np.array(polygon[0])
            draw.polygon([((x - lon0) * res, (lat1 - y) * res) for x, y in ring], fill=1)
    land = np.array(mask)
    ys, xs = np.nonzero(land ^ ndi.binary_erosion(land))
    return np.column_stack([lon0 + xs / res, lat1 - ys / res])


def fit(cfg):
    pixels = np.array([c[0] for c in cfg['control']], float)
    places = np.array([c[1] for c in cfg['control']], float)
    start = np.array(cfg['projection'], float)

    def control_error(c):
        x, y = project(c, places[:, 0], places[:, 1])
        return np.hypot(x - pixels[:, 0], y - pixels[:, 1])

    first = least_squares(lambda c: np.concatenate([project(c, places[:, 0], places[:, 1])[i] - pixels[:, i] for i in range(2)]), start, loss='soft_l1', f_scale=8)
    coef = first.x
    print('control fit', np.round(coef, 3), 'mean', round(control_error(coef).mean(), 1), 'worst', round(control_error(coef).max(), 1))
    image = np.array(Image.open(te.download(cfg['file'])).convert('RGB'))
    sea = sea_mask(image)
    dist = ndi.distance_transform_edt(~(sea ^ ndi.binary_erosion(sea)))
    pts = coast_points()[::5]
    cap = 12.0

    def coast_distance(c):
        x, y = project(c, pts[:, 0], pts[:, 1])
        inside = (x > 50) & (x < 1225) & (y > 40) & (y < 1000)
        d = ndi.map_coordinates(dist, [np.clip(y, 0, dist.shape[0] - 1), np.clip(x, 0, dist.shape[1] - 1)], order=1)
        return d, inside

    def residuals(c):
        d, inside = coast_distance(c)
        x, y = project(c, places[:, 0], places[:, 1])
        return np.concatenate([np.where(inside, np.minimum(d, cap), 0.0), 0.5 * (x - pixels[:, 0]), 0.5 * (y - pixels[:, 1])])

    if cfg.get('refine', True):
        coef = least_squares(residuals, coef, loss='soft_l1', f_scale=4, max_nfev=80).x
    errors = control_error(coef)
    print('fit', np.round(coef, 3), 'control residual mean', round(errors.mean(), 1), 'px, worst', round(errors.max(), 1), 'px')
    for c, e in zip(cfg['control'], errors):
        print('  ', c[2], round(e, 1))
    d, inside = coast_distance(coef)
    print('coast distance (px): median', round(float(np.median(d[inside])), 1), 'share under 6 px', round(float((d[inside] < 6).mean()), 2))
    return coef


classify_plain = te.classify


def classify(image, cfg):
    """The printed edge tint along the coasts and borders of a stage reads as the next stage (pink): a thin band of one
    stage that touches another stage goes to that one."""
    labels, names = classify_plain(image, cfg)
    ids = [stage['id'] for stage in cfg['stages']]
    for stage_id in ids:
        number = names.index(stage_id)
        mask = labels == number
        band = mask & ~ndi.binary_opening(mask, structure=np.ones((3, 3)), iterations=cfg.get('band', 7))
        others = np.isin(labels, [names.index(i) for i in ids if i != stage_id]) & ~band
        distance, index = ndi.distance_transform_edt(~others, return_indices=True)
        near = band & (distance <= cfg.get('band_reach', 14))
        labels[near] = labels[tuple(index)][near]
    return labels, names


to_multipolygon_plain = te.to_multipolygon


def to_multipolygon(mask, params, min_area, tolerance):
    """Small holes (a town's name inked over a territory) are filled before the outlines are traced."""
    holes, count = ndi.label(ndi.binary_fill_holes(mask) & ~mask)
    sizes = ndi.sum(holes, holes, range(1, count + 1)) if count else []
    filled = mask | np.isin(holes, [i + 1 for i, size in enumerate(sizes) if size <= cfg_hole])
    return to_multipolygon_plain(filled, params, min_area, tolerance)


cfg_hole = 4000
te.project, te.unproject, te.fit, te.classify, te.to_multipolygon = project, unproject, fit, classify, to_multipolygon

if __name__ == '__main__':
    te.main()
