from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pytest
import rasterio
from rasterio import Affine

from backend.app.data.pipeline import RAW, SHAPE, TRANSFORM, align_average, prepare, validate_source
from backend.app.geospatial.terrain import POLAR, assert_aligned


def test_resampling_handles_shifted_origin_and_checks_complete_coverage():
    values = np.arange(16, dtype=float).reshape((4, 4))
    source_transform = Affine(60, 0, -120, 0, -60, 120)
    shifted = Affine(120, 0, -90, 0, -120, 90)
    # First row/column overlap weights are [1/4, 1/2, 1/4], not naive 2x2 blocks.
    assert align_average(values, source_transform, (1, 1), shifted)[0, 0] == pytest.approx(5)
    with pytest.raises(ValueError, match="fully cover"):
        align_average(values, source_transform, (4, 4), shifted)


def test_original_pds_metadata_contract():
    fixture = Path(__file__).parent / "fixtures" / "ldem_75s_240m.lbl"
    text = fixture.read_text(encoding="ascii")
    source = SimpleNamespace(shape=(3812, 3812), count=1, dtypes=("int16",), crs=POLAR,
                             transform=Affine(240, 0, -457440, 0, -240, 457440),
                             scales=(0.5,), offsets=(1737400.0,), nodata=-32768)
    validate_source(source, text, "elevation")
    with pytest.raises(ValueError):
        validate_source(source, text.replace("1737.4 <km>", "6371 <km>"), "elevation")
    source.transform = Affine(240, 0, -457320, 0, -240, 457440)
    with pytest.raises(ValueError):
        validate_source(source, text, "elevation")


@pytest.mark.skipif(not (RAW / "ldem_75s_240m.img").exists()
                    or not (RAW / "AVGVISIB_85S_060M_201608.IMG").exists(),
                    reason="Optional real-data integration: run the acquisition pipeline first")
def test_real_pipeline_is_reproducible_and_retains_uninterpolated_samples(tmp_path):
    first = prepare(processed_dir=tmp_path, download=False)
    second = prepare(processed_dir=tmp_path, download=False)
    assert first == second
    assert first["statistics"]["elevation_valid_cells"] == 160000
    with rasterio.open(tmp_path / "terrain.tif") as terrain, \
            rasterio.open(tmp_path / "illumination.tif") as light, \
            rasterio.open(RAW / "ldem_75s_240m.lbl") as original:
        assert terrain.shape == SHAPE
        assert terrain.transform == TRANSFORM
        assert_aligned(terrain, light)
        elevation = terrain.read(1)
        expected = original.read(1, window=((1706, 2106), (1706, 2106))) * 0.5
        np.testing.assert_array_equal(elevation, expected)
        fractions = light.read(1)
        assert fractions.min() >= 0 and fractions.max() <= 1
