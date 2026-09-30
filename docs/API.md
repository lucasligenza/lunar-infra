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

Coordinates are planetocentric lunar latitude and east-positive longitude in the
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
