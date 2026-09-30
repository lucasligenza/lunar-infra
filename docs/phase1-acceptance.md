# Phase 1 acceptance evidence

Local validation completed on Windows with locked Python and npm dependencies.
GitHub Actions repeats acquisition, scientific tests, type checks, production
build and browser integration on Linux. Its initial remote result is pending
when this report is committed; local results are not a claim of remote success.

| Requirement | Implementation and evidence |
| --- | --- |
| Straightforward startup | README includes installation, data preparation and two-terminal startup. Browser tests also start both servers from a stopped state. |
| Reproducible NASA acquisition | Pinned source labels, byte sizes and SHA-256 hashes in data/polar-sources.json; pipeline validates labels, GDAL metadata and lunar CRS. Real processing repeats identically. |
| Actual south-pole terrain map | OpenLayers georeferences the prepared LOLA raster in lunar polar meters, covering a 96 x 96 km region. No Earth basemap is used. |
| Map navigation | Browser tests exercise pan, zoom, reset and scientific layer controls. |
| Actual location selection | Clicks and coordinate entry request the API; a marker and sampled-cell outline show their relationship. |
| Corresponding elevation | Real pipeline test compares every cropped elevation pixel with the original source. API and browser tests compare inspected values with registered pixels and displayed values. |
| Derived local slope | Central differences use physical reference-sphere distances, projection scale and a valid five-cell stencil. Tests cover flat/tilted surfaces, anisotropic pixels, boundaries and nodata. |
| Compatible solar layer | Actual AVGVISIB modeled fractions are validated and area-averaged to the terrain grid. Tests cover shifted origin, complete coverage, masks and alignment. |
| Sources and units | Typed API quantities and inspector identify product, measured/derived/modeled kind, units, methods, spatial support and periods. |
| Invalid/unavailable data | Tests cover coordinate validation, outside bounds, nodata, valid zero, absent/corrupt data and PNG transparency; browser tests cover stale-value clearing and API/raster retry. |
| Scientific tests | 33 Python tests and eight additional subtests pass locally, with real-data integration tests executed rather than skipped. |
| Frontend/backend integration | Six Chromium tests pass with actual processed NASA data; JavaScript lunar transforms match PyProj. No runtime page errors in the main integration test. |
| Documentation | README, architecture, API, acquisition/provenance and scientific assumptions describe current behavior and limitations. |
| Incremental Git workflow | Scientific ingestion, processing, API and frontend were committed and pushed separately. PROGRESS.md records published milestones. |

Frontend type checking and production build pass. Desktop and mobile screenshots
were inspected, and the controls remain usable without horizontal page overflow.

## Scientific limits

Elevation is NASA gridded/interpolated LOLA altimetry relative to a 1,737.4 km
reference sphere. The 240 m grid and 480 m slope baseline support regional terrain
exploration; they do not establish landing safety or engineering suitability.

Solar visibility is modeled frequency of any solar-disc visibility over roughly
18.6 years at hourly timesteps. It is not instantaneous sunlight, irradiance or
power generation. Exact model calendar dates are unspecified, and the illumination
product uses an older underlying terrain release. These limits appear in the API,
UI and scientific assumptions. No thermal, infrastructure, optimization or AI
features were added.

## Repeating validation

Follow README installation and data preparation, then run `uv run pytest` from
the root and `npm run typecheck`, `npm run build`, `npm test` from frontend.
Install Chromium first as documented. The CI workflow performs the same steps
on a fresh runner, downloading about 80 MB of pinned scientific data. An archive
outage or integrity mismatch fails acquisition explicitly and never substitutes
generated observations.
