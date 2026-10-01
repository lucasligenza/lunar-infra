# Phase 5 mission-control acceptance

This phase changes the browser experience. Three.js, the scientifically projected
OpenLayers map, registered rasters, scientific APIs, scenario revision checks and
Python energy calculations are preserved. No dataset or numerical model is added.

## Delivered experience

- Explore, Analyze, Design and Simulate share geographic and mission context.
  Existing URL modes still work; direct and contextual transitions preserve drafts,
  saved scenarios and the selected simulation interval.
- The header, toolbar, visualization, contextual dock and console own layout space.
  Desktop tools/inspectors use columns; narrow screens use Map, Tools, Inspector
  and Timeline task panels. Panels scroll independently without covering controls.
- Centralized night/panel/elevated tokens, locally bundled Geist Sans/Mono, readable
  measurements, UTC charts, visible focus and restrained actual-status colors
  establish the mission-control identity.
- Ctrl/Cmd+K opens searchable commands with arrow/Enter navigation. Commands call
  the same actions as visible controls; unsupported actions explain their block.
- The bounded activity console shows actual timestamped requests, selections,
  readiness, saved revisions, simulation IDs and errors. It can expand, minimize,
  clear, dismiss and reopen. It does not execute shell commands.
- Optional six-step guidance, Help and functional motion/console settings can be
  dismissed and reopened. Tour dismissal and motion preference persist locally.

## User-journey evidence

The browser uses prepared real NASA/USGS data and the actual local FastAPI service.
Hypothetical temporal inputs are explicitly labeled; test missions are deleted
after the journeys. Scientific measurements are never taken from screenshot colors.

| Requested flow | Browser coverage |
| --- | --- |
| A: Explore, select and inspect | Destination/surface picking, actual API elevation, coverage and source identifiers in `globe.spec.ts` and `responsive.spec.ts`. |
| B: Analyze, overlay and inspect | Real polar elevation/slope/visibility and global atlas layers, coverage, provenance, profiles, opacity and comparison in `explorer.spec.ts`, `atlas.spec.ts` and `discovery.spec.ts`. |
| C: Design, place, configure and save | API-backed placement, movement, editing, reopening, duplication, confirmed deletion and invalid-location errors in `missions.spec.ts` and `global-missions.spec.ts`. |
| D: Run, inspect and play | Python simulation output, changed inputs, stale-result handling, interval/chart selection, playback and saved-result reopening in `simulation.spec.ts` and `responsive.spec.ts`. |
| E: Switch without losing context | Location, camera, atlas, independent drafts, scenario revisions and selected playback state in `modes.spec.ts` and `mission-regressions.spec.ts`. |
| F: Execute a keyboard command | Search, arrow/Enter navigation, real destinations/layers/catalog, actual simulation request, disabled reasons, Escape and restored focus in `commands.spec.ts`. |
| G: Use the activity console | Actual UTC events, expanded/minimized/dismissed/reopened states and mobile reachability in `commands.spec.ts`. |

Additional checks cover reduced motion, dismiss/reopen persistence, Help settings,
rendered primary-action contrast, actual font families and keyboard focus. Existing
loading, missing-data, failed-raster/tile and retry workflows remain in the suite.

## Rendered and responsive review

Actual screenshots were captured and inspected before and after the redesign.
Final journeys cover all four activities, selected/unselected regions, asset
configuration and computed playback at 1920x1080, 1440x900, 1366x768, 1024x768 and
390x844. DOM hit tests check that header/map controls are inside the viewport and
receive pointer input; horizontal document overflow is rejected. Expanded atlas,
catalog, sector/profile, console, Help and command dialogs were also inspected.
Screenshots/traces stay in ignored artifacts, outside Git.

Observed defects repaired during final review:

- At a 720x450 CSS viewport, the map footer covered Reset. Short windows now use
  ordinary vertical scrolling with a sticky header and adequate workspace height.
  The control receives pointer input after scrolling; it was not removed.
- An open destination list produced a dark occlusion rectangle on the idle WebGL
  globe. Toolbar popovers now use the same separate, slightly translucent
  compositing treatment as the existing atlas controls. Repeated rendered capture
  confirms the lunar surface remains intact, without continuous GPU redrawing.
- Laptop/mobile SVG axes were too small after viewBox scaling. Responsive font
  sizes now compensate; browser checks measure the actual transformed text size.
  The header names the polar readiness it checks, and a green saved indicator
  requires a saved scenario without pending requests or unsaved drafts.

The 125%/200% checks use equivalent reduced CSS viewports (1152x720 and 720x450
for a 1440x900 window). They test responsive layout and reachability, not native
Chrome UI zoom or every device-pixel-ratio behavior. Mobile review uses Chromium
viewport emulation, not a physical handset. Accessibility checks are targeted
improvements, not an external WCAG conformance certification.

## Validation record

Final local validation passes: all 39 Chromium tests (5.1 minutes), frontend
typecheck and optimized production build. Pushed milestone hashes and remote
validation are recorded in [PROGRESS.md](../PROGRESS.md). The preserved Python
suite passes 91 tests plus eight subtests. Existing dependency deprecation warnings remain;
tests are not skipped or disabled. GitHub validation also acquires pinned NASA/
USGS data on a fresh runner before scientific and browser checks.

## Retained scientific limitations

Global geometry remains the documented coarse LOLA visualization mesh; overlay
coloring does not change terrain resolution. Numeric inspections use the registered
supporting raster. High-resolution polar analysis retains its existing footprint.
Thermal/mineralogical/resource/gravity numerical layers remain unavailable.

Validated time-dependent NASA illumination is unavailable. Power runs consume
explicit hypothetical interval factors and identify their provenance; average
modeled visibility is never converted into invented eclipse times. The existing
energy model still omits thermal coupling, degradation and spatial shading.
