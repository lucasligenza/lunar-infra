import json
from pathlib import Path
from backend.app.models.atlas import DatasetRecord
from lunaros.dataset import ROOT

CATALOG = ROOT / 'data/atlas-sources.json'


def definitions(path: Path = CATALOG) -> dict[str, DatasetRecord]:
    document = json.loads(path.read_text(encoding='utf8'))
    if document['schema_version'] != 1:
        raise ValueError('Unsupported catalog schema')
    records = [DatasetRecord.model_validate(value) for value in document['datasets']]
    if len({record.id for record in records}) != len(records):
        raise ValueError('Duplicate dataset identifier')
    return {record.id: record for record in records}
