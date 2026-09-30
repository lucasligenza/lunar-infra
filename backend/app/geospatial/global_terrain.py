"""Reference-sphere numerical derivatives on a periodic longitude grid."""
import math
import numpy as np

RADIUS = 1737400
SLOPE_METHOD = 'Central differences on lunar sphere; longitude wraps; five-cell valid stencil; boundary rows missing'


def slope_rows(values,ppd,first,last,scale=1):
    rows,columns=values.shape
    if rows!=round(180*ppd) or columns!=round(360*ppd):raise ValueError('Grid must cover the lunar sphere')
    indices=np.arange(first,last)
    current=np.asarray(values[indices],dtype=np.float64)*scale
    north=np.asarray(values[np.maximum(0,indices-1)],dtype=np.float64)*scale
    south=np.asarray(values[np.minimum(rows-1,indices+1)],dtype=np.float64)*scale
    for data in [current,north,south]:data[data<=-32764*scale]=np.nan
    east=np.roll(current,-1,axis=1);west=np.roll(current,1,axis=1)
    step=math.pi*RADIUS/(180*ppd)
    lat=np.radians(90-(indices+.5)/ppd)
    dx=(east-west)/(2*step*np.cos(lat[:,None]))
    dy=(north-south)/(2*step)
    slope=np.degrees(np.arctan(np.hypot(dx,dy)))
    slope[~np.isfinite(current)]=np.nan
    slope[(indices==0)|(indices==rows-1)]=np.nan
    return slope.astype(np.float32)


def slope_at(values,ppd,row,column,scale=1):
    if row==0 or row==values.shape[0]-1:return None
    neighbors=np.array([values[row,column],values[row,column-1],values[row,(column+1)%values.shape[1]],values[row-1,column],values[row+1,column]],dtype=float)
    if np.any(neighbors<=-32764) or not np.all(np.isfinite(neighbors)):return None
    step=math.pi*RADIUS/(180*ppd)
    dx=(neighbors[2]-neighbors[1])*scale/(2*step*math.cos(math.radians(90-(row+.5)/ppd)))
    dy=(neighbors[3]-neighbors[4])*scale/(2*step)
    return math.degrees(math.atan(math.hypot(dx,dy)))
