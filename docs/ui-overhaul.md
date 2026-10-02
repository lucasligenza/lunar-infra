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
