# Lunar Atlas data and rendering

Prepare the bounded global data with `uv run python -m backend.app.data.atlas`.
`--plan` reports download and disk estimates; `--offline` validates existing source
files without networking. Raw data, numeric arrays and generated tiles are ignored.
The pinned 133 MB GLD100 32-pixel/degree product is retained at its native grid.
PDS scaling, missing/saturation codes, sphere, origin and projection are checked;
source and processed hashes are checked before registration. A matching validated
cache is reused instead of processing the full Moon on every startup.

The 100 m original GLD100 pixel spacing is not its effective approximately 300 m
resolved detail. The selected reduced product has approximately 948 m equatorial
spacing. Its polar fill above 79 degrees uses LOLA. Original-product accuracy
estimates do not establish the accuracy of every reduced or polar-filled cell.
The label does not identify a surveyed control network; shared spherical navigation
is not a proven sub-pixel transformation into the polar ME/PA DE421 product.

## Numeric quantities

`GET /atlas/inspect` samples the containing native numeric cell, without
interpolation. Longitude wraps to east-positive 0–360 degrees; at an exact pole
longitude is undefined, although a meridian is used to select the adjacent cell.
The original Phase 1 polar API retains its finer 240 m analysis independently.

Slope uses a five-valid-cell central-difference stencil on the 1737400 m reference
sphere. North–south spacing is R times angular latitude spacing; east–west spacing
includes cosine of the sampled cell's latitude. Longitude is periodic. The first
and last rows have no complete north–south stencil and remain missing. Support is
two native pixels in each direction, not a claim of landing-hazard resolution.
Cached float32 slopes are calculated in float64 and tested against independently
derived spherical surfaces at multiple resolutions. No interpolation fills gaps.

## Georeferenced 3D layers

`GET /atlas/layers` describes source-linked elevation and slope palettes.
`GET /atlas/tiles/{dataset}/{layer}/{z}/{x}/{y}.png` serves 256-pixel geodetic tiles:
two hemispheres at level zero, doubling subdivisions through level five. Pixel
centers sample the numeric grid; missing values are transparent. Color saturation
clips only the legend's display range, never the numerical query. PNG colors are
never a source for measurements.

The Three.js layer clips the existing globe triangles to geographic tile bounds.
It retains their exact positions; a color change does not change terrain geometry.
The existing coarse LOLA display mesh remains distinct from GLD100 query resolution.
Camera-dependent tile requests have four concurrent downloads, 32 retained GPU
tiles, cancellation and disposal. Root tiles remain until selected detail tiles
are ready. The disk tile cache is capped at approximately 256 MiB and keyed by
source, palette and processing method. The imagery/science comparison renders the
same camera twice into two scissored parts of one viewport, avoiding divergent views.

Source definitions live in `data/atlas-sources.json`. Discovery entries do not
become queryable or renderable merely by appearing in the catalog. Dataset periods,
unknown frames, pending integrations and scientific limitations remain explicit.

Sources: [GLD100 documentation](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLD100),
[selected numeric product](https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLD100_E000N1800_032P),
[Scholten et al.](https://doi.org/10.1029/2011JE003926).
