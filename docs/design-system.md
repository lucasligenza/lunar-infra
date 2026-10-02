# Lunar mission control interface

Explore, Analyze, Build and Simulate share one compact header and geographic/mission
context. The surface owns the flexible viewport. Build opens without rails;
+ Add Asset reveals a compact palette that closes when placement begins.
Selected equipment or terrain opens a contextual inspector. Overlays is separate
from advanced tools; metadata and engineering settings use disclosures.
Below 900 CSS pixels, contextual docks become dismissible task sheets without a
second navigation row. Closing a panel restores the map and retains draft state.

`frontend/app/mission-control.css` owns the palette, spacing and stacking tokens.
`mission-workspace.css` applies the surface-first shell, palette, inspector and
playback refinements after the legacy styles, using those same tokens.

| Token | Value | Purpose |
| --- | --- | --- |
| base | #0B0F14 | Lunar night / viewport frame |
| panel | #131A23 | Tools and scientific panels |
| elevated | #202C39 | Controls and hover surfaces |
| surface-inset | #0E141C | Input and chart surfaces |
| accent-muted | #1C3249 | Selected controls |
| ink | #F0F3F6 | Primary text |
| quiet | #A3AEBC | Secondary labels |
| accent | #82B8EF | Actions, focus, selection |
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

The [visual overhaul](ui-overhaul.md) establishes shared line icons, visible
scientific layer choices and a reserved toolbar band over the global viewport.
Layer choices are native radios: Tab reaches the selected choice and arrows
change it. Preparation and polar coverage remain explicit; a selected radio does
not claim successful rendering. Original source-period labels remain visible.
Contextual asset tools use the same glyphs as their inspectors, with grouped
electrical inputs. Current playback figures have a compact two-level hierarchy;
the battery reserve bar directly reflects the returned aggregate end-of-interval
SOC. Ordinary demand charts are neutral; warnings remain tied to real conditions.

Stacking tokens distinguish surfaces, viewport controls, deliberate popovers,
console and dialogs. Primary structure uses Grid/Flexbox; absolute positioning
is limited to map overlays and deliberate popup containers.

Commands open with Ctrl/Cmd+K or the header action. Search, arrow keys and Enter
operate the same application actions as the graphical controls. Unavailable
actions display a reason. Escape closes the native modal and returns focus.
The activity console starts minimized, can expand, clear or dismiss, and reopens
from Activity. It shows actual UTC application events with optional request
details; the viewport shrinks normally when the console expands.

The first-time invitation is an optional normal-flow strip, not a mandatory modal.
Its six-step tour can be closed at any point, remembers dismissal locally and is
reopened through Help or commands. Help explains actual shortcuts and scientific
quantity terminology. Settings respects system motion preference or explicitly
reduces camera/CSS motion, persists that preference and controls console visibility.
Unsaved asset drafts explain why simulation saving/running is blocked rather than
displaying a fictitious in-progress state.

Below 600 CSS pixels in height, the shell permits ordinary vertical scrolling
with a sticky header. This prevents the map footer from covering camera controls
in short/zoomed windows. Toolbar popovers use separate translucent compositing
to avoid occlusion artifacts on the demand-rendered WebGL canvas; their stacking
remains limited to the deliberate toolbar overlay container.

Simulation uses a compact playback/current-conditions bar. Current power is
interval-average kW, battery SOC is at interval end, and selected-asset readings
come from that same saved interval. Charts, cumulative kWh totals, events and
assumptions are disclosed in a separately scrolling drawer capped at 34dvh on
desktop. On mobile it becomes a task sheet; the collapsed bar retains the map.
Escape/Close details retain the interval and chart window and return focus.
