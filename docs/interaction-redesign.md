# Interaction redesign — simpler surface, richer function

Baseline `b8422f6` (clean main, equal to origin). This phase builds on the
accepted [spatial workspace](spatial-workspace.md). Latest user requirements
supersede earlier UX restrictions where they conflict; scientific rules do not
change.

## Observed baseline (rendered, not inferred)

Production build of `b8422f6`, Chromium, 1920×1080, 1440×900, 1366×768,
1024×768 and 390×844 (ignored `artifacts/claude-baseline/*`). 106 Python tests
and 8 subtests passed.

| Area | Observation |
| --- | --- |
| Orange marks | Settlement-candidate rings (`0xe7b879`) stay on the globe after the candidate panel closes and collapse into orange squiggles at globe zoom; the mission base site is an unexplained amber sphere. Same color as the polar coverage outline. |
| Asset markers | Letter sprites (H/S/B/C/R) overlap at mission scale; Build opens so close that 2 of 5 assets are visible. |
| Overlays | One panel mixes layer choice, geology readout, settlement search, location details and an Advanced toggle that adds four tabs and a dataset `<select>`. |
| Location | Explore shows elevation/slope only; solar, temperature, geology and coverage are hidden in other panels or Advanced. |
| Candidates | Generic copy pushes results below the fold; titles are raw coordinates ("Promising tradeoff · −89.505° …"); no rank, score or completeness. |
| Simulation | "Unserved 9.15 kW / Power shortage" without cause; surface never reflects state; robot never moves; no event marks on the timeline. |
| Controls | Six `<select>`s and nested `<details>` menus (Mission details, header utilities, screening settings). |
| Inspector | Inner scroll clips Remove asset at 1024×768. |
| Phone | Every panel replaces the Moon entirely. |

## Surface model

One canvas; one surface per region. Opening a surface in a region replaces the
previous one. Escape/× closes and keeps drafts.

- **Top-left menus:** Overlays (what is drawn), Places, Add asset.
- **Right drawer:** Location · Candidates · Asset · Missions · Simulation
  setup · Analysis tools (regional analysis/catalog, from commands/location).
- **Bottom:** simulation bar with power flow; bounded details drawer.

Dataset/source choice moves to Overlays → Source details. Selects become
segmented controls or rows unless a select is genuinely needed.

## Milestones

1. Onboarding, project skills, rule update, baseline audit (this record).
2. Separate contextual surfaces; compact Overlays; remove unnecessary selects.
3. Universal selected-location inspector aggregating every prepared value.
4. Vector asset icons in Three.js and OpenLayers; orange-marker cleanup.
5. Settlement screening score (v2) and candidate browser.
6. Candidate neighborhood grid from actual evaluated cells.
7. Deterministic power-flow explanation, mission status and tutorial.
8. Rover routes with deterministic, time-derived playback.
9. Final simplification, responsive review and acceptance.

Each milestone: tests, rendered review at all five sizes, PROGRESS.md, one
conventional commit, ordinary push.

## Implemented interaction model

- **Overlays** — the only visualization control. Rows: Imagery, Elevation,
  Slope, Solar visibility, Temperature, Geology (Polar / Not prepared badges);
  the active row adds its product name, opacity, legend, render status and
  coverage. Terrain source, comparison and display toggles are under Source
  details. A compact legend chip stays on the canvas while a layer is active.
- **Location** — every prepared value at the selected point from one
  `/atlas/inspect?dataset=best` sample, grouped Terrain / Environment / Geology /
  Data coverage / Mission context, then Technical details and Sources &
  provenance. Footer actions: Find settlement sites, Create mission, Analyze.
- **Settlement sites** — candidate cards with the preliminary screening score,
  band, criterion bars, completeness and distance; selection flies to the
  candidate and draws its native analysis cells (toggle, legend, hover).
- **Analysis tools** — regional statistics, profiles, sectors and the dataset
  catalog; opened from Location or commands, never by default.
- **Build** — Add asset palette, Missions drawer (rename, saved missions,
  placed assets, base site), Asset inspector (including rover routes).
- **Simulate** — Setup drawer, power-flow card, event marks on the timeline,
  outcome in View details, and an optional six-step tutorial (How it works).

Escape closes the newest surface first (menu, then drawer). Below 900 px the
surfaces are bottom sheets and only one is open at a time. Every colored mark
on the Moon belongs to an open surface or is explained on hover.
