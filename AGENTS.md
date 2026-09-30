# LunarOS engineering rules

Implement the user's Phase 3: global 3D exploration, destinations, connected viewing
modes and UI redesign. Preserve Phase 1 science and Phase 2 missions/simulations.
Optimization and AI are outside this assignment.
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
