# LunarOS visual overhaul

Requested after the completed mission-workspace redesign. This pass improves
the application's visual identity and clarity; scientific processing, sources,
API contracts, mission state and numerical simulation stay unchanged.

## Observed baseline

Fresh Chromium captures at 1440 × 900 and 390 × 844 show a full-width search
strip competing with the navigation, equally emphasized region actions,
small stacked measurements, and scientific layers hidden in a select menu.
The mission map is already dominant and its panels close correctly; preserve
that interaction model rather than reintroducing permanent rails.

Baseline screenshots: ignored `artifacts/overhaul-before-*.png`.

## Working milestones

1. Establish a consistent navigation, icon, typography and surface treatment.
   Float compact global controls in a reserved band; improve destination and
   region presentation. Expose registered layers as keyboard-operable choices
   with honest preparation/coverage labels and unchanged rendering status.
2. Carry the visual language into infrastructure, contextual inspectors and
   playback. Improve form grouping and chart hierarchy without changing state
   ownership, asset parameters, sampling or simulation behavior.
3. Review actual rendered workflows at the five supported sizes, verify focus,
   contrast and reachability, run the existing regressions, and publish each
   verified milestone. Keep screenshots and temporary review missions out of Git.

The supporting palette is neutral charcoal with restrained blue interaction
states. Status colors convey actual application state. Illustrative UI glyphs
identify tools; they never represent scientific measurements or hardware scale.
Original layer names, source periods, uncertainty and preparation statuses remain
available alongside the simpler labels. No additional scientific capability or
physical habitability claim is introduced.

## M1 rendered review

Before/after captures show the heavy toolbar replaced by compact controls over
the globe, with a consistent navigation treatment, measured region values in
two columns, one primary next action and direct layer selection. Desktop docks
still own their width; controls occupy a reserved top band. Phones retain
dismissible task sheets. Screenshots at all five requested sizes were inspected.

22 relevant browser journeys pass across the focused runs, including new native
radio keyboard navigation and five-size hit testing. Original atlas numerical,
georeferencing, real polar pixel contrast, blank-tile failure, mission overlay,
coverage, persistence, focus and contrast assertions remain. Two initial test
selector ambiguities were fixed by scoping the layer caption to its workspace;
the source-period assertion itself is unchanged. Scientific regression passes
106 tests and eight subtests (133.88s; nine dependency deprecation warnings).
Frontend typecheck and production build also pass.

Published as `c224f35` (`style: overhaul lunar exploration and scientific layer
controls`); ordinary push to main confirmed. Full GitHub validation subsequently
caught a status-label layout regression in the mission globe (56/57 journeys
passed). Its cause was an explorer-only toolbar offset applied to the shared
renderer status class. The follow-up scopes that offset to Global Explorer;
mission rendering and scientific behavior were unchanged.

## Mission presentation

The asset palette and selected inspector now share recognizable infrastructure
glyphs. Primary electrical parameters are grouped without changing defaults,
validation, advanced fields or revision checks. Site quantities keep their
numeric values, sampling units and source disclosures. The mission control shelf,
camera controls and contextual panels use the same spacing and surface treatment.

Playback now emphasizes actual interval readings and shows aggregate battery
reserve directly from the saved Python result. Current kW/SOC readings remain
separate from the mission-wide kWh summary. Ordinary electrical demand has a
neutral chart color; failure regions and shortage status retain their real
constraint meaning. Charts remain closed by default and capped at 34dvh on
desktop. Phone details remain an explicit, dismissible task sheet.

Rendered review at 1366 × 768 found that the map remains dominant with compact
playback and both side panels closed. The 390 × 844 palette and compact playback
were inspected, including accessible close actions and source qualifications.
The 1024-pixel automated check caught slightly undersized SVG axes after spacing
changes; responsive text sizing was increased rather than weakening the check.
The map scale was also moved clear of the mobile control shelf. The full local
run found a lost separating space in formatted telemetry text, now restored.
Numeric comparisons and all scientific uncertainty assertions are retained.

## Final local acceptance

- Frontend typecheck and production build pass. `next start` became ready in
  287ms; the API reports verified scientific datasets ready.
- All 57 Chromium journeys pass against that production build (9.0m), including
  the previous status-label and accessible telemetry regressions. Three focused
  follow-up journeys also passed before the production build (1.5m).
- Before/after screenshots were inspected across 1920×1080, 1440×900, 1366×768,
  1024×768 and 390×844. Default views, open palette, selected asset, site inspector,
  compact playback, bounded charts, scientific layers and missing coverage were
  reviewed. The new status offset was visually rechecked in the mission globe.
- Existing numerical, persistence, draft/revision, failure recovery, contrast,
  focus and source assertions remain. New checks verify the reserve graphic
  against actual returned SOC and separate the map scale from mission controls.
  Keyboard layer selection and five-size control hit tests also pass.

No science, data coverage or model capability was added. Temperature is a
historical polar product; solar visibility is a modeled mean, not a temporal
forecast. Mission playback retains explicitly hypothetical time-series inputs.
Screenshots and temporary review scenarios remain outside Git. Final publication
uses an ordinary follow-up commit; the earlier CI failure is not hidden or amended.
