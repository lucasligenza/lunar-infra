# Mission API

All infrastructure is hypothetical. Default engineering numbers are editable
examples, not NASA hardware specifications. Existing scientific endpoints remain.

- POST /scenarios: name, site {latitude_deg, longitude_deg}, optional mission and
  assets. Returns a versioned definition with UUID, dataset versions and revision.
- GET /scenarios and /scenarios/{id}: saved definitions, most recently edited first.
- PATCH /scenarios/{id}: revision plus name, site and/or complete mission definition.
- DELETE /scenarios/{id}?revision=N: deletes after the UI obtains confirmation.
- POST /scenarios/{id}/duplicate: {revision}; copies with new scenario/asset IDs.
- POST /scenarios/{id}/assets: {revision, asset}; asset kind selects its typed schema.
- PATCH /scenarios/{id}/assets/{asset_id}: {revision, changes}; partial parameter
  updates are merged and fully validated. Asset ID/kind cannot change.
- DELETE /scenarios/{id}/assets/{asset_id}?revision=N: returns updated scenario.

Every edit returns the authoritative saved scenario with an incremented revision.
Stale revisions return 409; missing identifiers 404; invalid parameters or outside/
nodata locations 422; unavailable NASA terrain prevents placement with 503.
The SQLite aggregate transaction rolls back if any validation fails. There is no
in-memory-only save or browser localStorage copy masquerading as persistence.

Storage: data/local/missions.sqlite (ignored). LUNAROS_DB_PATH can override it.
Back up that database separately from regenerable scientific rasters. Schema
version is recorded using PRAGMA user_version and definition schema_version.
This is a local, single-user application; no remote authentication is implemented.

Mission time is timezone-aware and normalized to UTC, with positive equal intervals
and at most 10000 samples. Optional illumination_factors are explicit interval
inputs in [0,1], labeled synthetic/custom_hypothetical. NASA average visibility
is not a supported temporal source. Full request/response schemas appear in /docs.
