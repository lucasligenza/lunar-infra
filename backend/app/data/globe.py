"""Bounded, reproducible global visualization preparation; no scientific substitution."""
import argparse
import json
from pathlib import Path
from PIL import Image
from lunaros.dataset import ROOT, checksum, fetch, fetch_files, load, verify_file

RAW = ROOT / 'data/raw'
OUTPUT = ROOT / 'data/processed/globe'
MANIFEST = ROOT / 'data/globe-sources.json'


def prepare(raw_dir: Path = RAW, output: Path = OUTPUT, offline: bool = False):
    source = json.loads(MANIFEST.read_text(encoding='utf-8'))
    if not offline:
        fetch(raw_dir)
        fetch_files(raw_dir, source['files'])
    grid, _ = load(raw_dir)
    for name, spec in source['files'].items():
        verify_file(raw_dir / name, spec)
    output.mkdir(parents=True, exist_ok=True)
    artifacts = {}
    for size, name, dimensions in [('1k', 'lroc_color_poles_1k.jpg', (1024, 512)),
                                    ('4k', 'lroc_color_poles_4k.tif', (4096, 2048))]:
        with Image.open(raw_dir / name) as image:
            if image.size != dimensions or image.mode != 'RGB':
                raise ValueError('Unexpected NASA visualization image dimensions or channels')
            target = output / f'color-{size}.jpg'
            image.save(target, format='JPEG', quality=92, optimize=True)
        artifacts[target.name] = {'sha256': checksum(target), 'bytes': target.stat().st_size}
    target = output / 'elevation.bin'
    target.write_bytes((raw_dir / 'ldem_4.img').read_bytes())
    artifacts[target.name] = {'sha256': checksum(target), 'bytes': target.stat().st_size}
    registry = {'schema_version': 1, 'imagery': source,
                'terrain': json.loads((ROOT / 'data/ldem_4.json').read_text()),
                'grid': {'rows': grid.rows, 'columns': grid.columns, 'pixels_per_degree': grid.pixels_per_degree,
                         'scale_m': grid.scale_m, 'reference_radius_m': grid.reference_radius_m,
                         'frame': 'MEAN EARTH/POLAR AXIS OF DE421', 'nodata_dn': -32768},
                'artifacts': artifacts}
    (output / 'registry.json').write_text(json.dumps(registry, indent=2) + '\n', encoding='utf-8')
    return registry


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    registered = prepare(offline=args.offline)
    print(json.dumps({'prepared': str(OUTPUT), 'artifacts': registered['artifacts']}, indent=2))
