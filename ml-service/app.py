"""
app.py

REPLACES the Flask stub. Your intended architecture specifies "Python
FastAPI ML Service" and the backend's mlService.js already sends a
standard multipart POST -- that part doesn't change. What changes is that
this file now actually loads the model and runs real inference instead of
returning the hardcoded "TEMPORARY RESPONSE".

Contract kept IDENTICAL to what backend/src/services/mlService.js and
backend/src/controllers/predictionController.js already expect (verified
by reading that code, not assumed):
    - form field name: "image"          (mlService.js: form.append("image", ...))
    - success shape:  {"success": true, "prediction": {...}, "recommendation": {...}}
    - error shape:    {"success": false, "message": "..."}   (matches the
      original Flask stub's error format, and frontend's getApiError()
      checks `.message` before `.error`)

Run:
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

load_dotenv()

from services.disease_prediction import DiseaseModel  # noqa: E402
from services.fertilizer_recommendation import get_recommendation  # noqa: E402

MODEL_PATH = os.environ.get("MODEL_PATH", "models/disease_model.pth")
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # matches frontend's ImageUpload.jsx 5 MB limit
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png"}  # matches ImageUpload.jsx validTypes

_disease_model: DiseaseModel | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _disease_model
    _disease_model = DiseaseModel(checkpoint_path=MODEL_PATH)
    print(f"[startup] disease model loaded from '{MODEL_PATH}' "
          f"({len(_disease_model.class_names)} classes, device={_disease_model.device})")
    yield
    _disease_model = None


app = FastAPI(title="LDFRS ML Service", lifespan=lifespan)


@app.get("/health")
def health():
    ok = _disease_model is not None
    return {
        "success": ok,
        "model_loaded": ok,
        "num_classes": len(_disease_model.class_names) if ok else 0,
    }


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    if _disease_model is None:
        return JSONResponse(status_code=503, content={"success": False, "message": "Model not loaded yet"})

    if image.content_type not in ALLOWED_CONTENT_TYPES:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Only JPG, JPEG, and PNG leaf images are supported."},
        )

    image_bytes = await image.read()
    if not image_bytes:
        return JSONResponse(status_code=400, content={"success": False, "message": "Image is required"})
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        return JSONResponse(status_code=400, content={"success": False, "message": "Image size must be 5 MB or smaller."})

    try:
        prediction = _disease_model.predict(image_bytes)
    except ValueError as e:
        return JSONResponse(status_code=400, content={"success": False, "message": str(e)})
    except Exception as e:  # noqa: BLE001
        return JSONResponse(status_code=500, content={"success": False, "message": f"Inference failed: {e}"})

    recommendation = get_recommendation(prediction["disease"])

    return {
        "success": True,
        "prediction": prediction,  # {"crop", "disease", "confidence"}
        "recommendation": recommendation,  # {"fertilizer", "dosage", "application_method", "frequency"}
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)
