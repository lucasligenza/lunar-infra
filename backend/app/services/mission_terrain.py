"""Choose mission terrain by the saved scenario domain, independently of energy."""
from fastapi import HTTPException


class AtlasTerrain:
    def __init__(self,atlas):
        try:self.grid=atlas.grid()
        except ValueError as error:raise HTTPException(503,detail='Global mission terrain is unavailable; prepare the atlas') from error
        source=self.grid.source
        self.registry={'sources':{source.id:source.model_dump()|{'numeric_artifacts':atlas.registries[source.id]['artifacts'],
            'coordinate_limitation':source.frame_note,'temporal_illumination_available':False}}}
    def inspect(self,longitude,latitude):return self.grid.sample(longitude,latitude)


class MissionTerrain:
    def __init__(self,polar,atlas):self.polar=polar;self.atlas=atlas
    def resolve(self,definition):
        if definition.region_id=='global-atlas':return AtlasTerrain(self.atlas)
        if self.polar is None:raise HTTPException(503,detail='Prepared south-pole scientific data is unavailable')
        return self.polar
