# Preliminary settlement screening

In Moon, choose an overlay and a location, then select **Find settlement sites**.
The default search samples centers within 25 km and evaluates 5 km neighborhoods.
Select a candidate, read **Why this candidate?**, and create a mission there.
Screening settings expose the radius, terrain source and low-slope threshold.
Existing mission simulations remain explicitly hypothetical where time-dependent
illumination is unavailable.

`POST /atlas/suitability` runs independent Python numerical code. Inputs and the
`settlement-screening-v1` model version are returned with source identifiers,
versions, native pixel spacing and per-candidate evidence. Results repeat for
identical inputs and registered data; no stochastic or AI decision is involved.

The bounded search uses concentric equal-distance rings on a 1737.4 km lunar
sphere. There are at most eight rings. It evaluates native 240 m LOLA terrain
where an entire neighborhood fits the prepared south-pole crop; otherwise the
selected global grid is used. Polar overview automatically uses coarse LOLA
outside the local crop to avoid excessive convergent longitude sampling.
Neighborhood diameters span at least three native pixels on coarse grids.
Center positions stay within the search radius; their evaluation neighborhoods
may extend beyond it. This is a sampled search, not an exhaustive optimization.

The editable 5-degree threshold describes an engineering screening assumption,
not a validated construction or human-safety limit. Low-slope area fractions use
spherical cell areas or stereographic scale-corrected cell areas. Circular
boundaries use cell-center inclusion. At least 90% valid neighborhood area is
required for each ranked criterion. Valid zero sunlight is preserved. Incomplete
solar coverage remains unknown rather than being renormalized into a favorable
value. Search work is capped at two million examined native cells.

Non-dominated tradeoff fronts compare low-slope terrain fraction and modeled
average solar visibility only within matching terrain-source/evidence groups.
Terrain-only results are presented separately from terrain-plus-sunlight results.
Results are spatially separated by at least the smaller neighborhood radius;
groups are interleaved to retain different kinds of supporting evidence.
There is no universal habitability score or comparison across incompatible grids.

Diviner temperature at the center is descriptive: one southern-summer local-time
brightness-temperature bin does not establish thermal extrema or habitat comfort.
Geology does not establish extractable resources. Radiation shielding, bearing
strength, communications, usable water, time-resolved sunlight, thermal control
and life support are not evaluated. Every lunar site needs a protected habitat;
these candidates are starting points for further engineering analysis.
