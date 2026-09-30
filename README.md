# LunarOS

Reproducible lunar terrain exploration using actual NASA LOLA elevation and modeled
solar visibility. Phase 1 follows the supplied lunar data explorer roadmap.
See [PROGRESS.md](PROGRESS.md) for completed milestones and remaining work.

Requires Python 3.12+ and [uv](https://docs.astral.sh/uv/getting-started/installation/).
Run from the repository root:

```powershell
uv sync --locked
uv run python -m backend.app.data.pipeline
uv run pytest
```

The active pipeline downloads about 80 MB, validates pinned hashes and polar CRS,
and prepares a 96 x 96 km region at 240 m resolution. Use `--offline` to reprocess
cached files. See [data setup](data/README.md). Downloads and GeoTIFFs are ignored.
No synthetic data is substituted if acquisition fails.

Start the backend after preparation:

```powershell
uv run uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Visit http://127.0.0.1:8000/docs for the working scientific API. The frontend is
the next milestone. See [API documentation](docs/API.md).

The original 2 MB global-overview CLI remains available as `uv run python -m lunaros
fetch` and `uv run python -m lunaros inspect`; it is not used for polar analysis.

See [architecture](docs/ARCHITECTURE.md) and
[global dataset provenance](docs/DATA_PROVENANCE.md) and
[scientific assumptions and limitations](docs/scientific-assumptions.md).
