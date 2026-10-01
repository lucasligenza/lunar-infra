"""Containing-cell queries shared by projected scientific overlays and analysis."""
import math
import numpy as np
from pyproj import CRS, Transformer
from backend.app.geospatial.terrain import GEOGRAPHIC, RADIUS_M, validate_polar_crs
from backend.app.models.atlas import Quantity


class ProjectedRaster:
    def __init__(self, values, transform, crs, source, kind, method):
        validate_polar_crs(crs)
        if values.ndim != 2 or transform.b or transform.d or transform.a <= 0 or transform.e >= 0:
            raise ValueError('Expected north-up lunar south-polar numeric grid')
        self.values, self.transform, self.source = values, transform, source
        self.kind, self.method = kind, method
        self.forward = Transformer.from_crs(GEOGRAPHIC, CRS(crs), always_xy=True)

    def coordinates(self, longitude, latitude):
        lon, lat = np.broadcast_arrays(longitude, latitude)
        x, y = self.forward.transform(lon, lat)
        x, y = np.asarray(x), np.asarray(y)
        column = (x-self.transform.c)/self.transform.a
        row = (y-self.transform.f)/self.transform.e
        covered = np.isfinite(row) & np.isfinite(column) & (lat >= -90) & (lat <= 0)
        covered &= (row >= 0) & (row < self.values.shape[0]) & (column >= 0) & (column < self.values.shape[1])
        rows = np.floor(np.where(covered, row, 0)).astype(int)
        columns = np.floor(np.where(covered, column, 0)).astype(int)
        return rows, columns, covered

    def at(self, longitude, latitude):
        rows, columns, covered = self.coordinates(longitude, latitude)
        return np.where(covered, self.values[rows, columns], np.nan)

    def sample(self, longitude, latitude):
        rows, columns, covered = self.coordinates(longitude, latitude)
        value = float(self.values[rows, columns]) if covered else math.nan
        cx, cy = self.transform @ (int(columns)+.5, int(rows)+.5)
        scale = 1+(cx*cx+cy*cy)/(4*RADIUS_M**2)
        spacing = self.transform.a/scale
        return Quantity(value=value if math.isfinite(value) else None, unit=self.source.unit,
            status='unavailable' if not covered else 'ok' if math.isfinite(value) else 'nodata',
            source_id=self.source.product_id, version=self.source.version, quantity_kind=self.kind,
            spacing_north_m=spacing, spacing_east_m=spacing, support_north_m=spacing,
            support_east_m=spacing, method=self.method)
