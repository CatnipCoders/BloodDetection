"""Minimal Flask serving wrapper for the converted notebooks' models.

Endpoints:
 - GET /health -> returns 200 OK when server is up
 - POST /predict -> accepts multipart/form-data with 'image' file field

Environment variables:
 - MODEL_PATH (optional) -> path to saved Keras model file. Default: 'model_blood_group_detection_resnet.h5'
 - PORT -> port to listen on (default 5000)

This script uses a small compatibility layer and defensive error handling so it fails clearly when TensorFlow cannot be imported.
"""

import os
import io
import json
import glob
from flask import Flask, request, jsonify
from PIL import Image
import numpy as np
from flask_cors import CORS
from db import create_user, get_user, update_user_blood_group, list_users, get_user_history

app = Flask(__name__)
# Enable CORS so the Next.js frontend (running on a different origin during dev)
# can call /predict, /health, etc. In production restrict origins as appropriate.
CORS(app)

# Configuration
MODEL_PATH = os.environ.get("MODEL_PATH", "model_blood_group_detection_resnet.h5")
PORT = int(os.environ.get("PORT", "5000"))

# Labels mapping used by the notebooks — adjust if your training used a different ordering
DEFAULT_LABELS = ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']


def load_model_safe(path):
    """Try to import TensorFlow and locate a model file.

    This will attempt the following in order:
      1. MODEL_PATH env var (if set)
      2. the provided `path`
      3. common subfolders like `test/`, `models/`, `code/`
      4. a quick recursive search for any .h5 or .keras files in the repo

    Returns a loaded Keras model or raises FileNotFoundError / RuntimeError.
    """
    try:
        from tensorflow.keras.models import load_model
    except Exception as e:
        raise RuntimeError(
            "TensorFlow failed to import. See README.md for troubleshooting steps. Original error: {}".format(e)
        )

    tried = []
    env_path = os.environ.get("MODEL_PATH")
    if env_path:
        tried.append(env_path)

    tried.append(path)
    tried.append(os.path.join("test", path))
    tried.append(os.path.join("models", path))
    tried.append(os.path.join("code", path))

    # Add any discovered .h5 / .keras files in the repo to candidates
    for p in glob.glob("**/*.h5", recursive=True):
        tried.append(p)
    for p in glob.glob("**/*.keras", recursive=True):
        tried.append(p)

    # Try candidates
    for candidate in tried:
        if not candidate:
            continue
        if os.path.exists(candidate):
            app.logger.info(f"Loading model from: {candidate}")
            model = load_model(candidate)
            return model

    # Nothing found
    raise FileNotFoundError(
        "Model file not found. Tried: " + ", ".join([str(x) for x in tried if x])
    )


def preprocess_image(file_stream, target_size=(256, 256)):
    # Read image from stream and convert to array expected by the model
    image = Image.open(io.BytesIO(file_stream)).convert('RGB')
    image = image.resize(target_size)
    arr = np.array(image).astype('float32')
    # scale to [0,255] then use preprocess_input if available
    try:
        from tensorflow.keras.applications.imagenet_utils import preprocess_input
        arr = preprocess_input(arr)
    except Exception:
        # fallback: normalize to [0,1]
        arr = arr / 255.0

    arr = np.expand_dims(arr, axis=0)
    return arr


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200


@app.route('/', methods=['GET'])
def index():
    """Root index to guide users (avoids 404 when opening http://localhost:5000).

    Returns a small JSON document describing available endpoints.
    """
    info = {
        'service': 'BloodDetection model API',
        'endpoints': {
            '/health': 'GET - health check',
            '/predict': "POST - multipart/form-data with 'image' file -> returns {label, confidence}"
        }
    }
    return jsonify(info), 200

@app.route('/api/users', methods=['POST'])
def register_user():
    """Create a new user with their blood group and return the created user object."""
    data = request.get_json()
    if not data or not all(k in data for k in ('name', 'email', 'blood_group')):
        return jsonify({'error': 'Missing required fields: name, email, blood_group'}), 400
        
    try:
        user_id = create_user(
            name=data['name'],
            email=data['email'],
            blood_group=data['blood_group'],
            confidence=data.get('confidence')
        )
        # Fetch the created user and return it so clients can immediately display it
        user = get_user(user_id)
        if not user:
            return jsonify({'error': 'Failed to retrieve created user'}), 500
        return jsonify(user), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user_details(user_id):
    """Get user details by ID."""
    user = get_user(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user)

@app.route('/api/users/<int:user_id>/blood-group', methods=['PUT'])
def update_blood_group(user_id):
    """Update a user's blood group."""
    data = request.get_json()
    if not data or 'blood_group' not in data:
        return jsonify({'error': 'Missing blood_group in request'}), 400
        
    success = update_user_blood_group(
        user_id=user_id,
        blood_group=data['blood_group'],
        confidence=data.get('confidence')
    )
    
    if not success:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'status': 'updated'})

@app.route('/api/users/<int:user_id>/history', methods=['GET'])
def user_history(user_id):
    """Get scan history for a user."""
    if not get_user(user_id):
        return jsonify({'error': 'User not found'}), 404
        
    history = get_user_history(user_id)
    return jsonify(history)

@app.route('/api/users', methods=['GET'])
def list_all_users():
    """Get list of all users."""
    try:
        limit = min(int(request.args.get('limit', 100)), 1000)
        users = list_users(limit=limit)
        return jsonify(users)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/favicon.ico')
def favicon():
    # Return no content for favicon requests to avoid 404 spam in logs
    return ('', 204)


@app.route('/predict', methods=['POST'])
def predict():
    # Basic checks
    if 'image' not in request.files:
        return jsonify({'error': "Missing 'image' file in request"}), 400

    img_file = request.files['image']
    file_bytes = img_file.read()

    try:
        arr = preprocess_image(file_bytes)
    except Exception as e:
        return jsonify({'error': f'Error preprocessing image: {e}'}), 400

    try:
        # load model lazily and cache on the app object
        if not hasattr(app, 'model'):
            app.model = load_model_safe(MODEL_PATH)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    # Run prediction
    try:
        preds = app.model.predict(arr)
    except Exception as e:
        return jsonify({'error': f'Error during model.predict: {e}'}), 500

    predicted_index = int(np.argmax(preds, axis=1)[0])
    confidence = float(np.max(preds))

    # Labels may be different in your saved model; allow override via env var
    labels_env = os.environ.get('LABELS')
    if labels_env:
        labels = labels_env.split(',')
    else:
        labels = DEFAULT_LABELS

    if predicted_index < 0 or predicted_index >= len(labels):
        label = str(predicted_index)
    else:
        label = labels[predicted_index]

    return jsonify({'label': label, 'confidence': confidence}), 200


if __name__ == '__main__':
    # Run the Flask development server. For production use a WSGI server.
    app.run(host='0.0.0.0', port=PORT)
