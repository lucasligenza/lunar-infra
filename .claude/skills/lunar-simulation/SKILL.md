---
name: lunar-simulation
description: Use when changing the LunarOS energy simulation, rover kinematics, mission/asset schemas, simulation results, playback, power-flow explanations or simulation tutorial. Protects determinism, units, interval semantics, run immutability and energy balance.
---

# Lunar mission simulation

The engine is deterministic Python (`backend/app/simulation/`). The browser
only presents stored results; it never recomputes physics.

## Semantics that must not drift

- **kW vs kWh.** Interval quantities (`generation_kw`, `demand_kw`,
  `charge_kw`, `discharge_kw`, `curtailed_kw`, `unserved_kw`) are
  **interval-average power in kW**. Energy totals and stored energy are
  **kWh**. Never label one as the other.
- **Interval semantics.** Inputs and loads are piecewise-constant per UTC
  interval. SOC, stored energy and rover position are **end-of-interval**
  values; `soc_start`/`energy_start_kwh` give the start.
- **Battery SOC.** Aggregate SOC = Σ stored / Σ capacity over *installed*
  batteries (offline ones included). `minimum_soc` is an inaccessible reserve.
  Limits: `capacity`, `reserve`, `charge_power`, `discharge_power`.
- **Illumination is explicitly hypothetical.** `illumination_factors` are user
  or synthetic inputs (`synthetic` | `custom_hypothetical`). NASA average
  visibility must never become a time series. Say so in UI and docs.
- **Energy balance.** Each interval and the run summary must satisfy
  `generation + initial_stored = served + curtailed + losses + final_stored`
  within relative 1e-9. Tests verify it; never loosen the tolerance.
- **No invented physics.** No thermal, degradation, voltage, terrain shading,
  slope-dependent traction or motion-dependent rover power unless the model is
  explicitly versioned, documented in `docs/energy-model.md` and tested.

## Runs and schemas

- Runs are immutable snapshots: scenario snapshot, spatial source provenance,
  `input_sha256`, `result_sha256`. Adding result fields must keep stored runs
  verifiable (validate digests over the stored field set; new fields optional).
- Pydantic models use `extra="forbid"`; optional new fields need defaults so
  saved scenarios/runs still load. Model version strings are literals.
- Save scenarios through the API with revision checks; never touch SQLite.
- Bounds: ≤10000 intervals, ≤100000 asset-intervals, whole-second UTC.

## Rover movement (rover-kinematics-1)

- Route: start = robot location; explicit destination, departure offset (h),
  speed (km/h), optional dwell (h) and return. Great-circle path on the
  1,737.4 km sphere. Position is a pure function of mission time — no frame
  state. Scrubbing backward/forward and reloading reproduce positions exactly.
- Robot power remains `duty_cycle` interval-average demand in energy-1.0;
  motion does not change consumption. State this limitation in the UI.
- Endpoint terrain is validated; no traversability or path planning.

## Explanations

Power-flow text, mission status (NOMINAL, POWER LIMITED, BATTERY RESERVE,
POWER SHORTAGE, MISSION COMPLETE) and tutorial content are built
deterministically from interval values and events (`frontend/lib/power-flow.ts`).
No LLM text, no values that are not in the stored result.

## Key files

`backend/app/models/mission.py`, `backend/app/models/simulation.py`,
`backend/app/simulation/energy.py`, `backend/app/simulation/rover.py`,
`backend/app/services/scenarios.py`, `frontend/components/mission/*`,
`docs/energy-model.md`.

## Verify

```bash
uv run pytest backend/tests/test_energy.py backend/tests/test_energy_regressions.py backend/tests/test_simulation_api.py backend/tests/test_rover.py -q
```
