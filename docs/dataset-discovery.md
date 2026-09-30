# Verified providers and acquisition limits

The atlas catalog distinguishes discoveries, downloaded files and validated ready
datasets. Metadata is not numerical integration. Global GLD100 and USGS geology
are integrated; existing LOLA, polar terrain and average visibility remain intact.

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
