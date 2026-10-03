# LunarOS UX audit and Phase 5 plan

## Spatial workspace follow-up, baseline a0ecd7d

The latest accepted direction is [The Moon is the application](spatial-workspace.md).
Actual before/after screenshots at 1920x1080, 1440x900, 1366x768 and 1024x768
show the former reserved full-height rails replaced by bounded floating context.
Explore / Build / Simulate are the three primary activities; regional analysis
remains available contextually and through commands. Places is opened on demand,
Overlays uses compact rows, and source details remain disclosed.

The canvas keeps its exact width and camera position when desktop panels open.
Tests bound those panels to less than 25% of canvas area and verify reachable
close/camera controls. Build retains its closed palette/inspector default;
Simulate retains its compact current-interval strip and explicit chart drawer.
Rendered phone review corrected a wrapped toolbar covering Reset and removed
redundant map-footer text beneath it. Dirty mission names retain access to Save.
Global mission tools revealed another real collision with the layer legend;
status, fly-to and legend now use the free edge while those tools are open.

All older sections below describe their historical baselines. Current acceptance,
scientific limitations and validation status are recorded in PROGRESS.md.

## Mission workspace visual follow-up, baseline d852791

Fresh 1440×900 and 1366×768 Build/Simulate screenshots showed three competing
navigation/tool rows, an automatically opened simulation inspector repeating
timeline measurements, and long asset forms/source identifiers in primary view.
The scientific overlay repair was already functioning at this baseline; no new
data or numerical work was needed. See [the visual roadmap](mission-workspace-redesign.md)
for before/after review and validation.

The new shell uses one Explore / Analyze / Build / Simulate header. Default Build
and Simulate have no large rails. Equipment placement uses a contextual palette;
selection-driven inspectors disclose advanced/source fields. Simulation uses a
compact current-condition bar and an explicitly opened, bounded chart drawer.
Coverage guidance preserves native masks and qualifies the visual polar outline.
The earlier audit below records historical observations, not unresolved defects
in the current workspace.

## Targeted follow-up, baseline 533f8c7

Actual rendered polar overlays show a tiny, coarse footprint at the destination
camera distance. HTTP success/decoding was reported as ready even for completely
transparent tiles; preparation failures removed environmental choices entirely.
Native raster review confirms some radial Diviner patterns are source values,
not a reason to smooth or invent data. Geographic fragment mapping and finer
bounded polar display retain native structures. The local workspace still
reserves both rails even when no asset is selected. Timeline starts expanded.
The candidate evidence action leads to Mission, but next steps compete with
many general controls. See docs/targeted-refactor.md for the four scoped repairs.

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

## Structural repairs

The globe now has a normal-flow toolbar, flexible visualization and one dock.
Display settings, atlas and location details share that dock. Desktop docks own
their width; narrow screens use a full task panel with a visible close action.
Search closes when entering the narrow layout. The atlas has a fixed header/tabs
and a separately scrolling body, so profile/export actions scroll below chrome.

The local workspace owns a toolbar above its viewport. Mobile Map, Tools,
Inspector and Timeline controls select one reachable task panel. Camera controls
stay inside the viewport. The tools heading remains visible when forms scroll.
Rendered review caught a legacy 45% drawer height restriction; it was removed.
Scientific requests, numeric derivations, scenario revisions and coordinates are
unchanged. Browser regression checks cover dock separation and panel navigation.

## Final review findings

Four named activities now separate design inputs from simulation results while
preserving the same mission/location. The header retains context on laptops.
Technical quantities use bundled monospace fonts and larger labels; ordinary
descriptions remain sans-serif. Actual-event commands/console and optional Help
replace ambiguous workflow guidance with reachable, useful actions.

The final 200% zoom-equivalent review found Reset under the map footer. Short
windows now scroll normally, with the header sticky and enough workspace height
for map controls. Pointer hit tests confirm the repair. Screenshot review also
found an open destination popover leaving a dark rectangle on the idle globe;
separate translucent compositing removes that artifact while retaining demand
rendering. Both findings were observed in rendered output, not inferred from CSS.
Laptop chart axes now compensate for SVG scaling, with measured rendered font
size checks. Header readiness explicitly names polar data; saved-state indication
requires no unsaved drafts or pending requests.

See [Phase 5 acceptance](phase5-acceptance.md) for complete journey coverage,
viewport evidence and explicit native-zoom/accessibility validation limits.

## Follow-up simplification

The user's observed redundancy prompted the accepted Moon/Mission roadmap.
Primary navigation now exposes two workspaces. Basic Moon controls emphasize
search and Overlays; coordinate/display controls, the full catalog, sectors and
regional numerical tools are disclosed through Advanced. Detailed simulation
series are optional while the explicit hypothetical preset/run workflow remains
visible. The console and help are optional. Only one contextual globe dock owns
space at a time, including the candidate finder.

Rendered candidate review showed reachable, separately scrolling evidence and
settings at desktop and mobile sizes. A selected candidate persists through
mission creation and actual calculated playback. Validated average sunlight and
one source-specific Diviner temperature bin add scientific context, with unknown
evidence explicitly retained. Basic point inspection shares best supporting data
across Moon inspectors; visualization resolution is distinguished from numeric
analysis resolution. A pole-safe circle regression and complete-level tile
selection address polar geometry and omitted overlay wedges without changing
terrain geometry. Final acceptance counts are recorded in PROGRESS.md.

## Targeted workspace and playback review

The modular mission viewport no longer reserves closed tool/inspector rails.
Actual 1920/1366/390-pixel screens show contextual docks and reachable controls;
bounding-box tests also cover 1440 and 1024 widths and zoom-equivalent layouts.
Tools and inspectors are mutually exclusive. Forms stay mounted so closing a
panel does not discard drafts or weaken revision conflict checks.

Playback now starts compact with actual interval telemetry and a persistent
scrubber. Expanded charts have a bounded body and a pinned collapse action.
Desktop/laptop screenshots show the map retaining most height when compact.
An initial mobile screenshot exposed a blank compact Timeline task pane; the
revised narrow layout retains the map until chart details are expanded. The
compact flex item also needed explicit width/min-width to keep all controls in
the phone viewport; screenshot review and hit/bounding-box checks verified it.
selected interval and playback speed persist through collapse. Power is labeled
interval-average kW, with mission energy totals separately identified as kWh.

The settlement CTA previously sat below the whole evidence list, and switching
to Mission offered simulation configuration before a mission existed. The new
handoff shows candidate selection and its next action above the evidence groups,
then opens a coordinate-qualified creation form. Infrastructure follows a
successful save; simulation configuration opens its actual input form. Saved
missions have a direct action. Basic tools disclose one task; Advanced retains
all earlier controls. The simulation inspector no longer repeats the site
inspector below calculated telemetry. No screening formula or power model changed.
