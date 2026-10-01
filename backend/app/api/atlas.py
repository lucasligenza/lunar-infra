from typing import Annotated
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response
from backend.app.services.atlas_tiles import layers, render_tile
from backend.app.models.atlas import AtlasPoint, CatalogEntry
from backend.app.data.atlas import acquisition_plan
from backend.app.models.analysis import AnalysisRequest,ProfileRequest,RegionalAnalysis,ElevationProfile
from backend.app.services.regional_analysis import analyze,profile
from backend.app.geospatial.sectors import sectors,lookup
from backend.app.data import discovery
from backend.app.models.discovery import DiscoveryProvider,DiscoverySnapshot
from urllib.error import URLError

router=APIRouter(prefix='/atlas',tags=['Lunar atlas'])


@router.get('/providers',response_model=list[DiscoveryProvider])
def discovery_providers():return list(discovery.providers().values())


@router.get('/discovery/{provider_id}',response_model=DiscoverySnapshot)
def collection_discovery(provider_id:str,limit:Annotated[int,Query(ge=1,le=20)]=10,refresh:bool=False):
    provider=discovery.providers().get(provider_id)
    if provider is None:raise HTTPException(404,detail='Unknown registered discovery provider')
    try:return discovery.discover(provider.collection_id,limit,cache_dir=discovery.CACHE,refresh=refresh)
    except (OSError,URLError,ValueError,KeyError,TypeError) as error:
        raise HTTPException(503,detail='PDS collection metadata unavailable or invalid. Retry source discovery; no numerical data was substituted.') from error


@router.get('/sectors')
def geographic_sectors(level:Annotated[int,Query(ge=0,le=3)]=0,face:str|None=None):
    try:return sectors(level,face)
    except ValueError as error:raise HTTPException(422,detail=str(error))


@router.get('/sectors/lookup')
def containing_sector(latitude:Annotated[float,Query(ge=-90,le=90,allow_inf_nan=False)],
    longitude:Annotated[float,Query(ge=-180,le=360,allow_inf_nan=False)],level:Annotated[int,Query(ge=0,le=3)]=1):
    return lookup(longitude,latitude,level)


@router.post('/analysis',response_model=RegionalAnalysis)
def regional_analysis(body:AnalysisRequest,request:Request):
    try:grid=request.app.state.atlas.grid(body.dataset)
    except ValueError as error:raise HTTPException(503,detail=str(error))
    try:return analyze(grid,body)
    except ValueError as error:raise HTTPException(422,detail=str(error))


@router.post('/profile',response_model=ElevationProfile)
def elevation_profile(body:ProfileRequest,request:Request):
    try:grid=request.app.state.atlas.grid(body.dataset)
    except ValueError as error:raise HTTPException(503,detail=str(error))
    try:return profile(grid,body)
    except ValueError as error:raise HTTPException(422,detail=str(error))


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
    try:
        atlas=request.app.state.atlas;sample=atlas.grid(dataset).sample(longitude,latitude)
        if 'solar-visibility' in atlas.environment:sample.solar_visibility=atlas.environment['solar-visibility'].sample(longitude,latitude)
        if 'diviner-polar-midnight' in atlas.environment:sample.temperature=atlas.environment['diviner-polar-midnight'].sample(longitude,latitude)
        if 'usgs-geology' in atlas.classifications:sample.geology=atlas.classifications['usgs-geology'].sample(longitude,latitude)
        return sample
    except ValueError as error:raise HTTPException(503,detail=str(error))
