# NASA LOLA elevation provenance

Source: NASA Planetary Data System, Geosciences Node, LRO LOLA team at Goddard.
Dataset `LRO-L-LOLA-4-GDR-V1.0`, DOI
[10.17189/1520642](https://doi.org/10.17189/1520642).

The [original LDEM_4 label](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_4.lbl)
is authoritative for this product. A small copy with normalized line endings and
trailing whitespace is retained as a test fixture; its metadata is unchanged.
`data/ldem_4.json` pins the URLs, byte lengths, version, and SHA-256 checksums of
the actual files downloaded on 2026-09-29. These checksums pin our reviewed snapshot;
they are locally calculated, not checksums published by NASA. An archive update
must receive a reviewed manifest change before it can be ingested.

## Scientific conventions

- LDEM_4 V3.0, created 2017-09-15, observations 2009-07-13 through 2016-11-29.
- 720 rows, 1,440 columns; 16-bit signed little-endian integers, row-major.
- Simple cylindrical projection; planetocentric latitude, east-positive longitude
  from 0 to 360 degrees; mean Earth / polar axis frame of DE421.
- Pixel registered: row 0 is 89.875 degrees north; column 0 is 0.125 degrees east.
  Cells cover 0.25 degrees. Rows run north to south and columns west to east.
- Elevation relative to the reference sphere: `DN * 0.5` meters.
- Planetary radius: `DN * 0.5 + 1737400` meters. This is distinct from elevation.
- Reference sphere: 1,737.4 km radius. Do not use an Earth CRS or Earth radius.
- Equatorial cell spacing: approximately 7,580.84 m. East-west spacing shrinks with
  cosine of latitude. This is a regional overview, unsuitable for landing hazards.

The [LOLA FAQ](https://pds-geosciences.wustl.edu/missions/lro/lola_faq.htm)
uses height terminology for the offset-inclusive conversion. The product label
explicitly distinguishes elevation from planetary radius; LunarOS follows that
product-specific distinction. Elevation here is not height above a lunar geoid.

The label cautions about possible edge artifacts at 45-degree latitude band
boundaries and describes interpolation in the product-generation process.
Derived slopes reflect the gridded product and its sampling scale, rather than
small-scale surface hazards or unmodified individual laser returns.

Additional authoritative format reference:
[LOLA RDR/GDR interface specification](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/document/rdrsis.htm).
