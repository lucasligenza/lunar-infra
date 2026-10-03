from datetime import datetime, timedelta, timezone
from backend.tests.test_api import synthetic_data  # noqa: F401  (pytest fixture)
from uuid import UUID
import math

import pytest
from pydantic import ValidationError

from backend.app.models.mission import Location, Robot, ScenarioCreate
from backend.app.simulation.energy import simulate
from backend.app.simulation.rover import MOTION_MODEL, RADIUS_KM, interpolate, rover_state, surface_distance_km

START = datetime(2027, 1, 1, tzinfo=timezone.utc)
ORIGIN = {"latitude_deg": -89.5, "longitude_deg": 0}
DESTINATION = {"latitude_deg": -89.5, "longitude_deg": 90}


def robot(**route):
    return Robot(id=UUID(int=9), name="Mathematical rover", location=ORIGIN,
                 route={"destination": DESTINATION, **route} if route is not None else None)


def at(hours):
    return START + timedelta(hours=hours)


def test_great_circle_distance_and_interpolation_on_the_lunar_sphere():
    a, b = Location(**ORIGIN), Location(**DESTINATION)
    # Two points 0.5 degrees from the pole, 90 degrees apart in longitude.
    expected = RADIUS_KM * math.acos(math.sin(math.radians(-89.5)) ** 2 + math.cos(math.radians(-89.5)) ** 2 * math.cos(math.radians(90)))
    assert surface_distance_km(a, b) == pytest.approx(expected, rel=1e-12)
    lat, lon = interpolate(a, b, .5)
    midpoint = Location(latitude_deg=lat, longitude_deg=lon)
    assert surface_distance_km(a, midpoint) == pytest.approx(expected / 2, rel=1e-9)
    assert surface_distance_km(midpoint, b) == pytest.approx(expected / 2, rel=1e-9)
    assert interpolate(a, b, 0) == pytest.approx((a.latitude_deg, a.longitude_deg))
    with pytest.raises(ValueError, match="antipodal"):
        interpolate(Location(latitude_deg=0, longitude_deg=0), Location(latitude_deg=0, longitude_deg=180), .5)


def test_outbound_dwell_return_positions_are_pure_functions_of_time():
    rover = robot(departure_hours=2, speed_kmh=1, dwell_hours=3, return_to_start=True)
    distance = surface_distance_km(rover.location, rover.route.destination)
    travel = distance / 1
    start = rover_state(rover, START, at(0))
    assert (start.state, start.moving, start.distance_from_start_km) == ("parked", False, 0)
    assert (start.latitude_deg, start.longitude_deg) == pytest.approx((ORIGIN["latitude_deg"], 0))
    mid = rover_state(rover, START, at(2 + travel / 2))
    assert mid.state == "outbound" and mid.moving and mid.distance_from_start_km == pytest.approx(distance / 2)
    assert surface_distance_km(rover.location, Location(latitude_deg=mid.latitude_deg, longitude_deg=mid.longitude_deg)) == pytest.approx(distance / 2, rel=1e-9)
    arrived = rover_state(rover, START, at(2 + travel + 1))
    assert arrived.state == "at_destination" and not arrived.moving
    assert (arrived.latitude_deg, arrived.longitude_deg) == pytest.approx((DESTINATION["latitude_deg"], DESTINATION["longitude_deg"]))
    returning = rover_state(rover, START, at(2 + travel + 3 + travel / 4))
    assert returning.state == "returning" and returning.distance_from_start_km == pytest.approx(distance * .75)
    home = rover_state(rover, START, at(2 + 2 * travel + 3 + 1))
    assert home.state == "returned" and home.distance_from_start_km == pytest.approx(0, abs=1e-9)
    assert home.odometer_km == pytest.approx(2 * distance)
    # Scrubbing backward and forward reproduces exactly the same state.
    for hours in [2 + travel / 2, 0, 2 + 2 * travel + 4, 2 + travel / 2]:
        assert rover_state(rover, START, at(hours)) == rover_state(rover, START, at(hours))
    assert rover_state(rover, START, at(2 + travel / 2)) == mid


def test_one_way_route_stays_at_destination_and_validation_rejects_invalid_routes():
    rover = robot(speed_kmh=2, return_to_start=False)
    late = rover_state(rover, START, at(1000))
    assert late.state == "at_destination" and late.odometer_km == pytest.approx(surface_distance_km(rover.location, rover.route.destination))
    assert rover_state(Robot(name="Parked", location=ORIGIN), START, at(5)).state == "parked"
    for bad in [{"speed_kmh": 0}, {"speed_kmh": -1}, {"departure_hours": -1}, {"dwell_hours": float("nan")}]:
        with pytest.raises(ValidationError):
            robot(**bad)
    with pytest.raises(ValidationError):
        Robot(name="Bad", location=ORIGIN, route={"destination": {"latitude_deg": -91, "longitude_deg": 0}})


def test_simulation_reports_end_of_interval_rover_states_without_changing_energy():
    def scenario(route):
        rover = {"id": str(UUID(int=9)), "kind": "robot", "name": "Mathematical rover", "location": ORIGIN,
                 "active_demand_kw": 2, "idle_demand_kw": .2, "duty_cycle": .25, "route": route}
        return ScenarioCreate(name="Mathematical rover test", site=ORIGIN, assets=[
            {"id": str(UUID(int=1)), "kind": "solar_array", "name": "Array", "location": ORIGIN, "rated_power_kw": 10, "derating": 1}, rover],
            mission={"start": START, "end": START + timedelta(hours=6), "timestep_seconds": 3600, "illumination_kind": "synthetic",
                     "illumination_label": "Isolated mathematical input", "illumination_factors": [1, 1, 0, 0, 1, 1]})
    moving = simulate(scenario({"destination": DESTINATION, "departure_hours": 1, "speed_kmh": 1, "return_to_start": True}))
    parked = simulate(scenario(None))
    assert moving.motion_model_version == MOTION_MODEL and any(MOTION_MODEL in note for note in moving.assumptions)
    # Energy-1.0 keeps duty-cycle demand: motion does not change power accounting.
    for a, b in zip(moving.intervals, parked.intervals):
        assert (a.demand_kw, a.generation_kw, a.unserved_kw) == (b.demand_kw, b.generation_kw, b.unserved_kw)
    key = str(UUID(int=9))
    states = [row.rovers[key] for row in moving.intervals]
    # Interval 0 ends exactly at the one-hour departure: outbound, but not yet moved.
    assert states[0].state == "outbound" and states[0].moving_hours == 0 and states[0].distance_from_start_km == 0
    distance = surface_distance_km(Location(**ORIGIN), Location(**DESTINATION))
    rover = next(asset for asset in scenario({"destination": DESTINATION, "departure_hours": 1, "speed_kmh": 1}).assets if asset.kind == "robot")
    for index, state in enumerate(states):
        # Each reported state is the pure kinematic state at that interval's end.
        expected = rover_state(rover, START, at(index + 1), index)
        assert state == expected
        assert state.distance_from_start_km <= distance + 1e-9
    assert sum(state.moving_hours for state in states) == pytest.approx(min(5, 2 * distance))
    assert simulate(scenario({"destination": DESTINATION, "departure_hours": 1, "speed_kmh": 1})) == simulate(
        scenario({"destination": DESTINATION, "departure_hours": 1, "speed_kmh": 1}))
    assert all(row.rovers[key].state == "parked" for row in parked.intervals)


def test_rover_routes_validate_terrain_persist_and_reload_identically(tmp_path, request):
    from fastapi.testclient import TestClient
    from backend.app.main import create_app
    from backend.app.models.simulation import SimulationRun
    from backend.tests.test_energy import scenario
    synthetic = request.getfixturevalue("synthetic_data")
    base = scenario(factors=[1, 0, 1, 0], generation=10, demand=2).model_dump(mode="json")
    rover = {"kind": "robot", "name": "Route rover", "location": ORIGIN, "route": {"destination": DESTINATION, "speed_kmh": 5}}
    database = tmp_path / "db.sqlite"
    with TestClient(create_app(synthetic, database)) as client:
        outside = client.post("/scenarios", json=base | {"assets": base["assets"] + [rover | {"route": {"destination": {"latitude_deg": -80, "longitude_deg": 0}}}]})
        assert outside.status_code == 422
        saved = client.post("/scenarios", json=base | {"assets": base["assets"] + [rover]})
        assert saved.status_code == 201, saved.text
        scenario_id, revision = saved.json()["id"], saved.json()["revision"]
        run = SimulationRun.model_validate(client.post(f"/scenarios/{scenario_id}/simulations", json={"revision": revision}).json())
        rover_id = next(asset["id"] for asset in saved.json()["assets"] if asset["kind"] == "robot")
        assert [row.rovers[rover_id].state for row in run.result.intervals][0] == "outbound"
        assert run.result.intervals[-1].rovers[rover_id].distance_from_start_km > 0
    with TestClient(create_app(synthetic, database)) as reopened:
        restored = SimulationRun.model_validate(reopened.get(f"/simulations/{run.id}").json())
        assert restored.result.intervals == run.result.intervals and restored.result_sha256 == run.result_sha256
