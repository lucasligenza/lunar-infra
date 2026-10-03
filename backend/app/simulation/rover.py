"""Deterministic rover kinematics (rover-kinematics-1); no HTTP, database, UI or AI.

A rover with a route travels the shortest great circle on the 1,737.4 km lunar
reference sphere from its placed location to an explicit destination at a
constant hypothetical speed, optionally dwells, then optionally returns.
Position is a pure function of mission time, so scrubbing backward or forward
and reopening a saved run reproduce the same positions. Relief, slopes,
obstacles, traction and path planning are not modeled, and motion does not
change electrical demand in energy-1.0.
"""
from datetime import datetime
import math

from backend.app.models.simulation import RoverState

MOTION_MODEL = "rover-kinematics-1"
RADIUS_KM = 1737.4


def _unit(latitude: float, longitude: float) -> tuple[float, float, float]:
    lat, lon = math.radians(latitude), math.radians(longitude)
    return (math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat))


def central_angle(a, b) -> float:
    """Great-circle angle (radians) between two Location-like points, stable for short distances."""
    u, v = _unit(a.latitude_deg, a.longitude_deg), _unit(b.latitude_deg, b.longitude_deg)
    cross = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
    return math.atan2(math.hypot(*cross), sum(p * q for p, q in zip(u, v)))


def surface_distance_km(a, b) -> float:
    return central_angle(a, b) * RADIUS_KM


def interpolate(a, b, fraction: float) -> tuple[float, float]:
    """Spherical linear interpolation; returns (latitude_deg, longitude_deg 0-360)."""
    angle = central_angle(a, b)
    if angle < 1e-15:
        return a.latitude_deg, a.longitude_deg % 360
    if abs(angle - math.pi) < 1e-9:
        raise ValueError("Rover route endpoints are antipodal; the great-circle path is not unique")
    u, v = _unit(a.latitude_deg, a.longitude_deg), _unit(b.latitude_deg, b.longitude_deg)
    wa, wb = math.sin((1 - fraction) * angle) / math.sin(angle), math.sin(fraction * angle) / math.sin(angle)
    x, y, z = (wa * p + wb * q for p, q in zip(u, v))
    return math.degrees(math.atan2(z, math.hypot(x, y))), math.degrees(math.atan2(y, x)) % 360


def rover_state(robot, start: datetime, at: datetime, previous_hours: float | None = None) -> RoverState:
    """Rover state at `at`; `previous_hours` (elapsed hours at the interval start) yields moving time."""
    route = robot.route
    origin = robot.location
    elapsed = (at - start).total_seconds() / 3600
    if route is None:
        return RoverState(latitude_deg=origin.latitude_deg, longitude_deg=origin.longitude_deg % 360, state="parked",
                          moving=False, distance_from_start_km=0, odometer_km=0, moving_hours=0)
    distance = surface_distance_km(origin, route.destination)
    travel = distance / route.speed_kmh
    depart = route.departure_hours
    arrive = depart + travel
    leave = arrive + route.dwell_hours
    back = leave + travel

    def moving_until(hours: float) -> float:
        total = min(max(hours - depart, 0), travel)
        if route.return_to_start:
            total += min(max(hours - leave, 0), travel)
        return total

    if travel == 0 or elapsed < depart:
        state, fraction = "parked", 0.0
    elif elapsed < arrive:
        state, fraction = "outbound", (elapsed - depart) / travel
    elif not route.return_to_start or elapsed < leave:
        state, fraction = "at_destination", 1.0
    elif elapsed < back:
        state, fraction = "returning", 1 - (elapsed - leave) / travel
    else:
        state, fraction = "returned", 0.0
    latitude, longitude = interpolate(origin, route.destination, fraction)
    odometer = moving_until(elapsed) * route.speed_kmh
    moving_hours = moving_until(elapsed) - moving_until(previous_hours) if previous_hours is not None else 0.0
    return RoverState(latitude_deg=latitude, longitude_deg=longitude, state=state, moving=state in ("outbound", "returning"),
                      distance_from_start_km=fraction * distance, odometer_km=odometer, moving_hours=moving_hours)
