---
name: lunaros-ui
description: Use when changing LunarOS frontend layout, panels, menus, markers, icons, CSS or interaction flow. Keeps the Moon-first spatial interface coherent, minimal and contextual, and requires rendered browser review.
---

# LunarOS interface

**The Moon is the application.** The canvas owns the viewport; everything else
is temporary, contextual and small. It should read as geospatial / mission-
control software, not an admin dashboard, a wall of forms or cyberpunk fiction.

## Surface model

One canvas plus at most one contextual surface per screen region:

| Region | Surface | Owns |
| --- | --- | --- |
| Top-left | Overlays menu, Places, Add-asset palette | What is drawn / what to place |
| Right | Context drawer: Location · Candidates · Asset · Mission · Simulation setup · Analysis | The thing currently selected |
| Bottom | Simulation bar (+ bounded details drawer) | Playback and results |
| Header | Explore / Build / Simulate, Search (Ctrl/Cmd K), Help | Navigation only |

- Opening a right-drawer surface replaces the previous one; it never stacks.
  Closing (×, Escape) restores the canvas and keeps drafts in hooks.
- Overlays only controls visualization. Location only describes the selected
  point. Asset inspector only configures the selected asset. Candidate browser
  only screens sites. Simulation controls only set up/play/explain results.
- Dataset/source selection lives under **Source details**, never in the
  primary overlay list. Users choose *what to see*, not *which raster*.
- Below 900 px wide, drawers become dismissible bottom task sheets.

## Controls

- Ask of every `<select>`: does this need to be a select? Prefer segmented
  controls, radio rows, icon buttons, toggles, sliders or direct actions.
- No nested dropdowns or `<details>` inside `<details>` for primary tasks.
  Progressive disclosure is fine for provenance and advanced parameters.
- One scroll container per drawer. No nested scrolling.
- Every surface has an obvious next action and a close affordance.

## Visual language

- Tokens: `frontend/app/mission-control.css` (spacing, z-index) and
  `spatial-workspace.css` (palette, shell). Do not add a competing stylesheet.
- Palette: graphite surfaces, accent `#91BDF0`, nominal `#53B987`,
  warning `#D7A44B`, failure `#D96B6B`. Status color is always paired with
  text or a number — never color alone.
- Geist Sans for prose/controls; Geist Mono only for coordinates,
  measurements, IDs, UTC timestamps and telemetry. PowerShell/terminal
  styling only in telemetry, the command palette, IDs, timestamps and the
  activity console.
- Map markers are vector icons (`frontend/lib/asset-icons.ts`), screen-sized,
  with a restrained selected state and hover name/type. No letter markers.
  Every colored mark on the Moon must be explained by a legend, a hover or
  the open panel; nothing persists after its owning panel closes.
- Scientific colors come from layer definitions; UI colors never imply values.

## Required review

Source inspection is not enough. After any visible change:

1. Run the app (backend on 8000, frontend on 3000) and capture screenshots at
   1920×1080, 1440×900, 1366×768, 1024×768 and 390×844 of every state touched.
2. Look at them. Check overlap, overflow, stacked menus, hidden Moon,
   unreadable type, unexplained colors, dropdown overload.
3. Keep or add Playwright geometry checks (no overlap, hit-tested close and
   camera controls, panel area bounds) in `frontend/tests`.

Screenshots go to the ignored `artifacts/` directory.
