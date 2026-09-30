# LunarOS initial architecture

The repository started with no application or roadmap. This foundation implements
the explicitly requested NASA elevation integration; the full Phase 1 roadmap
and acceptance criteria are pending the user's existing roadmap.

## Initial data-to-UI boundary

```text
NASA PDS (pinned IMG + label)
  -> data/raw/ (ignored, verified SHA-256)
  -> lunaros/dataset.py (strict product contract, signed DN)
  -> lunar terrain processing (next milestone)
  -> local read-only inspection API and browser viewer (next milestone)
```

Python 3.12+ provides binary I/O, checksums, CLI, tests, and the eventual local HTTP
service without third-party runtime dependencies. Browser ES modules will provide
the initial visualization. This keeps the first slice reproducible on Windows
and avoids imposing a larger framework before the roadmap is available.

Keep data acquisition, scientific math, HTTP transport, and presentation in separate
modules. Only reviewed source code, small metadata, and test fixtures belong in Git.
Processed terrain must remain reproducible and ignored. No database, cloud service,
authentication, infrastructure deployment, or Phase 2 work is included here.

The initial product is deliberately fixed to LDEM_4 V3.0. Unsupported metadata must
fail explicitly. Higher-resolution and polar products require separate format and
scientific review; they must not silently reuse this cylindrical-grid contract.

The planned HTTP server is for local development, bound to loopback. Python's
[HTTP server documentation](https://docs.python.org/3.12/library/http.server.html)
documents the request-handler API and its production limitations.
