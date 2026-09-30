from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
from io import BytesIO
import hashlib

from lunaros.dataset import Grid, decode, fetch, read_label, verify_file

LABEL = (Path(__file__).parent / "fixtures" / "ldem_4.lbl").read_text(encoding="ascii")


class DatasetTests(unittest.TestCase):
    def test_official_label_contract_and_pixel_registration(self):
        grid = read_label(LABEL)
        self.assertEqual((grid.rows, grid.columns), (720, 1440))
        self.assertEqual(grid.center(0, 0), (89.875, 0.125))
        self.assertEqual(grid.center(719, 1439), (-89.875, 359.875))
        self.assertEqual(grid.scale_m, 0.5)
        self.assertEqual(grid.reference_radius_m, 1737400)
        with self.assertRaises(ValueError):
            grid.center(-1, 0)

    def test_incompatible_science_metadata_rejected(self):
        for old, new in [("LSB_INTEGER", "MSB_INTEGER"), ("1737400.", "6371000."),
                         ('"EAST"', '"WEST"'), ("359.5 <pix>", "360 <pix>"),
                         ("4 <pix/deg>", "4 <pix/rad>"), ("= 720", "= 721")]:
            with self.subTest(new=new), self.assertRaises(ValueError):
                read_label(LABEL.replace(old, new))
        with self.assertRaises(ValueError):
            read_label(LABEL + "\nLINES = 720\n")

    def test_signed_little_endian_decoding_and_elevation(self):
        grid = Grid(1, 4, 4, 0.5, 1737400)
        samples = decode(struct.pack("<4h", -17758, -1, 0, 21008), grid)
        self.assertEqual(list(samples), [-17758, -1, 0, 21008])
        self.assertEqual([dn * grid.scale_m for dn in samples], [-8879, -0.5, 0, 10504])
        with self.assertRaises(ValueError):
            decode(b"\x00", grid)

    def test_checksum_rejects_same_length_corruption(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "raster"
            path.write_bytes(b"good")
            spec = {"bytes": 4, "sha256": hashlib.sha256(b"good").hexdigest()}
            verify_file(path, spec)
            path.write_bytes(b"evil")
            with self.assertRaises(ValueError):
                verify_file(path, spec)

    def test_partial_and_oversized_downloads_preserve_existing_file(self):
        spec = {"files": {"ldem_4.img": {
            "bytes": 4, "sha256": hashlib.sha256(b"good").hexdigest(),
            "url": "https://example.test/raster"}}}
        for response in [b"bad", b"too-large"]:
            with self.subTest(response=response), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "ldem_4.img"
                path.write_bytes(b"old")
                with patch("lunaros.dataset.manifest", return_value=spec), \
                     patch("lunaros.dataset.urlopen", return_value=BytesIO(response)), \
                     self.assertRaises(ValueError):
                    fetch(Path(directory))
                self.assertEqual(path.read_bytes(), b"old")
                self.assertFalse(path.with_suffix(".img.tmp").exists())

    def test_fetch_repairs_corruption_and_reuses_verified_cache(self):
        spec = {"files": {"ldem_4.img": {
            "bytes": 4, "sha256": hashlib.sha256(b"good").hexdigest(),
            "url": "https://example.test/raster"}}}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "ldem_4.img"
            path.write_bytes(b"evil")
            with patch("lunaros.dataset.manifest", return_value=spec), \
                 patch("lunaros.dataset.load"), \
                 patch("lunaros.dataset.urlopen", return_value=BytesIO(b"good")) as download:
                fetch(Path(directory))
                self.assertEqual(path.read_bytes(), b"good")
                fetch(Path(directory))
                self.assertEqual(download.call_count, 1)
