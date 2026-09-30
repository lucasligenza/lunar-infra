# LunarOS

Explore the entire Moon in 3D with NASA imagery and coarse LOLA relief, then move
into validated south-pole terrain analysis and hypothetical infrastructure simulation.
See [PROGRESS.md](PROGRESS.md) for completed milestones and remaining work.
See the [Phase 3 plan](docs/phase3-plan.md), [global data](docs/global-data.md),
[Phase 2 acceptance evidence](docs/phase2-acceptance.md) and [mission API](docs/mission-api.md).

Requires Python 3.12+, [uv](https://docs.astral.sh/uv/getting-started/installation/),
and Node.js 24 with npm. Dependencies are locked for reproducible installation.
Run from the repository root:

```powershell
uv sync --locked
uv run python -m backend.app.data.pipeline
uv run python -m backend.app.data.globe
uv run python -m backend.app.data.atlas
uv run pytest
```

The active pipeline downloads about 80 MB, validates pinned hashes and polar CRS,
and prepares a 96 x 96 km region at 240 m resolution. Use `--offline` to reprocess
cached files. See [data setup](data/README.md). Downloads and GeoTIFFs are ignored.
No synthetic data is substituted if acquisition fails.
The global pipeline additionally prepares compact NASA visualization textures and
the native 0.25 degree LOLA overview. See [global data](docs/global-data.md) for
source integrity, coverage and the distinction between visualization and analysis.
The atlas additionally obtains the pinned 133 MB GLD100 global 32 ppd product,
preserving native values and PDS special codes. `--plan` reports acquisition/disk
requirements, and `--offline` reuses verified source files. Open **Lunar atlas**
on the globe to inspect terrain from selectable registered global sources and
search the scientific catalog. Discovered products are labeled separately from
prepared numerical sources. See [Phase 4 plan](docs/phase4-plan.md).

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

Open **http://127.0.0.1:3000** for **Global Explorer**. Drag to orbit, right-drag or
use arrow keys to pan, scroll to zoom, and click the Moon to select a location.
Focus the globe and press Enter to select the center of the view. Search seven
destinations, fly to coordinates, reset the camera, or toggle imagery/graticule.
The source drawer identifies coarse elevation and supported local coverage.
Use **Analyze this region** or **Design a mission here** at the prepared south pole.
Elsewhere, local analysis is explicitly unavailable; no local values are fabricated.
The top mode controls preserve location, camera, active scenario, drafts and the
selected simulation interval. Hidden playback pauses. On phones, destination and
region panels can be closed so they do not obstruct navigation.

In **Regional Analysis**, drag or scroll the map, switch elevation/slope/solar
visibility layers, and click a location to inspect it. The coordinate form also
accepts planetocentric latitude and east-positive longitude. Source labels, units,
methods and sampling footprints are available in the inspector. At latitude
`-89.5`, longitude `0`, the prepared raster reports -705 m elevation.

In **Mission Designer**, select terrain, enter a scenario name and choose
**Create scenario at selected site**.
Choose an asset from the infrastructure catalog, then click valid terrain to place it.
Click its symbol or list entry to configure it. **Save asset** persists parameters;
**Move on map** relocates it. Reopen, duplicate or delete scenarios from the left
rail; deletion requires confirmation. **Save scenario** saves the edited name.
Placements save immediately through the API; unsaved form changes are labeled.
Reopening restores the saved definition after confirming any discarded drafts.
Simultaneous edits return a revision conflict; reopen before retrying your changes.
On small screens, the sticky Map, Tools, Inspector and Timeline links navigate
between workspace sections.
The local database is `data/local/missions.sqlite`, separate from downloaded rasters.
Set `LUNAROS_DB_PATH` before backend startup to use another database path.

To exercise energy simulation, place a habitat, solar array and battery. Open
**Simulation inputs**, set the UTC period/time step and choose **Fill constant
profile**, **Apply synthetic stress profile**, or enter one electrical input factor
per interval. These are explicitly hypothetical inputs; NASA average visibility
cannot reconstruct sunlight over time. **Run simulation** saves changed inputs
and executes the Python engine. It never generates a lunar daily cycle.

The bottom timeline shows computed generation, demand, battery SOC and shortage
events. Scrub, play/pause, change speed, narrow the chart window, or select the
first shortage. Right-panel telemetry follows that interval. Powers are interval
averages and SOC is the interval-end value. Saving any scenario edit clears stale
telemetry; rerun to update it. Reopening an unchanged scenario restores its saved
result. See the [energy model](docs/energy-model.md) for equations and omissions.
Mission timestamps use whole-second UTC precision. Empty or non-finite entries
in an input series are rejected rather than interpolated or treated as zero.

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
runner. See [Phase 1](docs/phase1-acceptance.md) and
[Phase 2](docs/phase2-acceptance.md) and [Phase 3](docs/phase3-acceptance.md)
acceptance evidence for test coverage and rendered visual review.

The 240 m terrain grid supports regional exploration, not landing-hazard analysis.
The global 0.25° elevation source is approximately 7.58 km per pixel at the equator;
its display mesh uses 1° spacing and the visualization texture reaches 4096 × 2048.
Higher global detail is not streamed by this implementation. Global visual selection
is suitable for navigation; construction-scale conclusions need finer verified data.
Solar visibility is a modeled long-term frequency over approximately 18.6 years,
not current sunlight or electrical power. See the scientific limitations below.

The original 2 MB global-overview CLI remains available as `uv run python -m lunaros
fetch` and `uv run python -m lunaros inspect`; it is not used for polar analysis.

See [architecture](docs/ARCHITECTURE.md) and
[global dataset provenance](docs/DATA_PROVENANCE.md) and
[scientific assumptions and limitations](docs/scientific-assumptions.md).
