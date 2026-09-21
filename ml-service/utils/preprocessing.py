"""
utils/preprocessing.py

Was an empty placeholder file. Fills in the preprocessing pipeline for the
EfficientNet-B0 disease model.

NOTE ON THE ASSUMPTION BAKED IN HERE: disease_model.pth stores the
architecture and class names but not the exact transform used during
training. This uses 224x224 resize + standard ImageNet normalization,
which is what most EfficientNet-B0 fine-tune tutorials use. If your
training script used something different, update IMG_SIZE / MEAN / STD
below to match, or predictions will be quietly unreliable.
"""
from __future__ import annotations

import io

from PIL import Image
from torchvision import transforms

IMG_SIZE = 224
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

TRANSFORM = transforms.Compose(
    [
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ]
)


def bytes_to_tensor(image_bytes: bytes):
    """Decode raw image bytes (as received from FastAPI's UploadFile) into a
    normalized (1, 3, 224, 224) tensor ready for the model.

    Raises ValueError on anything that isn't a decodable image, so the
    caller can turn it into a clean 400 response instead of a 500.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        raise ValueError(f"Could not decode image: {e}") from e

    return TRANSFORM(image).unsqueeze(0)
