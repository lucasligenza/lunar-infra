# LunarOS UX audit and Phase 5 plan

## Baseline evidence

Audited clean `main` at c0c839d with the configured lucasligenza/lunar-infra origin.
The production application and scientific API were launched on loopback. Baseline
validation passed: 91 Python tests plus eight subtests, and all 28 Chromium tests.
No pre-existing failing test was disabled. Three.js, OpenLayers, source registries,
SQLite revision checks and the Python simulator are retained.

Actual rendered review covers Explore, polar/atlas analysis, scientific layers,
sectors, catalog, scenarios, infrastructure and computed simulation playback.
Additional capture at 1920x1080, 1440x900, 1366x768, 1024x768 and 390x844 used
prepared real science and a clearly hypothetical audit mission, deleted afterward.
Screenshots/DOM measurements remain in ignored artifacts; none are product assets.

## Observed findings

| Finding | Evidence | Repair |
| --- | --- | --- |
| Mobile region and destination panels collide | After selecting Shackleton then resizing to 390x844, the region drawer covers destination choices. | One contextual dock; responsive search disclosure; a full task panel on mobile. |
| Mission inspector action obscures camera controls | At 390x844, the bottom-right Hide inspector button occupies the camera control area. | Workspace toolbar outside the map; dedicated map control slots. |
| Mission workflow competes with playback | The 1024x768 computed-run view simultaneously shows input editing, site inspection, telemetry and charts; scenario controls are above the scrolled input form. | Distinct Design and Simulate activities with shared saved state/drafts. |
| Primary context disappears on laptops | Mission/region names vanish below 1200px while the navigation and saved-revision status remain. | Compact context row, rather than silently dropping the selected mission. |
| Global science is scattered across controls | Search, Globe layers, Lunar atlas and region controls occupy separate floating locations. | One map toolbar and one dock with clear tab labels. |
| Analytical actions scroll behind sticky chrome | Profile review shows part of Export regional JSON under the sticky tabs. | Separate fixed panel header and scrolling content; no calculated sticky offsets. |
| Technical information is hard to scan | Source IDs, coordinates, UTC values and chart labels mix proportional fonts and very small labels. | Sans for prose, mono for values; larger scientific axes and explicit units. |
| Navigation lacks a simulation activity | The current three buttons place simulations inside Mission Designer. | Explore, Analyze, Design and Simulate, with direct/contextual transitions. |

No horizontal page overflow was detected in the ten measured baseline Explore and
mission layouts. This does not rule out occlusion: the mobile collisions occur
inside the viewport. Existing scientific quantity/source and synthetic-input labels
are accurate and must remain. No user research beyond this observed review is claimed.

## Source-inspection risks, not confirmed defects

Many independent absolute-positioned controls and hardcoded sticky offsets make
future overlaps likely. Legacy selectors span three stylesheets with competing
breakpoints. Keyboard dialogs, command navigation and onboarding are absent;
contrast/focus behavior still needs a dedicated check. Browser zoom was not part
of the baseline pass; it will be tested after the structural repair.

## Design and delivery

The lunar surface stays dominant. A compact application header sits above a map
toolbar, flexible viewport and one contextual dock. Local workspaces retain their
scientifically correct map; mobile switches between map, tools, inspector and
results panels instead of stacking a long desktop layout.

Use the requested night/panel/elevated palette (#0B0F14, #141A22, #1D2632), readable
text (#F0F3F6, #99A6B5) and blue (#4C9BE8). Green/amber/red indicate actual statuses.
Primary-button text must meet contrast against blue. Use locally bundled
[Geist Sans and Geist Mono](https://vercel.com/font), with mono restricted to
coordinates, values, IDs and timestamps. Centralize spacing, borders and z-index.
Terminal influence comes from actionable commands and real timestamped events.

1. Audit and scope/documentation milestone.
2. Grid/dock repair, map toolbar and responsive task panels; preserve behavior.
3. Four activity navigation and explicit design/simulation transitions; preserve drafts.
4. Cohesive design tokens, typography, readable scientific/engineering controls.
5. Command palette and bounded actual-event activity console; shared action handlers.
6. Optional walkthrough, help/settings, contextual guidance and keyboard access.
7. Rendered review/interaction tests at all five sizes, 125%/200% zoom equivalents,
   error/empty/expanded states and full user journeys; document acceptance.

Each working slice is validated, explicitly staged, committed and pushed. This
phase changes UX only: no new science, simulation math, AI or dataset acquisition.
