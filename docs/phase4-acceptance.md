# Lunar Atlas acceptance evidence

Phase 4 adds real global terrain analysis and scientific layers to the existing
Three.js globe. Polar science, SQLite scenarios, the Python energy engine and
playback remain. No AI or optimization is included.
Core acceptance is verified locally and in [GitHub run 36796269865](https://github.com/lucasligenza/lunar-infra/actions/runs/36796269865)
for published functional commit `747bc46`: fresh acquisition, 91 tests plus eight
subtests, frontend typecheck/build and all 28 browser tests passed without skips.

## Functional coverage

| Requirement | Implementation and evidence |
| --- | --- |
| Global geographic exploration | Preserved orbital navigation, near/far sides, poles, picking and verified destinations. |
| Native global elevation | Pinned GLD100 32 ppd PDS array with LOLA polar fill; original values/special codes checked against the source. Prepared LDEM_4 remains independently selectable. |
| Global elevation and slope coloring | Registered progressive geographic tiles color the existing 3D triangles, with opacity, legends, source/version and synchronized imagery reveal. PNG colors never supply measurements. |
| Global numerical slope | Physical lunar distances, latitude-dependent east spacing, periodic longitude and complete valid central-difference stencils. Polar boundary rows remain missing. |
| Sectors | Six cube faces and 6/24/96-sector navigation, fly-to, globe highlighting and persisted browser favorites. Named landmarks, sectors and rendering tiles remain separate. |
| Arbitrary areas | Selected-location radius or wrapped geographic box, selectable source and visible outline; work capped at two million candidate cells. |
| Regional statistics | Native min/max, spherical-area-weighted mean, relief and weighted slope histogram. Masks, fractional box intersections and circle boundary approximation documented. |
| Profiles and exports | Shortest lunar great-circle native samples, missing gaps, explicit oversampling, sample inspection, JSON area reports and CSV profiles. Exact endpoint regression tested. |
| Provenance | Typed catalog with instrument/mission, original source/citation, version, periods, coverage, spacing, units, lunar frame, cache/readiness and limitations. Processed artifacts have hashes/methods. |
| Additional science category | USGS 2020 v2 geology: original 12,247 polygons, Moon 2000 projection, 49 classes/colors/descriptions, categorical queries and 3D layer. Iohs/Ios source discrepancy retained. |
| Reusable registration/discovery | Independent source/layer registries, bounded PDS and ZIP-member preparation, generic bounded PDS collection discovery and integrity-checked metadata snapshots. |
| Earlier features preserved | Actual 240 m polar terrain/average visibility, five assets, SQLite revisions, immutable energy runs, battery calculations and playback. Global hypothetical missions now use native terrain independently of polar cache availability. |
| Responsive rendering | Lazy 3D loading, smaller imagery first, camera-selected tiles, four concurrent requests, 32 retained tiles, cancellation/disposal and idle draw suppression. Missing tiles retain query availability and can be retried. |
| Actual visual review | Elevation/slope/geology globes, region statistics/profiles, live NASA PDS catalog and computed missions inspected at desktop/laptop/mobile sizes; loading, missing data and panels/transitions tested. |
| Incremental delivery | Sources/queries, overlays, regions/profiles, geology, global missions and discovery separately committed and pushed. PROGRESS.md records hashes and CI evidence. |

## Validation

`uv run --locked pytest -q`: **91 tests and eight subtests passed**. Checks cover
source preservation/reproducibility, projection/alignment, analytic slopes at
different resolutions, seams/poles, nodata, numeric-to-color consistency, API
schemas, corrupt/unavailable files, bounded acquisition/discovery and existing
energy conservation/persistence. Geology samples are independently compared with
source polygon intersections at registered cell centers in both hemispheres/poles.

`npm test`: **28 Chromium tests passed**. Actual prepared NASA/USGS data supply
terrain/classification checks. Tests cover native inspection, layers/legends/reveal,
sectors/favorites, region analysis/exports, source changes, asset/coordinate round
trips, scenario drafts/persistence/playback and loading/failure recovery. Synthetic
protocol fixtures supply no thermal values. Separately, live NASA requests returned
18 Diviner GCP products, and their real catalog interface was visually reviewed.
Final frontend typecheck and production build pass. After the final rendering fix,
12 focused browser/visual checks and six global mission/mode/recovery checks pass.
Three further workflows against the optimized production frontend verify native
queries/source changes, USGS geology and saved global mission placement/playback.
The production same-origin health and atlas inspection endpoints return real data.

Final screenshots at 1440 x 1000, 1280 x 800 and 390 x 844 show readable profiles,
scrollable atlas content and unobstructed camera controls. The review found dark
compositing artifacts beneath floating controls; separate translucent compositing
removed them in subsequent actual renders without increasing idle redraws.

The discovery milestone's first CI run found a test selector matching the same CRS
text in the inspector and hidden catalog entries. It now targets the measurement
inspector; no scientific test or failing feature was bypassed. Final remote
validation, including fresh scientific acquisition, is recorded in PROGRESS.md.

## Local performance observations

Two Chromium runs against local development/API servers, prepared products and a
warm disk tile cache recorded first imagery in **0.35–0.39 s**, the fully prepared
4k/LOLA view in **2.95–3.57 s**, elevation overlay ready/painted in **1.75–2.04 s**,
and an Apollo-region flight in **1.38–1.43 s**. Orbit retained/visible tiles were
10/8; regional tiles were 32/24; settled requests were zero active/queued.
After the final visual fix, another run recorded 0.34 s first imagery, 2.99 s full
view, 1.53 s elevation overlay and 1.42 s Apollo flight with the same resource counts.

These observations are from one local browser, not cross-device FPS or cold-network
benchmarks. Data acquisition is setup work, excluded from those timings. Diagnostic
attributes report actual draw calls, tile/request counts and renderer resources.
Disabling a layer releases its tiles; the browser suite checks this explicitly.

## Limits and unavailable integrations

Geometry remains the coarse 1-degree LOLA mesh. More detailed coloring does not
increase physical terrain detail. Selected GLD100 cells are about 948 m at the
equator; the original product's nominal 100 m spacing, roughly 300 m resolved
detail and published accuracy do not describe this downsampled grid. Frames are
nominally registered on the 1737.4 km sphere; surveyed control-network transforms
and construction/landing safety are not claimed.

Geology is an interpretive 1:5,000,000 map rasterized at 16 ppd, not proof of an
extractable resource or precise engineering contact. Radius areas select native
cell centers and approximate boundary fractions. Distances/areas use the reference
sphere without surface-relief correction. Missing stencils remain missing.

Thermal, mineralogical, resource-indicator and gravity numerical layers remain
unavailable. Diviner metadata is discoverable; PDS3/PDS4 longitude descriptions
differ, so numeric axes/nulls/calibration require validation. Large thermal batches
were not acquired. M3 access fails; other archives need a selected validated
product/adapter. See [discovery findings](dataset-discovery.md).

No validated time-dependent NASA illumination is integrated. Average polar
visibility cannot supply eclipse intervals. Power runs require explicit synthetic
or user-defined hypothetical series and preserve their assumptions/source snapshots.
