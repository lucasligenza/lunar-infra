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

## Source references

- [Original LOLA products and labels](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/)
- [NASA polar illumination documentation](https://pgda.gsfc.nasa.gov/products/69)
- [Mazarico et al. (2011)](https://doi.org/10.1016/j.icarus.2010.10.030)
- [PROJ stereographic parameters](https://proj.org/en/stable/operations/projections/stere.html)
- [GDAL PDS georeferencing caveats](https://gdal.org/en/stable/drivers/raster/pds.html)
- [Rasterio masks](https://rasterio.readthedocs.io/en/stable/topics/masks.html)
- [Rasterio reprojection](https://rasterio.readthedocs.io/en/stable/topics/reproject.html)
