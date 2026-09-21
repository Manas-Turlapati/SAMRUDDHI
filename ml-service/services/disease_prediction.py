"""
services/disease_prediction.py

Was an empty placeholder file. Loads disease_model.pth (EfficientNet-B0,
38 PlantVillage classes, verified by inspecting the checkpoint directly)
and runs prediction on an uploaded leaf image.
"""
from __future__ import annotations

import os

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as tvm

from utils.preprocessing import bytes_to_tensor

DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "disease_model.pth")


def _build_model(num_classes: int) -> nn.Module:
    model = tvm.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features  # 1280
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def _parse_class_name(class_name: str) -> tuple[str, str]:
    """"Crop___Disease_name" -> ("Crop", "Disease Name"). e.g.
    "Tomato___Early_blight" -> ("Tomato", "Early Blight")
    "Apple___healthy"       -> ("Apple", "Healthy")
    """
    crop_raw, _, disease_raw = class_name.partition("___")
    crop = crop_raw.replace("_", " ").strip()
    disease_raw = disease_raw.replace("_", " ").strip().rstrip("_").strip()
    disease = "Healthy" if disease_raw.lower() == "healthy" else disease_raw.title()
    return crop, disease


class DiseaseModel:
    """Loaded once at FastAPI startup (see app.py) and reused for every request."""

    def __init__(self, checkpoint_path: str | None = None, device: str | None = None):
        self.checkpoint_path = checkpoint_path or DEFAULT_MODEL_PATH
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        if not os.path.exists(self.checkpoint_path):
            raise FileNotFoundError(
                f"disease model checkpoint not found at '{self.checkpoint_path}'. "
                "Place the trained .pth file there, or set MODEL_PATH in .env."
            )

        ckpt = torch.load(self.checkpoint_path, map_location=self.device, weights_only=False)
        if not isinstance(ckpt, dict) or "model_state_dict" not in ckpt or "class_names" not in ckpt:
            raise ValueError(
                f"'{self.checkpoint_path}' doesn't have the expected keys "
                "(model_state_dict, class_names, num_classes). Wrong file, or a raw "
                "state_dict was saved instead of the full checkpoint dict."
            )

        self.class_names: list[str] = ckpt["class_names"]
        self.model = _build_model(num_classes=len(self.class_names))
        self.model.load_state_dict(ckpt["model_state_dict"])
        self.model.to(self.device)
        self.model.eval()

    @torch.inference_mode()
    def predict(self, image_bytes: bytes) -> dict:
        """Returns {"crop": str, "disease": str, "confidence": float}."""
        tensor = bytes_to_tensor(image_bytes).to(self.device)
        logits = self.model(tensor)
        probs = F.softmax(logits, dim=1)[0]
        confidence, idx = torch.max(probs, dim=0)

        crop, disease = _parse_class_name(self.class_names[idx.item()])
        return {
            "crop": crop,
            "disease": disease,
            "confidence": round(confidence.item(), 4),
        }
