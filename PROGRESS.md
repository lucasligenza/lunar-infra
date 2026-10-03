# LunarOS progress

## Interaction redesign — in progress

Plan and rendered baseline: [interaction redesign](docs/interaction-redesign.md).

- **M1 onboarding (2026-10-03).** Baseline `b8422f6` matched origin/main.
  Production build captured and inspected at 1920×1080, 1440×900, 1366×768,
  1024×768 and 390×844 (ignored `artifacts/claude-baseline`). Baseline
  `uv run pytest`: 106 passed, 8 subtests, 9 dependency warnings (114.9s).
  Orange marks traced to persistent amber settlement rings and the amber base
  sphere in `MoonCanvas`. Added Claude project skills (`lunar-science`,
  `lunaros-ui`, `lunar-simulation`, `lunar-validation`) and root `CLAUDE.md`.
  AGENTS.md now permits the user-requested *preliminary screening score*
  (never habitability/safety), the candidate-neighborhood endpoint and
  deterministic rover kinematics. No code changed in this milestone.
  Pushed `3cc17f8`.
- **M2+M3 surfaces and selected-location data.** One left menu (Overlays,
  Places, Add asset) and one right drawer (Location, Settlement sites,
  Analysis tools, Asset, Missions, Simulation setup); phones get bottom
  sheets that keep the Moon visible. Overlays is one compact list with opacity,
  legend, coverage and *Source details* (terrain source, compare, display).
  The old atlas panel tabs became an explicit Analysis tools drawer. Eight
  `<select>`s became segmented radios; the Mission-details, Advanced-tools and
  header-utility dropdowns were removed. A shared location panel aggregates
  every prepared value from one `/atlas/inspect?dataset=best` sample (terrain,
  native resolution, solar visibility, Diviner temperature, geology, coverage,
  nearby assets) with *Unavailable here / Missing source data / Not prepared*
  states, then Technical details and Sources & provenance. Candidate rings,
  sectors and analysis outlines now render only while their panel is open.
  The mission globe mounts only while its shell is visible (it previously
  kept a second WebGL renderer alive in Explore). Scientific tiles retry once
  after a transient failure. M2 and M3 share one commit because the drawer
  and the panel replaced the same components.
  Validation: typecheck and production build pass; full Playwright run 63/64
  then the remaining dev-server tile flake fixed and re-run (8/8); journeys
  updated only where controls intentionally moved, numeric/provenance
  assertions retained. Python 115 passed + 8 subtests (includes the in-progress
  M5/M8 backend). Rendered review at all five sizes (`artifacts/claude-m3`).
  Pushed `611b889`.
- **M4 icons and orange cleanup.** Letter sprites (H/S/B/C/R) replaced by one
  local vector icon set (`lib/asset-icons.ts`: dome, panel, cell, dish,
  rover) drawn with Path2D on the globe and as inline SVG on the polar map;
  screen-sized badges, accent ring + halo when selected, hover shows name and
  type. Orange cause: settlement-candidate rings (`0xe7b879`) persisted after
  the panel closed and collapsed into squiggles at globe zoom, and the base site
  was an unexplained amber sphere. Rings now belong to the candidate browser,
  guides are accent blue and draped on the display mesh, and the base sphere
  is gone (the polar map keeps a labeled "Base site" ring). Opening a mission
  frames all assets (previously 2 of 5 were off-screen). Journeys assert
  vector markers per kind; an icon unit test rejects letter glyphs.
  Pushed `70a7e69`.
- **M5+M6 screening score and analysis grid.** `settlement-screening-v2` adds a
  Python preliminary screening score = 100 × (0.5 × low-slope area fraction +
  0.5 × mean modeled solar visibility); unevaluated criteria contribute 0 and
  lower data completeness (terrain-only ≤ 50%, labeled *Incomplete
  evidence*). Bands strong/promising/mixed/constrained always pair color with
  text and number; ranks are within evidence groups only. Temperature and
  geology stay descriptive. Candidate cards show rank, score, band, criterion
  bars, completeness and distance; *Why this score?* lists weights,
  contributions and basis. `POST /atlas/suitability/neighborhood` returns the
  candidate's exact native cells (same windows/weights); tests prove its
  fractions reproduce each candidate on polar 240 m and global grids. The globe
  draws those cells (low slope / steeper / missing) with a legend, hover
  readout and toggle, flies to the candidate, and clears rings and grid when
  the browser closes. Real Shackleton results score 24–49% (mixed or
  constrained): rough terrain is not inflated. Python suitability: 11 tests;
  settlement journeys 7/7; build passes. Pushed `524a27f`.
- **M7+M8 explained playback and rover routes.** A power-flow card restates
  each stored interval with fixed templates (`lib/power-flow.ts`): solar →
  bus → loads, battery charge/discharge with SOC start → end, curtailment,
  unserved demand, events, and a status (NOMINAL, POWER LIMITED, BATTERY
  RESERVE, POWER SHORTAGE; precedence documented in `docs/energy-model.md`).
  The timeline shows event marks (clickable); View details opens with a
  mission outcome (generated vs consumed kWh, unserved, shortage hours,
  minimum SOC, first shortage explained, MISSION COMPLETE at the end). Asset
  badges carry restrained state cues from the same interval. An optional
  six-step tutorial (How it works) attaches to the real controls, states that
  sunlight input is hypothetical, remembers dismissal and reopens. Rovers take
  an explicit great-circle route (`rover-kinematics-1`, Python): departure,
  speed, dwell, optional return; end-of-interval positions are stored in runs,
  so scrubbing backward and reloading reproduce them exactly. Energy-1.0 is
  unchanged (duty-cycle demand); stored runs from before still verify (digests
  now cover the stored field set; 4/4 local runs checked). Routes are set by
  clicking the Moon from the rover inspector and validated against terrain.
  The closest orbit is now 1.03 radii (~52 km) so analysis grids are legible
  (zoom-bound journey updated). One commit because the explanation, asset
  cues and rover markers share the same playback wiring in Explorer.
  Validation: full Playwright 67/68, then the zoom-bound expectation updated
  and re-run; new journeys cover explanation vs interval math, event marks,
  outcome, tutorial dismiss/reopen, rover start/mid/end, backward scrubbing,
  reload and UI route setup. Python rover tests 5; build passes. Rendered
  review at all five sizes (`artifacts/claude-m7`).

## Spatial workspace — verified and pushed

The new accepted plan is [The Moon is the application](docs/spatial-workspace.md).
Baseline main matched origin after fetch. Before screenshots were captured and
inspected at 1920x1080, 1440x900, 1366x768 and 1024x768.

Implemented three primary activities, direct command search, on-demand Places,
stable full-width canvases, bounded floating context/tools, simple layer rows,
concise selection and disclosed metadata. Existing regional analysis, missions,
placement, uncertainty and Python playback behavior are preserved. The previous
workspace stylesheet is replaced, rather than loaded beneath more overrides.
Rendered review corrected a stretched close button, status/panel collision,
phone Reset overlap, low-contrast map scale and a mission legend hidden behind
floating tools. The latter now moves to the free edge, with direct hit tests.
Phone name edits keep Save reachable. Catalog failures have independent error
state and retry; successful point queries cannot conceal a missing catalog.

The implementation was pushed as `c66a398` (ordinary push verified). Clean GitHub
[run 37130522577](https://github.com/lucasligenza/lunar-infra/actions/runs/37130522577)
passed on 2026-10-03: 106 Python tests plus eight subtests (27.64s; nine existing
dependency warnings), all 64 Chromium journeys (9.9m), real NASA acquisition,
frontend typecheck and production build. A clean local production run also passes
all 64 journeys (10.5m), alongside local Python (77.17s), build and typecheck.
No test was disabled.

Before/after screenshots were inspected at all four requested desktop sizes,
plus 390x844: Explore, selected terrain, overlays, palette, asset inspector,
compact/expanded playback, settlement screening and limited polar coverage.
No backend, source data, API, model, renderer or dependency changes.
Latest successful implementation commit: `c66a398`; acceptance docs follow it.
The earlier `a0ecd7d` run failed one metadata request (60/61 journeys passed);
the new run passes the persistent catalog failure/retry regression.
Active milestone: complete. Blockers: none. Next task: user review of the local
production preview; no additional science or design scope is started.
Retained limitations: polar environmental coverage, explicitly hypothetical
temporal simulation inputs, and Chromium-only visual validation. Details and
the CSS-viewport zoom qualification are in docs/spatial-workspace.md.

## Map color inspection — verified

User requested an explanation of the color at a clicked map location. The
existing atlas API already returned USGS geological classes, but the explanation
was below the layer controls and absent from the ordinary location inspector.
The browser regression reproduced that missing readout before implementation.

Implemented a shared color/unit/interpretation readout in the atlas, selected
region and global/polar mission inspectors. Source descriptions and scientific
limitations remain behind Source details. New selection brings the atlas readout
into view and highlights its categorical legend entry. Loading, failed queries,
unprepared sources and nodata clear stale colors. Classifications come from the
existing numeric source grid; no values are read from screen colors.

All 61 Chromium journeys passed against the production build (11.8m). A follow-up
regional-analysis check exposed a retained Overlays tab; opening analysis now
selects its actual tool and preserves the color readout. All four focused journeys
pass after that repair (42.8s). Typecheck and production build pass. Desktop,
regional-analysis and phone screenshots were inspected. No backend, dataset or
model changes. Next: the user's spatial-workspace redesign, with three primary
activities, a stable full-width canvas and temporary controls.
Latest successful push: `fa83571`; GitHub run 37056922702 passed 57 browser tests,
106 Python tests plus eight subtests, acquisition, types and build.

## UI overhaul — verified

User requested a broader visual overhaul after reviewing the previous redesign.
Current plan and fresh screenshot audit: [UI overhaul](docs/ui-overhaul.md).
Baseline `4d9372e` matches fetched origin/main; its GitHub run 36960549213 passed.

M1 implementation: refined shell and typography, shared line icons, compact
floating globe controls, real destination shortcuts, clearer region hierarchy
and native keyboard-operable scientific layer choices shared with missions.
Original metadata, polar limitations and rendered/not-prepared states remain.

Scientific integration: unchanged. No backend, API, model, source, renderer or
dependency changes. Current work is presentation and interaction refinement.
M1 validation: 22 relevant browser journeys pass across focused runs, including
all five viewport sizes, actual polar rendering, source/geometry preservation,
keyboard selection, no-overlap/hit checks, missions and playback. Before/after
screenshots inspected. Python: 106 tests plus eight subtests pass (133.88s), with
nine dependency deprecation warnings. Typecheck and production build pass.
M1 pushed as `c224f35`. GitHub run 37008949564 passed 56/57 journeys but found a
mission-globe status-label overlap; the explorer-specific CSS offset is now
scoped to Global Explorer. The local full run also caught a separating-space
regression in telemetry text; it is restored without changing assertions.
M2 implemented: contextual asset glyphs and grouped configuration, refined site
and mission surfaces, compact hierarchy for current readings, real SOC reserve
indicator, neutral demand chart and mobile scale/control separation. Existing
draft, revision, simulation and geographic state ownership is preserved.
Final local validation: all 57 Chromium journeys pass against the production
build (9.0m). The three focused regression journeys also pass (1.5m). Frontend
typecheck and production build pass; production startup took 287ms. Python's
106 tests plus eight subtests passed during this overhaul; no backend code changed.
Actual before/after screenshots reviewed across 1920×1080, 1440×900, 1366×768,
1024×768 and 390×844, including compact/expanded playback, asset/site inspectors,
polar layers and unsupported coverage. Tests retain numerical, source, revision,
failure-recovery and contrast checks, plus 125%/200% zoom-equivalent layouts.
The added reserve graphic is checked against returned SOC; map scale/control
separation is verified at all five sizes. No current development blockers.

Final milestone: `style: refine mission tools and simulation presentation`.
Pushed as `fa83571`; GitHub run 37056922702 passed all validation, correcting the
earlier CI layout regression. Approval access recovered after a temporary
account-usage review block; no action was bypassed.

## Prior mission workspace visual redesign — completed and pushed

Accepted roadmap and rendered audit: [mission workspace redesign](docs/mission-workspace-redesign.md).
Baseline d852791 matched latest main; previous CI passed. No backend APIs,
scientific data, numerical models, renderers or dependencies were replaced.

Completed milestones:
- M1: one Explore / Analyze / Build / Simulate header, closed default panels,
  compact contextual Add Asset palette and map control shelf. Pushed 89d037b;
  GitHub run 36955974128 passed all 53 journeys, science, types and build.
- M2: selection-driven asset/site inspectors, advanced/source disclosures,
  one Overlays control and honest polar coverage navigation/outline. Pushed
  0b19c37; run 36958233781 passed all 55 journeys and scientific/build checks.
- M3: compact SimulationBar and bounded SimulationDrawer, actual per-asset
  interval readings, distinct kW/current and kWh/summary metrics, retained
  playback/index/settings and Escape focus. Pushed 82c53e5;
  run 36959266765 passed all 55 journeys and scientific/build checks.
- M4: complete responsive/journey review, all-size palette/bar reachability,
  compiled-application smoke check and updated startup/help/architecture docs.

Validation:
- `uv run pytest -q`: 106 tests + eight subtests pass (69.41s); nine dependency
  deprecation warnings.
- Frontend typecheck and production build pass.
- Complete Chromium suite: 55/55 pass (9.9m). Numerical comparisons, revisions,
  source metadata, stale-state/error recovery and persistence assertions remain.
- Production `next start` (ready in 303ms): five actual browser journeys pass
  (45.7s), covering workspace selection, polar overlays and saved simulation.
- Before/after screenshots inspected at 1440×900 and 1366×768. Final review
  includes 1920×1080, 1024×768, 390×844 and zoom-equivalent 125%/200% layouts.
  Closed/open panels, empty terrain, placement, current/expanded playback,
  polar temperatures/sunlight and unavailable coverage were inspected.

Scientific integration unchanged: global GLD100/LOLA and existing geology,
native 240 m polar terrain, Diviner historical summer temperature and modeled
average solar visibility. Source values/masks/provenance remain authoritative.
The outline marks an analysis area, not guaranteed environmental availability.
Power time series remain explicitly hypothetical; no habitability claim added.
Desktop details are capped at 34dvh; mobile details use dismissible task sheets.
No current blockers. Source data, caches, SQLite and screenshots stay outside Git.

Final acceptance commit: `4d9372e`; GitHub run 36960549213 passed 55 browser
journeys, 106 Python tests plus eight subtests, fresh acquisition, types and build.
The user's subsequent UI-overhaul request is the current authorized scope.

## Prior targeted refactor (completed)

Targeted frontend refactor: [four-milestone plan](docs/targeted-refactor.md).
Baseline 533f8c7 is on origin/main (prior CI run 36874129533 passed). Clean audit:
104 Python tests + eight subtests and 49 Chromium journeys pass.

M1 scientific overlay repair is validated locally: 106 Python tests + eight
subtests; 12 relevant Chromium journeys (nine atlas/workspace plus three
environmental tests), typecheck and production build. Geographic fragment
sampling, polar-aware tile bounds and a bounded environmental budget preserve
finer display detail. Native Diviner patterns/nodata are retained. Confirmed
defects: complete-level coarsening reduced polar display to a few texture rows;
decoded transparent HTTP-200 tiles were mislabeled ready. Stale layer endpoints
are prevented; unprepared sources remain selectable with explicit status. Opacity
zero, missing selected measurements, loading and failed rendering are distinct.
Ready requires nontransparent mounted tiles and a subsequent renderer draw.
Actual polar screenshots and opacity pixel differences were inspected; shader
errors were checked. Detailed polar framing needs dozens of tiles, so cold
software-browser loading can exceed 15 seconds; imagery remains interactive and
progress is visible. Global tiles remain capped at 32; environmental textures at
96 (~24 MiB uncompressed). No source acquisition or numeric changes.

M1 pushed as 9e59aaa. GitHub run 36921099219 passed fresh scientific acquisition,
Python regressions, all 50 browser journeys, typecheck and production build.

M2 modular map-first workspace is validated locally. MissionWorkspace owns layout;
ScenarioControls and InfrastructureCatalog own their visual sections. Root hooks,
scenario state and API contracts are retained. Closed panels reserve no rail;
tools and inspectors are contextual and mutually exclusive, with mounted drafts
preserved. Five screen sizes (1920, 1440, 1366, 1024 and 390 pixels wide) and
125%/200% zoom-equivalent layouts pass. Actual desktop/laptop/mobile screenshots
were inspected. The 51-test regression run passed 45 cases; six old journeys
needed explicit panel opening and all pass in the 10-case follow-up, including
new bounding-box checks. Typecheck and production build pass. A continuity defect
found during review retained the previous environmental tile URL when selecting
terrain in Mission; registered metadata now synchronizes the URL and a browser
regression verifies the correct slope request and rendering.

M2 pushed as 411d323. GitHub run 36925142251 passed the full scientific,
typecheck/build and 51-browser regression suite.

M3 compact playback is validated locally: 11 simulation/draft/navigation/responsive
browser journeys pass, followed by all six responsive checks after an observed
mobile blank-pane correction. Typecheck and production build pass. Compact
playback retains UTC time, scrubbing, play/pause, speed, actual battery state at
interval end and interval-average kW. Expanded charts/events/provenance scroll
inside a bounded body with pinned collapse controls (42% of desktop height).
Mission totals are explicitly kWh. Collapse preserves the selected interval and
playback settings. Actual desktop/laptop/mobile screenshots were inspected;
mobile keeps the map when compact and uses a task pane for expanded charts.
The Python engine and stored simulation format are unchanged.

M3 pushed as 2b0e8b5. GitHub run 36926566298 passed fresh acquisition,
scientific/API validation, typecheck/build and all 51 browser journeys.

M4 settlement-to-mission flow is validated locally. Candidate selection exposes
the next action and coordinate-qualified mission creation; a successful creation
opens infrastructure, and Configure simulation opens actual input controls.
Saved missions remain directly accessible. Basic tools show one task, while
Advanced retains the full tool set and mounted drafts. New-mission names have
an independent draft, so preparing another candidate does not rename or move an
existing mission. The inspector shows calculated telemetry without a duplicate
site panel; site evidence remains in Design/Moon. Existing polar environment
options also remain represented in the global mission selector.

Final scientific/API regression: 106 Python tests + eight subtests pass (63.75 s).
The final full Chromium run passes all 51 journeys (8.8 minutes). An earlier
navigation test pressed Enter while a save disabled its command; the helper now
waits for the actual command to become enabled. All 11 focused draft/navigation/
settlement checks also pass, including old-scenario immutability and separate
name-draft checks. Typecheck and
production build pass. Actual handoff, habitat and calculated-playback screenshots
were inspected, along with all five viewport sizes and expanded controls. Review
also fixed a clipped tools Close button, with a bounds/text-width regression.
No datasets, screening math, simulator, persistence API or renderer were replaced.

M4 pushed as 5f9a657. GitHub run 36929206460 passed fresh acquisition,
scientific/API tests, typecheck/build and all 51 browser journeys. All four
feature commits are pushed and their GitHub checks are green:
9e59aaa / 411d323 / 2b0e8b5 / 5f9a657. HEAD matched origin/main after the feature
push. Latest successful feature commit: 5f9a657f01b6b6798851240210aaa25897729e94.
This acceptance record follows as a documentation-only commit.

Active milestone: none; the four targeted milestones are complete. Next: await
the user's next assignment; no extra features or scientific acquisition planned.
Remaining limits: environmental data covers the prepared ~96 km south-pole
square, with real nodata; Diviner is one historical summer/local-midnight bin,
not current or habitat temperature. Validated time-dependent illumination is
still unavailable, so power input is explicit hypothetical/synthetic. Screening
does not certify habitability or construction safety. Cold detailed polar color
loading may exceed 15 seconds; tests inspect Chromium and zoom-equivalent CSS
viewports, not every GPU/browser or native operating-system zoom combination.

The earlier roadmap records below are historical.

Accepted Moon/Mission simplification and settlement screening roadmap:
[implementation plan](docs/simplification-plan.md). M1-M4 are implemented and
pushed; M5 final disclosure, polar overlay coverage and regression review is validated locally.

- c5ff8d7: two primary workspaces, optional Help, collapsed technical tools.
- a5d6e22: reusable projected overlays and validated average solar visibility.
- 8c9e663: bounded Diviner summer/local-midnight temperature integration.
- 6af53c3: repair the nested mission-overlay browser selector. Both preceding
  pushes succeeded but their CI failed on this single ambiguous selector.
  [Run 36869298031](https://github.com/lucasligenza/lunar-infra/actions/runs/36869298031)
  passed fresh acquisition, 96 Python tests, typecheck/build and 41 browser tests.
- b846f58: explainable settlement screening, source-specific tradeoff groups,
  candidate selection and saved-mission/hypothetical-playback journey.
  [Run 36871057381](https://github.com/lucasligenza/lunar-infra/actions/runs/36871057381)
  passed fresh acquisition, 103 Python tests, typecheck/build and 48 browser tests
  after retrying a NASA download timeout. No substituted data or disabled checks.

Current local validation: 104 scientific/API tests plus eight subtests pass;
all 49 Chromium journeys pass (7.3 minutes). Typecheck and production build pass. M5 moves map
coordinates/display and detailed simulation parameters under Advanced, preserves
all old API defaults, and adds explicit best-native point inspection. Polar tile
levels coarsen completely within the existing texture budget rather than omit
visible longitude wedges. Candidate circles use a pole-safe tangent basis.

Thermal acquisition is 212,669,606 bytes, within the 300 MB budget. Native bins,
source hashes, CRS, version, calibration and period are recorded. There is no
current temperature or validated time-dependent solar mission input. Settlement
screening is preliminary protected-outpost comparison, not human/construction
safety certification or a universal habitability score. See
[the method](docs/settlement-screening.md). Latest confirmed green push: b846f58.
Rendered review includes actual opening globe, both polar overlays, candidate
evidence, desktop/laptop layouts, mobile task panel and calculated mission playback.
Five screen sizes and 125%/200% zoom-equivalent layouts pass browser checks.
Global visualization geometry and polar color sampling remain coarser than native
point analysis; the existing 2D map is retained under Advanced for finer inspection.
All requested implementation is complete locally. At commit time the final
milestone's push and fresh GitHub validation remain to be confirmed; the result
is reported after the push. No further scientific acquisition is planned.

The earlier phase records below are historical acceptance evidence.

Phase 5 is complete: lunar mission-control UX and design overhaul. Scope and observed baseline
are in docs/ux-audit.md. M1 audit: 91 Python tests plus eight subtests and 28 browser
tests pass; actual production screens and all five requested viewport sizes reviewed.
Confirmed mobile destination/region collision and mission inspector/camera overlap.
M2 repairs: toolbar and contextual dock ownership, responsive task panels and
fixed atlas chrome. 29 Chromium tests pass, including dock/camera layout checks;
actual desktop/profile, computed mission and mobile region/map screens reviewed.
M3: Explore / Analyze / Design / Simulate navigation and explicit contextual
transitions; location, independent drafts, saved scenarios and playback persist.
M4: coherent night/panel/elevated palette, locally bundled Geist Sans/Mono,
readable scientific labels/charts and contrast/focus checks. M5: Ctrl/Cmd+K commands share navigation,
layer and saved-simulation actions; console records actual UTC requests/readiness
and failures, capped at 100 session events. M6: six-step dismissible/reopenable walkthrough, Help / Settings,
persisted reduced-motion preference and explanatory blocked simulation states.
M7: local, production-browser and fresh GitHub acceptance pass; all seven milestones
are pushed and verified. Phase 5 is complete within the documented validation limits.
See docs/phase5-acceptance.md. Scientific datasets,
numerical logic, existing APIs and saved mission formats remain in the preserved scope.

Phase 4: global lunar atlas, scientific overlays and reusable regional analysis.
Core acceptance is complete locally and on GitHub, with fresh NASA/USGS acquisition,
91 Python tests plus eight subtests, 28 Chromium tests, typecheck and production build.
All seven implementation milestones are committed and pushed. See
docs/phase4-acceptance.md for actual rendered review, performance observations and
explicit optional dataset limitations. No AI or optimization is included.
Scope and baseline are documented in docs/phase4-plan.md.
Phase 3 acceptance is verified locally and on GitHub, including actual rendered
review and the production build. See docs/phase3-acceptance.md for coverage limits.
Phase 2 acceptance checks pass locally and on GitHub with fresh NASA acquisition.
All seven Phase 2 implementation milestones are committed and pushed. Real-data temporal
illumination is not integrated; synthetic/custom hypothetical runs are explicit.

## Completed milestones

- 9ed94f6 (pushed): verified global LOLA overview ingestion and initial architecture.
- 5933d31 (pushed): scientific monorepo foundation and real south-pole pipeline.
  NASA polar elevation and quantitative modeled illumination; bounded crop,
  CRS validation, nodata masks, local slope and aligned solar visibility.
- ab54689 (pushed): typed scientific inspection service, FastAPI endpoints,
  georeferenced PNG layers, readiness checks and explicit scientific error handling.
- 19d1437 (pushed): Next.js/OpenLayers lunar map, scientific layer controls,
  interactive selection, inspector, provenance, responsive layout and error recovery.
- d06426b (pushed, CI passed): acceptance evidence and GitHub scientific/browser
  validation on a fresh Linux runner with actual NASA acquisition.
- Final documentation milestone: record confirmed acceptance and remote validation.

## Historical milestone log

Phase 5 M1: repository/runtime audit complete, actionable layout/navigation/design
plan documented. Baseline screenshots are ignored artifacts; the audit mission
was removed after actual computed playback review. No user changes were present.
M1 audit 4c69fb6 pushed; GitHub CI 36801148539 passed.
M2 layout repairs validated: 29 Chromium tests, frontend typecheck and production
build. One post-review mission control adjustment additionally checked by the
two global-mission tests. Current milestone: fix: resolve overlapping mission
control panels. M2 09c80da pushed.
M3: four activities with one shared geographic/scenario context; asset editing
belongs to Design and temporal inputs, telemetry and playback to Simulate. Existing
URLs are supported. Draft/revision-conflict and mode-transition browser workflows
are retained. Validation: 29 browser tests, typecheck and production build.
Current milestone: refactor: simplify primary mission control navigation.
M3 26fde33 pushed; GitHub CI 36803470839 passed. M2 CI 36802762821 passed.
M4: centralized interface colors, restrained borders, readable technical values,
locally bundled/pinned fonts, accessible blue primary actions and reduced-motion
styles. Actual scientific/category colors and computations remain unchanged.
Validation: 30 browser tests (including rendered contrast/font/focus checks),
frontend typecheck and production build; actual atlas/mission/mobile screens reviewed.
Current milestone: style: implement lunar mission control design system.
M4 3496e5f pushed; GitHub CI 36804297500 passed.
M5: searchable keyboard command palette, verified destination navigation,
scientific layer/catalog actions and saved-profile simulation execution. Native
dialogs explicitly handle Escape from search inputs, trap/restore focus. The
collapsible activity console records real requests, IDs and layer readiness,
supports clear/dismiss/reopen and bounds session memory at 100 entries.
Validation: 32 browser tests, typecheck and production build; actual expanded
console/catalog screens inspected on desktop and mobile. No shell interpreter,
fake telemetry or persisted event logs are introduced.
Current milestone: feat: add mission control commands and activity console.
M5 7df7063 pushed; GitHub CI 36805965898 passed.
M6: optional six-step tour and Help with actual shortcuts/quantity explanations;
functional camera-motion and console settings; tour dismissal and motion
preference persist locally. Preference writes wait for initial reads, preventing
React development remounts from overwriting saved values. Scientific kind labels
have explanatory tooltips. Unsaved asset edits show an explicit simulation block.
Validation: 33 browser tests, frontend typecheck and production build; actual tour
and mobile settings dialog inspected. Current milestone: feat: add optional
mission workflow guidance. Next: final responsive/zoom-equivalent and complete
journey validation, followed by documented Phase 5 acceptance.
M6 72ab9a9 pushed; GitHub CI 36807276630 passed.
M7: complete flows A-G and all four activities at 1920x1080, 1440x900, 1366x768,
1024x768 and 390x844. Actual screenshot review, DOM pointer hit tests and scenario/
computed-telemetry checks cover selected regions, inspectors and timeline playback.
Short/zoom-equivalent windows scroll with a sticky header after a map-footer
occlusion was observed. Separate destination-popup compositing repairs an observed
dark rectangle on the idle WebGL globe. Responsive SVG axes and precise polar-data/
saved-state labels pass final validation. Full browser suite: 39 pass (5.1 minutes);
frontend typecheck and optimized production build pass. Both keyboard modifiers,
actual transformed axis font size and missing-global/polar-ready distinction pass.
preserved Python suite: 91 tests plus eight subtests. Native Chrome zoom and physical
handset testing are not claimed; CSS zoom equivalents and emulated viewports are
documented in docs/phase5-acceptance.md. Current milestone: test: validate mission
control layouts and user journeys. Acceptance is complete.
M7 7bbea57 pushed. Nine additional production-browser checks pass (1.2 minutes),
including the complete four-activity journey at all five sizes, zoom equivalents,
commands and guidance. Production HTTP readiness and the preserved NASA -705 m
sample at latitude -89.5, longitude 0 pass through the frontend proxy. Existing
API reused; optimized frontend available on http://127.0.0.1:3000. Fresh GitHub
[run 36809881870](https://github.com/lucasligenza/lunar-infra/actions/runs/36809881870)
passed for 7bbea57: pinned NASA/USGS acquisition, 91 Python tests plus eight subtests,
frontend typecheck/build and 39 Chromium tests (5.5 minutes). No skips or disabled
failing checks. Final documentation records verified acceptance; no further feature
phase is authorized.

Phase 4 milestone 1 d1d4dc0 pushed, CI passed: real GLD100 native global terrain, typed catalog, bounded
acquisition plan, independent atlas API and data-to-UI measurement inspector.
Baseline verified: 71 Python tests plus eight subtests and 17 browser tests pass;
initial rendered globe reviewed. GLD100 is pinned at 32 ppd / about 948 m
equatorial spacing; polar LOLA fill, null/saturation codes, source label and
unknown observation dates preserved. Raw download 132733440 bytes; outputs ignored.
Validation passed: 74 Python tests plus eight subtests, all 18 Chromium tests,
typecheck and production build. Native values match the original PDS array;
repeat preparation is identical and corrupt caches/missing data are rejected.
Rendered atlas inspector reviewed. Next: native global slope and 3D layers.

Milestone 2 c980eb3 pushed, CI passed (run 36785755743): native global slope and georeferenced 3D elevation/slope layers.
Central differences use latitude-dependent lunar distances and periodic longitude;
nodata and polar boundary rows stay missing. 256-pixel tiles load by camera with
bounded requests/GPU/disk caches, opacity, scientific legends and a synchronized
imagery/science reveal. Patches retain the existing terrain triangles exactly.
Validation: 79 Python tests plus eight subtests and all 20 Chromium tests pass;
independent spherical derivatives, seam/pole clipping and numeric-to-color parity
are checked. Actual elevation and slope screenshots inspected, with readable
controls and preserved globe interaction. Typecheck and production build pass.
Next: cube-sphere sectors, weighted AOI statistics
and native elevation profiles.

Milestone 3 e037ff1 pushed, CI passed (run 36787831715): cube-sphere sector hierarchy, globe highlighting/fly-to and browser
favorites; arbitrary radius or wrapped geographic extent; lunar-area-weighted
elevation/slope statistics, terrain relief, great-circle elevation profiles and
source-linked JSON/CSV exports. Regional analysis outside the polar footprint now
uses the 3D atlas; the original polar map and mission drafts remain intact. Atlas
source/layer/sector/results survive mode transitions. Validation: 83 Python tests
plus eight subtests and 22 browser tests pass. Profile endpoints retain exact
input coordinates after a cell-boundary regression fix. Desktop and mobile
interactions reviewed; chart labels enlarged and atlas header/tabs made sticky
after screenshot inspection. Focused browser regression and typecheck pass.
Production build passes. Next: validated USGS geology integration.

Milestone 4 3de62c8 pushed, CI passed (run 36789772731): USGS v2 global geology integration. Eight pinned archive members
acquired via bounded ranges (83855573 bytes transferred); original 12,247 polygons
and Moon 2000 projection validated. 49 interpreted classes rasterized at 16 ppd
with original colors/descriptions, categorical query metadata and a registered 3D
overlay/legend. Polygon and description codes Iohs/Ios remain explicitly qualified.
Raw polygons and the 16.6 MB class grid are ignored. Independent point-in-polygon
checks agree at sampled centers across near/far side and both poles. Range/CRC/
checksum guards, categorical transparency and numeric-to-color agreement pass.
Full validation: 86 Python tests plus eight subtests, 23 browser tests, typecheck
and production build pass; all six atlas tests repeated after the global LOD/limb
refinement. Actual geology globe screenshot reviewed. NASA PDS collection discovery
verified; thermal/mineralogical/resource/gravity integration limits recorded in
docs/dataset-discovery.md. Next: global hypothetical mission placement and final
atlas usability/performance acceptance.

Milestone 5 861ff94 pushed, CI passed (run 36792355155): global hypothetical mission integration. Saved scenario domains
select the original polar service or verified global numeric grid. Global asset
placement/edit/movement use native elevation; 3D sprites, selection/tooltips and
scientific overlays share the existing renderer. The unchanged Python energy
model records source metadata and artifact hashes and requires explicit synthetic
or hypothetical illumination. Saved definitions/results and selected playback
interval survive mode transitions/reopening. Native elevation/slope/source appear
in the global inspector; global terrain works independently of the polar cache.
Validation: 88 Python tests plus eight subtests and all 24 Chromium tests pass;
typecheck and production build pass. Actual desktop/mobile mission views reviewed;
asset sprites now render after scientific color patches to remain readable.
Close-up screenshots also revealed tile-center culling could hide valid science
patches. Conservative spherical tile extents now intersect the camera frustum;
a new seam/pole/close-up regression passes. All eight atlas/mission tests pass
after that fix; eight mission/polar failure-state tests pass after separating
global workflow availability from the polar cache. Full suite now contains 26
browser tests; its final all-at-once run follows in the acceptance slice.
Next: reusable bounded PDS collection discovery and final atlas acceptance.

Milestone 6 48b0166 pushed: verified collection registry and reusable PDS metadata discovery.
Requests cap at 20 records / 2 MiB, validate collection membership and file-size
associations, and retain SHA-256/UTC/source snapshots. The catalog browses original
labels, periods, indexed bounds and files; acquisition-budget controls start no
download. Live NASA requests returned the real 18-product Diviner GCP collection;
actual rendered catalog screenshot reviewed. No thermal numeric integration is
claimed; source axis/calibration validation remains necessary.
Validation: three bounded discovery/cache/API unit tests and the Chromium catalog
error/retry/budget/mobile workflow pass; typecheck and production build pass.
Existing atlas/scenario scientific definitions are preserved. Next: final rendered
review, resource/latency observations, missing-overlay recovery and acceptance.

Milestone 7 747bc46 pushed, CI passed (run 36796269865): final atlas acceptance and overlay failure recovery. Failed tile
requests retain an explicit error and retry action while independent native
measurements remain usable. Actual request/tile/GPU counters expose bounded
resources; retry and disposal are covered by a browser regression. Final rendered
desktop/laptop/mobile atlas profiles and controls were inspected. Floating controls
now composite separately from WebGL after screenshots revealed dark painting
artifacts beneath the drawer and camera controls; reviewed renders no longer show
those artifacts. No continuous redraw or larger terrain download was introduced.
Full local validation: 91 Python tests plus eight subtests and 28 Chromium tests
pass. Final compositing change has 12 focused browser/visual checks and six further
global mission/mode/recovery checks; all pass. Final typecheck and production build
pass. Three additional optimized-production browser workflows pass; actual geology
and mission desktop/mobile renders were reviewed. GitHub run 36796269865 passed
fresh pinned acquisition, all 91 tests/eight subtests, typecheck/build and all 28
browser tests without skips. See docs/phase4-acceptance.md for complete
functional coverage, source limits and measured warm-cache latency/resource counts.
The first discovery CI run (36793305496) failed one overbroad CRS text selector
after catalog metadata expanded; its other 26 browser tests and scientific/build
checks passed. The selector now targets the measurement inspector. No tests are
disabled or bypassed; the final fresh run verifies the correction. Phase 4 core
acceptance is complete. The local production app and scientific API are running
at http://127.0.0.1:3000 and http://127.0.0.1:8000 at handoff.

Phase 3 milestone 1 a07b772 pushed: audit and renderer/data investigation complete. Baseline
69 tests plus eight subtests and 10 browser tests pass; existing UI screenshots
captured and visually inspected. Cesium ion requires account/token and hosted
terms; Three.js plus NASA textures/validated global LOLA is the selected fallback.
Milestone 2 0a1b6a8 pushed: reproducible global NASA acquisition, coarse elevation/coverage API
and source-linked destinations implemented. Global preparation repeats identically
and retains every native elevation sample. Full suite: 71 tests plus eight subtests
pass, including two new global scientific/API tests. Native observation periods,
source hashes, nodata and separate visualization/analysis coverage are recorded.
Milestone 3 6ae6269 pushed, CI passed: Three.js global lunar terrain, progressive NASA imagery, surface
picking, source-linked destination search/fly-to, layer/camera controls and shared
mode shell implemented. Two new browser/coordinate tests pass; rendered initial
and selected-region screenshots inspected; marker sizing and button contrast fixed
after visual review. All 12 browser tests and production build pass. Idle rendering now occurs only when
the view changes; global navigation passes in 19.1 s on software Chromium.
Milestone 4 93f6435 pushed, CI passed: connected mode/scenario continuity implemented. Global selection
opens real local inspection; unsupported regions show a coverage state rather
than an unrelated map. Scenario drafts, assets, camera and selected simulation
interval survive mode changes; hidden playback pauses. Two added browser tests
pass, including actual rendered marker-coordinate checks. All 14 browser tests,
typecheck and production build pass. Regional, mission and
global-with-assets screenshots captured and visually inspected.
Milestone 5 5c53d23 pushed: responsive/failure-state review and camera regressions complete locally.
All 17 browser tests, typecheck and production build pass; the final rapid-switch
coverage guard also passes its focused regression. Laptop (1280x800), desktop
(1440x1000) and mobile (390x844) screenshots inspected. Mobile copy/panel overlaps
were corrected; missing/global-loading states and local panel collapse tested.
First decoded imagery measured 0.25 s from renderer creation on local Chromium;
at-rest draw counts remain stable. This is not a universal device benchmark.
Final fresh-run CI passed; acceptance documentation records the completed review.
The production application runs locally with verified NASA datasets.

Phase 2 milestone 1 b033422 pushed: audit and mission-control layout.
Milestone 2 ff5035b pushed: typed assets, SQLite scenarios and validated CRUD API.
Milestone 3 b180a1a pushed: scenario explorer and interactive asset placement.
Milestone 4 f3a9e76 pushed: deterministic energy engine and numerical tests.
Milestone 5 084b39c pushed: simulation API and immutable stored runs.
Milestone 6 21c85e4 pushed: explicit mission inputs, computed telemetry, charts and playback.
Milestone 7 f93ba88 pushed, CI passed: final regression fixes, responsive navigation
and acceptance evidence. Documentation handoff records confirmed remote validation.

## Validation results

- Phase 3 local suite: 71 Python tests plus eight subtests; 17 Chromium tests;
  TypeScript and production build pass. Delayed coverage also passes its final
  focused regression. Source integrity, actual coordinates/markers, destination
  navigation, camera limits, mode/scenario continuity and missing-data recovery
  are tested. Acceptance and rendered review are in docs/phase3-acceptance.md.
- All five Phase 3 implementation/audit commits have successful GitHub runs. Final fresh-data
  [run 36773865632](https://github.com/lucasligenza/lunar-infra/actions/runs/36773865632)
  for 5c53d23 passed: pinned NASA acquisition, 71 Python tests plus eight subtests,
  typecheck, production build and all 17 Chromium tests.
- Final production Chromium check: real globe loads; global/regional/mission
  transitions pass with zero page errors. Root and health/global/destinations/
  inspection/scenario proxies return HTTP 200; original elevation remains -705 m.
- Final Phase 2 suite: 69 Python tests plus eight subtests pass; all 10 Chromium
  tests, TypeScript validation and production build pass. Actual NASA integration
  checks run without skips. New regressions cover missing/non-finite input factors,
  custom UTC missions, concurrent edit conflicts, independent drafts surviving
  unrelated saves, explicit reopen resetting drafts, corrupt run schemas and
  consistent shortage tolerances. Small-screen section navigation is tested.
- All six preceding Phase 2 commits have successful GitHub validation. Latest
  confirmed [run 36725728488](https://github.com/lucasligenza/lunar-infra/actions/runs/36725728488)
  passed for 21c85e4. Final [run 36729018094](https://github.com/lucasligenza/lunar-infra/actions/runs/36729018094)
  passed for f93ba88: fresh pinned NASA acquisition, 69 Python tests plus eight
  subtests, frontend typecheck/build and 10 browser tests. No skips.
- Final production frontend and same-origin health/scenario endpoints return HTTP
  200; the API is ready with verified datasets and the real -705 m inspection sample.
- Playback browser test compares API results to displayed generation/load/SOC and
  shortage telemetry; tests interval scrubbing, speed/play/pause, chart window,
  collapse/expand, stale-result clearing and reopening a current saved run.
  Desktop and mobile simulation screenshots reviewed; no horizontal overflow.
  All eight browser tests, frontend typecheck and production build pass.
- Simulation API milestone: full suite passes 66 tests plus eight subtests.
  Runs reopen after restart, repeated inputs have identical results/hashes,
  later edits preserve snapshots, stale revisions/missing profiles are rejected,
  corruption is detected and schema migration/cascade deletion are verified.
- Energy engine: 15 numerical tests pass, including 30 seeded randomized balance
  cases, exact fractional-interval shortage onset, step refinement, stable multiple
  battery dispatch, efficiencies, all storage limits, inactive assets and invalid
  input/precision rejection. The preceding full suite passed 60 tests; three new
  regressions also pass (63 total tests now present).
- Infrastructure browser integration covers create/place/edit/move, invalid
  placement preserving saved state, reload/reopen, duplicate and confirmed removal.
  Configuration saves show the backend revision; unsaved edits are explicit.
  All seven Chromium tests, typecheck and production build pass. Infrastructure
  screenshot reviewed: real map, base marker, selected asset and editable units.
- Scenario milestone: 48 Python tests plus eight subtests pass, covering restart
  persistence, all asset types, duplication, deletion, invalid/nodata locations,
  invalid batteries/time axes and simultaneous revision conflicts/rollback.
- Phase 2 audit/layout: 33 Python tests plus eight subtests, six browser tests,
  typecheck and production build pass. Added tool-collapse coverage passes.
  Desktop screenshot reviewed; map remains unobstructed and controls functional.
- 33 tests pass, with eight additional unittest subtests. No failures or skipped
  real-data integration tests in this environment.
- Analytic projection comparisons, pole and coordinate validation, half-open bounds,
  known planes, nodata stencils, anisotropic pixels, CRS variants and grid alignment.
- Real-data processing repeats identically and preserves every cropped elevation
  sample. Output rasters align exactly; illumination resampling is tested.
- API tests cover typed responses, valid zero, nodata, invalid/outside queries,
  missing/corrupt files, OpenAPI schemas and PNG transparency. A real API query
  matches its registered GeoTIFF pixel exactly.
- Region: 400 x 400 cells; elevation -4242.5 to +1954.5 m; maximum slope 35.1239 deg.
  All 160000 cells are valid in each layer.
- Six Chromium browser tests pass using actual prepared NASA rasters, including
  cold startup of both servers, JS/PyProj transform parity, click/form inspection,
  all layers, pan/zoom, provenance, mobile layout, outside-region and API/raster retry.
- Frontend TypeScript validation and production build pass. Desktop and mobile
  screenshots were inspected; controls remain usable without overlap.
- [GitHub run 36715026163](https://github.com/lucasligenza/lunar-infra/actions/runs/36715026163)
  passed for d06426b on 2026-09-30: fresh NASA acquisition, 33 Python tests and
  eight subtests, frontend type checking/build and six Chromium tests. No skips.
- Local production frontend and API readiness/proxy return HTTP 200 and the
  real -705 m sample at latitude -89.5, longitude 0.
- Rasterio emits affine multiplication deprecation warnings internally. Local code
  uses the supported matrix operator; numerical results are unaffected.

## Dataset integration status

- WAC_GLD100_E000N1800_032P v1.4: pinned native 5760 x 11520 PDS grid,
  32 ppd, approximately 948 m equatorial cells. Special/null codes preserved;
  derived physical-distance slopes, numerical queries/statistics/profiles and
  progressive 3D coloring are ready. WAC coverage is supplemented by LOLA polar
  fill; observation dates and surveyed inter-frame registration remain unspecified.
- Unified_Geologic_Map_of_the_Moon_GIS_v2 (2020 v2): eight pinned members from
  the original USGS archive, 12,247 source polygons, 49 interpretive units and
  original classification colors/descriptions. Categorical 16 ppd queries/3D layer
  are ready; Moon 2000 source projection and Iohs/Ios description discrepancy retained.
- Diviner GCP: 18 real collection products discovered from verified PDS labels,
  with bounded metadata snapshots and original file sizes/checksums. Temperature
  values are not acquired or integrated; PDS3/PDS4 axis/calibration validation remains.
  Mineralogical, resource and gravity adapters are also explicitly unavailable.
- LDEM_4 V3.0: preserved native global 1440 x 720 int16 grid, 0.25 degrees,
  DN * 0.5 m on the same lunar sphere/frame. Global inspection and coverage API
  validate separately from the polar store. Observations 2009-2016.
- NASA SVS 4720 visualization: pinned 2019 1k JPEG/4k TIFF, dimension-preserving
  JPEG preparation. Adjusted color/polar fill are visualization only. Global
  browser payload is about 4.53 MB including native elevation, with small imagery
  first. data/globe-sources.json and data/ldem_4.json record hashes and provenance.
- LDEM_75S_240M V2.0: 29062688-byte polar DEM, observations 2009-07-13 through
  2017-02-02. Crop retains the native 240 m grid over a 96 x 96 km pole region.
- AVGVISIB_85S_060M_201608 V1.05: 51166728-byte modeled solar visibility, native
  60 m, area-averaged to the exact terrain grid. NASA describes hourly modeling
  over 18.6 years; exact simulation calendar dates are unspecified.
- data/polar-sources.json pins source URLs and hashes. Raw and processed rasters
  and their local registry are ignored. Moon sphere and ME/PA DE421 frame validated.

## Known scientific limitations and blockers

No current implementation blocker. 240 m slopes cannot resolve landing hazards.
The visual globe retains its coarse 1-degree LOLA mesh and at most 4k imagery.
Phase 4 native GLD100 queries/derived slopes use 0.03125-degree cells and progressive
scientific color tiles; colored overlays do not increase geometric resolution.
Detailed 240 m local analysis retains the prepared polar footprint; global missions
use the available native global terrain with explicit coarser-resolution/frame
qualifications. Destination centers are rounded navigation aids, not surveyed sites.
Illumination is modeled long-term visibility and uses older underlying terrain.
Time-dependent NASA illumination is not integrated, so real-data mission playback
is unavailable. Energy runs use explicitly labeled hypothetical factors; the model
omits thermal coupling, degradation and spatial shading. See scientific-assumptions.md
and docs/energy-model.md. SQLite scenarios/results are local and excluded from Git.
One bounded Diviner summer/local-midnight layer is prepared; thermal extrema and
mission time series remain unavailable. Mineralogical/resource/gravity numerical
layers are not prepared. Verified provider metadata alone does not imply integration.
Geology is interpretation at 1:5,000,000 map scale, not proof of extractable resources.
Git writes and outbound networking require elevated execution in this environment.

## Latest successful commit

Latest confirmed pushed and CI-validated feature: b846f58, settlement screening,
[GitHub run 36871057381](https://github.com/lucasligenza/lunar-infra/actions/runs/36871057381).
The CI repair 6af53c3 is independently green in run 36869298031.
The current milestone's own hash is available through
`git log -1 --format=%h -- PROGRESS.md`; its push/CI outcome is reported separately.

## Next development task

Local functionality, production build, complete browser/rendered review and
scientific checks pass. Confirm the final milestone's fresh GitHub validation;
when green, this accepted roadmap is complete. Preserve
explicit unknowns and existing scenarios; do not expand into AI, new datasets or
unrequested engineering models.
