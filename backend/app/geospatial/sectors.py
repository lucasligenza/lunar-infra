"""User navigation sectors on a cube-sphere, independent of rendering tiles."""
import math
import numpy as np

FACES = {'near':(0,1),'far':(0,-1),'east':(1,1),'west':(1,-1),'north':(2,1),'south':(2,-1)}


def coordinate(face,u,v):
    axis,sign=FACES[face]
    vector=np.zeros(3);vector[axis]=sign
    other=[i for i in range(3) if i!=axis]
    vector[other]=[u,v]
    vector/=np.linalg.norm(vector)
    return {'longitude_deg':math.degrees(math.atan2(vector[1],vector[0]))%360,
            'latitude_deg':math.degrees(math.asin(vector[2]))}


def sector(face,level=0,x=0,y=0):
    if face not in FACES or not 0<=level<=3 or not 0<=x<2**level or not 0<=y<2**level:
        raise ValueError('Invalid cube-sphere sector')
    step=2/2**level;u=-1+x*step;v=-1+y*step
    boundary=[]
    for a,b in [((u,v),(u+step,v)),((u+step,v),(u+step,v+step)),
                ((u+step,v+step),(u,v+step)),((u,v+step),(u,v))]:
        for t in np.linspace(0,1,13)[:-1]:
            boundary.append(coordinate(face,a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])))
    boundary.append(boundary[0])
    return {'id':f'{face}/{level}/{x}/{y}','face':face,'level':level,'x':x,'y':y,
            'name':f'{face.title()} hemisphere' if level==0 else f'{face.title()} sector {level}.{x+1}.{y+1}',
            'center':coordinate(face,u+step/2,v+step/2),'boundary':boundary,
            'indexing':'Dominant Cartesian face; cube UV quadtree. Navigation only, not dataset boundaries.'}


def lookup(longitude,latitude,level=1):
    if not math.isfinite(longitude) or not math.isfinite(latitude) or not -90<=latitude<=90 or not 0<=level<=3:
        raise ValueError('Invalid sector coordinates')
    lon,lat=math.radians(longitude%360),math.radians(latitude)
    vector=[math.cos(lat)*math.cos(lon),math.cos(lat)*math.sin(lon),math.sin(lat)]
    axis=max(range(3),key=lambda i:abs(vector[i]))
    sign=1 if vector[axis]>=0 else -1
    face=next(key for key,value in FACES.items() if value==(axis,sign))
    uv=[vector[i]/abs(vector[axis]) for i in range(3) if i!=axis]
    cells=2**level
    x,y=[min(cells-1,max(0,math.floor((value+1)*cells/2))) for value in uv]
    return sector(face,level,x,y)


def sectors(level=0,face=None):
    if not 0<=level<=3 or face is not None and face not in FACES:raise ValueError('Invalid sector hierarchy')
    return [sector(name,level,x,y) for name in ([face] if face else FACES)
            for y in range(2**level) for x in range(2**level)]
