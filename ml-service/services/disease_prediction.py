"""
services/disease_prediction.py

Loads disease_model.pth (EfficientNet-B0, 38 PlantVillage classes)
and executes the complete machine learning inference pipeline with
Shannon Entropy uncertainty estimation and on-demand Grad-CAM explainability.

====================================================================================================
                        SAMRUDDHI - MACHINE LEARNING INFERENCE FLOW DIAGRAM
====================================================================================================

  [ 1. RAW IMAGE INPUT ]
         │  Uploaded by farmer via Frontend (JPG / JPEG / PNG <= 5MB)
         ▼
  [ 2. FASTAPI STREAM RECEPTION (app.py: /predict) ]
         │  Asynchronous upload validation; dispatches to threadpool
         ▼
  [ 3. PREPROCESSING PIPELINE (preprocessing.py) ]
         │  • PIL decode bytes -> RGB (strips alpha channel)
         │  • Resize: (224, 224) via bilinear interpolation
         │  • ToTensor(): Rescales pixels [0, 255] -> [0.0, 1.0]
         │  • Normalize: ImageNet mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
         │  • Unsqueeze(0): Adds batch dim -> Tensor shape: (1, 3, 224, 224)
         ▼
  [ 4. DEEP LEARNING BACKBONE (disease_prediction.py: EfficientNet-B0) ]
         │  • Stem Conv: 3x3 Conv2d -> (32, 112, 112)
         │  • Stages 2-8: MBConv inverted residual blocks + Squeeze-and-Excitation
         │  • Stage 9: Final conv features[-1] (1280 channels)
         │  • AdaptiveAvgPool2d(1) -> 1280-dim feature vector
         │  • Linear Classifier Head: nn.Linear(1280, 38)
         │  • Output: Raw Logits z in R^38
         ▼
  [ 5. PROBABILISTIC INFERENCE & CONFIDENCE ]
         │  • Softmax: P(y_i) = exp(z_i) / SUM(exp(z_j))
         │  • Predicted Index: idx = argmax(P)
         │  • Model Confidence: confidence = max(P)
         │  • Taxonomy Parser: "Crop___Disease" -> ("Crop", "Disease")
         ▼
  [ 6. UNCERTAINTY ESTIMATION (Shannon Entropy) ]
         │  • Entropy: H(X) = - SUM [ P(y_i) * log2(P(y_i)) ] across all 38 classes
         │
         ├──▶ IF (Confidence < 0.70 OR Entropy > 1.20 bits):
         │       │
         │       ├──▶ [ EXPLAINABLE AI: GRAD-CAM SALIENCY HOOK ]
         │       │       • Hook on features[-1] -> alpha_k = (1/Z) * SUM( d(logit_c) / d(A^k) )
         │       │       • Heatmap = ReLU( SUM( alpha_k * A^k ) ) -> Bilinear (224, 224)
         │       │       • Colorize black-to-red (#ff3b00) + Alpha blend (0.42) with leaf
         │       │       • Returns gradcam_base64
         │       │
         │       └──▶ [ HUMAN-IN-THE-LOOP EXPERT TRIAGE GATE (inferenceGate.js) ]
         │               • Status: PENDING_EXPERT_REVIEW
         │               • Generates 48-hr cryptographic SHA-256 magic token
         │               • Alerts Extension Pathologist for review on canvas
         │
         └──▶ ELSE (Confident & Low Entropy):
                 • Status: AUTOMATED_REVIEW
                 • Direct delivery to farmer
         ▼
  [ 7. AGRONOMIC INTERLOCKING (predictionController.js) ]
         │  • Fertilizer Engine: Certified commercial NPK formulations (e.g. 13-0-45)
         │  • Smart Spray Advisor: 24-hr hourly rain, wind, and leaf scorch check
         │  • Nearby Shops: Geodesic PACS & RBK cooperative map placement
         ▼
  [ 8. MONGODB PERSISTENCE & FRONTEND JSON DELIVERY ]
====================================================================================================
"""
from __future__ import annotations

import os
import io
import base64
import math

import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.models as tvm
from PIL import Image, ImageOps

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

    def predict(self, image_bytes: bytes) -> dict:
        """Return class probabilities, uncertainty, and a Grad-CAM overlay when flagged."""
        tensor = bytes_to_tensor(image_bytes).to(self.device)
        with torch.inference_mode():
            logits = self.model(tensor)
            probs = F.softmax(logits, dim=1)[0]
            confidence, idx = torch.max(probs, dim=0)

        crop, disease = _parse_class_name(self.class_names[idx.item()])
        probabilities = {
            class_name: round(float(probability), 7)
            for class_name, probability in zip(self.class_names, probs.tolist())
        }
        entropy = -sum(value * math.log2(value) for value in probabilities.values() if value > 0)
        result = {
            "crop": crop,
            "disease": disease,
            "confidence": round(confidence.item(), 4),
            "probabilities": probabilities,
            "entropy": round(entropy, 6),
        }
        if result["confidence"] < 0.7 or entropy > 1.2:
            result["gradcam_base64"] = self._gradcam_overlay(image_bytes, idx.item())
        return result

    def _gradcam_overlay(self, image_bytes: bytes, class_index: int) -> str:
        activation = {}

        def capture_activation(_module, _inputs, output):
            output.retain_grad()
            activation["tensor"] = output

        handle = self.model.features[-1].register_forward_hook(capture_activation)
        try:
            tensor = bytes_to_tensor(image_bytes).to(self.device)
            with torch.enable_grad():
                logits = self.model(tensor)
                gradients, = torch.autograd.grad(logits[0, class_index], activation["tensor"])

            features = activation["tensor"]
            weights = gradients.mean(dim=(2, 3), keepdim=True)
            heatmap = F.relu((weights * features).sum(dim=1, keepdim=True))
            heatmap = F.interpolate(heatmap, size=(224, 224), mode="bilinear", align_corners=False)[0, 0]
            heatmap = heatmap - heatmap.min()
            heatmap = heatmap / heatmap.max().clamp_min(1e-8)

            grayscale = Image.fromarray((heatmap.detach().cpu().numpy() * 255).astype("uint8"), mode="L")
            color = ImageOps.colorize(grayscale, black="#000000", white="#ff3b00").convert("RGB")
            original = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((224, 224))
            overlay = Image.blend(original, color, alpha=0.42)
            output = io.BytesIO()
            overlay.save(output, format="PNG", optimize=True)
            return base64.b64encode(output.getvalue()).decode("ascii")
        finally:
            handle.remove()
