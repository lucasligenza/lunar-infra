from types import SimpleNamespace
import math

import numpy as np
import pytest
from rasterio import Affine

from backend.app.geospatial.terrain import (
    POLAR, RADIUS_M, OutsideRegion, assert_aligned, cell_at, project, slope_degrees, unproject, validate_polar_crs,
)
from backend.app.data.pipeline import align_average


@pytest.mark.parametrize("longitude, latitude", [(0, -89), (90, -89), (180, -89), (270, -89), (33, -88)])
def test_projection_against_analytic_sphere(longitude, latitude):
    radius = 2 * RADIUS_M * math.tan(math.radians(90 + latitude) / 2)
    expected = (radius * math.sin(math.radians(longitude)), radius * math.cos(math.radians(longitude)))
    x, y = project(longitude, latitude)
    assert (x, y) == pytest.approx(expected, abs=1e-7)
    assert unproject(x, y) == pytest.approx((longitude, latitude), abs=1e-9)


def test_pole_and_invalid_coordinates():
    assert project(123, -90) == pytest.approx((0, 0), abs=1e-7)
    for longitude, latitude in [(0, float("nan")), (float("inf"), -89), (0, -91), (361, -89)]:
        with pytest.raises(ValueError):
            project(longitude, latitude)


def test_bounds_are_half_open_and_use_containing_cell():
    transform = Affine(240, 0, -480, 0, -240, 480)
    assert cell_at(transform, (4, 4), -480, 480) == (0, 0)
    assert cell_at(transform, (4, 4), 0, 0) == (2, 2)
    for x, y in [(480, 0), (0, -480), (-481, 0), (0, 481)]:
        with pytest.raises(OutsideRegion):
            cell_at(transform, (4, 4), x, y)


@pytest.mark.parametrize("gx, gy", [(0, 0), (math.tan(math.radians(30)), 0), (0.3, 0.4)])
def test_slope_on_known_plane_and_projection_scale(gx, gy):
    transform = Affine(240, 0, -600, 0, -240, 600)
    x = -600 + (np.arange(5) + 0.5) * 240
    y = 600 - (np.arange(5) + 0.5) * 240
    elevation = 100 + gx * x[None, :] + gy * y[:, None]
    slopes = slope_degrees(elevation, transform)
    assert slopes[2, 2] == pytest.approx(math.degrees(math.atan(math.hypot(gx, gy))))
    k = 1 + (240**2 + 240**2) / (4 * RADIUS_M**2)
    assert slopes[1, 1] == pytest.approx(math.degrees(math.atan(math.hypot(gx, gy) * k)))
    assert np.isnan(slopes[0]).all()


def test_nodata_stencil_and_anisotropic_pixel_spacing():
    transform = Affine(100, 0, 0, 0, -200, 0)
    x = (np.arange(7) + 0.5) * 100
    elevation = np.broadcast_to(x, (7, 7)).copy()
    result = slope_degrees(elevation, transform)
    assert result[3, 3] == pytest.approx(45, abs=0.001)
    elevation[3, 3] = np.nan
    result = slope_degrees(elevation, transform)
    for row, column in [(3, 3), (2, 3), (4, 3), (3, 2), (3, 4)]:
        assert np.isnan(result[row, column])
    assert np.isfinite(result[1, 1])
    with pytest.raises(ValueError):
        slope_degrees(elevation, Affine.rotation(10))


def test_alignment_rejects_grid_phase_and_earth_crs():
    first = SimpleNamespace(shape=(3, 3), crs=POLAR, transform=Affine(240, 0, 0, 0, -240, 0))
    assert_aligned(first, first)
    for second in [SimpleNamespace(**{**vars(first), "transform": Affine(240, 0, 30, 0, -240, 0)}),
                   SimpleNamespace(**{**vars(first), "crs": "EPSG:3857"})]:
        with pytest.raises(ValueError):
            assert_aligned(first, second)


def test_gdal_polar_variant_b_is_valid_but_wrong_planet_and_scale_are_not():
    from pyproj import CRS
    validate_polar_crs(POLAR)
    validate_polar_crs(CRS.from_proj4("+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +R=1737400 +units=m"))
    for definition in ["EPSG:3031", "+proj=stere +lat_0=-90 +lat_ts=-71 +R=1737400 +units=m",
                       "+proj=stere +lat_0=90 +R=1737400 +units=m"]:
        with pytest.raises(ValueError):
            validate_polar_crs(definition)


def test_illumination_averaging_preserves_zero_and_rejects_missing_contributors():
    source = np.array([[0.0, 0.2], [0.6, 0.8]])
    transform = Affine(60, 0, -60, 0, -60, 60)
    destination = Affine(120, 0, -60, 0, -120, 60)
    assert align_average(source, transform, (1, 1), destination)[0, 0] == pytest.approx(0.4)
    assert align_average(np.zeros((2, 2)), transform, (1, 1), destination)[0, 0] == 0
    source[0, 0] = np.nan
    assert np.isnan(align_average(source, transform, (1, 1), destination)[0, 0])
