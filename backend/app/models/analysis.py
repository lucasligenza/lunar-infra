from typing import Annotated,Literal
from pydantic import BaseModel,ConfigDict,Field,model_validator


class Coordinates(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    latitude_deg:float=Field(ge=-90,le=90)
    longitude_deg:float=Field(ge=-180,le=360)


class CircleArea(Coordinates):
    kind:Literal['circle']='circle'
    radius_km:float=Field(ge=1,le=600)


class BoxArea(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    kind:Literal['box']='box'
    south:float=Field(ge=-90,le=90)
    north:float=Field(ge=-90,le=90)
    west:float=Field(ge=-180,le=360)
    east:float=Field(ge=-180,le=360)
    @model_validator(mode='after')
    def validate_extent(self):
        if self.south>=self.north or self.east==self.west:
            raise ValueError('Area requires positive latitude and longitude extent; wrap west to east across zero if needed')
        return self


class AnalysisRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    dataset:str='auto'
    area:Annotated[CircleArea|BoxArea,Field(discriminator='kind')]


class ProfileRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    dataset:str='auto'
    start:Coordinates
    end:Coordinates
    samples:int=Field(default=128,ge=2,le=1024)


class Summary(BaseModel):
    minimum:float|None
    maximum:float|None
    mean:float|None
    unit:str
    valid_cells:int
    valid_area_km2:float


class RegionalAnalysis(BaseModel):
    dataset_id:str
    source_id:str
    version:str
    reference_radius_m:float=1737400
    area:CircleArea|BoxArea
    selected_cells:int
    selected_area_km2:float
    terrain_relief_m:float|None
    elevation:Summary
    slope:Summary
    slope_distribution:list[dict]
    resolution:dict
    weighting_method:str
    processing_method:str
    warnings:list[str]
    frame_note:str


class ElevationProfile(BaseModel):
    dataset_id:str
    source_id:str
    version:str
    distance_km:float
    sample_spacing_km:float
    samples:list[dict]
    reference_radius_m:float=1737400
    method:str
    warnings:list[str]
    frame_note:str
