"""Native numeric AOI analysis with lunar surface area weighting and profiles."""
import math
import numpy as np
from backend.app.models.analysis import BoxArea,RegionalAnalysis,ElevationProfile
from backend.app.geospatial.global_terrain import RADIUS,slope_rows,SLOPE_METHOD

MAX_CELLS=2_000_000


def angular_distance(longitude,latitude,lon0,lat0):
    lon,lat=np.radians(longitude),np.radians(latitude)
    a=np.sin((lat-math.radians(lat0))/2)**2+np.cos(lat)*math.cos(math.radians(lat0))*np.sin((lon-math.radians(lon0))/2)**2
    return 2*np.arcsin(np.sqrt(np.clip(a,0,1)))


def selection(grid,area):
    if isinstance(area,BoxArea):
        south,north=area.south,area.north;west=area.west%360;width=(area.east-area.west)%360 or 360
    else:
        angle=area.radius_km*1000/RADIUS;delta=math.degrees(angle)
        south,north=max(-90,area.latitude_deg-delta),min(90,area.latitude_deg+delta)
        if south<=-90 or north>=90:west,width=0,360
        else:
            extent=math.degrees(math.asin(min(1,math.sin(angle)/math.cos(math.radians(area.latitude_deg)))))
            west,width=(area.longitude_deg-extent)%360,2*extent
    first=max(0,math.floor((90-north)*grid.ppd));last=min(grid.rows,math.ceil((90-south)*grid.ppd))
    start=math.floor(west*grid.ppd);count=min(grid.columns,math.ceil((west+width)*grid.ppd)-start)
    if (last-first)*count>MAX_CELLS:raise ValueError('Area exceeds two million native cells; reduce extent or select the coarser LOLA global dataset')
    rows=np.arange(first,last);unwrapped=np.arange(start,start+count);columns=unwrapped%grid.columns
    lat=90-(rows+.5)/grid.ppd;lon=(unwrapped+.5)/grid.ppd
    latitude_top=np.minimum(90-rows/grid.ppd,north);latitude_bottom=np.maximum(90-(rows+1)/grid.ppd,south)
    longitude_left=np.maximum(unwrapped/grid.ppd,west);longitude_right=np.minimum((unwrapped+1)/grid.ppd,west+width)
    weights=RADIUS**2*(np.sin(np.radians(latitude_top))-np.sin(np.radians(latitude_bottom)))[:,None]*np.radians(longitude_right-longitude_left)[None,:]
    if not isinstance(area,BoxArea):
        weights[angular_distance(lon[None,:],lat[:,None],area.longitude_deg,area.latitude_deg)>area.radius_km*1000/RADIUS]=0
    return rows,columns,weights


def summary(values,weights,unit):
    valid=np.isfinite(values)&(weights>0)
    area=float(weights[valid].sum())
    return {'minimum':float(values[valid].min()) if area else None,'maximum':float(values[valid].max()) if area else None,
            'mean':float(np.sum(values[valid]*weights[valid])/area) if area else None,'unit':unit,
            'valid_cells':int(valid.sum()),'valid_area_km2':area/1e6}


def analyze(grid,request):
    rows,columns,weights=selection(grid,request.area)
    raw=grid.values[np.ix_(rows,columns)]
    elevation=raw.astype(np.float64)*(.5 if grid.source.id=='lola-global' else 1)
    elevation[raw<=-32764]=np.nan
    if grid.slopes is not None:slopes=np.asarray(grid.slopes[np.ix_(rows,columns)])
    elif len(rows):slopes=slope_rows(grid.values,grid.ppd,int(rows[0]),int(rows[-1]+1),.5 if grid.source.id=='lola-global' else 1)[:,columns]
    else:slopes=np.empty(elevation.shape)
    bins=[0,2,5,10,20,30,90];valid=np.isfinite(slopes)&(weights>0);total=float(weights[valid].sum())
    distribution=[]
    for low,high in zip(bins[:-1],bins[1:]):
        area=float(weights[valid&(slopes>=low)&((slopes<high) if high<90 else (slopes<=high))].sum())
        distribution.append({'minimum_deg':low,'maximum_deg':high,'area_km2':area/1e6,'fraction_of_valid_slope_area':area/total if total else None})
    warnings=['Reference-sphere areas omit relief surface area; coarse slopes do not establish construction safety.']
    if not isinstance(request.area,BoxArea):warnings.append('Circular boundary uses cell-center inclusion; fractional boundary coverage is approximate.')
    polar=(isinstance(request.area,BoxArea) and max(abs(request.area.north),abs(request.area.south))>=79) or (not isinstance(request.area,BoxArea) and abs(request.area.latitude_deg)+math.degrees(request.area.radius_km*1000/RADIUS)>=79)
    if grid.source.id=='gld100' and polar:
        warnings.append('GLD100 uses LOLA polar fill above 79 degrees; longitude pixels narrow toward the poles.')
    if not np.any(weights>0):warnings.append('Area contains no native cell centers at this resolution; increase radius or use an extent.')
    elevation_summary=summary(elevation,weights,'m')
    return RegionalAnalysis(dataset_id=grid.source.id,source_id=grid.source.product_id,version=grid.source.version,
        area=request.area,selected_cells=int((weights>0).sum()),selected_area_km2=float(weights.sum())/1e6,
        terrain_relief_m=elevation_summary['maximum']-elevation_summary['minimum'] if elevation_summary['minimum'] is not None else None,
        elevation=elevation_summary,slope=summary(slopes,weights,'deg'),slope_distribution=distribution,
        resolution={'pixels_per_degree':grid.ppd,'north_south_spacing_m':grid.step_m,'slope_support_pixels':2},
        weighting_method='Spherical cell areas R² Δlongitude (sin(north) − sin(south)); box edge fractions clipped exactly',
        processing_method=SLOPE_METHOD,warnings=warnings,frame_note=grid.source.frame_note)


def profile(grid,request):
    def vector(point):
        lat,lon=math.radians(point.latitude_deg),math.radians(point.longitude_deg)
        return np.array([math.cos(lat)*math.cos(lon),math.cos(lat)*math.sin(lon),math.sin(lat)])
    start,end=vector(request.start),vector(request.end)
    angle=math.atan2(float(np.linalg.norm(np.cross(start,end))),float(np.dot(start,end)))
    if angle>math.pi-1e-7:raise ValueError('Antipodal endpoints have no unique shortest profile; choose another endpoint')
    if angle<1e-12:raise ValueError('Profile endpoints must differ')
    samples=[]
    for fraction in np.linspace(0,1,request.samples):
        point=(math.sin((1-fraction)*angle)*start+math.sin(fraction*angle)*end)/math.sin(angle)
        lon=math.degrees(math.atan2(point[1],point[0]))%360;lat=math.degrees(math.asin(np.clip(point[2],-1,1)))
        if fraction==0:lon,lat=request.start.longitude_deg%360,request.start.latitude_deg
        elif fraction==1:lon,lat=request.end.longitude_deg%360,request.end.latitude_deg
        sample=grid.sample(lon,lat)
        samples.append({'distance_km':float(fraction*angle*RADIUS/1000),'longitude_deg':lon,'latitude_deg':lat,
                        'elevation_m':sample.elevation.value,'status':sample.elevation.status,'sample_row':sample.sample_row,'sample_column':sample.sample_column})
    spacing=angle*RADIUS/(request.samples-1)/1000
    warnings=['Shortest great-circle distance on the lunar reference sphere; no surface-relief distance correction.']
    if spacing*1000<grid.step_m:warnings.append('Samples may repeat native cells; oversampling creates no additional resolved detail.')
    return ElevationProfile(dataset_id=grid.source.id,source_id=grid.source.product_id,version=grid.source.version,
        distance_km=angle*RADIUS/1000,sample_spacing_km=spacing,samples=samples,
        method='Shortest spherical great circle; containing native numeric pixels without interpolation',warnings=warnings,frame_note=grid.source.frame_note)
