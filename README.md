# LunarOS

Reproducible lunar terrain exploration using actual NASA LOLA elevation and modeled
solar visibility. Phase 1 follows the supplied lunar data explorer roadmap.
See [PROGRESS.md](PROGRESS.md) for completed milestones and remaining work.

Requires Python 3.12+, [uv](https://docs.astral.sh/uv/getting-started/installation/),
and Node.js 24 with npm. Dependencies are locked for reproducible installation.
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

Install the frontend from the repository root:

```powershell
cd frontend
npm ci
```

Start the backend in a terminal at the repository root:

```powershell
uv run uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

Open **http://127.0.0.1:3000**. Drag or scroll the map, switch elevation/slope/solar
visibility layers, and click a location to inspect it. The coordinate form also
accepts planetocentric latitude and east-positive longitude. Source labels, units,
methods and sampling footprints are available in the inspector. At latitude
`-89.5`, longitude `0`, the prepared raster reports -705 m elevation.

The frontend proxies `/api` to the backend at `http://127.0.0.1:8000`. Set
`LUNAROS_BACKEND_URL` before starting Next.js if the backend runs elsewhere.
Visit http://127.0.0.1:8000/docs for interactive API documentation, or read
[API documentation](docs/API.md). If data preparation fails, fix the reported
download/validation error; the app displays an unavailable state without fake data.

Validate from the repository root with `uv run pytest`. Frontend checks run from
`frontend`:

```powershell
npm run typecheck
npm run build
npx playwright install chromium
npm test
```

Browser tests use the actual prepared NASA data and start both local servers when
needed. On Linux, use `npx playwright install --with-deps chromium` to install
browser system dependencies. `npm run build` followed by `npm start` also serves
the frontend locally; this project has not been deployed to a public service.
GitHub Actions repeats these checks and downloads the pinned data on a fresh Linux
runner. See [Phase 1 acceptance evidence](docs/phase1-acceptance.md) for test coverage.

The 240 m terrain grid supports regional exploration, not landing-hazard analysis.
Solar visibility is a modeled long-term frequency over approximately 18.6 years,
not current sunlight or electrical power. See the scientific limitations below.

The original 2 MB global-overview CLI remains available as `uv run python -m lunaros
fetch` and `uv run python -m lunaros inspect`; it is not used for polar analysis.

See [architecture](docs/ARCHITECTURE.md) and
[global dataset provenance](docs/DATA_PROVENANCE.md) and
[scientific assumptions and limitations](docs/scientific-assumptions.md).
