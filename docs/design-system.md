# Lunar mission control interface

Explore, Analyze, Design and Simulate share one header and geographic/mission
context. The map owns the flexible viewport; desktop tools and inspectors own
their columns. Global display settings, atlas and region details share one dock.
Below 900 CSS pixels, contextual docks become task panels; the local workspace
offers Map, Tools, Inspector and Timeline navigation. Closing a panel restores
the map and its controls.

`frontend/app/mission-control.css` owns the palette, spacing and stacking tokens.
Legacy component styles reference these tokens rather than independent colors.

| Token | Value | Purpose |
| --- | --- | --- |
| base | #0B0F14 | Lunar night / viewport frame |
| panel | #141A22 | Tools and scientific panels |
| elevated | #1D2632 | Controls and selected surfaces |
| ink | #F0F3F6 | Primary text |
| quiet | #99A6B5 | Secondary labels |
| accent | #4C9BE8 | Actions, focus, selection |
| nominal | #53B987 | Calculated nominal conditions |
| warning | #D7A44B | Actual limitations and warnings |
| failure | #D96B6B | Errors / constraint violations |

Geist Sans and Geist Mono are locally bundled through pinned `geist` 1.7.2
(SIL Open Font License), avoiding runtime font services. Sans is used for prose
and controls; mono for coordinates, measurements, dataset IDs, engineering
inputs and UTC telemetry. Scientific raster/category colors remain sourced from
the scientific layer definitions; interface colors do not modify measurements.

Primary actions use dark text on blue. Browser tests compute the rendered text
contrast (at least 4.5:1), verify actual font families and visible keyboard focus.
Reduced-motion styles disable cosmetic animations/transitions. Existing globe
keyboard selection and destination alternatives remain available. These checks
are targeted improvements, not a claim of a full external WCAG conformance audit.

Stacking tokens distinguish surfaces, viewport controls, deliberate popovers,
console and dialogs. Primary structure uses Grid/Flexbox; absolute positioning
is limited to map overlays and deliberate popup containers.
