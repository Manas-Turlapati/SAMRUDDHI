"""
services/fertilizer_recommendation.py

NOTE ON THE FILE RENAME: the original stub was named
"fertilizer-recommendation.py" (hyphen). That's not valid Python module
syntax -- `from services.fertilizer-recommendation import x` is a syntax
error, and even `import importlib` workarounds are needlessly fragile.
This file uses an underscore instead; delete the old hyphenated one when
you drop this in.

NOTE ON WHAT THIS ACTUALLY IS: models/fertilizer_model.pkl is currently a
0-byte placeholder -- there is no trained fertilizer model anywhere in the
uploaded project. Rather than leave the whole `recommendation` object
undefined (which the backend and frontend both already expect and render,
see Prediction.js / reportService.js / PredictionResult.jsx), this ships a
small static lookup table keyed by disease name, so the full pipeline
produces real, non-empty output today. Swap `get_recommendation()` for
real fertilizer_model.pkl inference once that model exists -- the function
signature (disease name in, same dict shape out) is designed to make that
swap a one-function change.
"""
from __future__ import annotations

# Keyed by the *exact* disease strings produced by disease_prediction.py's
# _parse_class_name(), e.g. "Early Blight", "Healthy", "Bacterial Spot".
_RECOMMENDATIONS: dict[str, dict] = {
    "Healthy": {
        "fertilizer": "Balanced NPK 10-10-10 (maintenance)",
        "dosage": "10 g per plant",
        "application_method": "Broadcast around the base and water in",
        "frequency": "Every 30 days",
    },
    "Early Blight": {
        "fertilizer": "NPK 10-10-10 + Calcium Nitrate",
        "dosage": "20 g per plant",
        "application_method": "Apply around root zone, avoid foliage contact",
        "frequency": "Every 15 days",
    },
    "Late Blight": {
        "fertilizer": "Potassium-rich NPK 5-10-20",
        "dosage": "15 g per plant",
        "application_method": "Apply around root zone",
        "frequency": "Every 10-14 days during active infection",
    },
    "Bacterial Spot": {
        "fertilizer": "NPK 10-10-10 + Copper-based foliar spray",
        "dosage": "20 g per plant (fertilizer), per label (foliar spray)",
        "application_method": "Root zone for fertilizer, foliar spray for copper",
        "frequency": "Every 15 days",
    },
    "Powdery Mildew": {
        "fertilizer": "Low-nitrogen NPK 5-10-10",
        "dosage": "15 g per plant",
        "application_method": "Apply around root zone",
        "frequency": "Every 20 days",
    },
    "Black Rot": {
        "fertilizer": "NPK 10-10-10 + Potassium Sulfate",
        "dosage": "20 g per plant",
        "application_method": "Apply around root zone",
        "frequency": "Every 15 days",
    },
}

_DEFAULT_RECOMMENDATION = {
    "fertilizer": "General balanced NPK 10-10-10",
    "dosage": "15-20 g per plant",
    "application_method": "Apply around root zone, follow local agronomist guidance",
    "frequency": "Every 15-20 days",
}


def get_recommendation(disease: str) -> dict:
    """disease: the display string from disease_prediction.py, e.g. "Early Blight".
    Falls back to a generic balanced recommendation for any disease not yet
    in the table above, so the API never returns a missing/undefined
    `recommendation` object."""
    return dict(_RECOMMENDATIONS.get(disease, _DEFAULT_RECOMMENDATION))
