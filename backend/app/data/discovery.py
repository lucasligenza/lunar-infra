"""Bounded PDS collection discovery; never downloads or registers numeric data."""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import re
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
from uuid import uuid4
from backend.app.models.discovery import DiscoveryProvider, DiscoverySnapshot, DiscoveredProduct, DiscoveredFile
from lunaros.dataset import ROOT

BASE='https://pds.nasa.gov/api/search/1'
CACHE=ROOT/'data/raw/discovery'
MAX_BYTES=2*1024*1024


def providers():
    document=json.loads((ROOT/'data/discovery-providers.json').read_text(encoding='utf8'))
    if document['schema_version']!=1:raise ValueError('Unsupported discovery provider schema')
    entries=[DiscoveryProvider.model_validate(item) for item in document['providers']]
    if len({item.id for item in entries})!=len(entries):raise ValueError('Duplicate discovery provider ID')
    return {item.id:item for item in entries}


def collection_url(identifier,limit):
    if not re.fullmatch(r'urn:nasa:pds:[a-z0-9_.:-]+',identifier) or not 1<=limit<=20:
        raise ValueError('Use a valid PDS collection identifier and a limit between 1 and 20')
    return f'{BASE}/products/{quote(identifier,safe=":")}/members?{urlencode({"limit":limit})}'


def normalize(document,identifier,url,limit,fetched_at,fingerprint):
    hits=document['summary']['hits'];items=document['data']
    if not isinstance(hits,int) or hits<0 or not isinstance(items,list) or len(items)>limit:
        raise ValueError('PDS response exceeds the requested result limit or has invalid summary metadata')
    products=[]
    for item in items:
        if not item['id'].startswith(identifier.split('::')[0]+':'):
            raise ValueError('PDS returned an unrelated collection member')
        properties=item.get('properties',{});metadata=item.get('metadata',{})
        def values(key):
            result=properties.get(key,[])
            return result if isinstance(result,list) else [result]
        def first(key):
            result=values(key)
            return result[0] if result else None
        refs=values('ops:Data_File_Info.ops:file_ref');sizes=values('ops:Data_File_Info.ops:file_size')
        checksums=values('ops:Data_File_Info.ops:md5_checksum');types=values('ops:Data_File_Info.ops:mime_type')
        if refs and len(refs)!=len(sizes):raise ValueError('PDS file sizes cannot be matched unambiguously to URLs')
        files=[DiscoveredFile(url=ref,bytes=int(sizes[index]),md5=checksums[index] if len(checksums)==len(refs) else None,
            media_type=types[index] if len(types)==len(refs) else None) for index,ref in enumerate(refs)]
        coverage={name:first('geom:Surface_Geometry_Min_Max.geom:'+field) for name,field in
            [('south','minimum_latitude'),('north','maximum_latitude'),('west','minimum_longitude'),('east','maximum_longitude')]}
        coverage['note']='Original index values; longitude convention and actual numeric axes are not validated.'
        products.append(DiscoveredProduct(identifier=item['id'],title=item.get('title',item['id']),product_class=item.get('type','Unknown'),
            label_url=metadata.get('label_url'),version=str(metadata['version']) if metadata.get('version') is not None else None,
            period={'start':item.get('start_date_time'),'stop':item.get('stop_date_time')},indexed_coverage=coverage,files=files))
    return DiscoverySnapshot(collection_id=identifier,source_url=url,fetched_at=fetched_at,metadata_sha256=fingerprint,
        total_products=hits,limit=limit,products=products)


def discover(identifier,limit=10,*,cache_dir:Path=CACHE,refresh=False,offline=False):
    url=collection_url(identifier,limit);path=cache_dir/(sha256(url.encode()).hexdigest()+'.json')
    if path.exists() and (offline or not refresh):
        if path.stat().st_size>MAX_BYTES*2:raise ValueError('Discovery cache exceeds its size budget')
        saved=json.loads(path.read_text(encoding='utf8'));raw=saved['raw_json'].encode('utf8')
        if saved['schema_version']!=1 or saved['source_url']!=url or sha256(raw).hexdigest()!=saved['sha256']:
            raise ValueError('Discovery cache integrity failed; explicitly refresh source metadata')
        return normalize(json.loads(raw),identifier,url,limit,saved['fetched_at'],saved['sha256'])
    if offline:raise ValueError('No cached discovery snapshot; fetch metadata first')
    with urlopen(Request(url,headers={'Accept':'application/json','User-Agent':'LunarOS-atlas/1'}),timeout=10) as response:
        if int(response.headers.get('Content-Length','0'))>MAX_BYTES:raise ValueError('PDS metadata exceeds the 2 MiB response budget')
        raw=response.read(MAX_BYTES+1)
    if len(raw)>MAX_BYTES:raise ValueError('PDS metadata exceeds the 2 MiB response budget')
    fingerprint=sha256(raw).hexdigest();fetched_at=datetime.now(timezone.utc).isoformat()
    result=normalize(json.loads(raw),identifier,url,limit,fetched_at,fingerprint)
    cache_dir.mkdir(parents=True,exist_ok=True);temporary=path.with_suffix(f'.{uuid4().hex}.tmp')
    saved={'schema_version':1,'source_url':url,'fetched_at':fetched_at,'sha256':fingerprint,'raw_json':raw.decode('utf8')}
    try:temporary.write_text(json.dumps(saved),encoding='utf8');temporary.replace(path)
    finally:temporary.unlink(missing_ok=True)
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--provider',default='diviner-gcp');parser.add_argument('--collection')
    parser.add_argument('--limit',type=int,default=10);parser.add_argument('--offline',action='store_true')
    parser.add_argument('--refresh',action='store_true');parser.add_argument('--plan',action='store_true')
    args=parser.parse_args();identifier=args.collection or providers()[args.provider].collection_id
    if args.plan:print(json.dumps({'url':collection_url(identifier,args.limit),'response_budget_bytes':MAX_BYTES,'numeric_download_bytes':0},indent=2))
    else:print(discover(identifier,args.limit,refresh=args.refresh,offline=args.offline).model_dump_json(indent=2))


if __name__=='__main__':main()
