# LunarOS architecture

Phase 1 provides scientific exploration. Phase 2 adds hypothetical infrastructure,
scenario persistence and energy simulation. The user's Phase 3 adds global 3D lunar
exploration and connected viewing modes. Optimization and AI remain excluded.

The visual workspace organizes the browser into Explore, Analyze, Build and Simulate. These
are activities over the same root location, camera, atlas selection and scenario
state, not separate applications. The existing `global`, `regional` and `mission`
URL values remain supported; `simulation` is added. Asset and mission editors stay
mounted while hidden between activities, preserving independent drafts. API
revision checks remain authoritative. The timeline is visible only in Simulate
and pauses when leaving it; the selected reporting interval persists on return.

`MissionWorkspace` owns visual slots around the original map and hooks.
`ContextInspector` opens only for selection or explicit details; the asset palette
closes when placement begins. `OverlayMenu` uses registered layers and existing
numeric coverage queries. Switching native 2D/3D presentation does not change the
scenario coordinate domain or numerical source. The projected footprint outline
is a navigation guide, never a substitute for nodata or source coverage.

`Timeline` retains playback timer, selected interval, speed and chart window.
`SimulationBar` formats interval output; `SimulationDrawer` presents existing
charts, cumulative energy, events and reproducibility metadata. Collapsing charts
keeps the reporting interval and settings. No scientific logic moved to JavaScript;
per-asset telemetry is read directly from the Python result dictionaries.

The visual overhaul adds shared `Icon` and `LayerPicker` components. The latter
uses native radio behavior and the existing registered layer list; both global
and mission views call their original layer handlers. Short labels are a display
mapping, not a second scientific registry. Original layer names, availability,
coverage requests, render state, legends and sources remain authoritative.
The global toolbar reserves a top band above contextual docks; mission tools
and the compact simulation bar keep their existing Grid/Flex layout ownership.

The command palette calls the existing mode, atlas-view and simulation handlers.
Destination commands use the API's verified destination catalog. Native modal
dialogs trap focus, handle Escape (including search inputs) and restore the opener.
An explicit saved hypothetical input series is required for the run command;
unsaved drafts and busy requests explain why it is unavailable.

The activity store keeps at most 100 actual browser-session events. Completed
scientific/API requests, actual raster readiness, selection and saved simulation
responses emit UTC entries; failures are warnings. Optional details show request
paths and returned IDs/revisions. Clearing/dismissing the console changes only
presentation. It neither persists logs nor executes operating-system commands.

```text
NASA PDS / LOLA team (pinned IMG + labels)
 -> data/raw/ (ignored and checksummed)
 -> backend/app/data/ (validation, bounded crop, registration)
 -> backend/app/geospatial/ (lunar transforms and numerical slope)
 -> data/processed/ (ignored GeoTIFFs and provenance registry)
 -> backend/app/services/ (reusable inspection and visualization)
 -> backend/app/api/ (FastAPI with Pydantic responses)
 -> frontend/ (Next.js, React, TypeScript, Tailwind, OpenLayers)
```

Python 3.12+ dependencies are locked by uv.lock. The original lunaros module retains
its published global-overview ingestion CLI. Active south-pole analysis uses the
backend modules, adopting the user's specified stack without rewriting history.
Frontend dependencies are locked separately by npm in frontend/package-lock.json.

Acquisition is an explicit CLI operation, never a side effect of inspection. The
pipeline registers verified artifact hashes and source metadata. Services consume
prepared files only and fail clearly when data is unavailable or corrupt. HTTP
handlers delegate numerical logic to functions that later AI tools can call directly.
The small bounded region can fit in memory; no database or distributed worker is
needed for terrain. Phase 2 uses local SQLite for mission definitions and immutable
simulation runs; numerical energy functions remain separate from HTTP and React.
Optimization, AI and production deployment remain outside the implementation.

OpenLayers displays georeferenced raster renderings in their lunar polar coordinate
space, using a custom projection rather than Earth Web Mercator. Its browser
coordinate formulas are tested against the PyProj API. Color images are visualization
only; measurements come from the scientific service. React loads the map on the
client and disposes it on unmount. Selecting a location requests the API and marks
both the requested position and sampled cell. New requests cancel stale inspection
requests and clear previous measurements.

Next.js proxies same-origin /api requests to FastAPI; the browser needs no separate
CORS configuration. Scientific layer metadata, legends and source identifiers come
from the backend. Desktop scientific controls occupy a collapsible left tool rail;
mobile controls flow below the map.
Development servers bind to loopback. Playwright starts both servers and validates
the real data-to-UI flow, navigation and failure recovery. Pure numerical functions
remain usable outside the web application for future scientific tools.

Mission definitions use discriminated Pydantic asset schemas. SQLite stores each
scenario as a validated versioned JSON aggregate; edits hold an immediate transaction
and compare revisions before replacing it. This keeps simultaneous browser edits
from silently overwriting one another. Definitions and local database files stay
separate from immutable scientific rasters. No extra database server is required.
The pure Python simulation module consumes a validated definition and explicit
interval inputs. A synchronous API call runs bounded local work (100000 asset-
intervals maximum), then stores a run with immutable input/source snapshots and
hashes. Scenario revisions are rechecked before publishing the result. No worker
queue is needed for this bounded model; longer computations can later use the
same numerical function behind a job runner.

React treats API responses as the authoritative saved state. Independent asset and
mission drafts survive unrelated saves; explicit reopening resets them after a
discard confirmation. Changing the saved revision invalidates displayed results.
Playback selects one Python result interval used by every chart and telemetry panel;
it does not calculate power or battery state in JavaScript. Mobile section links
retain access to the scientific map, tools, inspector and computed timeline.

Global exploration uses a separate bounded NASA preparation command and service.
Its coarse native elevation supports global inspection without expanding local
construction analysis. Three.js loads only in an active 3D viewport; 1k imagery
precedes 4k, and a fixed 1-degree mesh samples the verified 0.25-degree DEM. No
high-resolution planetary streaming engine or hosted account is required.

The root Explorer owns location, camera, scenario and simulation context. Regional
and mission controls stay mounted while hidden, preserving drafts; the GPU viewer
is disposed on exit and reconstructs its saved camera on return. A synchronous
lunar footprint check prevents rapid switches from showing an unrelated region;
backend coverage remains authoritative for availability and nodata. At-rest frames
do not redraw the GPU. Camera/texture changes invalidate the view, and controls,
geometry, materials, textures, observer and WebGL context are released on cleanup.
See [global data](global-data.md) and [Phase 3 plan](phase3-plan.md).

Implementation references:

The Phase 4 atlas registry and numeric services supplement the legacy polar and
global stores. File-backed native arrays avoid loading the 32-pixel/degree DEM
into Python memory. Derived slopes and browser tiles have independent caches;
numeric queries always use original values. The same Three.js mesh supports
progressive scientific tiles and a synchronized comparison reveal. See
[atlas data and rendering](atlas-data.md) for limits and coordinate conventions.

Scenarios retain their saved domain: `south-pole` resolves the original projected
terrain service, while `global-atlas` resolves the best verified global numeric
grid. Location validation and provenance occur through this shared API boundary;
the deterministic energy engine is unchanged. The additive domain uses the existing
schema/versioned SQLite aggregate and revision checks. Global runs snapshot the
source definition and numeric artifact hashes. Changing dataset versions requires
reviewing/recreating a scenario before rerunning. Atlas availability remains
independent of polar cache availability.

The mission globe reuses the scientific overlay renderer and camera context.
Hypothetical asset sprites are screen-sized symbols at lunar coordinates, with
selection, tooltips and map movement. Their position samples the coarse visual
LOLA mesh, while placement validity and the inspector use native numeric data.
They describe neither hardware footprints nor validated terrain clearances.

Discovery providers register exact verified PDS collection identifiers separately
from numerical dataset definitions. Bounded member requests produce integrity-
checked metadata snapshots without acquiring or auto-registering scientific values.
The catalog can preview acquisition budgets and browse original labels/files.
This separates discovery from calibration, processing and ready-state registration;
provider-specific validation remains necessary before any numerical integration.

Settlement screening is independent Python computation exposed through the typed
atlas API. It uses native numerical terrain and registered environmental rasters,
never rendered colors. The browser owns editable screening settings and the last
report at the application root, so switching activities preserves candidates.
Candidate selection uses the existing shared lunar location and scenario APIs.
Source/evidence groups prevent comparisons across different supporting grids.
See [the screening method](settlement-screening.md).

Explore's basic inspector explicitly requests `dataset=best`: native 240 m polar
terrain inside its footprint, otherwise the best prepared global grid. Nodata
remains nodata. Existing `auto`/explicit dataset API defaults and mission snapshots
retain their global semantics. Numerical point measurements can be finer than
the global color visualization, and the UI identifies that difference. The global
tile renderer chooses a complete visible level within its bounded texture budget,
including at poles, rather than discarding longitude wedges.

- [Rasterio masks](https://rasterio.readthedocs.io/en/stable/topics/masks.html)

The targeted workspace refactor extracts `MissionWorkspace` (layout ownership),
`ScenarioControls` and `InfrastructureCatalog`. Explorer retains the existing
scenario/simulation hooks and geographic state. One contextual panel resizes the
map; tools and inspectors stay mounted while hidden so input drafts survive.
Mobile contextual disclosure selects a full-width task sheet. The inspector has one outer
scroll container instead of nested scientific/asset scroll areas.

Timeline starts compact. Playback, the selected interval, interval-average power
and battery state at interval end stay visible without charts. Expanding details
preserves playback/index and reveals a single bounded scroll area; its collapse
control remains outside that area. Chart power is kW; whole-mission energy totals
are kWh. All values use the same stored Python simulation result as the inspector.
On small screens expanded charts occupy a task pane; collapsing restores the map.

Settlement handoff uses the existing shared lunar location. A focused mission
creation panel shows its coordinates and evidence qualification; no scenario is
created or repositioned until the user submits the existing API action. Only a
successful creation opens the infrastructure catalog. Saved missions, placement
and simulation inputs have direct contextual actions; Advanced opens the complete
tool set. Disclosure uses hidden mounted sections, preserving draft ownership and
revision checks. Simulation inspection suppresses duplicate site panels while
showing calculated telemetry; terrain evidence remains available in Build/Explore.
The new-mission name draft is separate from the open scenario's name, preventing
candidate creation from enabling a rename/save action on the previous mission.

Scientific rendering reads numeric-derived PNGs independently of point queries.
Alpha is checked before tiles can be reported as rendered, and readiness follows
a renderer draw. Environmental metadata reports local preparation explicitly.
Fragment coordinates use the same lunar graphics-axis permutation as markers;
polar tile extents account for longitude convergence. Global cache budget stays
32 tiles, with up to 96 for bounded environmental views (~24 MiB RGBA). Original
nodata and real radial source patterns are retained; texture colors never provide
numeric measurements.
Interaction redesign (2026-10): `Explorer` owns one `menu` and one `drawer` state
for Build/Simulate (`MissionWorkspace` renders slots; drafts stay mounted), and
`GlobalExplorer` owns the same pair for Explore. `useAtlasCatalog` loads registered
layers/datasets once for both. `LocationPanel` renders one `/atlas/inspect?dataset=best`
sample everywhere. Screening scores and neighborhood cells come from Python
(`services/screening_score.py`, `POST /atlas/suitability/neighborhood`). Playback
explanations are formatted from stored intervals by `lib/power-flow.ts`; rover
positions come from `simulation/rover.py` via each stored interval.
`lib/surface-layers.ts` builds globe markers, candidate rings, rover routes and
analysis grids; none of these geometries is a measurement source.

- [Rasterio reprojection](https://rasterio.readthedocs.io/en/stable/topics/reproject.html)
- [PyProj axis order](https://pyproj4.github.io/pyproj/stable/api/transformer.html)
- [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [OpenLayers projections](https://openlayers.org/en/latest/apidoc/module-ol_proj_Projection-Projection.html)
