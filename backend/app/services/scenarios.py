"""Small transactional SQLite repository. Scenario JSON is a versioned aggregate."""

from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
from uuid import uuid4

from backend.app.models.mission import Scenario, ScenarioCreate


class NotFound(Exception):
    pass


class Conflict(Exception):
    pass


class ScenarioRepository:
    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as db:
            version = db.execute("PRAGMA user_version").fetchone()[0]
            if version not in (0, 1):
                raise ValueError("Unsupported mission database schema")
            db.execute("CREATE TABLE IF NOT EXISTS scenarios (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, document TEXT NOT NULL)")
            db.execute("PRAGMA user_version=1")

    @contextmanager
    def connection(self):
        db = sqlite3.connect(self.path, timeout=30)
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
