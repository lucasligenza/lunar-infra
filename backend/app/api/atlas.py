from typing import Annotated
from fastapi import APIRouter, HTTPException, Query, Request
from backend.app.models.atlas import AtlasPoint, CatalogEntry
from backend.app.data.atlas import acquisition_plan

router=APIRouter(prefix='/atlas',tags=['Lunar atlas'])


@router.get('/datasets',response_model=list[CatalogEntry])
def catalog(request:Request):
    return request.app.state.atlas.catalog()


@router.get('/acquisition/{identifier}')
def plan(identifier:str):
    try:return acquisition_plan(identifier)
    except KeyError:raise HTTPException(404,detail='Unknown dataset')
    except ValueError as error:raise HTTPException(422,detail=str(error))


@router.get('/inspect',response_model=AtlasPoint)
def inspect(request:Request,
    latitude:Annotated[float,Query(ge=-90,le=90,allow_inf_nan=False)],
    longitude:Annotated[float,Query(ge=-180,le=360,allow_inf_nan=False)],dataset:str='auto'):
    try:return request.app.state.atlas.grid(dataset).sample(longitude,latitude)
    except ValueError as error:raise HTTPException(503,detail=str(error))
