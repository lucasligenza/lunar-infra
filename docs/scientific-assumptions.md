# Scientific assumptions and limits

## Coordinate system

Every active source label identifies the Moon, planetocentric latitude,
east-positive longitude, and `MEAN EARTH/POLAR AXIS OF DE421`. The working CRS is
south polar stereographic on a 1,737,400 m sphere, central meridian zero, true
scale at the pole, zero false easting and northing. Geographic coordinates use
that same sphere and frame. No Earth EPSG codes or inter-frame transformation
is used. Longitude is undefined at the exact pole; displayed zero there is a
coordinate convention rather than a physical meridian measurement.

The original GDAL WKT uses stereographic variant B (`lat_ts=-90`) and legacy
datum/unit names. The working CRS uses equivalent variant A (`k=1`). The pipeline
validates radius, projection method and all parameters, meter conversion, label
frame and exact pixel transform. It preserves the original WKT in the registry.
Projection tests compare PROJ to the analytic spherical polar formula.

## Elevation and missing data

Elevation is `DN * 0.5` m relative to the 1,737.4 km sphere; planetary radius adds
1,737,400 m. Neither is geoid-referenced height. The input is a LOLA gridded
altimetry product, interpolated by its producer using GMT blockmedian/surface;
it is not an unmodified laser shot or a new measurement taken by LunarOS.
The 240 m source grid is cropped without resampling. Site queries return the
containing pixel, its center coordinates, and the sampling method explicitly.

GDAL's PDS driver reports -32768 as signed-int16 nodata for both inputs. These
labels do not declare a separate missing constant; this is a driver convention
that the pipeline records and preserves through masked reads. Missing values
become NaN in GeoTIFF and null with a status in API JSON. Valid zero elevation
and zero illumination are retained. No gap filling is performed.

## Derived slope

Use centered east-west and north-south finite differences across two pixel
intervals (480 m projected baseline) and `atan(hypot(dz/dx, dz/dy))` in degrees.
For spherical polar stereographic, projected-to-ground scale is
`k = 1 + (x²+y²)/(4R²)`; multiply the projected gradient by k to obtain the
reference-sphere gradient. The five-cell cross stencil must be fully valid.
Boundary cells without a stencil are missing; a source halo prevents artificial
missing values at the prepared region boundary.

This is slope at the DEM sampling scale, using reference-sphere horizontal
distances. It omits the small elevation-dependent radius correction and cannot
resolve boulders, small craters, lander footprint hazards or engineering suitability.
No landing recommendation or site ranking is produced in Phase 1.

## Modeled solar visibility

`AVGVISIB_85S_060M_201608` stores `DN * 0.00004`, a dimensionless fraction of
timesteps with any portion of the solar disc visible. NASA describes hourly
sampling over approximately 18.6 years. It is not current illumination, irradiance,
solar-array energy, or guaranteed continuous sunlight. The exact modeled calendar
start/stop is not specified in the reviewed label/product page, so the registry
records those as unknown. The label's START_TIME/STOP_TIME refer to underlying
LOLA observations (2009-2013), not the simulation interval.

The terrain source uses observations through 2017 and therefore differs from the
terrain underlying the 2016 illumination product. Their frame/projection agree;
this permits a documented overlay, not a claim of identical source topography.
Their 60 m and 240 m grids have different origins. GDAL area-average resampling
aligns illumination to the exact terrain grid. A cell is missing if any contributing
area is missing; zero remains permanent shadow. Resampled values represent a
240 m footprint average, rather than native 60 m point resolution.

## Hypothetical infrastructure (Phase 2)

All asset defaults are illustrative, editable assumptions, not NASA hardware.
Solar arrays specify rated electrical power and a user derating factor. Batteries
specify internal usable-window capacity, a reserve fraction, efficiencies and
bus-side charge/discharge limits. Habitat and communications demand is continuous;
robot duty cycle represents interval-averaged active/idle demand. No deployed
assets, thermal coupling, degradation, cabling losses or detailed mechanical
orientation models are implied. Asset/site locations must have valid NASA elevation.

The integrated illumination raster cannot supply time-dependent solar input.
Hypothetical explicit interval inputs are separate from the map's long-term average.
Real-data mission playback is unavailable until a compatible time-dependent source
has been validated. Synthetic presets and user-supplied hypothetical profiles are
always labeled in saved runs and the interface. Missing or non-finite factors fail
validation; they are never filled from the average raster.

See the [energy model](energy-model.md) for conservation equations, storage dispatch,
numerical tolerances and omitted physics. The timeline displays interval-average
power and interval-end SOC, with the UTC interval range shown in telemetry. Power
charts use steps; SOC lines connect reported endpoints for visual guidance, without
asserting additional samples. These results are engineering calculations under
explicit assumptions, not measurements of deployed infrastructure.

## Global exploration (Phase 3)

LDEM_4 V3.0 supplies native 0.25-degree global gridded altimetry. The 1-degree
visual mesh samples containing pixels at its vertices and interpolates triangles
for rendering; visual mesh heights are never returned as scientific measurements.
Global inspection samples the original native array. Different footprints and
observation periods explain differences from the prepared 240 m polar elevation.
No solar measurement is inferred outside prepared polar coverage. Phase 4 adds
native global GLD100/LOLA terrain slopes, with explicit source resolution and
stencil support; these remain distinct from the finer prepared polar analysis.
See [atlas derivations](atlas-data.md).

Global-atlas hypothetical missions can place assets wherever verified numeric
elevation exists. The domain is saved separately from the original polar domain.
Source frame qualifications remain attached: GLD100 and Moon 2000 geology are
nominally registered on the 1737.4 km sphere, without a claimed surveyed transform
into ME/PA DE421. Coarse global terrain does not qualify a construction site.
No temporal illumination becomes available simply by extending elevation coverage;
every global power run requires an explicit hypothetical interval profile.

The graphics coordinate axes are +X at 0 degrees east on the equator, +Y north,
and -Z at 90 degrees east. This is an orthogonal permutation of the same lunar
spherical frame. Radius is 1737400 m; relief is at true scale. Source texture
longitude runs -180 to +180 with north at the top. NASA's visualization texture
includes adjusted color, polar albedo fill and inpainting; it cannot establish
reflectance, illumination or terrain safety. Display lighting is fixed for
inspection, unrelated to mission sunlight.

Destination coordinates are source-linked, rounded atlas navigation centers.
Gazetteer control networks are not transformed into surveyed DE421 coordinates;
on the spherical reference, geographic/centric latitude coincide. The SPA overview
uses a published projection center, not a precisely surveyed basin center. Sources
and precision notes stay visible in the destination inspector.

## Source references

- [Original LOLA products and labels](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/)
- [NASA polar illumination documentation](https://pgda.gsfc.nasa.gov/products/69)
- [Mazarico et al. (2011)](https://doi.org/10.1016/j.icarus.2010.10.030)
- [PROJ stereographic parameters](https://proj.org/en/stable/operations/projections/stere.html)
- [GDAL PDS georeferencing caveats](https://gdal.org/en/stable/drivers/raster/pds.html)
- [Rasterio masks](https://rasterio.readthedocs.io/en/stable/topics/masks.html)
- [Rasterio reprojection](https://rasterio.readthedocs.io/en/stable/topics/reproject.html)

## Projected environmental overlays

The 3D atlas now samples the prepared solar visibility raster through explicit
lunar geographic-to-south-polar transforms. Containing numeric cells provide both
queries and visualization colors; outside coverage and nodata remain transparent.
Valid zero visibility is preserved. Geographic tile resolution is a visualization
choice and does not increase native scientific resolution. The original 60 m
model has already been area-averaged onto the registered 240 m crop. It describes
~18.6-year solar visibility, not current sunlight or mission eclipse intervals.
Registered tile URLs drive the shared frontend renderer; no per-provider shader
or duplicate map implementation is introduced.
