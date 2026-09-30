# Phase 2 implementation plan and audit

Audit: clean main at 1930dee, configured origin lucasligenza/lunar-infra. Actual
LOLA terrain, projection, slope, aligned average solar visibility, inspection API
and interactive OpenLayers map work. Baseline: 33 Python tests plus eight subtests,
six Chromium tests and frontend type checking pass. Existing numerical/data modules
will remain intact. No infrastructure, persistence or time-dependent simulation exists.

## Scientific input boundary

The integrated AVGVISIB product is one averaged raster, not an hourly image cube.
The producer's hourly modeling interval cannot reconstruct its time axis.
[NASA product 69](https://pgda.gsfc.nasa.gov/products/69) describes long-term averages;
[archive documentation](https://imbrium.mit.edu/EXTRAS/ILLUMINATION/README_ILLUMINATION_2016.TXT)
and the IMG listing provide averaged visibility and shadow maps. No compatible
time-resolved product was validated in this audit. Real-data mission playback
therefore remains unavailable. Simulation accepts explicit interval illumination
series; demonstration inputs are authored hypothetical sequences, unrelated to a
24-hour Earth cycle or NASA averages. Source kind is recorded in every result.

## Incremental milestones

1. Mission-control layout: left scientific tools, dominant unobstructed lunar map,
   contextual right inspector; collapsible sections and responsive layout. Preserve
   functional layer/coordinate/navigation controls; no placeholder telemetry.
2. Typed asset/scenario definitions, SQLite persistence, revision conflicts and
   CRUD/duplication API. Validate coordinates against actual terrain. Ignore databases.
3. Scenario creation/reopening, asset catalog, map placement/selection/movement,
   parameter editing and explicit save state backed by API responses.
4. Pure deterministic Python interval energy engine and conservation tests.
   Piecewise-constant generation/load, limits/efficiencies/reserve SOC, curtailment
   and shortage. Multiple batteries dispatch in stable ID order, documented.
5. Simulation endpoints persist immutable scenario/input snapshots and results,
   reject invalid/missing series, and record reproducibility identifiers.
6. Mission parameters, explicit synthetic/custom series, calculated charts,
   telemetry, event selection, scrub/play/pause/speed and stale-result handling.
7. Integration/CI, desktop/mobile critique, startup/API/science/acceptance docs.

Each working milestone is tested, reviewed, committed and pushed with progress.

## Design direction

Instrument palette: deep navy #0c1722, panel #142331, border #304557,
cyan #90d5ed, amber #e9bd72, nominal green #87c7a1; red only for computed violations.
Segoe UI text and Bahnschrift headings where available; tabular numerals for data.
Left-aligned dense tools, quiet chrome and NASA terrain as the primary visual.

```text
brand | active scenario / region | save state / actions
tools | lunar scientific map     | selection / configuration
      |                         | computed telemetry
      + mission timeline / charts / events (once functional)
```

The existing overlaid tool cards obscure terrain on desktop and create a long mobile
page. Move these into a dedicated tool rail; preserve map projection and source
renderings. Introduce the bottom timeline only when it consumes computed output.
