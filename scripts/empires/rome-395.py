# Runs trace-empire.py for rome-395, whose map is centred on longitude LON0 instead of 30
import importlib.util
import os
import sys
from pathlib import Path

import numpy as np
from scipy import ndimage as ndi

LON0 = 20
spec = importlib.util.spec_from_file_location('trace_empire', Path(__file__).resolve().parent.parent / 'trace-empire.py')
te = importlib.util.module_from_spec(spec)
spec.loader.exec_module(te)


def project(params, lon, lat):
    xc, y0, rho30, k, n = params
    theta = n * np.radians(np.asarray(lon) - LON0)
    rho = rho30 - k * (np.asarray(lat) - 30)
    return xc + rho * np.sin(theta), y0 + rho * np.cos(theta)


def unproject(params, x, y):
    xc, y0, rho30, k, n = params
    dx, dy = np.asarray(x) - xc, np.asarray(y) - y0
    rho, theta = np.hypot(dx, dy), np.arctan2(dx, dy)
    return LON0 + np.degrees(theta) / n, 30 + (rho30 - rho) / k


te.project, te.unproject = project, unproject
classify = te.classify


def classify_by_region(image, cfg):
    # The orange of Britain (diocese of the Gauls' prefecture) is also the orange of Thrace and Hellespontus (the East):
    # the two are far apart, so the side of the map tells them apart
    labels, names = classify(image, cfg)
    gaul, east = names.index('gaul'), names.index('east')
    columns = np.arange(labels.shape[1])[None, :]
    # Dacia's yellow-green is also close to the yellow of Gaul (the western end of the map): east of Gaul, it belongs to the
    # prefecture of Illyricum
    labels[(labels == gaul) & (columns > 1000)] = names.index('illyricum')
    labels[(labels == names.index('illyricum')) & (columns > 1300)] = east
    labels[(labels == east) & (columns < 1000)] = gaul
    # Illyricum is only in the Balkans: hill shading of the Alps and of the Atlas that took its colour takes what is closest
    stray = (labels == names.index('illyricum')) & (columns < 1000)
    index = ndi.distance_transform_edt(stray, return_distances=False, return_indices=True)
    labels = labels[tuple(index)]
    # Outside the empire, the hills of the Caucasus and Armenia are shaded grey-green (green above red), where the tints of
    # the East are pink or lilac (red at least equal to green): what is shaded that way is not territory
    paper = [ndi.grey_closing(image[:, :, c], size=cfg['ink_size']) for c in range(3)]
    smooth = np.stack([ndi.median_filter(p, size=13) for p in paper], axis=2).astype(int)
    hills = (smooth[:, :, 1] - smooth[:, :, 0] > 6) & (labels == east)
    labels[hills] = names.index('land')
    return labels, names


te.classify = classify_by_region
to_multipolygon = te.to_multipolygon


def without_holes(mask, params, min_area, tolerance):
    # What is left unpainted inside a territory is the print's text and shading, not a hole of the empire
    return to_multipolygon(ndi.binary_fill_holes(mask), params, min_area, tolerance)


te.to_multipolygon = without_holes
if os.environ.get('FIXED'):
    te.fit = lambda cfg: np.array(cfg['projection'], float)
sys.argv = ['trace-empire.py'] + sys.argv[1:]
te.main()
