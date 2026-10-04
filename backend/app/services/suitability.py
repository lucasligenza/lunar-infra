"""Deterministic, area-weighted terrain/solar tradeoffs and preliminary screening scores on a lunar sphere."""
import math
import numpy as np
from backend.app.models.analysis import CircleArea
from backend.app.models.suitability import Candidate, SuitabilityReport
from backend.app.geospatial.terrain import RADIUS_M, project, INVERSE
from backend.app.geospatial.global_terrain import slope_rows
from backend.app.services.regional_analysis import angular_distance, selection
from backend.app.services.screening_score import SCORE_METHOD, screening_score

MODEL = 'settlement-screening-v3'
MAX_CELLS = 2_000_000
MIN_COVERAGE = .9
UNKNOWN = ['Radiation protection, communications, subsurface bearing strength and accessible resources are not evaluated.',
           'No location-accurate time-resolved sunlight or habitat thermal model is available.']


def destination(lon,lat,distance_km,bearing):
    phi,lam,theta=math.radians(lat),math.radians(lon),math.radians(bearing)
    angle=distance_km*1000/RADIUS_M
    origin=np.array([math.cos(phi)*math.cos(lam),math.cos(phi)*math.sin(lam),math.sin(phi)])
    north=np.array([-math.sin(phi)*math.cos(lam),-math.sin(phi)*math.sin(lam),math.cos(phi)])
    east=np.array([-math.sin(lam),math.cos(lam),0])
    target=origin*math.cos(angle)+(north*math.cos(theta)+east*math.sin(theta))*math.sin(angle)
    return math.degrees(math.atan2(target[1],target[0]))%360,math.degrees(math.atan2(target[2],math.hypot(target[0],target[1])))



def centers(area,spacing):
    points = [(area.longitude_deg%360,area.latitude_deg)]
    rings = min(8,math.floor(area.radius_km/spacing))
    for ring in range(1,rings+1):
        distance = ring*spacing
        count = max(6,round(2*math.pi*distance/spacing))
        points.extend(destination(area.longitude_deg,area.latitude_deg,distance,360*i/count) for i in range(count))
    return points


def polar_window(polar,lon,lat,radius):
    if polar is None or lat>0:
        return None
    column,row=(~polar.transform)@project(lon,lat)
    if not (0<=row<polar.elevation.shape[0] and 0<=column<polar.elevation.shape[1]):return None
    outline = [project(*destination(lon,lat,radius,i*10)) for i in range(36)]
    columns,rows = zip(*[(~polar.transform)@point for point in outline])
    first,last = math.floor(min(rows)),math.ceil(max(rows))
    left,right = math.floor(min(columns)),math.ceil(max(columns))
    if first<0 or left<0 or last>polar.elevation.shape[0] or right>polar.elevation.shape[1]:
        return None
    r,c = np.arange(first,last),np.arange(left,right)
    x = polar.transform.c+(c+.5)*polar.transform.a
    y = polar.transform.f+(r+.5)*polar.transform.e
    longitude,latitude = INVERSE.transform(*np.broadcast_arrays(x[None,:],y[:,None]))
    scale = 1+(x[None,:]**2+y[:,None]**2)/(4*RADIUS_M**2)
    weights = abs(polar.transform.a*polar.transform.e)/scale**2
    weights = np.where(angular_distance(longitude,latitude,lon,lat)<=radius*1000/RADIUS_M,weights,0)
    return polar.elevation[np.ix_(r,c)],polar.slope[np.ix_(r,c)],weights,longitude,latitude


def terrain_window(grid,lon,lat,radius):
    rows,columns,weights = selection(grid,CircleArea(latitude_deg=lat,longitude_deg=lon,radius_km=radius))
    raw = grid.values[np.ix_(rows,columns)]
    elevation = np.where(raw<=-32764,np.nan,raw.astype(float)*(.5 if grid.source.id=='lola-global' else 1))
    slopes = (np.asarray(grid.slopes[np.ix_(rows,columns)]) if grid.slopes is not None else
        slope_rows(grid.values,grid.ppd,int(rows[0]),int(rows[-1]+1),.5 if grid.source.id=='lola-global' else 1)[:,columns])
    longitude,latitude = np.broadcast_arrays((columns[None,:]+.5)/grid.ppd,90-(rows[:,None]+.5)/grid.ppd)
    return elevation,slopes,weights,longitude,latitude


def dominated(first,second):
    """Compare low-slope terrain only within the same terrain source.

    Solar visibility exists only in the polar crop, so it never ranks candidates.
    """
    if first.evidence_group != second.evidence_group:
        return False
    return first.low_slope_fraction<second.low_slope_fraction


def fronts(candidates):
    remaining = list(candidates);result=[];front=1
    while remaining:
        best=[candidate for candidate in remaining if not any(dominated(candidate,other) for other in remaining)]
        for candidate in best:candidate.tradeoff_front=front
        result.extend(best);ids={candidate.id for candidate in best}
        remaining=[candidate for candidate in remaining if candidate.id not in ids];front+=1
    return result


def screen(atlas,request):
    base=atlas.grid(request.dataset)
    warnings=[]
    if request.dataset=='auto' and abs(request.area.latitude_deg)>85 and polar_window(atlas.polar,request.area.longitude_deg,request.area.latitude_deg,request.candidate_radius_km) is None and 'lola-global' in atlas.grids:
        base=atlas.grid('lola-global');warnings.append('Polar overview uses coarser LOLA to avoid oversampling convergent longitude cells.')
    nominal=max(request.candidate_radius_km,1.5*base.step_m/1000)
    spacing=max(request.candidate_radius_km,request.area.radius_km/8)
    points=centers(request.area,spacing);candidates=[];visited=0;source_ids=set()
    for index,(lon,lat) in enumerate(points):
        local=polar_window(atlas.polar,lon,lat,request.candidate_radius_km) if request.dataset=='auto' else None
        if local is not None:
            elevation,slopes,weights,longitude,latitude=local
            source=atlas.definitions['lola-south'];radius=request.candidate_radius_km;native=atlas.polar.transform.a
        else:
            radius=nominal;native=base.step_m;source=base.source
            elevation,slopes,weights,longitude,latitude=terrain_window(base,lon,lat,radius)
        visited+=weights.size
        if visited>MAX_CELLS:
            raise ValueError('Search exceeds two million native cells; reduce radius or choose the coarser LOLA overview under Advanced.')
        total=float(weights.sum())
        valid=np.isfinite(elevation)&np.isfinite(slopes)&(weights>0)
        support=float(weights[valid].sum())
        if not total or support/total<MIN_COVERAGE:
            continue
        low=float(weights[valid&(slopes<=request.max_slope_deg)].sum())
        solar=None;solar_fraction=0
        illumination=atlas.environment.get('solar-visibility')
        if illumination is not None:
            values=illumination.at(longitude,latitude)
            valid_sun=np.isfinite(values)&valid
            light_area=float(weights[valid_sun].sum());solar_fraction=float(np.clip(light_area/total,0,1))
            # Do not renormalize tiny supported slivers into full-evidence recommendations.
            if solar_fraction>=MIN_COVERAGE:
                solar=float(np.sum(values[valid_sun]*weights[valid_sun])/light_area)
                source_ids.add(illumination.source.id)
        temperature=atlas.environment.get('diviner-polar-midnight')
        thermal=temperature.sample(lon,lat) if temperature is not None else None
        if thermal is not None and thermal.status=='ok':source_ids.add(temperature.source.id)
        source_ids.add(source.id)
        reasons=[f'{100*low/support:.1f}% of supported terrain at or below the {request.max_slope_deg:g} degree screening assumption.',
                 f'{radius:g} km neighborhood; terrain pixel spacing about {native:g} m.']
        unknowns=list(UNKNOWN)
        if solar is None:unknowns.append('Comparable average sunlight coverage is unavailable for this neighborhood.')
        else:reasons.append(f'{solar*100:.1f}% modeled average solar visibility (descriptive, not scored: polar coverage only); no eclipse timing inferred.')
        if thermal is None or thermal.status!='ok':unknowns.append('Selected local-time thermal bin has no supported center measurement.')
        else:reasons.append(f'{thermal.value:.1f} K center brightness temperature in one summer/local-time bin; descriptive only.')
        if radius>request.candidate_radius_km:reasons.append('Neighborhood enlarged to span at least three native terrain pixels across its diameter.')
        low_fraction=float(np.clip(low/support,0,1))
        score,score_band,components=screening_score(low_fraction,request.max_slope_deg)
        # Data completeness: share of the neighborhood area with valid terrain (at least 90%).
        candidates.append(Candidate(screening_score=min(100.0,score),score_band=score_band,data_completeness=float(np.clip(support/total,0,1)),score_components=components,id=f'candidate-{index+1}',longitude_deg=lon,latitude_deg=lat,radius_km=radius,
            dataset_id=source.id,source_id=source.product_id,version=source.version,spacing_m=native,
            valid_terrain_fraction=float(np.clip(support/total,0,1)),low_slope_fraction=low_fraction,low_slope_area_km2=low/1e6,
            mean_slope_deg=float(np.sum(slopes[valid]*weights[valid])/support),solar_visibility=solar,
            solar_valid_fraction=solar_fraction,temperature_at_center=thermal,
            evidence_group=source.id,
            tradeoff_front=0,reasons=reasons,unknowns=unknowns))
    ordered=sorted(fronts(candidates),key=lambda value:(value.tradeoff_front,value.evidence_group,value.latitude_deg,value.longitude_deg))
    selected=[]
    # Round robin over terrain sources: one grid cannot displace every result from another.
    groups={name:[item for item in ordered if item.evidence_group==name] for name in sorted({item.evidence_group for item in ordered})}
    while any(groups.values()) and len(selected)<request.limit:
        for group in groups.values():
            if not group or len(selected)>=request.limit:continue
            item=group.pop(0)
            if all(float(angular_distance(item.longitude_deg,item.latitude_deg,prior.longitude_deg,prior.latitude_deg))*RADIUS_M/1000>=min(item.radius_km,prior.radius_km) for prior in selected):
                selected.append(item)
    if not selected:warnings.append('No neighborhoods have at least 90% valid terrain support at the selected resolution.')
    # Rank by score within each terrain source; grids of different resolution are not ranked together.
    selected.sort(key=lambda item:(item.evidence_group,-item.screening_score,item.id))
    for group in {item.evidence_group for item in selected}:
        for rank,item in enumerate((item for item in selected if item.evidence_group==group),start=1):item.rank_in_group=rank
    return SuitabilityReport(model_version=MODEL,score_method=SCORE_METHOD,request=request,candidates=selected,evaluated_centers=len(points),
        supported_candidates=len(candidates),search_spacing_km=spacing,sources=[atlas.definitions[key].model_dump() for key in sorted(source_ids)],
        assumptions=['Protected human outpost screening, not a human safety or construction certification.',
            'Equal-distance ring search, at most eight rings; not exhaustive site optimization.',
            'At least 90% valid area required per ranked criterion; missing evidence never increases suitability.',
            'Candidates are ranked by low-slope area fraction only within the same terrain source.',
            'Spherical surface distances; center-inclusion boundaries; stereographic cell areas corrected by local scale squared.',
            'Average solar visibility, temperature and geology are descriptive; none enters the score or ranking.',
            'Preliminary screening score = 100 x low-slope area fraction. Solar visibility is excluded because validated average-visibility maps cover only polar regions, not the entire Moon.',
            'The score is a relative engineering-screening aid within one evidence group, not habitability, construction safety or mission-success probability.'],warnings=warnings)


NEIGHBORHOOD_MAX_CELLS=20000


def neighborhood(atlas,request):
    """Return the exact native cells a candidate's screening evaluated, with their own values.

    Uses the same windows, weights and thresholds as `screen`, so aggregate fractions
    reproduce the candidate. No finer grid or interpolated cell is created.
    """
    from backend.app.models.suitability import NeighborhoodCell,NeighborhoodReport
    from backend.app.geospatial.terrain import FORWARD
    lon,lat,radius=request.longitude_deg%360,request.latitude_deg,request.radius_km
    if request.dataset_id=='lola-south':
        local=polar_window(atlas.polar,lon,lat,radius)
        if local is None:raise ValueError('Neighborhood is outside the prepared south-pole terrain')
        elevation,slopes,weights,longitude,latitude=local
        source=atlas.definitions['lola-south'];spacing=float(atlas.polar.transform.a)
        hx,hy=atlas.polar.transform.a/2,abs(atlas.polar.transform.e)/2
        x,y=FORWARD.transform(longitude,latitude)
        corners=[INVERSE.transform(x+dx,y+dy) for dx,dy in ((-hx,-hy),(hx,-hy),(hx,hy),(-hx,hy))]
        method='Native 240 m south polar stereographic cells; cell-center inclusion within the great-circle radius; stereographic scale-corrected areas.'
    else:
        grid=atlas.grid(request.dataset_id)
        elevation,slopes,weights,longitude,latitude=terrain_window(grid,lon,lat,radius)
        source=grid.source;spacing=float(grid.step_m);half=.5/grid.ppd
        corners=[((longitude+dx)%360,np.clip(latitude+dy,-90,90)) for dx,dy in ((-half,-half),(half,-half),(half,half),(-half,half))]
        method='Native equirectangular cells of the screening grid; cell-center inclusion within the great-circle radius; spherical cell areas.'
    inside=weights>0
    if int(inside.sum())>NEIGHBORHOOD_MAX_CELLS:raise ValueError('Neighborhood exceeds 20000 native cells; choose a smaller radius')
    illumination=atlas.environment.get('solar-visibility')
    solar=illumination.at(longitude,latitude) if illumination is not None else np.full(weights.shape,np.nan)
    total=float(weights[inside].sum())
    valid=np.isfinite(elevation)&np.isfinite(slopes)&inside
    support=float(weights[valid].sum())
    valid_sun=np.isfinite(solar)&valid;light=float(weights[valid_sun].sum())
    solar_fraction=float(np.clip(light/total,0,1)) if total else 0.0
    def finite(value):return float(value) if np.isfinite(value) else None
    cells=[]
    for index in zip(*np.nonzero(inside)):
        slope=finite(slopes[index]);ok=bool(valid[index])
        cells.append(NeighborhoodCell(center=(float(longitude[index])%360,float(latitude[index])),
            polygon=[(float(corner[0][index])%360,float(corner[1][index])) for corner in corners],
            elevation_m=finite(elevation[index]),slope_deg=slope,low_slope=(slope<=request.max_slope_deg) if ok else None,
            solar_visibility=finite(solar[index]) if ok else None,area_km2=float(weights[index])/1e6))
    return NeighborhoodReport(dataset_id=source.id,source_id=source.product_id,version=source.version,spacing_m=spacing,
        radius_km=radius,max_slope_deg=request.max_slope_deg,center=(lon,lat),cells=cells,
        valid_terrain_fraction=float(np.clip(support/total,0,1)) if total else 0.0,
        low_slope_fraction=float(np.clip(weights[valid&(slopes<=request.max_slope_deg)].sum()/support,0,1)) if support else None,
        solar_visibility=float(np.sum(solar[valid_sun]*weights[valid_sun])/light) if solar_fraction>=MIN_COVERAGE else None,
        solar_valid_fraction=solar_fraction,method=method)
