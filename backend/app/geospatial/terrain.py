"""Pure numerical terrain tools in the Moon ME/PA DE421 frame."""

import math

import numpy as np
from pyproj import CRS, Transformer
from rasterio import Affine

RADIUS_M = 1737400.0
GEOGRAPHIC = CRS.from_proj4(f"+proj=longlat +R={RADIUS_M} +no_defs")
POLAR_PROJ = f"+proj=stere +lat_0=-90 +lon_0=0 +k=1 +R={RADIUS_M} +units=m +no_defs"
POLAR = CRS.from_proj4(POLAR_PROJ)
# Explicit x/y axis order, never Earth EPSG:4326.
# https://pyproj4.github.io/pyproj/stable/api/transformer.html
FORWARD = Transformer.from_crs(GEOGRAPHIC, POLAR, always_xy=True)
INVERSE = Transformer.from_crs(POLAR, GEOGRAPHIC, always_xy=True)


class OutsideRegion(ValueError):
    pass


def project(longitude: float, latitude: float) -> tuple[float, float]:
    if not (math.isfinite(longitude) and math.isfinite(latitude)):
        raise ValueError("Coordinates must be finite")
    if not -90 <= latitude <= 0 or not -180 <= longitude <= 360:
        raise ValueError("Expected lunar southern latitude and east-positive longitude")
    return FORWARD.transform(longitude, latitude, errcheck=True)


def unproject(x: float, y: float) -> tuple[float, float]:
    if not (math.isfinite(x) and math.isfinite(y)):
        raise ValueError("Coordinates must be finite")
    longitude, latitude = INVERSE.transform(x, y, errcheck=True)
    return longitude % 360, latitude


def cell_at(transform: Affine, shape: tuple[int, int], x: float, y: float) -> tuple[int, int]:
    if not (math.isfinite(x) and math.isfinite(y)):
        raise ValueError("Coordinates must be finite")
    column, row = ~transform @ (x, y)
    if not 0 <= row < shape[0] or not 0 <= column < shape[1]:
        raise OutsideRegion("Location lies outside the prepared south-pole region")
    return math.floor(row), math.floor(column)


def validate_polar_crs(value) -> None:
    """Validate projection semantics despite GDAL's legacy datum/unit names.

    GDAL emits variant B with lat_ts=-90; variant A with k=1 is numerically
    equivalent on this sphere, but CRS.equals does not equate those definitions.
    """
    crs = CRS(value)
    if (not crs.is_projected or crs.ellipsoid.semi_major_metre != RADIUS_M
            or crs.ellipsoid.semi_minor_metre != RADIUS_M
            or crs.prime_meridian.longitude != 0
            or any(axis.unit_conversion_factor != 1 for axis in crs.axis_info)):
        raise ValueError("Expected meter coordinates on the 1737.4 km lunar sphere")
    operation = crs.coordinate_operation
    expected = {
        "9829": {"8832": -90, "8833": 0, "8806": 0, "8807": 0},
        "9810": {"8801": -90, "8802": 0, "8805": 1, "8806": 0, "8807": 0},
    }
    actual = {str(parameter.code): parameter.value for parameter in operation.params}
    if operation.method_code not in expected or actual != expected[operation.method_code]:
        raise ValueError("Expected south polar stereographic, lon_0=0, true scale at pole")


def slope_degrees(elevation: np.ndarray, transform: Affine) -> np.ndarray:
    """Central differences, full valid cross stencil, reference-sphere distances.

    Polar stereographic scale k = 1 + rho²/(4R²). The physical gradient equals
    projected gradient times k. Unsupported rotation and outer edges fail/are nodata.
    """
    if transform.b != 0 or transform.d != 0 or transform.a <= 0 or transform.e >= 0:
        raise ValueError("Slope requires an unrotated north-up raster with positive spacing")
    z = np.asarray(elevation, dtype=np.float64)
    if z.ndim != 2 or min(z.shape) < 3:
        raise ValueError("Slope requires a 2D raster of at least 3 by 3 cells")
    result = np.full(z.shape, np.nan, dtype=np.float64)
    west, east = z[1:-1, :-2], z[1:-1, 2:]
    north, south = z[:-2, 1:-1], z[2:, 1:-1]
    center = z[1:-1, 1:-1]
    valid = np.isfinite(center) & np.isfinite(west) & np.isfinite(east)
    valid &= np.isfinite(north) & np.isfinite(south)
    dzdx = (east - west) / (2 * transform.a)
    dzdy = (south - north) / (2 * transform.e)
    x = transform.c + (np.arange(1, z.shape[1] - 1) + 0.5) * transform.a
    y = transform.f + (np.arange(1, z.shape[0] - 1) + 0.5) * transform.e
    scale = 1 + (x[None, :] ** 2 + y[:, None] ** 2) / (4 * RADIUS_M ** 2)
    values = np.degrees(np.arctan(np.hypot(dzdx, dzdy) * scale))
    result[1:-1, 1:-1] = np.where(valid, values, np.nan)
    return result


def assert_aligned(first, second) -> None:
    if (first.shape != second.shape or
            not first.transform.almost_equals(second.transform, precision=1e-7) or
            not CRS(first.crs).equals(CRS(second.crs), ignore_axis_order=True)):
        raise ValueError("Rasters are not aligned in shape, transform and lunar CRS")
