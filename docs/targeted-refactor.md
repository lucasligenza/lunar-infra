# Targeted frontend repair

Baseline: main 533f8c7 matches origin/main; clean working tree. Existing scientific
services, Three.js globe, OpenLayers local map, revision-checked scenarios and
Python simulation remain in place. No dataset acquisition or numerical model changes.

1. Repair polar scientific texture mapping and report preparation, transparent
   coverage, loading and rendering failure honestly. Verify real NASA tiles and
   the rendered globe; retain native numeric sampling.
2. Extract mission workspace layout from Explorer. Open contextual tools and
   inspectors on demand, with predictable map resizing and mobile task panels.
3. Keep timeline playback/scrubbing and actual interval telemetry compact by
   default; disclose bounded charts, cumulative energy and source details.
4. Improve settlement evidence → saved mission → infrastructure → simulation
   transitions. Preserve direct saved-mission access and scientific qualifications.

Observed baseline: both environmental rasters are registered/prepared, return
transparent pixels outside the ~96 km polar square, and preserve original values.
The rendered polar footprint is small and radially coarse at level 2. Native
Diviner bins also contain radial patterns; these must remain in the visualization.
Linear mesh UV interpolation is singular at the pole. Tile success also incorrectly produces a ready label
for fully transparent camera tiles. Existing browser assertions tested readiness,
not actual color visibility. Permanent tool/inspector rails compete with the map;
Timeline initializes expanded. Baseline: 104 Python tests plus eight subtests pass.
Browser baseline and subsequent rendered reviews are recorded in PROGRESS.md.

## Changed files

- Scientific rendering/registration: `backend/app/services/atlas_tiles.py`,
  `backend/tests/test_environment.py`, `frontend/lib/atlas-render.ts`,
  `frontend/types/atlas.ts`, `frontend/components/globe/MoonCanvas.tsx`,
  `AtlasPanel.tsx`, `AtlasLegend.tsx` and `MissionMoon.tsx` in the same globe folder.
- Workspace/playback/flow: `frontend/components/Explorer.tsx`,
  `frontend/components/globe/SettlementPanel.tsx`, and
  `frontend/components/mission/MissionWorkspace.tsx`, `ScenarioControls.tsx`,
  `InfrastructureCatalog.tsx`, `Timeline.tsx`.
- Layout: `frontend/app/globals.css`, `mission-control.css`, `exploration.css`.
- Browser regressions under `frontend/tests`: `commands.spec.ts`,
  `environment.spec.ts`, `explorer.spec.ts`, `global-missions.spec.ts`,
  `globe-usability.spec.ts`, `layout.spec.ts`, `mission-regressions.spec.ts`,
  `missions.spec.ts`, `modes.spec.ts`, `responsive.spec.ts`, `settlement.spec.ts`,
  `simulation.spec.ts`, and shared `workspace.ts`.
- Documentation: `AGENTS.md`, `README.md`, `PROGRESS.md`,
  `docs/ARCHITECTURE.md`, `docs/ux-audit.md`, and this plan.

The existing GlobalExplorer, OpenLayers map, thermal ingestion, API contracts,
scenario hooks, revision handling and Python simulation engine are retained.
Raw data, generated rasters, screenshots, test traces and local databases are ignored.

## Acceptance

All four feature milestones are implemented, committed, pushed and green on GitHub:

| Milestone | Commit | Fresh validation |
| --- | --- | --- |
| Scientific overlays | 9e59aaa | [36921099219](https://github.com/lucasligenza/lunar-infra/actions/runs/36921099219) |
| Map-first workspace | 411d323 | [36925142251](https://github.com/lucasligenza/lunar-infra/actions/runs/36925142251) |
| Compact playback | 2b0e8b5 | [36926566298](https://github.com/lucasligenza/lunar-infra/actions/runs/36926566298) |
| Settlement-to-mission flow | 5f9a657 | [36929206460](https://github.com/lucasligenza/lunar-infra/actions/runs/36929206460) |

Final local validation: 106 Python tests plus eight subtests; all 51 Chromium
journeys in one complete run; typecheck and production build. Rendered baseline
and final review include both environmental overlays, missing/unprepared/error
states, contextual tools/inspectors, candidate evidence, habitat placement,
saved missions, compact/expanded charts and real calculated playback. Five
screen sizes and 125%/200% CSS zoom equivalents are covered. Earlier interaction
failures were repaired and rerun; no tests were disabled or skipped for a commit.

Confirmed defects were coarse complete-level polar tile selection, readiness
claimed for decoded transparent HTTP-200 tiles, and stale scientific tile URLs
when switching layer in Mission. Geographic per-fragment sampling avoids pole
UV interpolation artifacts. Native Diviner radial structure and nodata remain.
Rendering resolution is distinct from native numerical analysis resolution.

Environmental coverage and temporal limitations remain explicit: the prepared
south-pole square, a single historical Diviner season/local-time bin, average
solar visibility rather than time-resolved sunlight, and preliminary settlement
screening. Cold detailed polar views can take over 15 seconds to color; the base
Moon stays interactive with loading progress. Cross-browser/GPU validation and
native OS zoom are not claimed. No new dataset or numerical model was added.
