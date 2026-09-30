# Phase 3 acceptance evidence

Phase 3 adds credential-free global lunar exploration and connects it to the
preserved polar scientific analysis and hypothetical mission designer. Cesium Moon
was investigated first; its hosted account/content requirements were not established
for this project. The implemented Three.js viewer uses verified NASA SVS imagery
and native PDS LOLA elevation. See the [audit and decision](phase3-plan.md).

## Functional acceptance

| Requirement | Implementation and verification |
| --- | --- |
| Cohesive interface | Shared mission header, restrained dark instrument surfaces, compact search/camera tools, contextual drawers, collapsible local panels and computed timeline. Actual screenshots reviewed. |
| Entire Moon in 3D | True-scale lunar sphere displaced from LDEM_4, progressive 1k/4k NASA visualization imagery and orbital controls. No Earth basemap or Earth ellipsoid. |
| Near/far sides and poles | Drag, pan, bounded zoom, reset and arc-interpolated fly-to; tests visit both poles and the far-side SPA overview. Flights avoid crossing the planet. |
| Select and inspect | Surface ray picking and keyboard center selection convert graphics positions to lunar coordinates; API returns original coarse elevation and explicit coverage. |
| Destinations | South pole, Shackleton, north pole, Apollo 11/Tranquillitatis region, Tycho, Copernicus and SPA overview. Search, source links, rounded coordinates and precision notes are present. |
| Global/regional modes | Shared geographic selection and restored camera; unsupported regions show a coverage panel. A delayed-coverage regression proves an immediate mode switch does not display an unrelated local map. |
| Polar science survives | Original OpenLayers lunar projection, elevation, slope, average visibility, native masks, API contracts and scientific tests preserved. |
| Mission scenarios survive | SQLite definitions, five asset types, validation, saved revisions, immutable simulations, numerical energy logic and playback preserved. |
| Engineering connection | Shackleton/global selection opens actual local inspection; asset/base markers use the same coordinates. Scenario/configuration drafts and selected simulation interval survive mode changes. Hidden playback pauses. |
| Real-data measurements | Global and local elevation come from separately identified native NASA products. Mesh interpolation, fixed display lighting and color textures never supply measurements. |
| Unknown data | Missing/corrupt global files, failed terrain and outside/nodata/unavailable local coverage are explicit; no scientific fallback. NASA temporal illumination remains unavailable. |
| Responsive operation | Desktop, laptop and phone layouts reviewed; panels close, maps expand and phone controls remain usable without horizontal overflow. Heavy GPU view is lazy loaded and disposed on exit. |
| Regression tests | Full Python suite, existing browser workflows and seven added navigation/state/usability browser tests pass locally. Typecheck and production build pass. |
| Rendered visual verification | Before/after screenshots and all three modes inspected, including selected/unselected globe, open/closed panels, actual simulation results, loading and missing-data states. |
| Incremental delivery | Five implementation/audit milestones pushed with progress updates; remote validation is recorded below. No datasets, SQLite files, credentials or screenshot artifacts committed. |

## Validation performed on 2026-09-30

- Python: **71 tests plus eight subtests passed**, with the prepared NASA products
  and no skipped integration checks. New tests verify native global sample
  preservation, deterministic preparation, poles/seam, nodata, corruption, typed
  API responses and independent local coverage. Existing science, persistence,
  energy conservation and simulation API tests remain passing.
- Frontend: **17 Chromium tests passed**, `npm run typecheck` and `npm run build`
  passed. The strengthened delayed-coverage regression also passed in isolation
  after the final guard change. Browser checks use the actual prepared NASA data;
  isolated network-failure fixtures are clearly failure-state tests.
- Geographic checks compare graphics conversions, native global pixel sampling
  and the existing PyProj-backed local projection. Actual rendered asset-marker
  positions round-trip to the saved backend coordinates.
- Mode integration creates an isolated scenario, edits drafts, switches modes,
  saves, runs the Python simulation, scrubs real results and checks displayed
  telemetry against API values. Tests remove only their own scenario fixtures.
- Camera tests cover orbital drag, pan, keyboard selection, zoom boundaries, reset
  and stable draw counts at rest. Navigation/search reaches every destination.
- GitHub fresh-data validation **passed** in
  [run 36773865632](https://github.com/lucasligenza/lunar-infra/actions/runs/36773865632)
  for `5c53d23`: pinned NASA acquisition, all Python tests, typecheck, build and
  all 17 Chromium tests. The four preceding Phase 3 milestones have successful remote runs;
  see [PROGRESS.md](../PROGRESS.md) for the published milestone history.
- Final production-build Chromium verification loaded the real globe, switched
  global/regional/mission modes and returned with zero browser JavaScript errors.
  Root, same-origin health/global/destinations/inspection/scenario endpoints return
  HTTP 200. Seven destinations are present; the original -89.5 latitude / 0 longitude
  inspection remains -705 m from LDEM_75S_240M. Both servers are bound to loopback.

## Visual and performance observations

Actual Chromium screenshots were captured at 1440 x 1000 (desktop), 1280 x 800
(laptop) and 390 x 844 (phone). The initial Phase 2 UI was inspected before changes.
After implementation, inspection covered the global overview, selected Shackleton,
global mission markers, connected polar analysis, computed mission timeline,
mobile destination/layer drawers, collapsed local panels and loading/missing data.
Visual review found and corrected oversized global markers, button contrast,
phone introductory text over the Moon and a region toggle over layer information.
Temporary screenshots remain ignored, rather than part of the shipped data.

The local phone-viewport browser run measured **0.25 seconds from renderer creation
to the first decoded texture**. This excludes page startup/metadata and is not a
physical-phone or universal device benchmark. Prepared globe payloads total
4,534,061 bytes: 148,450-byte initial JPEG, 2,312,011-byte finer JPEG and
2,073,600-byte native elevation. The viewer becomes interactive with the smaller
texture and loads finer imagery and terrain progressively.

The fixed mesh has approximately 65,000 vertices / 130,000 triangles at 1-degree
spacing. Pixel ratio is capped at 1.5. Controls continue checking for interaction
on animation frames, but the GPU draws only after view/data changes; the idle
regression observes stable draw counts. Geometry, materials, textures, controls,
observer and WebGL context are disposed on leaving the globe. No general FPS or
GPU-memory claim is made without a representative hardware benchmark.

## Scientific and operational limits

Global source elevation is 0.25 degrees (about 7.58 km per pixel at the equator),
visual mesh spacing is 1 degree and imagery is at most 4096 x 2048. There is no
streamed high-resolution global surface or construction-scale analysis beyond the
prepared 96 km south-pole region at 240 m. A globe location can be viewable without
supporting local engineering tools. Gazetteer destinations are approximate atlas
navigation centers, not surveyed DE421 site coordinates.

NASA's color texture includes adjusted color, polar albedo fill and inpainting;
display lighting is fixed for inspection, not calculated sunlight. The aligned
polar illumination layer is a long-term modeled visibility fraction. It cannot
produce a mission time series. Simulations continue using explicitly hypothetical
inputs and retain the omissions documented in the [energy model](energy-model.md).
Neither coarse nor 240 m terrain establishes landing/construction safety.

Start both pipelines and both local servers as described in [README](../README.md).
Servers bind to loopback; no public deployment or multi-user authentication was
introduced. Local mission files need separate backups. No hosted content account,
subscription, AI agent or optimization subsystem was added.
