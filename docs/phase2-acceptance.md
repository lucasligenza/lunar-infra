# Phase 2 acceptance evidence

Phase 2 implements hypothetical infrastructure planning and deterministic energy
simulation on the preserved NASA south-pole map. No optimization, AI, 3D deployment
or public hosting was introduced. Validated time-dependent NASA illumination remains
unavailable in this integration; mission runs use explicitly labeled synthetic or
user-defined hypothetical electrical factors.

## Functional acceptance

| Requirement | Implementation and evidence |
| --- | --- |
| Preserve scientific map | Original lunar polar projection, NASA elevation/slope/average visibility, provenance, nodata and error handling; original six browser tests and scientific suite remain passing. |
| Improve interface | Mission header, collapsible tool rail, dominant interactive map, contextual inspector, responsive navigation and expandable computed timeline. Desktop/mobile screenshots reviewed. |
| Create and reopen scenarios | Versioned SQLite definitions, site/region, UTC mission inputs, source identifiers, model version and revisions; restart persistence and migration tests. |
| Place/configure infrastructure | Habitat, solar array, battery, communications and robot schemas; map symbols, base marker, backend-validated coordinates and editable parameters with units. |
| Edit/move/remove | Validated asset patches, map relocation and confirmed removal; browser round trip compares saved API state. Invalid placements preserve saved state. |
| Save/duplicate/delete | API-authoritative state, independent draft handling, explicit reopen/discard confirmation, duplicate IDs and confirmed deletion. Concurrent stale revisions return 409 without overwriting newer edits. |
| Reproducible engine | Pure Python `energy-1.0`, explicit interval inputs, deterministic dispatch, repeatable result/input hashes and immutable run snapshots. |
| Editable simulation | UTC period, integer time step, electrical input factors, habitat profiles, battery limits/efficiencies and other asset assumptions; missing/non-finite inputs fail validation. |
| Run from UI | Saved revision submitted to Python simulation API; unsupported missing profiles show actionable errors. No numerical energy logic in React. |
| Actual timeline/telemetry | Charts, scrub/play/pause/speed, chart windows, event selection and per-asset telemetry consume one selected result interval. Saved current runs reopen; edits clear stale output. |
| Battery/power constraints | Capacity, reserve, charge/discharge power, efficiency losses, curtailment, unmet demand and exact within-interval shortage events are calculated and tested. |
| Scientific honesty | NASA map quantities retain source/units; assets and temporal factors are hypothetical. Average visibility is never converted into an invented sunlight cycle. |
| Regression coverage | Mathematical, API, persistence, actual-data and desktop/mobile browser checks described below. |
| Git workflow | Seven coherent implementation milestones with progress updates and ordinary pushes; confirmed remote validation recorded in PROGRESS.md. |

## Validation performed on 2026-09-30

- `uv run pytest`: **69 tests plus eight subtests passed**, with actual registered
  NASA rasters and no skipped integration checks.
- `npm run typecheck` and `npm run build`: passed.
- `npm test`: **10 Chromium tests passed**, covering original map features,
  infrastructure workflows, current saved runs, telemetry/API agreement, playback,
  UTC/custom factors, missing values, stale revisions, independent drafts and
  mobile navigation.
- Energy tests independently verify conservation, bus power balance, efficiencies,
  capacity/reserve/power limits, zero generation, variable inputs, inactive assets,
  step refinement and 30 seeded randomized configurations. Regression coverage
  includes fractional battery-limit events and consistent power/energy tolerances.
- Simulation API tests cover immutable results after edits, repeated hashes, restart
  persistence, corrupt snapshots, schema migration and cascade deletion.
- GitHub Actions repeats acquisition of pinned NASA products and all checks on a
  fresh Linux runner. [Run 36729018094](https://github.com/lucasligenza/lunar-infra/actions/runs/36729018094)
  **passed** for `f93ba88`, including fresh NASA acquisition and the full scientific,
  persistence, energy, build and browser checks. All seven implementation milestones
  are pushed; the complete milestone history is in [PROGRESS.md](../PROGRESS.md).
- The final production frontend and API proxy return HTTP 200. Readiness confirms
  verified scientific data; inspection at -89.5 degrees latitude, 0 degrees longitude
  returns the real -705 m elevation sample. The scenario endpoint is available.

## Remaining scientific and operational limits

The model uses a common ideal electrical bus and a shared hypothetical factor for
all arrays. Spatial shadows, thermal coupling, degradation, voltage dynamics and
optimized dispatch are absent. UUID order is the documented dispatch priority.
The 240 m DEM cannot establish footprint-scale safety or detailed construction
suitability. Average solar visibility remains a spatial map layer, not a mission
time series. Read [scientific assumptions](scientific-assumptions.md) and the
[energy model](energy-model.md) before interpreting output.

Servers bind to loopback; this is a local planning application without multi-user
authentication. SQLite mission files and generated results are ignored by Git.
Back up the local database separately if scenarios must survive workspace removal.
