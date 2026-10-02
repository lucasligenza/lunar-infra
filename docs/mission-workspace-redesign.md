# Mission workspace visual redesign

Baseline: `d852791`, clean main matching origin/main; previous CI passed. Scope
is frontend presentation and interaction only. Scientific services, the Python
energy model, persisted definitions and Three.js/OpenLayers remain unchanged.

## Observed baseline

Fresh Chromium screenshots of Build and Simulate were captured and inspected at
1440×900 and 1366×768 (ignored `artifacts/mission-before-*.png`). The header,
Mission tasks and toolbar use three competing rows. Simulation automatically
opens a 320px inspector duplicating the compact timeline telemetry. Disabled
save actions and revision labels compete with the mission context. Asset tools
have long descriptions and a full list instead of a compact placement palette.
This is observed rendered behavior, not a proposed scientific deficiency.

## Incremental implementation

1. Consolidate Explore / Analyze / Build / Simulate navigation in the header;
   provide a compact surface control shelf and contextual asset palette. Close
   default tools/inspectors and preserve hook-owned scenario/location state.
2. Refine selection-driven asset and site inspectors; disclose advanced metadata
   and provide one overlay control with honest availability/coverage guidance.
3. Extract compact simulation controls and a bounded detail drawer; retain
   playback interval, charts, input provenance and separate kW from kWh.
4. Inspect all requested sizes/states, run complete browser/Python/build checks,
   repair defects and record acceptance. Commit and push each verified slice.

Baseline validation: 106 Python tests and eight subtests; two real browser
baseline workflows pass. Screenshots, datasets, SQLite and caches stay outside
Git. All illumination playback inputs remain explicitly hypothetical; polar
average solar visibility and historical Diviner temperatures retain their
coverage, modeled/observational period and limitations.

## M1 verification

One header now owns the four activities. Build has a small placement shelf and
contextual palette; selecting a placement tool closes the palette. Reopening a
mission and running simulation no longer opens a permanent inspector. Current
calculated telemetry remains in the compact timeline. Default closed panels
restore the entire map width. Desktop/laptop and phone screenshots were inspected.
The 53-case first pass passed 47; its six old navigation/disclosure expectations
were updated and all pass in a 26-case follow-up. Existing numerical comparisons,
revision assertions, error recovery and saved scenario equality checks remain.

M1 pushed as `89d037b`; [GitHub validation](https://github.com/lucasligenza/lunar-infra/actions/runs/36955974128)
passed all 53 browser journeys, Python validation, fresh acquisition and build.

## M2 rendered review

Selected-asset screenshots now show name, operational state, demand/capacity,
coordinates and save/move/remove actions without a long advanced form. Terrain
selection shows coordinates/elevation/slope; source IDs, native spacing, sample
details and qualifications remain under disclosures. The phone uses task sheets
with Close actions rather than a second permanent navigation row.

Overlays is distinct from advanced tools. Prepared native 2D layers remain;
imagery, geology and temperature use the existing Three.js surface. Selecting a
3D layer changes presentation only; placement still uses the scenario's native
coordinate domain and numerical queries retain their original supporting raster.
Coverage messages use `/atlas/inspect`, distinguishing unavailable and nodata.
The outline shows the registered south-pole **analysis area**, not a claim that
every enclosed environmental cell exists. Native masks and query statuses remain
authoritative. The supported-region action flies to verified Shackleton terrain.
Actual outside-coverage, polar temperature/solar, asset and site screenshots were
inspected; no environmental or numerical data was added or altered.

M2 validation: 20 workspace/responsive journeys and 15 further footprint,
settlement, playback and globe journeys pass. Typecheck and production build pass. Registered layers,
real polar colors, native measurements, nodata and persistence are preserved.

M2 pushed as `0b19c37`; [GitHub validation](https://github.com/lucasligenza/lunar-infra/actions/runs/36958233781)
passed all 55 browser journeys, fresh scientific acquisition, Python and build.

## M3 playback review

The timeline now composes a compact `SimulationBar` and a separately disclosed
`SimulationDrawer`. The existing controller retains selected interval, speed,
play/pause and chart window. Current generation/demand/unserved demand use kW;
battery SOC is at interval end. Selected-asset output is a direct lookup in the
same saved interval, not an additional frontend simulation.

View details exposes the three charts, mission energy summary in kWh, events,
input/result hashes and assumptions. Desktop drawer height is capped at 34dvh;
its body scrolls while close/playback stay reachable. Mobile details use a task
sheet; the compact state keeps the surface visible. Escape collapses details and
returns focus to the toggle without changing the reporting interval.

Actual 1366/1024/mobile compact and expanded screenshots were inspected. New
journey assertions check closed default charts/rails, >75% desktop surface height
in compact simulation, retained interval on collapse, selected-battery SOC from
the actual Python output and distinct cumulative summary values.

M3 validation: 15 focused browser journeys and 11 final label/focus/responsive
checks pass; typecheck and production build pass. Python regression passes
106 tests and eight subtests. No backend, simulation, source data or APIs changed.
