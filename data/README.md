# Scientific data storage

Versioned manifests pin NASA sources, labels, byte lengths, and SHA-256 digests.
Raw downloads live in `data/raw/`; all GeoTIFFs and their local registry live in
`data/processed/`. Both directories are ignored. Never commit rasters or caches.

```powershell
uv sync --locked
uv run python -m backend.app.data.pipeline
```

Downloads: 29.1 MB LOLA elevation plus 51.2 MB modeled illumination and small
labels. The pipeline verifies their integrity and polar metadata before cropping
a 96 x 96 km square around the pole to a 400 x 400 grid at 240 m/pixel.
No elevation resampling occurs. Illumination is area-averaged onto that exact grid.
A separate elevation halo supplies central-difference slope values at crop edges.

Use `--offline` to process already-downloaded files with integrity checks. A failed
download produces an error, never a synthetic replacement. SHA mismatches require
restoring the pinned archive snapshot or reviewing a new manifest. Generation
publishes the registry last; interrupted preparation must be rerun before serving.

The original global `LDEM_4` manifest remains available through
`uv run python -m lunaros fetch`, but it is not used for south-pole inspection.
