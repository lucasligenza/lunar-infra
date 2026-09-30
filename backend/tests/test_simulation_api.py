import json
import sqlite3
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.app.main import create_app
from backend.app.models.simulation import SimulationRun
from backend.tests.test_api import synthetic_data
from backend.tests.test_energy import scenario


def test_run_snapshot_reproducibility_reopen_integrity_and_cascade(synthetic_data, tmp_path):
    database = tmp_path / "db.sqlite"
    with TestClient(create_app(synthetic_data, database)) as client:
        saved = client.post("/scenarios", json=scenario(factors=[1, 0], generation=20, demand=8, battery={}).model_dump(mode="json")).json()
        path = f"/scenarios/{saved['id']}"
        results = [client.post(path + "/simulations", json={"revision": saved["revision"]}) for _ in range(2)]
        assert all(response.status_code == 201 for response in results)
        runs = [SimulationRun.model_validate(response.json()) for response in results]
        assert runs[0].id != runs[1].id
        assert runs[0].input_sha256 == runs[1].input_sha256
        assert runs[0].result_sha256 == runs[1].result_sha256
        assert runs[0].result == runs[1].result
        assert runs[0].scenario_snapshot.model_dump(mode="json") == saved
        assert runs[0].result.input_kind == "synthetic"
        assert runs[0].scientific_provenance["elevation"]["product_id"] == "LDEM_75S_240M"
        assert len(client.get(path + "/simulations").json()) == 2
        client.patch(path, json={"revision": 1, "name": "Edited later"})
        assert client.post(path + "/simulations", json={"revision": 1}).status_code == 409
    with TestClient(create_app(synthetic_data, database)) as reopened:
        original = reopened.get(f"/simulations/{runs[0].id}").json()
        assert original["scenario_snapshot"]["name"] != "Edited later"
        assert original["scenario_snapshot"]["revision"] == 1
        with sqlite3.connect(database) as db:
            tampered = json.loads(db.execute("SELECT document FROM simulations WHERE id=?", (str(runs[1].id),)).fetchone()[0])
            tampered["result"]["intervals"][0]["generation_kw"] += 1
            db.execute("UPDATE simulations SET document=? WHERE id=?", (json.dumps(tampered), str(runs[1].id)))
        assert reopened.get(f"/simulations/{runs[1].id}").status_code == 503
        with sqlite3.connect(database) as db:
            malformed = runs[0].model_dump(mode="json")
            del malformed["result"]["summary"]
            db.execute("UPDATE simulations SET document=? WHERE id=?", (json.dumps(malformed), str(runs[0].id)))
        assert reopened.get(f"/simulations/{runs[0].id}").status_code == 503
        assert reopened.delete(path + "?revision=2").status_code == 204
        assert reopened.get(f"/simulations/{runs[0].id}").status_code == 404


def test_missing_temporal_input_invalid_profiles_and_missing_runs(synthetic_data, tmp_path):
    with TestClient(create_app(synthetic_data, tmp_path / "db.sqlite")) as client:
        saved = client.post("/scenarios", json={"name": "Missing series", "site": {"latitude_deg": -89.5, "longitude_deg": 0}}).json()
        path = f"/scenarios/{saved['id']}"
        response = client.post(path + "/simulations", json={"revision": 1})
        assert response.status_code == 422 and "explicit time-series" in response.text
        assert client.get(path + "/simulations").json() == []
        assert client.get(f"/simulations/{uuid4()}").status_code == 404
        definition = scenario(factors=[1, 0])
        definition.assets[1].load_profile_kw = [1]
        saved = client.post("/scenarios", json=definition.model_dump(mode="json")).json()
        assert client.post(f"/scenarios/{saved['id']}/simulations", json={"revision": 1}).status_code == 422


def test_schema_one_database_migrates_without_losing_scenario(synthetic_data, tmp_path):
    database = tmp_path / "old.sqlite"
    with TestClient(create_app(synthetic_data, database)) as client:
        saved = client.post("/scenarios", json=scenario().model_dump(mode="json")).json()
    with sqlite3.connect(database) as db:
        db.execute("DROP TABLE simulations")
        db.execute("PRAGMA user_version=1")
    with TestClient(create_app(synthetic_data, database)) as client:
        assert client.get(f"/scenarios/{saved['id']}").json() == saved
        assert client.post(f"/scenarios/{saved['id']}/simulations", json={"revision": 1}).status_code == 201
