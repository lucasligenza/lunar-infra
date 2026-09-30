"""Reproducible bounded south-pole acquisition, processing and registration."""

import argparse
import json
from pathlib import Path
import re

import numpy as np
import rasterio
from rasterio import Affine
from rasterio.enums import Resampling
from rasterio.warp import reproject
from rasterio.windows import Window
from rasterio.transform import array_bounds

from lunaros.dataset import ROOT, checksum, fetch_files, verify_file
from backend.app.geospatial.terrain import POLAR, POLAR_PROJ, assert_aligned, slope_degrees, validate_polar_crs

SOURCE_MANIFEST = ROOT / "data" / "polar-sources.json"
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
REGION_ID = "south-pole"
SHAPE = (400, 400)
TRANSFORM = Affine(240, 0, -48000, 0, -240, 48000)


def source_manifest() -> dict:
    return json.loads(SOURCE_MANIFEST.read_text(encoding="utf-8"))


def label_field(text: str, name: str) -> str:
    clean = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    values = re.findall(r"^\s*" + re.escape(name) + r"\s*=\s*([^\r\n]+)", clean, re.MULTILINE)
    if len(values) != 1:
        raise ValueError(f"Expected one {name} label field")
    return values[0].strip().strip('"')


def validate_source(source, text: str, kind: str) -> None:
    expected = {
        "PDS_VERSION_ID": "PDS3", "TARGET_NAME": "MOON",
        "DATA_SET_ID": "LRO-L-LOLA-4-GDR-V1.0", "SAMPLE_TYPE": "LSB_INTEGER",
        "SAMPLE_BITS": "16", "MAP_PROJECTION_TYPE": "POLAR STEREOGRAPHIC",
        "KEYWORD_LATITUDE_TYPE": "PLANETOCENTRIC", "POSITIVE_LONGITUDE_DIRECTION": "EAST",
        "CENTER_LATITUDE": "-90 <deg>", "CENTER_LONGITUDE": "0 <deg>",
        "A_AXIS_RADIUS": "1737.4 <km>", "B_AXIS_RADIUS": "1737.4 <km>",
        "C_AXIS_RADIUS": "1737.4 <km>", "MAP_PROJECTION_ROTATION": "0.0",
        "COORDINATE_SYSTEM_NAME": "MEAN EARTH/POLAR AXIS OF DE421",
        "UNIT": "METER" if kind == "elevation" else "NONE",
        "PRODUCT_VERSION_ID": "V2.0" if kind == "elevation" else "V1.05",
    }
    for name, value in expected.items():
        if label_field(text, name) != value:
            raise ValueError(f"Unsupported {name} in {kind}")
    size, spacing, scale, offset = (3812, 240, 0.5, 1737400) if kind == "elevation" else (5058, 60, 0.00004, 0)
    for name, expected_value in {"LINES": size, "LINE_SAMPLES": size,
                                 "LINE_PROJECTION_OFFSET": (size - 1) / 2,
                                 "SAMPLE_PROJECTION_OFFSET": (size - 1) / 2,
                                 "MAP_SCALE": spacing,
                                 "SCALING_FACTOR": scale, "OFFSET": offset}.items():
        if float(label_field(text, name).split()[0]) != expected_value:
            raise ValueError(f"Unsupported {name} in {kind}")
    expected_transform = Affine(spacing, 0, -size * spacing / 2, 0, -spacing, size * spacing / 2)
    if (source.shape != (size, size) or source.count != 1 or source.dtypes != ("int16",)
            or not source.transform.almost_equals(expected_transform, precision=1e-7)
            or source.scales != (scale,) or source.offsets != (float(offset),)
            or source.nodata != -32768):
        raise ValueError(f"GDAL metadata does not match reviewed {kind} label")
    validate_polar_crs(source.crs)


def align_average(values: np.ndarray, source_transform: Affine, shape: tuple[int, int],
                  destination_transform: Affine) -> np.ndarray:
    """Area-average modeled fractions; reject cells with any missing contributors."""
    source_bounds = array_bounds(*values.shape, source_transform)
    bounds = array_bounds(*shape, destination_transform)
    if (bounds[0] < source_bounds[0] or bounds[1] < source_bounds[1]
            or bounds[2] > source_bounds[2] or bounds[3] > source_bounds[3]):
        raise ValueError("Illumination source does not fully cover the destination grid")
    output = np.full(shape, np.nan, dtype=np.float64)
    coverage = np.zeros(shape, dtype=np.float64)
    params = dict(src_transform=source_transform, src_crs=POLAR,
                  dst_transform=destination_transform, dst_crs=POLAR,
                  resampling=Resampling.average)
    # https://rasterio.readthedocs.io/en/stable/topics/reproject.html
    reproject(values, output, src_nodata=np.nan, dst_nodata=np.nan, **params)
    reproject(np.isfinite(values).astype(np.float64), coverage, **params)
    output[coverage < 1 - 1e-8] = np.nan
    return output


def write_raster(path: Path, bands: list[np.ndarray], descriptions: list[str]) -> None:
    temporary = path.with_suffix(".tmp.tif")
    try:
        with rasterio.open(temporary, "w", driver="GTiff", width=SHAPE[1], height=SHAPE[0],
                           count=len(bands), dtype="float32", crs=POLAR, transform=TRANSFORM,
                           nodata=np.nan, compress="deflate") as destination:
            for band, (values, description) in enumerate(zip(bands, descriptions, strict=True), start=1):
                destination.write(values.astype("float32"), band)
                destination.set_band_description(band, description)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def prepare(raw_dir: Path = RAW, processed_dir: Path = PROCESSED, *, download: bool = True) -> dict:
    sources = source_manifest()["sources"]
    metadata = {}
    for kind, spec in sources.items():
        if download:
            fetch_files(raw_dir, spec["files"])
        for name, file_spec in spec["files"].items():
            verify_file(raw_dir / name, file_spec)
        label_name = next(name for name in spec["files"] if name.lower().endswith(".lbl"))
        label = (raw_dir / label_name).read_text(encoding="ascii")
        with rasterio.open(raw_dir / label_name) as source:
            validate_source(source, label, kind)
            # A 1-cell elevation halo preserves valid central-difference slopes at ROI edges.
            if kind == "elevation":
                window = Window(1705, 1705, 402, 402)
                elevation = source.read(1, window=window, masked=True).astype("float64").filled(np.nan) * 0.5
                slope = slope_degrees(elevation, source.window_transform(window))[1:-1, 1:-1]
                elevation = elevation[1:-1, 1:-1]
            else:
                # Read only the bounded ROI plus source halo; preserve actual 60m grid origin.
                column, row = ~source.transform @ (-48240, 48240)
                window = Window(int(np.floor(column)), int(np.floor(row)), 1610, 1610)
                fractions = source.read(1, window=window, masked=True).astype("float64").filled(np.nan) * 0.00004
                if np.any((fractions[np.isfinite(fractions)] < 0) | (fractions[np.isfinite(fractions)] > 1)):
                    raise ValueError("Solar visibility outside [0, 1]")
                illumination = align_average(fractions, source.window_transform(window), SHAPE, TRANSFORM)
            metadata[kind] = {
                **spec, "source_crs_wkt": source.crs.to_wkt(), "source_resolution_m": source.res[0],
                "observation_start": label_field(label, "START_TIME"),
                "observation_stop": label_field(label, "STOP_TIME"),
                "created": label_field(label, "PRODUCT_CREATION_TIME"),
                "frame": "MEAN EARTH/POLAR AXIS OF DE421", "source_nodata": source.nodata,
                "quantity_kind": "measured_gridded" if kind == "elevation" else "modeled",
                "processing": "Crop; DN x 0.5; no elevation interpolation" if kind == "elevation" else
                "DN x 0.00004; area-average resampling from 60 m to the exact terrain grid",
                "model_duration_years": 18.6 if kind == "illumination" else None,
                "model_timestep_hours": 1 if kind == "illumination" else None,
                "model_calendar_start": None, "model_calendar_stop": None,
            }
    processed_dir.mkdir(parents=True, exist_ok=True)
    write_raster(processed_dir / "terrain.tif", [elevation, slope], ["elevation_m", "slope_deg"])
    write_raster(processed_dir / "illumination.tif", [illumination], ["solar_visibility_fraction"])
    with rasterio.open(processed_dir / "terrain.tif") as terrain, \
            rasterio.open(processed_dir / "illumination.tif") as light:
        assert_aligned(terrain, light)
    registry = {
        "schema_version": 1, "region_id": REGION_ID, "name": "Lunar south pole",
        "bounds_m": [-48000, -48000, 48000, 48000], "shape": list(SHAPE),
        "resolution_m": 240, "crs_proj": POLAR_PROJ, "crs_wkt": POLAR.to_wkt(),
        "transform": list(TRANSFORM)[:6], "reference_radius_m": 1737400,
        "sources": metadata,
        "artifacts": {name: {"sha256": checksum(processed_dir / name)}
                      for name in ["terrain.tif", "illumination.tif"]},
        "statistics": {"elevation_min_m": float(np.nanmin(elevation)),
                       "elevation_max_m": float(np.nanmax(elevation)),
                       "slope_max_deg": float(np.nanmax(slope)),
                       "elevation_valid_cells": int(np.isfinite(elevation).sum()),
                       "slope_valid_cells": int(np.isfinite(slope).sum()),
                       "illumination_valid_cells": int(np.isfinite(illumination).sum())},
    }
    temporary = processed_dir / "registry.json.tmp"
    temporary.write_text(json.dumps(registry, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(processed_dir / "registry.json")
    return registry


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare real south-pole terrain and solar visibility")
    parser.add_argument("--offline", action="store_true", help="Validate and process existing pinned raw files")
    args = parser.parse_args()
    try:
        result = prepare(download=not args.offline)
    except (OSError, ValueError, rasterio.errors.RasterioError) as error:
        parser.exit(1, f"Data preparation failed: {error}\nNo synthetic fallback is used.\n")
    print(json.dumps(result["statistics"], indent=2))


if __name__ == "__main__":
    main()
