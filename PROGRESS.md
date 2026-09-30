# LunarOS progress

## Current development phase

Phase 2: infrastructure simulation and mission control. Phases 3-4 excluded.
All local Phase 2 acceptance checks pass; final publication/remote CI confirmation
is the active handoff task. Real-data temporal illumination is not integrated.

## Completed milestones

- 9ed94f6 (pushed): verified global LOLA overview ingestion and initial architecture.
- 5933d31 (pushed): scientific monorepo foundation and real south-pole pipeline.
  NASA polar elevation and quantitative modeled illumination; bounded crop,
  CRS validation, nodata masks, local slope and aligned solar visibility.
- ab54689 (pushed): typed scientific inspection service, FastAPI endpoints,
  georeferenced PNG layers, readiness checks and explicit scientific error handling.
- 19d1437 (pushed): Next.js/OpenLayers lunar map, scientific layer controls,
  interactive selection, inspector, provenance, responsive layout and error recovery.
- d06426b (pushed, CI passed): acceptance evidence and GitHub scientific/browser
  validation on a fresh Linux runner with actual NASA acquisition.
- Final documentation milestone: record confirmed acceptance and remote validation.

## Active milestone and features in progress

Phase 2 milestone 1 b033422 pushed: audit and mission-control layout.
Milestone 2 ff5035b pushed: typed assets, SQLite scenarios and validated CRUD API.
Milestone 3 b180a1a pushed: scenario explorer and interactive asset placement.
Milestone 4 f3a9e76 pushed: deterministic energy engine and numerical tests.
Milestone 5 084b39c pushed: simulation API and immutable stored runs.
Milestone 6 21c85e4 pushed: explicit mission inputs, computed telemetry, charts and playback.
Milestone 7: final regression fixes, responsive navigation and acceptance evidence.

## Validation results

- Final Phase 2 suite: 69 Python tests plus eight subtests pass; all 10 Chromium
  tests, TypeScript validation and production build pass. Actual NASA integration
  checks run without skips. New regressions cover missing/non-finite input factors,
  custom UTC missions, concurrent edit conflicts, independent drafts surviving
  unrelated saves, explicit reopen resetting drafts, corrupt run schemas and
  consistent shortage tolerances. Small-screen section navigation is tested.
- All six preceding Phase 2 commits have successful GitHub validation. Latest
  confirmed [run 36725728488](https://github.com/lucasligenza/lunar-infra/actions/runs/36725728488)
  passed for 21c85e4. Final regression milestone remote validation is pending push.
- Playback browser test compares API results to displayed generation/load/SOC and
  shortage telemetry; tests interval scrubbing, speed/play/pause, chart window,
  collapse/expand, stale-result clearing and reopening a current saved run.
  Desktop and mobile simulation screenshots reviewed; no horizontal overflow.
  All eight browser tests, frontend typecheck and production build pass.
- Simulation API milestone: full suite passes 66 tests plus eight subtests.
  Runs reopen after restart, repeated inputs have identical results/hashes,
  later edits preserve snapshots, stale revisions/missing profiles are rejected,
  corruption is detected and schema migration/cascade deletion are verified.
- Energy engine: 15 numerical tests pass, including 30 seeded randomized balance
  cases, exact fractional-interval shortage onset, step refinement, stable multiple
  battery dispatch, efficiencies, all storage limits, inactive assets and invalid
  input/precision rejection. The preceding full suite passed 60 tests; three new
  regressions also pass (63 total tests now present).
- Infrastructure browser integration covers create/place/edit/move, invalid
  placement preserving saved state, reload/reopen, duplicate and confirmed removal.
  Configuration saves show the backend revision; unsaved edits are explicit.
  All seven Chromium tests, typecheck and production build pass. Infrastructure
  screenshot reviewed: real map, base marker, selected asset and editable units.
- Scenario milestone: 48 Python tests plus eight subtests pass, covering restart
  persistence, all asset types, duplication, deletion, invalid/nodata locations,
  invalid batteries/time axes and simultaneous revision conflicts/rollback.
- Phase 2 audit/layout: 33 Python tests plus eight subtests, six browser tests,
  typecheck and production build pass. Added tool-collapse coverage passes.
  Desktop screenshot reviewed; map remains unobstructed and controls functional.
- 33 tests pass, with eight additional unittest subtests. No failures or skipped
  real-data integration tests in this environment.
- Analytic projection comparisons, pole and coordinate validation, half-open bounds,
  known planes, nodata stencils, anisotropic pixels, CRS variants and grid alignment.
- Real-data processing repeats identically and preserves every cropped elevation
  sample. Output rasters align exactly; illumination resampling is tested.
- API tests cover typed responses, valid zero, nodata, invalid/outside queries,
  missing/corrupt files, OpenAPI schemas and PNG transparency. A real API query
  matches its registered GeoTIFF pixel exactly.
- Region: 400 x 400 cells; elevation -4242.5 to +1954.5 m; maximum slope 35.1239 deg.
  All 160000 cells are valid in each layer.
- Six Chromium browser tests pass using actual prepared NASA rasters, including
  cold startup of both servers, JS/PyProj transform parity, click/form inspection,
  all layers, pan/zoom, provenance, mobile layout, outside-region and API/raster retry.
- Frontend TypeScript validation and production build pass. Desktop and mobile
  screenshots were inspected; controls remain usable without overlap.
- [GitHub run 36715026163](https://github.com/lucasligenza/lunar-infra/actions/runs/36715026163)
  passed for d06426b on 2026-09-30: fresh NASA acquisition, 33 Python tests and
  eight subtests, frontend type checking/build and six Chromium tests. No skips.
- Local production frontend and API readiness/proxy return HTTP 200 and the
  real -705 m sample at latitude -89.5, longitude 0.
- Rasterio emits affine multiplication deprecation warnings internally. Local code
  uses the supported matrix operator; numerical results are unaffected.

## Dataset integration status

- LDEM_75S_240M V2.0: 29062688-byte polar DEM, observations 2009-07-13 through
  2017-02-02. Crop retains the native 240 m grid over a 96 x 96 km pole region.
- AVGVISIB_85S_060M_201608 V1.05: 51166728-byte modeled solar visibility, native
  60 m, area-averaged to the exact terrain grid. NASA describes hourly modeling
  over 18.6 years; exact simulation calendar dates are unspecified.
- data/polar-sources.json pins source URLs and hashes. Raw and processed rasters
  and their local registry are ignored. Moon sphere and ME/PA DE421 frame validated.

## Known scientific limitations and blockers

No current implementation blocker. 240 m slopes cannot resolve landing hazards.
Illumination is modeled long-term visibility and uses older underlying terrain.
Time-dependent NASA illumination is not integrated, so real-data mission playback
is unavailable. Energy runs use explicitly labeled hypothetical factors; the model
omits thermal coupling, degradation and spatial shading. See scientific-assumptions.md
and docs/energy-model.md. SQLite scenarios/results are local and excluded from Git.
Git writes and outbound networking require elevated execution in this environment.

## Latest successful commit

Latest confirmed published milestone: 21c85e4.
Current milestone: fix: harden mission workflows and scientific input validation.
Resolve its hash with `git log -1 --format=%h -- PROGRESS.md`.
Push results and hashes are reported immediately after each successful push.

## Next development task

Push the final validated milestone, confirm fresh-run GitHub CI and record the
handoff. No Phase 3 work is authorized by this assignment.
