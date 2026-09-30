# Verified providers and acquisition limits

The atlas catalog distinguishes discoveries, downloaded files and validated ready
datasets. Metadata is not numerical integration. Global GLD100 and USGS geology
are integrated; existing LOLA, polar terrain and average visibility remain intact.

## Reusable discovery

`data/discovery-providers.json` registers verified PDS collection identifiers and
their original collection labels. The independent PDS client accepts a collection
URN, requests only its documented members endpoint, caps results at 20 and the
response at 2 MiB, and never follows product file links for acquisition. It rejects
unrelated members and ambiguous file-size associations. Raw JSON snapshots retain
the source URL, UTC fetch time and SHA-256 under ignored `data/raw/discovery`.
Cached snapshots are integrity-checked; refresh is explicit and failures remain
unavailable rather than becoming numeric data. The PDS index is not complete.

```powershell
uv run python -m backend.app.data.discovery --provider diviner-gcp --plan
uv run python -m backend.app.data.discovery --provider diviner-gcp --limit 20
uv run python -m backend.app.data.discovery --provider diviner-gcp --limit 20 --offline
```

`--collection urn:nasa:pds:...` supports another verified collection without a new
provider adapter. Register its original label/provider to expose it in the UI.
The catalog's **Browse PDS products** lists labels, literal indexed bounds, periods,
files, source checksums and estimated sizes. **Refresh PDS metadata** obtains a new
snapshot. Source file links may download entire products; inspect size first.
GLD100/geology **Inspect acquisition budget** checks source and disk budgets without
starting a download. Actual preparation remains the documented reproducible CLI.

API: GET `/atlas/providers`, GET `/atlas/discovery/{provider_id}?limit=20&refresh=false`.
Only registered providers can be requested through HTTP. Discovery failures return
503; invalid limits return 422. No unvalidated product is auto-registered as ready.
Live verification returned 18 actual Diviner GCP products, including 156211313-byte
latitude-band tables; the mathematical/API tests use explicitly synthetic protocol
fixtures so outages do not masquerade as scientific success.

NASA PDS documents a Search API with structured queries and collection members.
The advertised Registry endpoint returned HTTP 503 during this audit. The official
Search endpoint worked: an exact structured identifier query resolved
`urn:nasa:pds:lro_diviner_derived1:data_derived_gcp`, and its `/members` endpoint
returned actual observational products with labels, data URLs, sizes, checksums,
periods and coverage fields. A `keywords` request unexpectedly returned unrelated
products; it must not be treated as a working keyword search without verification.
PDS warns its index is incomplete. Metadata discovery cannot establish calibrated
data values or consistent coordinate conventions on its own.

Diviner's GCP archive offers 0.5-degree latitude/longitude and 0.25 local-hour bins
from cumulative 2009-07-05 through 2015-04-01 nadir observations. These are
brightness/bolometric brightness temperatures and climatological bins, not a
mission UTC illumination series. Each 10-degree latitude band is 156211313 bytes;
18 bands total approximately 2.8 GB. Higher-resolution mapped TIFFs are about
3.3 GB each. No unbounded batch or full-resolution thermal acquisition is started.
The UCLA linked server fails modern TLS negotiation in this environment; PDS
remains a verified alternative. Thermal queries/overlays remain unavailable until
an actual subset is acquired and its axes, nulls and calibration are validated.
The PDS3 label describes -180..180 longitude while indexed PDS4 metadata describes
0..360; actual table axes must resolve that difference before scientific integration.

The M3 PDS volume page returned 403 during this audit. Lunar Prospector's reduced
and special-product listing and the GRAIL archive are reachable, but no individual
product, resolution, calibration or query adapter is claimed ready. A hydrogen or
spectral signature is not proof of an extractable water deposit. LROC WAC global
imagery is documented and listed, while the current base visualization remains the
pinned SVS product. Moon Trek/ODE services are research candidates, with no claimed
stable region-subset API. Existing full-product and ZIP-member adapters perform
local preparation; providers are not presumed to offer server-side cropping.

Primary sources:

- [PDS Search syntax and endpoints](https://nasa-pds.github.io/pds-api/guides/search/endpoints.html)
- [PDS incomplete-index warning](https://nasa-pds.github.io/pds-api/guides/search/quickstart.html)
- [Diviner PDS archive](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm)
- [Diviner GCP data listing](https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gcp/)
- [Diviner product label](https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_gcp/global_cumul_avg_cyl_00n10n_002.lbl)
- [M3 archive](https://pds-imaging.jpl.nasa.gov/volumes/m3.html)
- [Lunar Prospector special products](https://pds-geosciences.wustl.edu/missions/lunarp/reduced_special.html)
- [GRAIL archive](https://pds-geosciences.wustl.edu/missions/grail/)
