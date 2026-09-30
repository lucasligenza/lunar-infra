"""Strict reader for the pinned NASA LOLA LDEM_4 V3.0 product.

This deliberately supports one reviewed PDS3 product, not arbitrary PDS labels.
Scientific contract: docs/DATA_PROVENANCE.md and the original product label.
"""

from array import array
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "ldem_4.json"


def checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def manifest() -> dict:
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


@dataclass(frozen=True)
class Grid:
    rows: int
    columns: int
    pixels_per_degree: float
    scale_m: float
    reference_radius_m: float

    def center(self, row: int, column: int) -> tuple[float, float]:
        if not 0 <= row < self.rows or not 0 <= column < self.columns:
            raise ValueError("Cell outside raster")
        return (90 - (row + 0.5) / self.pixels_per_degree,
                (column + 0.5) / self.pixels_per_degree)


def read_label(text: str) -> Grid:
    # Only single-line contract fields in this specific detached label are read.
    clean = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)

    def field(name: str) -> str:
        values = re.findall(r"^\s*" + re.escape(name) + r"\s*=\s*([^\r\n]+)",
                            clean, flags=re.MULTILINE)
        if len(values) != 1:
            raise ValueError(f"Expected exactly one {name} field")
        return values[0].strip().strip('"')

    expected = {
        "PDS_VERSION_ID": "PDS3", "PRODUCT_ID": "LDEM_4",
        "PRODUCT_VERSION_ID": "V3.0", "DATA_SET_ID": "LRO-L-LOLA-4-GDR-V1.0",
        "TARGET_NAME": "MOON", "SAMPLE_TYPE": "LSB_INTEGER",
        "SAMPLE_BITS": "16", "UNIT": "METER", "LINES": "720",
        "LINE_SAMPLES": "1440", "RECORD_BYTES": "2880", "FILE_RECORDS": "720",
        "^IMAGE": "LDEM_4.IMG", "MAP_PROJECTION_TYPE": "SIMPLE CYLINDRICAL",
        "POSITIVE_LONGITUDE_DIRECTION": "EAST",
        "COORDINATE_SYSTEM_NAME": "MEAN EARTH/POLAR AXIS OF DE421",
    }
    for name, value in expected.items():
        if field(name) != value:
            raise ValueError(f"Unsupported {name}: {field(name)}")

    numeric = {
        "SCALING_FACTOR": (0.5, ""), "OFFSET": (1737400, ""),
        "MAP_RESOLUTION": (4, "<pix/deg>"),
        "A_AXIS_RADIUS": (1737.4, "<km>"), "B_AXIS_RADIUS": (1737.4, "<km>"),
        "C_AXIS_RADIUS": (1737.4, "<km>"),
        "MAXIMUM_LATITUDE": (90, "<deg>"), "MINIMUM_LATITUDE": (-90, "<deg>"),
        "WESTERNMOST_LONGITUDE": (0, "<deg>"), "EASTERNMOST_LONGITUDE": (360, "<deg>"),
        "CENTER_LATITUDE": (0, "<deg>"), "CENTER_LONGITUDE": (180, "<deg>"),
        "MAP_PROJECTION_ROTATION": (0, ""),
        "LINE_PROJECTION_OFFSET": (359.5, "<pix>"),
        "SAMPLE_PROJECTION_OFFSET": (719.5, "<pix>"),
        "LINE_FIRST_PIXEL": (1, ""), "LINE_LAST_PIXEL": (720, ""),
        "SAMPLE_FIRST_PIXEL": (1, ""), "SAMPLE_LAST_PIXEL": (1440, ""),
    }
    for name, (value, unit) in numeric.items():
        parts = field(name).split(maxsplit=1)
        if float(parts[0]) != value or (parts[1] if len(parts) > 1 else "") != unit:
            raise ValueError(f"Unsupported {name}: {field(name)}")
    return Grid(720, 1440, 4, 0.5, 1737400)


def decode(raw: bytes, grid: Grid) -> array:
    if len(raw) != grid.rows * grid.columns * 2:
        raise ValueError("Raster byte length does not match label dimensions")
    samples = array("h")
    if samples.itemsize != 2:
        raise RuntimeError("This platform does not provide 16-bit signed shorts")
    # https://docs.python.org/3.12/library/array.html#array.array.frombytes
    samples.frombytes(raw)
    if sys.byteorder != "little":
        samples.byteswap()
    return samples


def verify_file(path: Path, spec: dict) -> None:
    if path.stat().st_size != spec["bytes"] or checksum(path) != spec["sha256"]:
        raise ValueError(f"Integrity check failed for {path.name}; fetch the pinned product again")


def load(raw_dir: Path) -> tuple[Grid, array]:
    specs = manifest()["files"]
    for name, spec in specs.items():
        verify_file(raw_dir / name, spec)
    grid = read_label((raw_dir / "ldem_4.lbl").read_text(encoding="ascii"))
    return grid, decode((raw_dir / "ldem_4.img").read_bytes(), grid)


def fetch(raw_dir: Path) -> None:
    """Download bounded, checksummed files; never accept partial cache entries."""
    raw_dir.mkdir(parents=True, exist_ok=True)
    for name, spec in manifest()["files"].items():
        destination = raw_dir / name
        if destination.exists():
            try:
                verify_file(destination, spec)
                continue
            except ValueError:
                pass
        temporary = destination.with_suffix(destination.suffix + ".tmp")
        try:
            with urlopen(spec["url"], timeout=30) as response, temporary.open("wb") as output:
                total = 0
                while chunk := response.read(65536):
                    total += len(chunk)
                    if total > spec["bytes"]:
                        raise ValueError(f"Download larger than pinned size: {name}")
                    output.write(chunk)
            verify_file(temporary, spec)
            temporary.replace(destination)
        finally:
            temporary.unlink(missing_ok=True)
    load(raw_dir)


def summary(raw_dir: Path) -> dict:
    grid, samples = load(raw_dir)
    return {
        "product": "LDEM_4", "product_version": "V3.0",
        "rows": grid.rows, "columns": grid.columns,
        "sample_count": len(samples), "pixels_per_degree": grid.pixels_per_degree,
        "reference_radius_m": grid.reference_radius_m,
        "elevation_min_m": min(samples) * grid.scale_m,
        "elevation_max_m": max(samples) * grid.scale_m,
        "northwest_cell_center": grid.center(0, 0),
        "southeast_cell_center": grid.center(grid.rows - 1, grid.columns - 1),
        "integrity": "Both SHA-256 checksums match the pinned manifest",
    }
