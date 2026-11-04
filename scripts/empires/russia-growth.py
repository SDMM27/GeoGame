# Runs scripts/trace-empire.py on the Russia growth map, whose central meridian is not longitude 30: the projection
# has a sixth parameter (the central meridian), fitted here. Run: py scripts/empires/russia-growth.py [debug folder]
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from scipy.optimize import least_squares

ROOT = Path(__file__).resolve().parent.parent.parent
spec = importlib.util.spec_from_file_location('trace_empire', ROOT / 'scripts/trace-empire.py')
te = importlib.util.module_from_spec(spec)
spec.loader.exec_module(te)


def project(params, lon, lat):
    xc, y0, rho_ref, k, n, lon0 = params
    theta = n * np.radians(np.asarray(lon) - lon0)
    rho = rho_ref - k * (np.asarray(lat) - 30)
    return xc + rho * np.sin(theta), y0 + rho * np.cos(theta)


def unproject(params, x, y):
    xc, y0, rho_ref, k, n, lon0 = params
    dx, dy = np.asarray(x) - xc, np.asarray(y) - y0
    rho, theta = np.hypot(dx, dy), np.arctan2(dx, dy)
    return lon0 + np.degrees(theta) / n, 30 + (rho_ref - rho) / k


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
    global PARAMS
    PARAMS = result.x
    return result.x


def classify(image, cfg):
    """Like trace-empire's, but each pixel takes the label of the k nearest pixels of the sample boxes (the sample colours of this
    map overlap too much for a nearest box): colour plus green-minus-red, which tells the greens apart."""
    from scipy import ndimage as ndi
    from scipy.spatial import cKDTree
    samples = cfg['samples']
    names = list(samples)
    paper = [ndi.grey_closing(image[:, :, c], size=cfg['ink_size']) for c in range(3)]
    smooth = np.stack([ndi.median_filter(p, size=13) for p in paper], axis=2).astype(float)
    smooth = np.stack([ndi.uniform_filter(smooth[:, :, c], size=9) for c in range(3)], axis=2)

    def features(array):
        return np.concatenate([array, 3 * (array[..., 1:2] - array[..., 0:1])], axis=-1)

    train, train_labels = [], []
    for number, name in enumerate(names):
        for x, y, half in samples[name]:
            box = smooth[y - half:y + half, x - half:x + half].reshape(-1, 3)
            train.append(features(box[::3]))
            train_labels += [number] * len(box[::3])
            print('  colour', name, (x, y), np.median(box, axis=0))
    tree = cKDTree(np.vstack(train))
    train_labels = np.array(train_labels)
    flat = features(smooth.reshape(-1, 3))
    labels = np.empty(len(flat), int)
    for start in range(0, len(flat), 400000):
        _, index = tree.query(flat[start:start + 400000], k=25, workers=-1)
        votes = np.stack([(train_labels[index] == n).sum(axis=1) for n in range(len(names))], axis=1)
        labels[start:start + 400000] = votes.argmax(axis=1)
    labels = labels.reshape(image.shape[:2])
    # The sea (as in trace-empire) and the coloured lines (the Golden Horde border, the pink halos of the borders) take what is
    # closest around them
    fill = (labels == names.index('sea')) | (labels == names.index('line'))
    index = ndi.distance_transform_edt(fill, return_distances=False, return_indices=True)
    labels = labels[tuple(index)]
    # Thin bands and small holes of 'land' inside a territory (the Golden Horde line, the ink of a name) belong to what is around
    land = labels == names.index('land')
    radius = 16
    y, x = np.mgrid[-radius:radius + 1, -radius:radius + 1]
    thick = ndi.binary_opening(land, structure=(x * x + y * y) <= radius * radius)
    thin = land & ~thick
    distance, index = ndi.distance_transform_edt(land, return_indices=True)
    labels = np.where(thin & (distance <= 2 * radius), labels[tuple(index)], labels)
    # Small gaps of land closed round by one territory (a town's name, a lake) are part of it
    for stage in cfg['stages']:
        number = names.index(stage['id'])
        filled = ndi.binary_fill_holes(labels == number)
        labels[filled & (labels == names.index('land'))] = number
    # Pieces read wrongly (a printed tint borrowed by a neighbour): "erase" turns a stage's pixels in a [lon0, lat0, lon1, lat1]
    # box into plain land, "relabel" gives them another stage
    y, x = np.mgrid[0:labels.shape[0], 0:labels.shape[1]]
    lon, lat = unproject(PARAMS, x, y)
    for stage, boxes in cfg.get('erase', {}).items():
        for lon0, lat0, lon1, lat1 in boxes:
            labels[(labels == names.index(stage)) & (lon >= lon0) & (lon <= lon1) & (lat >= lat0) & (lat <= lat1)] = names.index('land')
    for stage, boxes in cfg.get('relabel', {}).items():
        for lon0, lat0, lon1, lat1, target in boxes:
            labels[(labels == names.index(stage)) & (lon >= lon0) & (lon <= lon1) & (lat >= lat0) & (lat <= lat1)] = names.index(target)
    return labels, names


EAST_LIMIT = 60  # the outline stops at the crest of the Urals, about 60E (a little further east in the far north, where the range runs east): no Siberia
WEST_LIMIT = 20.5  # west of it only Prussian, Austrian and Polish land
SOUTH_LIMIT = 43  # south of it: Greece, Georgia, Armenia, Persia: never Russian on this map


def land_mask(params, size):
    land = original_land_mask(params, size)
    y, x = np.mgrid[0:size[1], 0:size[0]]
    lon, lat = unproject(params, x, y)
    return land & (lon <= EAST_LIMIT + np.minimum(np.maximum(0, lat - 64) * 0.6, 4)) & (lon >= WEST_LIMIT) & (lat >= SOUTH_LIMIT)


original_land_mask = te.land_mask
te.project, te.unproject, te.fit, te.land_mask, te.classify = project, unproject, fit, land_mask, classify
if __name__ == '__main__':
    sys.argv = ['trace-empire.py', 'russia-growth'] + sys.argv[1:]
    te.main()
