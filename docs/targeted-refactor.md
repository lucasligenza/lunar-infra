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
