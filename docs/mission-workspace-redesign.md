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
