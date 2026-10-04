# LunarOS engineering rules

Implement the interaction redesign in docs/interaction-redesign.md on top of the
accepted spatial workspace (docs/spatial-workspace.md): one canvas, one contextual
surface per screen region, separate Overlays / Location / Asset / Candidate /
Simulation surfaces, vector asset icons, explained simulation playback.
Preserve existing science, missions, simulations and location state. Primary
navigation is Explore / Build / Simulate; regional analysis remains available
contextually and through commands. No new datasets, AI or LLM-generated text.
User-authorized additions for this phase only: the preliminary screening score,
a typed candidate-neighborhood endpoint, and deterministic rover kinematics.
Use actual rendered browser review and journey tests.

Preliminary screening score (settlement-screening-v3, docs/settlement-screening.md):
- A 0–100% relative engineering-screening aid computed in Python. Never call it
  habitability, safety, construction suitability or mission-success probability.
- Score only criteria prepared for the entire Moon (currently native terrain
  slope: score = 100 × low-slope area fraction). Polar-only evidence (average
  solar visibility, Diviner temperature) and geology stay descriptive and never
  enter scores or rankings. Missing data must never raise a score.
- Deterministic, with contributions shown; data completeness shown separately;
  rank only within one terrain grid. Keep the detailed evidence view.
Keep numerical code independent of HTTP, UI, and AI. Follow the accepted roadmap
and the user-authorized incremental commit/push workflow in PROGRESS.md.

- Inspect Git status before editing; preserve unrelated user changes.
- Pin scientific source URLs, versions, checksums, lunar CRS, units and periods.
- Never use Earth CRS defaults, invent measurements, or substitute mock data.
- Synthetic inputs belong only in mathematical tests or explicitly labeled
  hypothetical simulations. Never turn NASA average visibility into eclipse times.
- Keep simulation in Python, record input snapshots/model versions and verify
  interval energy balances. No thermal/degradation claims without modeled physics.
- Save scenarios through the API with revision checks; ignore local SQLite files.
- Keep nodata distinct from valid zero. Check CRS, grid origin and resolution
  before combining rasters. Document resampling and derivation.
- Raw and processed datasets, .env files, caches and secrets stay out of Git.
- Run `uv run pytest` for scientific/API changes and frontend typecheck, tests,
  and build for UI changes. Never bypass a failing test to commit.
- Stage intended paths explicitly. Use conventional commits and ordinary pushes.
  No history rewrites, force pushes or global Git configuration changes.
- Update PROGRESS.md in each meaningful milestone and report pushed commit hashes.

Run commands from the repository root unless documented otherwise. The legacy
`lunaros` module retains the original global overview ingestion; active Phase 1
scientific code lives in `backend/app`, with the browser in `frontend`.
