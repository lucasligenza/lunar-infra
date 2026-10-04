"""Preliminary screening score: a relative engineering-screening aid.

Not habitability, construction safety or mission-success probability. The score
uses only criteria with global coverage, so every candidate on the Moon is scored
the same way. Average solar visibility (polar crop only) and Diviner temperature
remain descriptive evidence and never enter the score. Pure and deterministic.
"""
from backend.app.models.suitability import ScoreComponent

SCORE_METHOD = 'preliminary-screening-score-v2'
# Native terrain slope is the only screening criterion prepared for the entire Moon.
WEIGHTS = {'low_slope_terrain': 1.0}
BANDS = ((80, 'strong'), (60, 'promising'), (40, 'mixed'), (0, 'constrained'))


def band(score: float) -> str:
    return next(name for floor, name in BANDS if score >= floor)


def screening_score(low_slope_fraction: float, max_slope_deg: float):
    """Return (score 0-100, band, components) for one neighborhood."""
    if not 0 <= low_slope_fraction <= 1:
        raise ValueError('low_slope_fraction must be a fraction between 0 and 1')
    component = ScoreComponent(criterion='low_slope_terrain', label='Slope suitability', weight=WEIGHTS['low_slope_terrain'],
        value=low_slope_fraction, evaluated=True, contribution=100 * low_slope_fraction,
        basis=f'Area fraction of valid terrain at or below {max_slope_deg:g} degrees on the native grid.')
    score = component.contribution
    return score, band(score), [component]
