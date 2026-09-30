from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from backend.app.main import create_app
from backend.app.models.mission import Battery, Mission, ScenarioCreate
from backend.app.services.scenarios import Conflict, ScenarioRepository
from backend.tests.test_api import synthetic_data

LOCATION = {"latitude_deg": -89.5, "longitude_deg": 0}


def test_scenario_assets_roundtrip_reopen_duplicate_and_delete(synthetic_data, tmp_path):
    database = tmp_path / "missions.sqlite"
    with TestClient(create_app(synthetic_data, database)) as client:
        response = client.post("/scenarios", json={"name": "Outpost", "site": LOCATION})
        assert response.status_code == 201
        scenario = response.json()
        path = f"/scenarios/{scenario['id']}"
        assert scenario["dataset_identifiers"]["LDEM_75S_240M"] == "V2.0"
        for kind in ["habitat", "solar_array", "battery", "communications", "robot"]:
            response = client.post(path + "/assets", json={"revision": scenario["revision"], "asset": {
                "kind": kind, "name": kind, "location": LOCATION}})
            assert response.status_code == 201, response.text
            scenario = response.json()
        habitat = scenario["assets"][0]
        response = client.patch(path + f"/assets/{habitat['id']}", json={"revision": scenario["revision"],
                               "changes": {"name": "Research habitat", "demand_kw": 12}})
        assert response.status_code == 200
        scenario = response.json()
        assert scenario["assets"][0]["demand_kw"] == 12
        duplicate = client.post(path + "/duplicate", json={"revision": scenario["revision"]}).json()
        assert duplicate["id"] != scenario["id"] and duplicate["revision"] == 1
        assert len({a["id"] for a in duplicate["assets"]} & {a["id"] for a in scenario["assets"]}) == 0
        assert client.delete(path + f"/assets/{habitat['id']}?revision={scenario['revision']}").json()["revision"] == scenario["revision"] + 1
    with TestClient(create_app(synthetic_data, database)) as restarted:
        saved = restarted.get(path).json()
        assert len(saved["assets"]) == 4
        assert len(restarted.get("/scenarios").json()) == 2
        assert restarted.delete(path + f"?revision={saved['revision']}").status_code == 204
        assert restarted.get(path).status_code == 404
        assert restarted.get(f"/scenarios/{duplicate['id']}").status_code == 200


def test_invalid_locations_definitions_and_failed_transactions_preserve_state(synthetic_data, tmp_path):
    with TestClient(create_app(synthetic_data, tmp_path / "db.sqlite")) as client:
        for latitude in [-80, -90]:  # outside and synthetic fixture nodata at pole
            assert client.post("/scenarios", json={"name": "Invalid", "site": {**LOCATION, "latitude_deg": latitude}}).status_code == 422
        scenario = client.post("/scenarios", json={"name": "Valid", "site": LOCATION}).json()
        path = f"/scenarios/{scenario['id']}"
        assert client.patch(path, json={"revision": 1, "mission": {"timestep_seconds": 0}}).status_code == 422
        assert client.patch(path, json={"revision": 1, "site": {**LOCATION, "latitude_deg": -80}}).status_code == 422
        assert client.post(path + "/assets", json={"revision": 1, "asset": {
            "kind": "habitat", "name": "Bad", "location": LOCATION, "demand_kw": -1}}).status_code == 422
        assert client.get(path).json() == scenario
        scenario = client.post(path + "/assets", json={"revision": 1, "asset": {
            "kind": "battery", "name": "Storage", "location": LOCATION}}).json()
        asset = scenario["assets"][0]
        for changes in [{"initial_soc": 0}, {"kind": "habitat"}, {"id": str(uuid4())}, {"capacity_kwh": None}, {"unknown": 1}]:
            assert client.patch(path + f"/assets/{asset['id']}", json={"revision": 2, "changes": changes}).status_code == 422
        assert client.patch(path, json={"revision": 1, "name": "Stale"}).status_code == 409
        assert client.delete(path + "?revision=1").status_code == 409
        assert client.get(path).json() == scenario
        assert client.delete(path + f"/assets/{uuid4()}?revision=2").status_code == 404


def test_concurrent_revision_updates_have_one_winner(tmp_path):
    repo = ScenarioRepository(tmp_path / "db.sqlite")
    original = repo.create(ScenarioCreate(name="Concurrency", site=LOCATION), {})
    def edit(name):
        try:
            return repo.update(original.id, 1, lambda document: document.update(name=name)).name
        except Conflict:
            return "conflict"
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(edit, ["First", "Second"]))
    assert outcomes.count("conflict") == 1
    assert repo.get(original.id).revision == 2


@pytest.mark.parametrize("changes", [{"charge_efficiency": 0}, {"discharge_efficiency": 1.1},
    {"capacity_kwh": 0}, {"max_charge_kw": -1}, {"initial_soc": 0.05}, {"initial_soc": float("nan")}])
def test_invalid_battery_parameters(changes):
    with pytest.raises(ValidationError):
        Battery(name="Test battery", location=LOCATION, **changes)


@pytest.mark.parametrize("changes", [{"start": "2027-01-01T00:00:00"}, {"end": "2026-01-01T00:00:00Z"},
    {"timestep_seconds": 5000}, {"timestep_seconds": True}, {"illumination_factors": [1]},
    {"illumination_kind": "nasa_average"}])
def test_invalid_time_axes_and_unvalidated_sources(changes):
    with pytest.raises(ValidationError):
        Mission(**changes)
