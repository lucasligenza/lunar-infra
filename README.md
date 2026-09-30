# LunarOS

Reproducible lunar terrain exploration, beginning with a real NASA LOLA elevation
product. The initial architecture and ingestion are implemented; the user's
existing Phase 1 roadmap is pending. See [PROGRESS.md](PROGRESS.md).

Requires Python 3.12 or newer. Run from the repository root; no dependency install
is needed.

```powershell
python -m lunaros fetch
python -m lunaros inspect
python -m unittest discover -s tests -v
```

`fetch` downloads about 2 MB from NASA PDS and verifies pinned checksums. `inspect`
verifies local files and reports grid geometry and elevation range. Downloads stay
in ignored `data/raw/`. A changed archive product or corrupt download fails loudly.

See [architecture](docs/ARCHITECTURE.md) and
[scientific provenance and limitations](docs/DATA_PROVENANCE.md).
