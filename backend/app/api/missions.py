from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import ValidationError

from backend.app.api.routes import Store
from backend.app.models.mission import AssetCreate, AssetPatch, Revision, Scenario, ScenarioCreate, ScenarioPatch
from backend.app.services.scenarios import Conflict, CorruptRun, NotFound, ScenarioRepository
from backend.app.models.simulation import RunSummary, SimulationRun
from backend.app.simulation.energy import simulate

router = APIRouter(tags=["Mission scenarios"])


def repository(request: Request):
    return request.app.state.scenarios


Repository = Annotated[ScenarioRepository, Depends(repository)]


def translate(operation):
    try:
        return operation()
    except NotFound as error:
        raise HTTPException(404, detail={"code": "not_found", "message": str(error)}) from error
    except Conflict as error:
        raise HTTPException(409, detail={"code": "revision_conflict", "message": str(error)}) from error
    except CorruptRun as error:
        raise HTTPException(503, detail={"code": "stored_run_invalid", "message": str(error)}) from error
    except (ValidationError, ValueError) as error:
        raise HTTPException(422, detail={"code": "invalid_definition", "message": str(error)}) from error


def validate_locations(store, definition):
    for location in [definition.site, *[asset.location for asset in definition.assets]]:
        try:
            sample = store.inspect(location.longitude_deg, location.latitude_deg)
        except ValueError as error:
            raise ValueError("Location is outside the prepared NASA terrain") from error
        if sample.elevation.status != "ok":
            raise ValueError("Location has no valid NASA elevation")


def update(repo, store, identifier, revision, change):
    def validated(document):
        change(document)
        validate_locations(store, Scenario.model_validate(document))
    return translate(lambda: repo.update(identifier, revision, validated))


@router.post("/scenarios", response_model=Scenario, status_code=201)
def create_scenario(definition: ScenarioCreate, repo: Repository, store: Store):
    def create():
        validate_locations(store, definition)
        sources = {item["product_id"]: item["version"] for item in store.registry["sources"].values()}
        return repo.create(definition, sources)
    return translate(create)


@router.get("/scenarios", response_model=list[Scenario])
def list_scenarios(repo: Repository):
    return repo.list()


@router.get("/scenarios/{identifier}", response_model=Scenario)
def read_scenario(identifier: UUID, repo: Repository):
    return translate(lambda: repo.get(identifier))


@router.patch("/scenarios/{identifier}", response_model=Scenario)
def patch_scenario(identifier: UUID, patch: ScenarioPatch, repo: Repository, store: Store):
    changes = patch.model_dump(mode="json", exclude_unset=True)
    changes.pop("revision")
    return update(repo, store, identifier, patch.revision, lambda document: document.update(changes))


@router.delete("/scenarios/{identifier}", status_code=204)
def delete_scenario(identifier: UUID, repo: Repository, revision: Annotated[int, Query(ge=1)]):
    translate(lambda: repo.delete(identifier, revision))
    return Response(status_code=204)


@router.post("/scenarios/{identifier}/duplicate", response_model=Scenario, status_code=201)
def duplicate(identifier: UUID, version: Revision, repo: Repository, store: Store):
    def copy():
        original = repo.get(identifier)
        if original.revision != version.revision:
            raise Conflict("Scenario changed. Reopen before duplicating.")
        data = original.model_dump(mode="json", include={"name", "region_id", "site", "mission", "assets"})
        data["name"] = (original.name[:94] + " copy")
        for asset in data["assets"]:
            asset["id"] = str(uuid4())
        definition = ScenarioCreate.model_validate(data)
        validate_locations(store, definition)
        return repo.create(definition, original.dataset_identifiers)
    return translate(copy)


@router.post("/scenarios/{identifier}/assets", response_model=Scenario, status_code=201)
def add_asset(identifier: UUID, payload: AssetCreate, repo: Repository, store: Store):
    return update(repo, store, identifier, payload.revision,
                  lambda document: document["assets"].append(payload.asset.model_dump(mode="json")))


@router.patch("/scenarios/{identifier}/assets/{asset_id}", response_model=Scenario)
def edit_asset(identifier: UUID, asset_id: UUID, payload: AssetPatch, repo: Repository, store: Store):
    def edit(document):
        if "id" in payload.changes or "kind" in payload.changes:
            raise ValueError("Asset ID and kind cannot be changed")
        asset = next((a for a in document["assets"] if a["id"] == str(asset_id)), None)
        if asset is None:
            raise NotFound("Asset does not exist")
        asset.update(payload.changes)
    return update(repo, store, identifier, payload.revision, edit)


@router.delete("/scenarios/{identifier}/assets/{asset_id}", response_model=Scenario)
def remove_asset(identifier: UUID, asset_id: UUID, repo: Repository, store: Store,
                 revision: Annotated[int, Query(ge=1)]):
    def remove(document):
        if not any(a["id"] == str(asset_id) for a in document["assets"]):
            raise NotFound("Asset does not exist")
        document["assets"] = [a for a in document["assets"] if a["id"] != str(asset_id)]
    return update(repo, store, identifier, revision, remove)


@router.post("/scenarios/{identifier}/simulations", response_model=SimulationRun, status_code=201)
def run_simulation(identifier: UUID, version: Revision, repo: Repository, store: Store):
    def run():
        scenario = repo.get(identifier)
        if scenario.revision != version.revision:
            raise Conflict("Scenario changed. Reopen before running the simulation.")
        validate_locations(store, scenario)
        sources = {item["product_id"]: item["version"] for item in store.registry["sources"].values()}
        if scenario.dataset_identifiers != sources:
            raise Conflict("Spatial dataset versions changed; review and recreate the scenario with current data.")
        result = simulate(ScenarioCreate.model_validate(scenario.model_dump(include={"name", "region_id", "site", "mission", "assets"})))
        return repo.save_run(scenario, result, store.registry["sources"])
    return translate(run)


@router.get("/simulations/{identifier}", response_model=SimulationRun)
def get_simulation(identifier: UUID, repo: Repository):
    return translate(lambda: repo.get_run(identifier))


@router.get("/scenarios/{identifier}/simulations", response_model=list[RunSummary])
def list_simulations(identifier: UUID, repo: Repository):
    return translate(lambda: repo.list_runs(identifier))
