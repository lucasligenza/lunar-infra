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

Global exploration uses a separate bounded NASA preparation command and service.
Its coarse native elevation supports global inspection without expanding local
construction analysis. Three.js loads only in an active 3D viewport; 1k imagery
precedes 4k, and a fixed 1-degree mesh samples the verified 0.25-degree DEM. No
high-resolution planetary streaming engine or hosted account is required.

The root Explorer owns location, camera, scenario and simulation context. Regional
and mission controls stay mounted while hidden, preserving drafts; the GPU viewer
is disposed on exit and reconstructs its saved camera on return. A synchronous
lunar footprint check prevents rapid switches from showing an unrelated region;
backend coverage remains authoritative for availability and nodata. At-rest frames
do not redraw the GPU. Camera/texture changes invalidate the view, and controls,
geometry, materials, textures, observer and WebGL context are released on cleanup.
See [global data](global-data.md) and [Phase 3 plan](phase3-plan.md).

Implementation references:

The Phase 4 atlas registry and numeric services supplement the legacy polar and
global stores. File-backed native arrays avoid loading the 32-pixel/degree DEM
into Python memory. Derived slopes and browser tiles have independent caches;
numeric queries always use original values. The same Three.js mesh supports
progressive scientific tiles and a synchronized comparison reveal. See
[atlas data and rendering](atlas-data.md) for limits and coordinate conventions.

Scenarios retain their saved domain: `south-pole` resolves the original projected
terrain service, while `global-atlas` resolves the best verified global numeric
grid. Location validation and provenance occur through this shared API boundary;
the deterministic energy engine is unchanged. The additive domain uses the existing
schema/versioned SQLite aggregate and revision checks. Global runs snapshot the
source definition and numeric artifact hashes. Changing dataset versions requires
reviewing/recreating a scenario before rerunning. Atlas availability remains
independent of polar cache availability.

The mission globe reuses the scientific overlay renderer and camera context.
Hypothetical asset sprites are screen-sized symbols at lunar coordinates, with
selection, tooltips and map movement. Their position samples the coarse visual
LOLA mesh, while placement validity and the inspector use native numeric data.
They describe neither hardware footprints nor validated terrain clearances.

Discovery providers register exact verified PDS collection identifiers separately
from numerical dataset definitions. Bounded member requests produce integrity-
checked metadata snapshots without acquiring or auto-registering scientific values.
The catalog can preview acquisition budgets and browse original labels/files.
This separates discovery from calibration, processing and ready-state registration;
provider-specific validation remains necessary before any numerical integration.

- [Rasterio masks](https://rasterio.readthedocs.io/en/stable/topics/masks.html)
- [Rasterio reprojection](https://rasterio.readthedocs.io/en/stable/topics/reproject.html)
- [PyProj axis order](https://pyproj4.github.io/pyproj/stable/api/transformer.html)
- [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [OpenLayers projections](https://openlayers.org/en/latest/apidoc/module-ol_proj_Projection-Projection.html)
