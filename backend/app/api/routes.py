from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response

from backend.app.geospatial.terrain import OutsideRegion
from backend.app.models.schemas import Dataset, Health, Region, SiteInspection
from backend.app.services.inspection import TerrainStore, datasets, region

router = APIRouter()


def get_store(request: Request) -> TerrainStore:
    if request.app.state.store is None:
        raise HTTPException(503, detail={"code": "datasets_unavailable",
                                       "message": "Prepare data, then restart the backend: uv run python -m backend.app.data.pipeline"})
    return request.app.state.store


Store = Annotated[TerrainStore, Depends(get_store)]


@router.get("/health", response_model=Health)
def health(request: Request, response: Response):
    ready = request.app.state.store is not None
    response.status_code = 200 if ready else 503
    return Health(status="ready" if ready else "unavailable",
                  detail="Verified scientific datasets loaded" if ready else request.app.state.data_error)


@router.get("/datasets", response_model=list[Dataset])
def list_datasets(request: Request):
    return datasets(request.app.state.store)


@router.get("/regions", response_model=list[Region])
def list_regions(request: Request):
    return [region(request.app.state.store is not None)]


@router.get("/sites/inspect", response_model=SiteInspection,
            responses={404: {"description": "Outside prepared region"}, 503: {"description": "Dataset unavailable"}})
def inspect(store: Store,
            latitude: Annotated[float, Query(ge=-90, le=0, allow_inf_nan=False, description="Planetocentric degrees")],
            longitude: Annotated[float, Query(ge=-180, le=360, allow_inf_nan=False, description="East-positive degrees")]):
    try:
        return store.inspect(longitude, latitude)
    except OutsideRegion as error:
        raise HTTPException(404, detail={"code": "outside_region", "message": str(error)}) from error


@router.get("/regions/{region_id}/layers/{layer}.png", response_class=Response,
            responses={200: {"content": {"image/png": {}}}})
def layer_image(region_id: str, layer: Literal["elevation", "slope", "illumination"], store: Store):
    if region_id != "south-pole":
        raise HTTPException(404, detail="Unknown region")
    return Response(store.images[layer], media_type="image/png", headers={"Cache-Control": "no-cache"})
