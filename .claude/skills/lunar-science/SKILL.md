---
name: lunar-science
description: Use when touching LunarOS scientific data, coordinates, rasters, overlays, point inspection, settlement screening or any value shown to users as a lunar measurement. Protects lunar CRS, nodata, provenance and the observed/derived/modeled/hypothetical distinction.
---

# Lunar scientific integrity

LunarOS displays real NASA/USGS products. A wrong unit, CRS or nodata rule
silently produces false science. Read this before changing anything under
`backend/app/data`, `backend/app/geospatial`, `backend/app/services`, overlay
rendering (`frontend/lib/atlas-render.ts`, `MoonCanvas.tsx`, `TerrainMap.tsx`)
or any panel that prints a measurement.

## Coordinates and frames

- Latitude is **planetocentric**; longitude is **east-positive**. The API stores
  0–360 °E (`Location.longitude_deg` is `[0, 360)`); queries also accept −180.
- Reference body is a **1,737,400 m sphere** (`RADIUS_M`, `reference_radius_m`).
  Elevation is relative to that sphere, never a geoid/ellipsoid height.
- Polar data: south polar stereographic on that sphere, ME/PA DE421 frame
  (`backend/app/geospatial/terrain.py`, `frontend/lib/lunar.ts`).
- Global atlas data (GLD100, LDEM_4, USGS geology) is nominally on the same
  sphere but has **no surveyed transform** into ME/PA DE421. Keep `frame_note`.
- Graphics axes (`frontend/lib/globe.ts`): +X = 0 °E equator, +Y = north,
  −Z = 90 °E. It is a permutation of the lunar frame, not a new frame.
- Longitude is undefined at an exact pole; show "longitude undefined".
- **Never** introduce an Earth EPSG code, Web Mercator, WGS84 or an Earth
  radius default. OpenLayers uses a custom lunar projection.

## Values and missing data

- **Nodata is not zero.** PDS −32768 (and ≤ −32764 codes) become NaN/`null`
  with a `status` of `nodata`. Valid zero elevation, zero sunlight and zero
  slope are real values. Outside coverage is `unavailable`, not `nodata`.
- UI wording: *Unavailable here* (outside coverage), *Missing source data* /
  *No source coverage* (nodata inside coverage), *Not prepared* (dataset not
  loaded locally). Never print a number for any of these.
- Never fill gaps, interpolate missing cells, or substitute mock data.
  Synthetic arrays are allowed only in mathematical tests or explicitly
  labeled hypothetical simulation inputs.
- Before combining rasters, check CRS, grid origin and resolution. Document
  any resampling (polar illumination is area-averaged 60 m → 240 m).

## Quantity kinds — keep them distinct

| Kind | Examples | Rule |
| --- | --- | --- |
| Observed / measured gridded | LOLA, GLD100 elevation; Diviner bins | Producer-gridded; cite source/version |
| Derived | Slope (5-cell central difference) | State stencil support (2 native pixels) |
| Modeled | Average solar visibility (~18.6 yr) | Long-term frequency only |
| Interpretive | USGS geological units (1:5M) | No resource/contact claims |
| Hypothetical | Asset specs, illumination factors, rover routes | Always labeled hypothetical |

- **Average solar visibility is not time-resolved sunlight.** Never turn it
  into eclipse times, power, or a simulation input series.
- **Diviner brightness temperature is not habitat temperature.** It is one
  southern-summer 00:00–00:15 local-time bolometric bin (2009–2019).
- **Overlay color is not numerical truth.** Tiles are visualization; values
  come from `/atlas/inspect`, `/sites/inspect` or the numeric services.
- Coverage differs: global terrain is ~948 m (GLD100 32 ppd) or 0.25° LOLA;
  the prepared south-pole crop is 240 m over ~96 km; solar visibility and
  temperature exist only in that polar crop. Never imply finer resolution
  than the source (e.g. a grid drawn finer than native cells).

## Provenance

Every displayed value keeps source id, version, units, native spacing,
sampling method, period/coverage and limitations reachable through
progressive disclosure (Overview → Technical details → Sources). Pin source
URLs, versions and SHA-256 checksums in the registries (`data/*.json`). Raw
and processed data, caches and `.env` never go into Git.

## Settlement screening score

The preliminary screening score (see `docs/settlement-screening.md`) is a
relative engineering-screening aid, never habitability, safety or mission
success. Missing criteria contribute zero and lower data completeness; they
must never raise a score. Temperature and geology stay descriptive.

## Key files

- `backend/app/services/atlas.py` — numeric grids, `inspect()` aggregation
- `backend/app/services/inspection.py` — polar 240 m site inspection
- `backend/app/services/suitability.py` — screening and score
- `backend/app/geospatial/*` — projections, slope, projected rasters
- `docs/scientific-assumptions.md`, `docs/atlas-data.md`,
  `docs/settlement-screening.md`

## Verify

```bash
uv run pytest backend/tests/test_terrain.py backend/tests/test_atlas.py backend/tests/test_environment.py backend/tests/test_suitability.py -q
```

Run the full `uv run pytest` before committing any scientific/API change.
