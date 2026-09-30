# LunarOS architecture

Phase 1 provides scientific exploration. Phase 2 adds hypothetical infrastructure,
scenario persistence and energy simulation. The user's Phase 3 adds global 3D lunar
exploration and connected viewing modes. Optimization and AI remain excluded.

```text
NASA PDS / LOLA team (pinned IMG + labels)
 -> data/raw/ (ignored and checksummed)
 -> backend/app/data/ (validation, bounded crop, registration)
 -> backend/app/geospatial/ (lunar transforms and numerical slope)
 -> data/processed/ (ignored GeoTIFFs and provenance registry)
 -> backend/app/services/ (reusable inspection and visualization)
 -> backend/app/api/ (FastAPI with Pydantic responses)
 -> frontend/ (Next.js, React, TypeScript, Tailwind, OpenLayers)
```

Python 3.12+ dependencies are locked by uv.lock. The original lunaros module retains
its published global-overview ingestion CLI. Active south-pole analysis uses the
backend modules, adopting the user's specified stack without rewriting history.
Frontend dependencies are locked separately by npm in frontend/package-lock.json.

Acquisition is an explicit CLI operation, never a side effect of inspection. The
pipeline registers verified artifact hashes and source metadata. Services consume
prepared files only and fail clearly when data is unavailable or corrupt. HTTP
handlers delegate numerical logic to functions that later AI tools can call directly.
The small bounded region can fit in memory; no database or distributed worker is
needed for terrain. Phase 2 uses local SQLite for mission definitions and immutable
simulation runs; numerical energy functions remain separate from HTTP and React.
Optimization, AI and production deployment remain outside the implementation.

OpenLayers displays georeferenced raster renderings in their lunar polar coordinate
space, using a custom projection rather than Earth Web Mercator. Its browser
coordinate formulas are tested against the PyProj API. Color images are visualization
only; measurements come from the scientific service. React loads the map on the
client and disposes it on unmount. Selecting a location requests the API and marks
both the requested position and sampled cell. New requests cancel stale inspection
requests and clear previous measurements.

Next.js proxies same-origin /api requests to FastAPI; the browser needs no separate
CORS configuration. Scientific layer metadata, legends and source identifiers come
from the backend. Desktop scientific controls occupy a collapsible left tool rail;
mobile controls flow below the map.
Development servers bind to loopback. Playwright starts both servers and validates
the real data-to-UI flow, navigation and failure recovery. Pure numerical functions
remain usable outside the web application for future scientific tools.

Mission definitions use discriminated Pydantic asset schemas. SQLite stores each
scenario as a validated versioned JSON aggregate; edits hold an immediate transaction
and compare revisions before replacing it. This keeps simultaneous browser edits
from silently overwriting one another. Definitions and local database files stay
separate from immutable scientific rasters. No extra database server is required.
The pure Python simulation module consumes a validated definition and explicit
interval inputs. A synchronous API call runs bounded local work (100000 asset-
intervals maximum), then stores a run with immutable input/source snapshots and
hashes. Scenario revisions are rechecked before publishing the result. No worker
queue is needed for this bounded model; longer computations can later use the
same numerical function behind a job runner.

React treats API responses as the authoritative saved state. Independent asset and
mission drafts survive unrelated saves; explicit reopening resets them after a
discard confirmation. Changing the saved revision invalidates displayed results.
Playback selects one Python result interval used by every chart and telemetry panel;
it does not calculate power or battery state in JavaScript. Mobile section links
retain access to the scientific map, tools, inspector and computed timeline.

Implementation references:

- [Rasterio masks](https://rasterio.readthedocs.io/en/stable/topics/masks.html)
- [Rasterio reprojection](https://rasterio.readthedocs.io/en/stable/topics/reproject.html)
- [PyProj axis order](https://pyproj4.github.io/pyproj/stable/api/transformer.html)
- [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [OpenLayers projections](https://openlayers.org/en/latest/apidoc/module-ol_proj_Projection-Projection.html)
