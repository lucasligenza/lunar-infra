import json
from typing import Annotated, Literal
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse
from backend.app.models.globe import GlobeInspection, GlobeMetadata, Destination
from backend.app.services.globe import inspect
from lunaros.dataset import ROOT

router = APIRouter()


@router.get('/globe', response_model=GlobeMetadata)
def metadata(request: Request):
    store = request.app.state.globe
    return store.metadata() if store else GlobeMetadata(available=False)


@router.get('/globe/{artifact}')
def artifact(request: Request, artifact: Literal['color-1k.jpg', 'color-4k.jpg', 'elevation.bin']):
    store = request.app.state.globe
    if store is None:
        raise HTTPException(503, detail='Prepare global data: uv run python -m backend.app.data.globe; restart the backend.')
    return FileResponse(store.directory / artifact,
        media_type='image/jpeg' if artifact.endswith('.jpg') else 'application/octet-stream',
        headers={'Cache-Control': 'no-cache'})


@router.get('/globe/inspect/location', response_model=GlobeInspection)
def location(request: Request,
    latitude: Annotated[float, Query(ge=-90, le=90, allow_inf_nan=False)],
    longitude: Annotated[float, Query(ge=-180, le=360, allow_inf_nan=False)]):
    return inspect(longitude, latitude, request.app.state.globe, request.app.state.store)


@router.get('/destinations', response_model=list[Destination])
def destinations():
    return json.loads((ROOT / 'data/destinations.json').read_text(encoding='utf-8'))
