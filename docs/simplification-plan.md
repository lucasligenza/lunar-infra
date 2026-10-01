# Simplified LunarOS roadmap

Accepted workflow: choose overlay, select region, find settlement candidates,
inspect evidence, create a mission. Moon and Mission are the only primary workspaces.
Advanced retains detailed science and original 2D analysis; existing mission APIs
and saved scenarios remain compatible.

1. Simplify shell, inspectors and Advanced disclosure; browser regression review.
2. Shared projected-raster overlays and validated polar average solar visibility.
3. One validated Diviner south-pole local-time temperature product, maximum
   300 MB total acquisition, or an explicit documented unavailable state.
4. Independent Python settlement screening: 25 km default search, 5 km neighborhoods
   enlarged for coarse grids; editable 5 degree slope assumption; comparable evidence
   groups and non-dominated terrain/sunlight tradeoffs; thermal context, no score.
5. Candidate-to-mission journeys, accessibility, five viewports and regression validation.

Every functioning milestone updates PROGRESS.md, passes appropriate tests, and is
committed/pushed normally. Missing data never improves a candidate. Screening does
not establish construction safety, thermal performance, water resources or human safety.
