---
name: lunar-validation
description: Use before declaring any LunarOS milestone done, committing or pushing. Defines the required tests, rendered review, PROGRESS.md update and the authorized Git workflow.
---

# LunarOS completion workflow

Evidence before claims. A milestone is done only when every applicable step
below has actually run and passed in this session.

## 1. Before editing

```bash
git status
git fetch
git status -sb   # confirm branch and relation to origin/main
```

Preserve unrelated user changes. Read `PROGRESS.md` and recent commits.

## 2. Checks (repository root unless noted)

| Change | Required |
| --- | --- |
| Python / science / API | `uv run pytest` (all; no `-k` filtering for the final run) |
| Frontend | `cd frontend && npm run typecheck && npm run build` |
| UI or journeys | `cd frontend && npm test` (Playwright, real prepared data) |

- Never skip, `.only`, `.skip`, `xfail` or weaken a scientific/numerical
  assertion to get green. If a journey's *intended* UI changed, update the
  selector while keeping the value/provenance assertion.
- Playwright reuses running servers on 8000/3000. A stale `next start` build
  will not include your changes — rebuild or use `next dev`.

## 3. Rendered review

Capture and **look at** screenshots at 1920×1080, 1440×900, 1366×768,
1024×768 and 390×844 for every state touched (see the `lunaros-ui` skill).
Fix congestion, overlap, overflow and unexplained colors before committing.

## 4. Record

Update `PROGRESS.md` with what changed, test counts/durations, the rendered
review and remaining limitations. Update affected docs (README, AGENTS.md,
`docs/*`) concisely.

## 5. Commit and push

- Stage intended paths explicitly (`git add <paths>`); never `git add -A`.
- Conventional commits (`feat:`, `fix:`, `style:`, `refactor:`, `test:`,
  `docs:`); one milestone per commit, no giant mixed commits.
- `git push` normally. **Never** force-push, rewrite history, amend pushed
  commits, or change global Git config.
- Never commit raw/processed data, caches, SQLite, screenshots or secrets.
- Report the pushed commit hash.
