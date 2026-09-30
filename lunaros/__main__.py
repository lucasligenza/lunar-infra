"""Run from the repository root: python -m lunaros --help."""

import argparse
import json
from pathlib import Path
import sys
from urllib.error import URLError

from .dataset import ROOT, fetch, summary


def main() -> int:
    parser = argparse.ArgumentParser(description="LunarOS NASA terrain pipeline")
    parser.add_argument("command", choices=["fetch", "inspect"])
    parser.add_argument("--raw-dir", type=Path, default=ROOT / "data" / "raw")
    args = parser.parse_args()
    try:
        if args.command == "fetch":
            fetch(args.raw_dir)
        print(json.dumps(summary(args.raw_dir), indent=2, allow_nan=False))
        return 0
    except (OSError, ValueError, URLError) as error:
        print(f"LunarOS: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
