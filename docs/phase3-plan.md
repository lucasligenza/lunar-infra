# Phase 3 plan and baseline audit

## Verified baseline (2026-10-02)

Clean `main`, origin `https://github.com/lucasligenza/lunar-infra.git`, latest
published handoff `97ce26a`. Inspection and execution confirm 69 Python tests plus
eight subtests and 10 Chromium tests pass. Existing desktop and mobile screenshots
were captured and inspected before changes; artifacts remain ignored.

OpenLayers uses a custom lunar polar stereographic projection, not Earth Mercator.
The prepared south-pole region is 96 km square at 240 m. Real NASA elevation,
derived slope and aligned long-term modeled solar visibility work. SQLite scenarios,
five asset types, validated placement, deterministic Python power/storage simulation,
stored results and playback work. Temporal NASA illumination remains unvalidated.
There is no current global UI; the legacy validated LDEM_4 reader already supports
a small global LOLA product. Permanent sidebars and small labels constrain the map.

## Renderer decision

[Cesium Moon](https://cesium.com/platform/cesium-ion/content/cesium-moon/) provides
3D Tiles asset 2684829. Its example sets the Moon ellipsoid, disables the Earth
globe/base layers/geocoder, and does not support 2D mode for this tileset. Picking
would require depth-buffer positions converted with the lunar ellipsoid, followed
by backend scientific queries rather than treating visual mesh heights as analysis.
Next.js can load the client-only viewer with static Cesium workers/assets; this is
more integration than the credential-free fallback. CesiumJS is Apache-2.0, while
ion content is subject to separate hosted terms and visible attribution.

The [ion pricing page](https://cesium.com/platform/cesium-ion/pricing/) currently
lists a personal/noncommercial community plan with 15 GB/month streaming; commercial
individual plans begin at $149/month. Account/token and project eligibility have
not been established here; no subscription or account creation is authorized by
this implementation. Review [content usage](https://cesium.com/learn/ion/content-usage-and-attribution-guide/)
before any later hosted integration. Provider specifications include 100 m global
imagery and progressively finer polar terrain; these are not our local analysis resolution.

Choose Three.js (MIT) with OrbitControls, NASA SVS imagery and the existing verified
LDEM_4 V3.0 global terrain. No custom streaming engine or new server dependency.
[NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) supplies compact visualization
textures centered on zero longitude. NASA explicitly identifies these as aesthetic
products, with adjusted colors and polar albedo fill; they provide no new measurements.
Scientific queries retain the PDS product/frame, nodata and units. Displacement is
at true scale on the 1737.4 km sphere; global mesh detail and analysis detail are distinct.

## Milestones

1. Audit/options/plan and scope rules; publish verified baseline.
2. NASA global acquisition, provenance, coarse elevation/coverage API and tests.
3. Shared shell/design primitives and interactive globe, loading/error states,
   orbital camera/picking, progressive textures and geographic conversion tests.
4. Verified destinations, search/fly-to, coverage-aware location inspector and layers.
5. Connect global/regional/mission modes, preserve location/scenario state, display
   assets in their geographic positions and retain the validated 2D map.
6. Refine regional/mission panels, run interaction regressions, inspect desktop,
   laptop and mobile screenshots, measure readiness/resource sizes, fix issues.
7. Acceptance/startup/architecture documentation and confirmed GitHub CI.

Every coherent feature is tested, reviewed, progress-recorded, committed and pushed.
The sequence puts reproducible data before the viewer so the first globe is grounded.

## Design direction

Palette: space `#080c11`, instrument `#111923`, boundary `#273440`, text `#edf2f5`,
interactive cyan `#8ecfe4`, warning amber `#e7b879`. Segoe UI is the readable body
face; Bahnschrift supplies compact navigation/headings with portable fallbacks.
The Moon is the visual focus, with a compact mode header, destination search at
upper left, quiet camera controls and a contextual drawer. Regional/mission views
share this vocabulary, with collapsible tools and inspector plus an expandable timeline.
No decorative telemetry, starfield download, stock dashboard grid or atmospheric glow.
User-triggered fly-to motion respects reduced-motion preferences.

## Scientific and validation boundary

All modes share east-positive planetocentric lunar coordinates. Global 3D uses a
documented graphics-axis permutation of the same lunar sphere, not an Earth CRS.
Destination centers are navigation aids with source links and rounded precision;
the Gazetteer coordinate system/control-network caveats are recorded. Outside
prepared coverage, local slope/solar/planning are unavailable, not inferred.
Keep existing test assertions; update their entry mode for the new global default.
Add source integrity/grid/poles/seam/nodata/coverage tests, 3D coordinate parity,
surface selection, camera reset/navigation, mode-state and scenario persistence tests.
Inspect actual rendered screenshots after major integrations, including missing
data, panels, simulation output and several viewport sizes. Document measured
startup times and bounded resource sizes rather than promising universal frame rates.
