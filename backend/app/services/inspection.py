"""Reusable read-only scientific service; no HTTP or AI dependencies."""

from io import BytesIO
import json
from pathlib import Path

import numpy as np
from PIL import Image
import rasterio

from backend.app.data.pipeline import PROCESSED, REGION_ID, SHAPE, TRANSFORM, source_manifest
from backend.app.geospatial.terrain import (
    POLAR_PROJ, RADIUS_M, assert_aligned, cell_at, project, unproject, validate_polar_crs,
)
from backend.app.models.schemas import Coordinates, Dataset, Layer, Measurement, Region, SampleCell, SiteInspection
from lunaros.dataset import checksum

LAYER_STYLES = {
    "elevation": ("Elevation", "m", -4500, 2500, ["#243c58", "#617c8b", "#a5b1ae", "#dad5c5"],
                  "LOLA elevation relative to the 1737.4 km sphere; native 240 m grid"),
    "slope": ("Local slope", "deg", 0, 40, ["#263d4b", "#577d8a", "#d2ba78", "#de795d"],
              "Derived central-difference slope; 480 m projected baseline"),
    "illumination": ("Solar visibility", "fraction", 0, 1, ["#172633", "#506372", "#acac88", "#f4da8b"],
                     "Modeled long-term sunlight frequency; area-averaged to 240 m"),
}


def region(available: bool) -> Region:
    return Region(id=REGION_ID, name="Lunar south pole", available=available,
                  bounds_m=[-48000, -48000, 48000, 48000], shape=list(SHAPE), resolution_m=240,
                  crs_proj=POLAR_PROJ, reference_radius_m=RADIUS_M,
                  layers=[Layer(id=key, name=style[0], unit=style[1], minimum=style[2], maximum=style[3],
                                colors=style[4], description=style[5],
                                image_url=f"/regions/{REGION_ID}/layers/{key}.png")
                          for key, style in LAYER_STYLES.items()])


def datasets(store: "TerrainStore | None") -> list[Dataset]:
    result = []
    for kind, spec in source_manifest()["sources"].items():
        metadata = store.registry["sources"][kind] if store else {}
        result.append(Dataset(
            product_id=spec["product_id"], version=spec["version"], dataset_id=spec["dataset_id"],
            available=store is not None, quantity_kind="measured_gridded" if kind == "elevation" else "modeled",
            unit="m" if kind == "elevation" else "fraction", source_resolution_m=240 if kind == "elevation" else 60,
            prepared_resolution_m=240, frame="MEAN EARTH/POLAR AXIS OF DE421",
            crs_wkt=metadata.get("source_crs_wkt"), observation_start=metadata.get("observation_start"),
            observation_stop=metadata.get("observation_stop"), created=metadata.get("created"),
            model_duration_years=metadata.get("model_duration_years"),
            model_timestep_hours=metadata.get("model_timestep_hours"),
            processing=metadata.get("processing", "Not prepared; run the data pipeline"), files=spec["files"],
        ))
    return result


class TerrainStore:
    def __init__(self, directory: Path = PROCESSED):
        self.registry = json.loads((directory / "registry.json").read_text(encoding="utf-8"))
        if self.registry.get("schema_version") != 1 or self.registry.get("region_id") != REGION_ID:
            raise ValueError("Unsupported scientific data registry")
        for kind, spec in source_manifest()["sources"].items():
            registered = self.registry["sources"][kind]
            if any(registered[key] != spec[key] for key in ["product_id", "version", "dataset_id", "files"]):
                raise ValueError("Registered sources differ from pinned NASA manifest")
        for name in ["terrain.tif", "illumination.tif"]:
            if checksum(directory / name) != self.registry["artifacts"][name]["sha256"]:
                raise ValueError(f"Prepared {name} failed its integrity check")
        with rasterio.open(directory / "terrain.tif") as terrain, \
                rasterio.open(directory / "illumination.tif") as light:
            assert_aligned(terrain, light)
            validate_polar_crs(terrain.crs)
            if (terrain.shape != SHAPE or terrain.transform != TRANSFORM or terrain.count != 2
                    or light.count != 1 or terrain.descriptions != ("elevation_m", "slope_deg")
                    or light.descriptions != ("solar_visibility_fraction",)
                    or terrain.dtypes != ("float32", "float32") or light.dtypes != ("float32",)
                    or terrain.nodata is None or light.nodata is None
                    or not np.isnan(terrain.nodata) or not np.isnan(light.nodata)):
                raise ValueError("Prepared raster geometry or band definitions are unsupported")
            self.transform = terrain.transform
            self.elevation = terrain.read(1, masked=True).filled(np.nan)
            self.slope = terrain.read(2, masked=True).filled(np.nan)
            self.illumination = light.read(1, masked=True).filled(np.nan)
        if (np.any((self.slope[np.isfinite(self.slope)] < 0) | (self.slope[np.isfinite(self.slope)] > 90))
                or np.any((self.illumination[np.isfinite(self.illumination)] < 0)
                          | (self.illumination[np.isfinite(self.illumination)] > 1))):
            raise ValueError("Prepared scientific values outside supported ranges")
        for data in [self.elevation, self.slope, self.illumination]:
            data.flags.writeable = False
        self.images = {key: self.render(key) for key in LAYER_STYLES}

    def inspect(self, longitude: float, latitude: float) -> SiteInspection:
        x, y = project(longitude, latitude)
        row, column = cell_at(self.transform, self.elevation.shape, x, y)
        cx, cy = self.transform @ (column + 0.5, row + 0.5)
        center_longitude, center_latitude = unproject(cx, cy)
        scale = 1 + (cx**2 + cy**2) / (4 * RADIUS_M**2)
        ground_resolution = self.transform.a / scale

        def measurement(values, unit, kind, source, method, notes, support=1):
            value = float(values[row, column])
            valid = np.isfinite(value)
            return Measurement(value=value if valid else None, unit=unit, status="ok" if valid else "nodata",
                               quantity_kind=kind, source_id=source, method=method,
                               resolution_m=ground_resolution, support_m=ground_resolution * support, notes=notes)

        elevation_id = self.registry["sources"]["elevation"]["product_id"]
        illumination_id = self.registry["sources"]["illumination"]["product_id"]
        return SiteInspection(
            region_id=REGION_ID,
            coordinates=Coordinates(longitude_deg=longitude % 360, latitude_deg=latitude, x_m=x, y_m=y,
                                    longitude_defined=latitude != -90),
            sample=SampleCell(row=row, column=column,
                              center=Coordinates(longitude_deg=center_longitude, latitude_deg=center_latitude,
                                                 x_m=cx, y_m=cy)),
            elevation=measurement(self.elevation, "m", "measured_gridded", elevation_id, "Containing pixel",
                                  "Height relative to the 1737.4 km reference sphere; NASA gridded altimetry"),
            slope=measurement(self.slope, "deg", "derived", elevation_id, "Central differences; valid cross stencil",
                              "Reference-sphere distances with polar projection scale correction; not landing-hazard slope", 2),
            solar_visibility=measurement(self.illumination, "fraction", "modeled", illumination_id,
                                         "Containing 240 m cell; area-averaged from 60 m",
                                         "Any solar-disc visibility; ~18.6 years at hourly timesteps; not current sunlight"),
        )

    def render(self, layer: str) -> bytes:
        values = {"elevation": self.elevation, "slope": self.slope, "illumination": self.illumination}[layer]
        style = LAYER_STYLES[layer]
        finite = np.isfinite(values)
        normalized = np.clip((np.where(finite, values, style[2]) - style[2]) / (style[3] - style[2]), 0, 1)
        stops = np.linspace(0, 1, len(style[4]))
        palette = np.array([[int(color[i:i + 2], 16) for i in (1, 3, 5)] for color in style[4]])
        rgba = np.zeros((*values.shape, 4), dtype=np.uint8)
        for channel in range(3):
            rgba[:, :, channel] = np.interp(normalized, stops, palette[:, channel]).astype(np.uint8)
        rgba[:, :, 3] = np.where(finite, 255, 0)
        output = BytesIO()
        Image.fromarray(rgba).save(output, format="PNG")
        return output.getvalue()
