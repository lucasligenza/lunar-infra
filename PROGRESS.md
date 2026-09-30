# LunarOS progress

## Current development phase

Phase 3: global 3D Moon exploration, destinations and connected premium UI.
AI and optimization remain excluded. See docs/phase3-plan.md.
Phase 3 acceptance is verified locally and on GitHub, including actual rendered
review and the production build. See docs/phase3-acceptance.md for coverage limits.
Phase 2 acceptance checks pass locally and on GitHub with fresh NASA acquisition.
All seven Phase 2 implementation milestones are committed and pushed. Real-data temporal
illumination is not integrated; synthetic/custom hypothetical runs are explicit.

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

Phase 3 milestone 1 a07b772 pushed: audit and renderer/data investigation complete. Baseline
69 tests plus eight subtests and 10 browser tests pass; existing UI screenshots
captured and visually inspected. Cesium ion requires account/token and hosted
terms; Three.js plus NASA textures/validated global LOLA is the selected fallback.
Milestone 2 0a1b6a8 pushed: reproducible global NASA acquisition, coarse elevation/coverage API
and source-linked destinations implemented. Global preparation repeats identically
and retains every native elevation sample. Full suite: 71 tests plus eight subtests
pass, including two new global scientific/API tests. Native observation periods,
source hashes, nodata and separate visualization/analysis coverage are recorded.
Milestone 3 6ae6269 pushed, CI passed: Three.js global lunar terrain, progressive NASA imagery, surface
picking, source-linked destination search/fly-to, layer/camera controls and shared
mode shell implemented. Two new browser/coordinate tests pass; rendered initial
and selected-region screenshots inspected; marker sizing and button contrast fixed
after visual review. All 12 browser tests and production build pass. Idle rendering now occurs only when
the view changes; global navigation passes in 19.1 s on software Chromium.
Milestone 4 93f6435 pushed, CI passed: connected mode/scenario continuity implemented. Global selection
opens real local inspection; unsupported regions show a coverage state rather
than an unrelated map. Scenario drafts, assets, camera and selected simulation
interval survive mode changes; hidden playback pauses. Two added browser tests
pass, including actual rendered marker-coordinate checks. All 14 browser tests,
typecheck and production build pass. Regional, mission and
global-with-assets screenshots captured and visually inspected.
Milestone 5 5c53d23 pushed: responsive/failure-state review and camera regressions complete locally.
All 17 browser tests, typecheck and production build pass; the final rapid-switch
coverage guard also passes its focused regression. Laptop (1280x800), desktop
(1440x1000) and mobile (390x844) screenshots inspected. Mobile copy/panel overlaps
were corrected; missing/global-loading states and local panel collapse tested.
First decoded imagery measured 0.25 s from renderer creation on local Chromium;
at-rest draw counts remain stable. This is not a universal device benchmark.
Final fresh-run CI passed; acceptance documentation records the completed review.
The production application runs locally with verified NASA datasets.

Phase 2 milestone 1 b033422 pushed: audit and mission-control layout.
Milestone 2 ff5035b pushed: typed assets, SQLite scenarios and validated CRUD API.
Milestone 3 b180a1a pushed: scenario explorer and interactive asset placement.
Milestone 4 f3a9e76 pushed: deterministic energy engine and numerical tests.
Milestone 5 084b39c pushed: simulation API and immutable stored runs.
Milestone 6 21c85e4 pushed: explicit mission inputs, computed telemetry, charts and playback.
Milestone 7 f93ba88 pushed, CI passed: final regression fixes, responsive navigation
and acceptance evidence. Documentation handoff records confirmed remote validation.

## Validation results

- Phase 3 local suite: 71 Python tests plus eight subtests; 17 Chromium tests;
  TypeScript and production build pass. Delayed coverage also passes its final
  focused regression. Source integrity, actual coordinates/markers, destination
  navigation, camera limits, mode/scenario continuity and missing-data recovery
  are tested. Acceptance and rendered review are in docs/phase3-acceptance.md.
- All five Phase 3 implementation/audit commits have successful GitHub runs. Final fresh-data
  [run 36773865632](https://github.com/lucasligenza/lunar-infra/actions/runs/36773865632)
  for 5c53d23 passed: pinned NASA acquisition, 71 Python tests plus eight subtests,
  typecheck, production build and all 17 Chromium tests.
- Final production Chromium check: real globe loads; global/regional/mission
  transitions pass with zero page errors. Root and health/global/destinations/
  inspection/scenario proxies return HTTP 200; original elevation remains -705 m.
- Final Phase 2 suite: 69 Python tests plus eight subtests pass; all 10 Chromium
  tests, TypeScript validation and production build pass. Actual NASA integration
  checks run without skips. New regressions cover missing/non-finite input factors,
  custom UTC missions, concurrent edit conflicts, independent drafts surviving
  unrelated saves, explicit reopen resetting drafts, corrupt run schemas and
  consistent shortage tolerances. Small-screen section navigation is tested.
- All six preceding Phase 2 commits have successful GitHub validation. Latest
  confirmed [run 36725728488](https://github.com/lucasligenza/lunar-infra/actions/runs/36725728488)
  passed for 21c85e4. Final [run 36729018094](https://github.com/lucasligenza/lunar-infra/actions/runs/36729018094)
  passed for f93ba88: fresh pinned NASA acquisition, 69 Python tests plus eight
  subtests, frontend typecheck/build and 10 browser tests. No skips.
- Final production frontend and same-origin health/scenario endpoints return HTTP
  200; the API is ready with verified datasets and the real -705 m inspection sample.
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

- LDEM_4 V3.0: preserved native global 1440 x 720 int16 grid, 0.25 degrees,
  DN * 0.5 m on the same lunar sphere/frame. Global inspection and coverage API
  validate separately from the polar store. Observations 2009-2016.
- NASA SVS 4720 visualization: pinned 2019 1k JPEG/4k TIFF, dimension-preserving
  JPEG preparation. Adjusted color/polar fill are visualization only. Global
  browser payload is about 4.53 MB including native elevation, with small imagery
  first. data/globe-sources.json and data/ldem_4.json record hashes and provenance.
- LDEM_75S_240M V2.0: 29062688-byte polar DEM, observations 2009-07-13 through
  2017-02-02. Crop retains the native 240 m grid over a 96 x 96 km pole region.
- AVGVISIB_85S_060M_201608 V1.05: 51166728-byte modeled solar visibility, native
  60 m, area-averaged to the exact terrain grid. NASA describes hourly modeling
  over 18.6 years; exact simulation calendar dates are unspecified.
- data/polar-sources.json pins source URLs and hashes. Raw and processed rasters
  and their local registry are ignored. Moon sphere and ME/PA DE421 frame validated.

## Known scientific limitations and blockers

No current implementation blocker. 240 m slopes cannot resolve landing hazards.
Global elevation is coarse 0.25-degree data, rendered on a 1-degree mesh with at
most 4k imagery; no high-resolution global terrain streaming is implemented.
Detailed local analysis and infrastructure placement retain the prepared polar
footprint. Destination centers are rounded navigation aids, not surveyed sites.
Illumination is modeled long-term visibility and uses older underlying terrain.
Time-dependent NASA illumination is not integrated, so real-data mission playback
is unavailable. Energy runs use explicitly labeled hypothetical factors; the model
omits thermal coupling, degradation and spatial shading. See scientific-assumptions.md
and docs/energy-model.md. SQLite scenarios/results are local and excluded from Git.
Git writes and outbound networking require elevated execution in this environment.

## Latest successful commit

Latest confirmed published milestone: 5c53d23.
Current milestone: docs: record global explorer acceptance and coverage.
Resolve its hash with `git log -1 --format=%h -- PROGRESS.md`.
Push results and hashes are reported immediately after each successful push.

## Next development task

Phase 3 is complete within documented data/resolution coverage. Await the next
user-approved roadmap; no AI, optimization or new hosted service is authorized.
For a new session, follow README startup and read docs/phase3-acceptance.md.
