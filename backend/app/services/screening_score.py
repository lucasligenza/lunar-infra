"""Preliminary screening score: a relative engineering-screening aid.

Not habitability, construction safety or mission-success probability. Only
criteria the screening actually evaluates contribute; a criterion without
supporting evidence contributes zero and lowers data completeness, so missing
data can never raise a score. Pure and deterministic; no HTTP or UI logic.
"""
from backend.app.models.suitability import ScoreComponent

SCORE_METHOD = 'preliminary-screening-score-v1'
# Equal weights: no validated relative importance exists between flat terrain
# and long-term solar visibility, so neither is preferred.
WEIGHTS = {'low_slope_terrain': 0.5, 'solar_visibility': 0.5}
BANDS = ((80, 'strong'), (60, 'promising'), (40, 'mixed'), (0, 'constrained'))


def band(score: float) -> str:
    return next(name for floor, name in BANDS if score >= floor)


def screening_score(low_slope_fraction: float, solar_visibility: float | None, max_slope_deg: float):
    """Return (score 0-100, completeness 0-1, band, components) for one neighborhood."""
    values = {'low_slope_terrain': low_slope_fraction, 'solar_visibility': solar_visibility}
    bases = {
        'low_slope_terrain': f'Area fraction of valid terrain at or below {max_slope_deg:g} degrees (native grid).',
        'solar_visibility': 'Area-weighted mean modeled average solar visibility (~18.6-year frequency).' if solar_visibility is not None
            else 'Not evaluated: comparable average solar visibility coverage is unavailable here. Contributes 0.',
    }
    labels = {'low_slope_terrain': 'Slope suitability', 'solar_visibility': 'Solar visibility'}
    components = []
    for criterion, weight in WEIGHTS.items():
        value = values[criterion]
        if value is not None and not 0 <= value <= 1:
            raise ValueError(f'{criterion} must be a fraction between 0 and 1')
        components.append(ScoreComponent(criterion=criterion, label=labels[criterion], weight=weight,
            value=value, evaluated=value is not None, contribution=100 * weight * (value or 0.0), basis=bases[criterion]))
    score = sum(component.contribution for component in components)
    completeness = sum(component.weight for component in components if component.evaluated)
    return score, completeness, band(score), components
