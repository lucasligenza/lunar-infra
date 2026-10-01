# Local scientific API

```powershell
uv run uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Interactive OpenAPI docs: http://127.0.0.1:8000/docs.
Prepare data before starting the service. Acquisition never runs inside HTTP
requests. To load newly generated files, restart the server.

| Endpoint | Result |
| --- | --- |
| GET /health | Dataset readiness; 200 ready or 503 unavailable |
| GET /datasets | Source IDs, versions, URLs, hashes, units, resolution, frame, periods and processing |
| GET /regions | Prepared extent, lunar CRS, dimensions and scientific layer legends |
| GET /sites/inspect?latitude=-89.5&longitude=0 | Elevation, slope and modeled solar visibility |
| GET /regions/south-pole/layers/elevation.png | Native-grid georeferenced color rendering |
| GET /regions/south-pole/layers/slope.png | Derived-slope color rendering |
| GET /regions/south-pole/layers/illumination.png | Modeled solar-visibility rendering |

Local-analysis coordinates are planetocentric lunar latitude and east-positive longitude in the
ME/PA DE421 frame. Supported longitude inputs span -180 to 360 degrees; responses
normalize to 0-360. Latitude inputs span -90 to 0. The bounded region is a square
from -48 km to +48 km along each polar projected axis. Other valid geographic
coordinates can be outside that square.

Each measurement includes value, unit, status, quantity kind, source ID, method,
physical ground resolution and support length. Missing values are JSON null and
status nodata. Zeros are valid. Containing-cell sampling does not interpolate;
responses distinguish the requested location from the sampled pixel center.
At the exact pole, longitude_defined is false.

Invalid parameters return 422; out-of-region locations return 404 with code
outside_region. Unavailable scientific data returns 503 with acquisition guidance.
The server validates hashes, alignment, projection, bands and units before loading.
There is no synthetic fallback. Metadata endpoints remain available when data is
missing and explicitly report availability=false.

Renderings use documented fixed color scales with transparent missing pixels.
They do not contain additional measurements. A custom lunar OpenLayers projection
places these images using the returned region extent, rather than an Earth basemap.

## Global exploration

Prepare the additional products with `uv run python -m backend.app.data.globe`.
The global and polar stores validate independently. `/health` retains its existing
polar readiness contract; `/globe` reports global availability separately.

| Endpoint | Result |
| --- | --- |
| GET /globe | Verified availability, lunar radius/frame, terrain observation period, imagery notes, artifact sizes/hashes and source links |
| GET /globe/color-1k.jpg | Initial 1024 x 512 NASA visualization image |
| GET /globe/color-4k.jpg | Finer 4096 x 2048 NASA visualization image |
| GET /globe/elevation.bin | Native 1440 x 720 little-endian int16 LDEM_4 array; DN * 0.5 m, nodata -32768 |
| GET /globe/inspect/location?latitude=9.62&longitude=339.92 | Coarse containing-pixel elevation, units/source/version, sample indices and local analysis/planning eligibility |
| GET /destinations | Seven source-linked navigation centers, precision notes and camera distances |

Global inspection accepts latitude -90 to +90 and longitude -180 to 360,
normalizing longitude to [0, 360). Non-finite or invalid coordinates return 422.
Missing elevation returns null with `nodata` or `unavailable`, never a fabricated
value. Local coverage has separate `available`, `outside_coverage`, `unavailable`
and `nodata` states. Outside the prepared polar footprint, a valid coarse elevation
does not enable the legacy 240 m polar services. The `planning` field retains that
polar-only eligibility contract. Phase 4 native global terrain and hypothetical
mission placement use the atlas and `global-atlas` scenario domain independently.

Metadata and destinations remain available without global files. Artifact requests
return 503 with preparation guidance when unavailable. The artifact allowlist
prevents arbitrary file access. Acquisition never runs within a request.
See [global data](global-data.md) for source alignment and visualization limits.
Existing scenario, asset and simulation endpoints are unchanged; their typed
contracts remain available in the generated OpenAPI documentation.

## Lunar atlas

| Endpoint | Result |
| --- | --- |
| GET /atlas/datasets | Typed provenance, original coverage, units, CRS, resolution, acquisition and query/overlay readiness |
| GET /atlas/layers | Registered scientific ranges/palettes, source/version and tile templates |
| GET /atlas/inspect?latitude=0.67&longitude=23.47&dataset=auto | Native elevation, physical sample spacing, derived slope/support and independently sampled geological interpretation |
| GET /atlas/tiles/{dataset}/{layer}/{z}/{x}/{y}.png | Cached georeferenced visualization; never a numerical measurement source |
| GET /atlas/acquisition/{dataset} | Bounded download/disk plan without starting acquisition |
| GET /atlas/sectors?level=1 | Cube-sphere navigation hierarchy and sampled geographic boundaries |
| GET /atlas/sectors/lookup?latitude=90&longitude=0&level=1 | Polar-safe containing sector |
| POST /atlas/analysis | Native-cell area-weighted elevation/slope statistics, terrain relief, slope distribution and provenance |
| POST /atlas/profile | Shortest lunar great-circle native elevation samples, distance and resolution warnings |
| GET /atlas/providers | Verified PDS collection identifiers and original labels |
| GET /atlas/discovery/{provider}?limit=20 | Bounded integrity-checked collection metadata; refresh=true explicitly refreshes |

Area inputs are a 1–600 km circle or wrapped west-to-east geographic box. Candidate
work is capped at two million native cells; reduce area or select coarser LOLA when
the guard returns 422. Profiles use 2–1024 samples, reject equal/antipodal endpoints,
and label oversampling. JSON requests/typed response contracts appear in OpenAPI.
Missing native values/stencils remain null; unavailable terrain returns 503.
Discovery does not download or register product values. See [atlas methods](atlas-data.md)
and [discovery](dataset-discovery.md). Sources and processed caches stay out of Git.
