
"""
LDFRS - Leaf Disease Detection and Fertilizer Recommendation System
FastAPI ML Service
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

from services.disease_prediction import DiseaseModel
from services.fertilizer_recommendation import get_recommendation


# Configuration
MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    "models/disease_model.pth",
)

MODEL_PATH = str((BASE_DIR / MODEL_PATH).resolve()) if not os.path.isabs(MODEL_PATH) else MODEL_PATH

MAX_UPLOAD_BYTES = 5 * 1024 * 1024

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
}

_disease_model: DiseaseModel | None = None


# Load the model when the service starts
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _disease_model

    print(f"[startup] Loading disease model from: {MODEL_PATH}")

    _disease_model = DiseaseModel(
        checkpoint_path=MODEL_PATH
    )

    print(
        f"[startup] Model loaded successfully. "
        f"Classes: {len(_disease_model.class_names)}, "
        f"Device: {_disease_model.device}"
    )

    yield

    _disease_model = None
    print("[shutdown] ML service stopped")


# FastAPI application
app = FastAPI(
    title="LDFRS ML Service",
    description="Leaf disease detection and fertilizer recommendation API",
    version="1.0.0",
    lifespan=lifespan,
)


# Health check
@app.get("/health")
def health():
    model_loaded = _disease_model is not None

    return {
        "success": model_loaded,
        "model_loaded": model_loaded,
        "num_classes": (
            len(_disease_model.class_names)
            if model_loaded
            else 0
        ),
    }


# Disease prediction
@app.post("/predict")
async def predict(image: UploadFile = File(...)):

    if _disease_model is None:
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "message": "Model not loaded yet",
            },
        )

    # Validate image type
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": (
                    "Only JPG, JPEG, and PNG leaf images are supported."
                ),
            },
        )

    # Read uploaded image
    image_bytes = await image.read()

    if not image_bytes:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "Image is required",
            },
        )

    # Validate file size
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "Image size must be 5 MB or smaller.",
            },
        )

    # Run disease prediction
    try:
        prediction = _disease_model.predict(image_bytes)

    except ValueError as error:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": str(error),
            },
        )

    except Exception as error:
        print(f"[prediction error] {error}")

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": f"Inference failed: {error}",
            },
        )

    # Generate fertilizer recommendation
    try:
        recommendation = get_recommendation(
            prediction["disease"]
        )

    except Exception as error:
        print(f"[recommendation error] {error}")

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Failed to generate fertilizer recommendation.",
            },
        )

    # Return response expected by the Node.js backend
    return {
        "success": True,
        "prediction": prediction,
        "recommendation": recommendation,
    }


# Production startup
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=False,
    )
