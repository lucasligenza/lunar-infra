# Preliminary settlement screening

In Moon, choose an overlay and a location, then select **Find settlement sites**.
The default search samples centers within 25 km and evaluates 5 km neighborhoods.
Select a candidate, read **Why this candidate?**, and create a mission there.
Screening settings expose the radius, terrain source and low-slope threshold.
Existing mission simulations remain explicitly hypothetical where time-dependent
illumination is unavailable.

`POST /atlas/suitability` runs independent Python numerical code. Inputs and the
`settlement-screening-v3` model version are returned with source identifiers,
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
for terrain scoring and for reporting descriptive solar visibility. Valid
zero sunlight is preserved; incomplete solar coverage is shown as not covered
rather than renormalized into a favorable value. Search work is capped at two million examined native cells.

Candidates are ordered by low-slope terrain fraction within the same terrain
source. Results are spatially separated by at least the smaller neighborhood
radius; terrain sources are interleaved so one grid cannot displace another.

## Preliminary screening score (user-authorized, `preliminary-screening-score-v2`)

A 0–100% **relative engineering-screening aid**. It is not habitability, human
safety, construction suitability or mission-success probability. Python computes
it deterministically (`backend/app/services/screening_score.py`):

```text
score = 100 × T
T = area fraction of valid neighborhood terrain at or below the slope threshold
data completeness = area fraction of the neighborhood with valid terrain (≥ 90%)
```

- Only criteria prepared for the **entire Moon** are scored. Native terrain slope
  is the only such criterion, so every candidate anywhere is scored the same way.
- **Average solar visibility is excluded** (since `settlement-screening-v3`):
  validated LOLA average-visibility products cover only polar regions (PGDA
  product 69 / LOLA GDRVIS: complete poleward of 65°, prepared here for the
  ~96 km south-pole crop), not the whole Moon. It is still reported per
  candidate as descriptive evidence where covered.
- **Temperature is excluded**: the prepared Diviner bin is polar-only. A global
  Diviner Global Cumulative Product exists (2 ppd, local-time bins, 2009–2015;
  Williams et al. 2017) but is not integrated; temperature stays descriptive.
- Bands: 80–100 strong, 60–79 promising, 40–59 mixed, 0–39 constrained; the
  interface always shows the number and label, never color alone.
- Candidates are ranked only within one terrain grid (polar 240 m LOLA, GLD100
  or LOLA 0.25°); grids of different resolution are shown separately.
- Geology remains descriptive and excluded from the score.

## Analysis neighborhood cells

`POST /atlas/suitability/neighborhood` returns the exact native cells a returned
candidate's screening evaluated (same window, cell-center inclusion and weights):
polygon corners, elevation, slope, low-slope pass/fail and sampled solar
visibility per cell, plus aggregate fractions that reproduce the candidate. Polar
candidates use 240 m stereographic cells; global candidates use the screening
grid's equirectangular cells (~948 m GLD100 or 0.25° LOLA). No finer grid or
interpolated cell is created. The globe draws these cells only while the
candidate is selected in the candidate browser.

Diviner temperature at the center is descriptive: one southern-summer local-time
brightness-temperature bin does not establish thermal extrema or habitat comfort.
Geology does not establish extractable resources. Radiation shielding, bearing
strength, communications, usable water, time-resolved sunlight, thermal control
and life support are not evaluated. Every lunar site needs a protected habitat;
these candidates are starting points for further engineering analysis.
