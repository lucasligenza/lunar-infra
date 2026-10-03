# The Moon is the application

This frontend-only redesign supersedes the four-activity visual shell in
`ui-overhaul.md`. Scientific sources, Three.js, OpenLayers, numerical queries,
scenario hooks, API contracts and the Python simulation remain unchanged.

## Observed baseline

Fresh production screenshots at 1920x1080, 1440x900, 1366x768 and 1024x768 show:

- Opening an inspector shrinks the canvas and moves its visual center.
- The tall 320–360px rail reserves empty space below short selections.
- Large overlay tiles, permanent search and technical status labels compete
  with the surface. Primary navigation duplicates contextual analysis.
- Asset placement and compact playback already work; preserve those behaviors.

Screenshots are ignored under `artifacts/spatial-before-*`. Findings above were
observed in rendered Chromium, rather than inferred from component names.

## Implementation

1. Reduce primary navigation to Explore / Build / Simulate. Retain regional
   analysis as a contextual action and command. Provide direct command search.
   Keep a stable full-width canvas with bounded temporary inspectors, compact
   layer rows, geographic search on demand and concise selection summaries.
2. Carry the same shell into Build and Simulate. Float contextual tools, use
   one scrolling inspector, disclose technical content, and retain compact
   interval telemetry with a bounded chart drawer. Keep drafts and playback
   state in the existing hooks.
3. Inspect actual screenshots at all four desktop sizes and phone size. Update
   tests for the deliberately changed navigation and floating geometry, while
   retaining source values, coverage, persistence, interaction and numerical
   assertions. Run typecheck, production build and browser regressions, then
   publish each verified slice with an ordinary commit and push.

Temporary panels occupy deliberate edge zones. Camera controls remain clear
of those zones; the center remains clickable. Small screens use dismissible
task sheets rather than compressed sidebars. Source information and serious
coverage/errors remain available; no unavailable layer is labeled ready.

## Rendered review and regressions

The implemented shell retains the complete canvas width when a desktop panel
opens. New browser checks compare its exact bounds and camera before/after,
limit a contextual panel to under 25% of canvas area, and hit-test its close
button and the camera controls. These checks run at all four requested sizes.
Build starts with neither rail visible; placement and selection keep their
existing API/state behavior. The playback strip contains current interval kW
and end-of-interval SOC; the expanded drawer keeps charts and cumulative kWh
separate and is capped at 34% of desktop viewport height.

Actual review caught and corrected a stretched region-close control, a globe
status label behind the overlay panel, a wrapped phone toolbar covering Reset,
and low-contrast OpenLayers scale text. Phone name edits keep Save accessible.
The full journey pass also exposed the floating mission tools covering the globe
legend. While tools are open, globe status, fly-to and legend move to the free
right edge; direct hit tests preserve access without narrowing the canvas.
The redraw does not stretch the finite polar raster to fill unsupported terrain.

The preceding geological-readout push passed local validation but its GitHub
run 37068089576 failed one of 61 journeys after a catalog request lost its
connection. Point-query success could clear the shared error while the dataset
selector remained empty. Catalog errors now have separate state, one automatic
read retry, and an explicit Retry catalog action; the selector is disabled until
its options exist. A browser test forces metadata failure while preserving real
point queries, then restores the connection and verifies dataset selection.
No scientific measurements, source grids or backend contracts changed.

Before/after images remain in ignored `artifacts/spatial-before-*` and
`artifacts/spatial-final-*`, with mission and environmental screenshots produced
by the existing journeys. See PROGRESS.md for final validation and commit status.
