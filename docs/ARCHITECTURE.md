# LunarOS architecture

Phase 1 is the lunar data explorer. Phases 2-4 are outside this implementation.

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
Frontend dependencies will be locked separately by npm.

Acquisition is an explicit CLI operation, never a side effect of inspection. The
pipeline registers verified artifact hashes and source metadata. Services consume
prepared files only and fail clearly when data is unavailable or corrupt. HTTP
handlers delegate numerical logic to functions that later AI tools can call directly.
The small bounded region can fit in memory; no database or distributed worker is
needed. No infrastructure, optimization, AI or production deployment is included.

OpenLayers supports custom lunar coordinates. It will display georeferenced raster
renderings in their polar coordinate space. Color images are visualization only;
measurements come from the scientific service. Development servers bind to loopback.

Implementation references:
- [Rasterio masks](https://rasterio.readthedocs.io/en/stable/topics/masks.html)
- [Rasterio reprojection](https://rasterio.readthedocs.io/en/stable/topics/reproject.html)
- [PyProj axis order](https://pyproj4.github.io/pyproj/stable/api/transformer.html)
- [FastAPI testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Next.js App Router](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [OpenLayers projections](https://openlayers.org/en/latest/apidoc/module-ol_proj_Projection-Projection.html)
