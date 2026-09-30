from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class DiscoveryProvider(BaseModel):
    model_config=ConfigDict(extra='forbid')
    id:str=Field(pattern=r'^[a-z0-9-]+$')
    dataset_id:str
    name:str
    collection_id:str=Field(pattern=r'^urn:nasa:pds:[a-z0-9_.:-]+$')
    source_url:str
    note:str


class DiscoveredFile(BaseModel):
    url:str
    bytes:int|None=Field(default=None,ge=0)
    md5:str|None=None
    media_type:str|None=None


class DiscoveredProduct(BaseModel):
    identifier:str
    title:str
    product_class:str
    label_url:str|None
    version:str|None
    period:dict
    indexed_coverage:dict
    files:list[DiscoveredFile]


class DiscoverySnapshot(BaseModel):
    collection_id:str
    source_url:str
    fetched_at:datetime
    metadata_sha256:str
    total_products:int=Field(ge=0)
    limit:int=Field(ge=1,le=20)
    products:list[DiscoveredProduct]
    numerical_queries:bool=False
    overlay_available:bool=False
    note:str='Indexed metadata only; validate original labels, numeric values, coverage and calibration before registration. The PDS index may be incomplete.'
