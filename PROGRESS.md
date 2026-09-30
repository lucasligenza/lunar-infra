# LunarOS progress

## Current development phase

Phase 1: Lunar Data Explorer, following the user's roadmap. Phases 2-4 excluded.

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

Phase 1 is complete and verified locally and on GitHub's fresh Linux runner,
including compatible modeled illumination integration. No active feature work.
See docs/phase1-acceptance.md for evidence.

## Validation results

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
No thermal data or power simulation is in this phase. See scientific-assumptions.md.
Git writes and outbound networking require elevated execution in this environment.

## Latest successful commit

Latest confirmed published and CI-validated implementation: d06426b.
Final record commit: docs: record verified Phase 1 completion.
Resolve its hash with `git log -1 --format=%h -- PROGRESS.md`.
Push results and hashes are reported immediately after each successful push.

## Next development task

None within the initial assignment. Phase 1 is complete. Await an explicit new
assignment before starting Phase 2; its infrastructure simulations remain unbuilt.
