# Deterministic energy model energy-1.0

The Python engine consumes typed hypothetical assets and an explicit illumination
factor for every UTC interval. These factors are assumptions about available
electrical output: generation = rated_kW * derating * factor for operational arrays.
They do not convert NASA average visibility into instantaneous sunlight or eclipses.
All arrays currently share the input factor; spatial shading and orientation are
not computed. Custom input profiles are also hypothetical until a measured/modeled
time-dependent source and its geometry have been validated.

Loads: operational habitat and communications continuous kW; a habitat interval
profile overrides continuous demand. Robot load is duty * active + (1-duty) * idle.
All assets share an ideal DC bus with no transmission loss or load-shedding priority.

## Units and conservation

Power is kW and elapsed time is hours; their product is energy in kWh.
Charging from the bus stores P_charge * dt * eta_charge internally. Discharging
delivers P_discharge * dt to the bus and withdraws that amount / eta_discharge.
The difference is an explicit battery loss, never silently discarded.

```text
generation_energy + initial_stored_energy
 = served_load_energy + curtailed_energy + battery_losses + final_stored_energy
served_load_energy = demanded_energy - unserved_energy
```

Every interval and whole-run summary reports the residual of this equation. Float64
arithmetic with compensated sums is checked against relative 1e-9 energy tolerance.
Tests also independently verify bus balance, bounds and losses. Dispatch under
1e-12 kW is treated as zero; shortage event detection uses 1e-9 kW tolerance.
Configurations beyond supported floating-point precision fail explicitly.

## Storage dispatch and timing

Bus charge/discharge limits, internal capacity and reserve SOC apply to each active
battery. A battery never charges and discharges simultaneously. Offline batteries
retain energy but cannot dispatch. Aggregate SOC includes all installed batteries;
per-battery state is included so inactive storage cannot be mistaken for supply.
Capacity times minimum_soc is inaccessible reserve; capacity minus reserve is the
dispatchable window. Initial SOC must be at or above reserve.

Batteries dispatch in sorted UUID order, an explicit deterministic priority rather
than optimized dispatch. Generation and loads are constant within each input
interval. When a battery fills or reaches reserve, the engine integrates to that
instant and redispatches the remaining interval. This records exact shortage onset
under these assumptions, including fractional intervals. Reported powers are
interval averages, and SOC/energy are end-of-interval values, with initial values
also preserved. Coarse intervals still cannot recover variation absent from input.
Mission endpoints use whole-second UTC precision; subsecond timestamps are rejected
to preserve exact reopening through the current editor. Each provided factor is
finite and between zero and one. Missing values have no interpolation rule and fail
validation. The power charts display interval averages as steps; SOC connects
interval-end samples, while exact shortage/battery-limit events retain their timestamps.

No random state, Earth daily cycle or automatic location-to-illumination inference
is used. At most 10000 reporting intervals and 100000 asset-intervals are supported
to bound local work and output size. Thermal coupling, aging, battery voltage,
startup transients, mechanical deployment and conversion physics are omitted.

## Rover kinematics (rover-kinematics-1)

A robot may carry an explicit hypothetical route: destination (validated against
the scenario's terrain like every location), departure offset in hours, constant
speed in km/h, optional dwell at the destination and optional return. The rover
follows the shortest great circle on the 1,737.4 km reference sphere from its
placed location. Position is a pure function of elapsed mission time
(`backend/app/simulation/rover.py`), so scrubbing backward or forward and reopening
a stored run reproduce identical positions. Each interval reports the
end-of-interval state (parked, outbound, at destination, returning, returned),
distance from start, odometer and hours moving within the interval.

No path planning, traversability, relief, slope, obstacles or traction are
modeled. Motion does **not** change electrical demand: energy-1.0 keeps the
robot's duty-cycle interval-average load, and the shared ideal bus has no
geography-dependent losses. Runs stored before this addition omit rover states;
their integrity digests are verified over the stored field set and still pass.

## Playback explanation semantics (presentation only)

`frontend/lib/power-flow.ts` restates one stored interval with fixed templates;
it computes no physics. Values are interval-average kW and end-of-interval SOC.
Battery SOC at interval start is `energy_start_kwh / Σ installed capacity`.

| Status | Rule (first match) |
| --- | --- |
| POWER SHORTAGE | `unserved_kw > 1e-9` |
| BATTERY RESERVE | any battery reports the `reserve` limit in the interval |
| POWER LIMITED | batteries discharge (`discharge_kw > 1e-9`) to cover demand |
| NOMINAL | otherwise: generation covers demand |

*Mission complete* is shown at the last interval with the stored kWh summary:
generated, consumed (= demanded − unserved), unserved, shortage hours, minimum
SOC and the first shortage explained with the same templates. Asset cues on the
Moon use the same interval: arrays dim at zero output, batteries show an SOC arc
(amber at or near reserve), loads turn red when any demand is unserved (the bus
has no load-shedding priority), and rovers move to their stored position.
