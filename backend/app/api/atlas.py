from typing import Annotated
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response
from backend.app.services.atlas_tiles import layers, render_tile
from backend.app.models.atlas import AtlasPoint, CatalogEntry
from backend.app.data.atlas import acquisition_plan

router=APIRouter(prefix='/atlas',tags=['Lunar atlas'])


@router.get('/layers')
def scientific_layers(request:Request):return layers(request.app.state.atlas)


@router.get('/tiles/{identifier}/{layer}/{z}/{x}/{y}.png')
def scientific_tile(request:Request,identifier:str,layer:str,z:int,x:int,y:int):
    try:return Response(render_tile(request.app.state.atlas,identifier,layer,z,x,y),media_type='image/png',headers={'Cache-Control':'public, max-age=3600'})
    except ValueError as error:raise HTTPException(422,detail=str(error))


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
