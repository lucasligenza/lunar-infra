"""Small transactional SQLite repository. Scenario JSON is a versioned aggregate."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from hashlib import sha256
import json
import sqlite3
from uuid import uuid4

from backend.app.models.mission import Scenario, ScenarioCreate
from backend.app.models.simulation import RunSummary, SimulationResult, SimulationRun


class NotFound(Exception):
    pass


class Conflict(Exception):
    pass


class CorruptRun(Exception):
    pass


def digest(value) -> str:
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")).hexdigest()


class ScenarioRepository:
    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as db:
            version = db.execute("PRAGMA user_version").fetchone()[0]
            if version not in (0, 1, 2):
                raise ValueError("Unsupported mission database schema")
            db.execute("CREATE TABLE IF NOT EXISTS scenarios (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, document TEXT NOT NULL)")
            db.execute("CREATE TABLE IF NOT EXISTS simulations (id TEXT PRIMARY KEY, scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE, document TEXT NOT NULL)")
            db.execute("PRAGMA user_version=2")

    @contextmanager
    def connection(self):
        db = sqlite3.connect(self.path, timeout=30)
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def list(self) -> list[Scenario]:
        with self.connection() as db:
            documents = db.execute("SELECT document FROM scenarios ORDER BY json_extract(document, '$.modified_at') DESC, id").fetchall()
        return [Scenario.model_validate_json(row[0]) for row in documents]

    @staticmethod
    def read(db, identifier) -> Scenario:
        row = db.execute("SELECT document FROM scenarios WHERE id=?", (str(identifier),)).fetchone()
        if row is None:
            raise NotFound("Scenario does not exist")
        return Scenario.model_validate_json(row[0])

    def get(self, identifier) -> Scenario:
        with self.connection() as db:
            return self.read(db, identifier)

    def create(self, definition: ScenarioCreate, datasets: dict[str, str]) -> Scenario:
        scenario = Scenario(**definition.model_dump(), id=uuid4(), revision=1,
                            modified_at=datetime.now(timezone.utc), dataset_identifiers=datasets)
        with self.connection() as db:
            db.execute("INSERT INTO scenarios VALUES (?, ?, ?)", (str(scenario.id), 1, scenario.model_dump_json()))
        return scenario

    def update(self, identifier, revision: int, change) -> Scenario:
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            current = self.read(db, identifier)
            if current.revision != revision:
                raise Conflict("Scenario changed. Reopen it before saving your edits.")
            document = current.model_dump(mode="json")
            change(document)
            document.update(revision=revision + 1, modified_at=datetime.now(timezone.utc))
            result = Scenario.model_validate(document)
            db.execute("UPDATE scenarios SET revision=?, document=? WHERE id=?", (result.revision, result.model_dump_json(), str(identifier)))
        return result

    def delete(self, identifier, revision: int):
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            current = self.read(db, identifier)
            if current.revision != revision:
                raise Conflict("Scenario changed. Reopen before deleting.")
            db.execute("DELETE FROM scenarios WHERE id=?", (str(identifier),))

    def save_run(self, scenario: Scenario, result: SimulationResult, provenance: dict) -> SimulationRun:
        snapshot = scenario.model_dump(mode="json")
        run = SimulationRun(id=uuid4(), created_at=datetime.now(timezone.utc), scenario_snapshot=scenario,
            scientific_provenance=provenance, input_sha256=digest({"scenario": snapshot, "spatial_sources": provenance}),
            result_sha256=digest(result.model_dump(mode="json")), result=result)
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            if self.read(db, scenario.id).revision != scenario.revision:
                raise Conflict("Scenario changed during computation. Reopen and rerun.")
            db.execute("INSERT INTO simulations VALUES (?, ?, ?)", (str(run.id), str(scenario.id), run.model_dump_json()))
        return run

    @staticmethod
    def validate_run(document) -> SimulationRun:
        run = SimulationRun.model_validate_json(document)
        if (digest({"scenario": run.scenario_snapshot.model_dump(mode="json"), "spatial_sources": run.scientific_provenance}) != run.input_sha256
                or digest(run.result.model_dump(mode="json")) != run.result_sha256):
            raise CorruptRun("Stored simulation failed integrity verification. Rerun from its saved scenario.")
        return run

    def get_run(self, identifier) -> SimulationRun:
        with self.connection() as db:
            row = db.execute("SELECT document FROM simulations WHERE id=?", (str(identifier),)).fetchone()
        if row is None:
            raise NotFound("Simulation does not exist")
        return self.validate_run(row[0])

    def list_runs(self, scenario_id) -> list[RunSummary]:
        with self.connection() as db:
            self.read(db, scenario_id)
            rows = db.execute("SELECT document FROM simulations WHERE scenario_id=? ORDER BY rowid DESC", (str(scenario_id),)).fetchall()
        runs = [self.validate_run(row[0]) for row in rows]
        return [RunSummary(id=run.id, created_at=run.created_at, scenario_revision=run.scenario_snapshot.revision,
                           input_kind=run.result.input_kind, summary=run.result.summary) for run in runs]
