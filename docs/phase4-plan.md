# Phase 4 implementation plan and audit

## Verified starting point, 2026-09-30

Clean main at 7c189a2; configured origin remains lucasligenza/lunar-infra.
Baseline: 71 Python tests plus eight subtests and 17 Chromium tests pass.
Actual rendered globe captured and inspected before changes. Existing Three.js
viewer, NASA SVS imagery, native LDEM_4, OpenLayers polar map, SQLite scenarios,
asset placement and Python energy/playback work. No validated temporal solar data.

The global elevation API preserves 0.25-degree LOLA values. The 96 km south-pole
crop supplies 240 m elevation, slope and aligned average visibility. Its PNG
renderings have a declared projected extent. They cannot cover unrelated regions.
The globe currently has no scientific color overlay; local planning is polar-only.

## Data and architecture decisions

Investigated [GLD100](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLD100) first.
Its 32 ppd attached-label PDS product is 132,733,440 bytes: about 948 m equatorial
spacing. High-resolution original spacing is 100 m, effective resolved detail
approximately 300 m; neither describes the downsampled grid used here. LOLA fills
the polar areas. Source header identifies planetocentric east-positive coordinates
and a 1737.4 km sphere; control-network precision must remain explicitly qualified.
Observation start/stop are unspecified in the product label.

Keep Three.js and existing numerical dependencies. Register sources separately
from derived layers, expose native numerical queries and cache colored geographic
tiles. Never query PNG colors. A geographic quadtree matches existing globe UVs;
user-facing sectors use cube faces with a hierarchy to avoid a longitude singularity
at the poles. Named destinations, sectors and rendering tiles remain distinct.

The USGS 2020 v2 geology ZIP is 224,413,040 bytes. Bounded HTTP range metadata
identifies unit polygons and attribution tables; acquire selected members rather
than the whole archive. File budgets and disk space are checked before acquisition.
Diviner's linked server currently fails modern TLS negotiation; keep this explicit
while investigating the PDS archive. Do not weaken TLS validation or invent data.

## Delivery sequence

1. Dataset registry, bounded acquisition and real global terrain query vertical slice.
2. Native-resolution global slope and reusable progressive 3D color overlays.
3. Polar-safe sectors, arbitrary radius/area analysis, weighted statistics, profiles
   and exports; connect additional regions without replacing polar science.
4. USGS geology polygons/classification and registered overlay; investigate thermal,
   mineralogical, resource and gravity products with honest availability states.
5. Catalog, favorites, comparison controls and global hypothetical mission placement.
6. Rendered desktop/mobile review, scientific/browser regressions, performance
   observations and acceptance/startup documentation.

Every functioning slice updates PROGRESS.md and is tested, committed and pushed.
Avoid giant downloads, new server infrastructure, AI and optimization.

## Interface direction

Retain the space/instrument/cyan palette and Segoe UI/Bahnschrift hierarchy.
The memorable element remains the lunar surface colored by actual data. Add a
compact Atlas control beside globe layers; one scrollable contextual drawer serves
catalog, sectors and regional results. Source/units/resolution accompany every
legend. Profiles use readable scientific axes. Panels collapse to preserve the Moon,
and controls follow existing focus and reduced-motion behavior.
