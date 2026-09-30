# Global visualization and analysis

Run `uv run python -m backend.app.data.globe` after installing Python dependencies.
It downloads the pinned 2019 NASA SVS Moon Kit 1k JPEG (139068 bytes) and 4k TIFF
(13095388 bytes), plus LDEM_4 V3.0 (2073600 bytes plus label). All inputs are checked
against manifest hashes. `--offline` requires every verified input already cached.
Outputs and their registry live in ignored `data/processed/globe`; no dataset is
committed. Restart the API after preparation.

The native global elevation array is copied without interpolation. It is signed
little-endian int16, 720 rows by 1440 columns, four pixels per degree, scaled by
0.5 m relative to the 1737400 m lunar sphere. The validated PDS label identifies
ME/PA DE421 and east-positive longitude. Rows run north to south; columns run
0 to 360 degrees. Label observation period: 2009-07-13T17:33:17 through
2016-11-29T05:48:19; creation date 2017-09-15. These are preserved in API metadata.
Sampling returns the containing pixel; poles use the nearest
edge row and have undefined longitude. Nodata DN -32768 stays missing, not zero.
At the equator, 0.25 degree is approximately 7.58 km; longitudinal ground spacing
shrinks toward the poles. This is coarse regional context, not construction analysis.

The visualization texture is equirectangular, centered on zero longitude (left edge
-180, right edge +180, top north). JPEG preparation preserves image dimensions;
encoding is lossy and used only for visualization. Prepared 1k/4k JPEGs are about
0.15/2.31 MB; the small image can load before the larger one. It is NASA's adjusted
color product with polar albedo fill/inpainting. No reflectance or illumination
measurement is extracted from it. Visible attribution links to NASA SVS.

`GET /globe` reports verified availability, source links, artifact hashes and dimensions.
`GET /globe/{artifact}` serves only three allowlisted files. Missing data returns 503
with preparation instructions. `GET /globe/inspect/location?latitude=...&longitude=...`
accepts the entire lunar sphere and returns coarse elevation, source/version/units,
sample indices and local coverage status. It reports unavailable values explicitly
even when the polar service remains usable. `GET /destinations` supplies seven
source-linked navigation centers independently of dataset availability.

Local analysis and planning eligibility use the same 240 m half-open grid bounds
and actual elevation mask as the existing inspection service. Geographic coverage,
prepared-data availability and nodata are distinct states. Global elevation never
substitutes for local slope or solar visibility. Time-dependent illumination remains
unavailable. Gazetteer destination centers are rounded navigation aids; displayed
control-network alternatives and planetographic conventions do not imply surveyed
ME/PA precision. On the reference sphere, planetographic and planetocentric latitude
coincide; no unverified control-network transformation is applied.

Sources: [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/),
[PDS global manifest](../data/ldem_4.json), [texture manifest](../data/globe-sources.json),
[destination sources and coordinate notes](../data/destinations.json).

Three.js and OrbitControls use the MIT license (copyright 2010-2026 three.js authors;
see the installed package LICENSE and [upstream license](https://github.com/mrdoob/three.js/blob/dev/LICENSE)).
NASA imagery is credited in the viewer and source metadata; use is educational
and informational, without implying NASA endorsement. See [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).
Hosted Cesium content was evaluated but is not included or dependent on any token.
