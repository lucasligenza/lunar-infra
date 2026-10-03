# LunarOS — Claude entry point

Read `AGENTS.md` first: it holds the binding engineering and scientific rules.
`frontend/AGENTS.md` notes that this Next.js version differs from older docs.

## Start every session

1. `git status`, `git fetch`, confirm the branch matches `origin/main`.
2. Read the top of `PROGRESS.md` and `git log --oneline -15` to learn what was
   accepted most recently and why.
3. Load the project skills that match the work.

## Project skills (`.claude/skills/`)

| Skill | Use for |
| --- | --- |
| `lunar-science` | Coordinates, rasters, overlays, point data, screening, any displayed measurement |
| `lunaros-ui` | Layout, panels, menus, markers, icons, CSS, interaction flow |
| `lunar-simulation` | Energy engine, rover motion, mission schemas, playback, explanations |
| `lunar-validation` | Before claiming done, committing or pushing |

Scientific and UI work usually need two of these together.

## Where things live

- `backend/app` — FastAPI, numerical services, Python simulation (Phase 1+)
- `frontend` — Next.js / React / Three.js / OpenLayers browser
- `docs/` — method and design records; `docs/ARCHITECTURE.md` for data flow
- `lunaros/` — legacy global-overview ingestion CLI only

Run commands from the repository root unless a doc says otherwise.
