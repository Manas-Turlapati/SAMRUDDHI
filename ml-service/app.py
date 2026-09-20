from flask import Flask, request, jsonify

app = Flask(__name__)


@app.route("/predict", methods=["POST"])
def predict():

    if "image" not in request.files:
        return jsonify({
            "success": False,
            "message": "Image is required"
        }), 400

    image = request.files["image"]

    # TEMPORARY RESPONSE
    # Replace this with the actual ML model later
    return jsonify({
        "prediction": {
            "disease": "Early Blight",
            "confidence": 0.93
        },
        "recommendation": {
            "fertilizer": "NPK 10-10-10",
            "dosage": "20 g per plant",
            "application_method": "Apply around root zone",
            "frequency": "Every 15 days"
        }
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)