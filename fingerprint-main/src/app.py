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
from db import (
    create_user, get_user, get_user_by_email, update_user_blood_group, 
    list_users, get_user_history, add_vital_signs, get_latest_vital_signs,
    get_vital_signs_history, save_health_report, get_user_reports,
    get_user_complete_data
)

app = Flask(__name__)

# Configure logging to show INFO level messages
import logging
logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)

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
        from tensorflow import keras
        from tensorflow.keras.models import load_model
        from tensorflow.keras.applications import ResNet50
        import h5py
        import tensorflow as tf
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
    # But exclude h5py test files
    for p in glob.glob("**/*.h5", recursive=True):
        if 'h5py' not in p and 'site-packages' not in p:
            tried.append(p)
    for p in glob.glob("**/*.keras", recursive=True):
        tried.append(p)

    # Try candidates
    last_error = None
    for candidate in tried:
        if not candidate:
            continue
        if not os.path.exists(candidate):
            continue
            
        # Skip non-model h5 files
        if 'h5py' in candidate or 'site-packages' in candidate:
            continue
            
        app.logger.info(f"Attempting to load model from: {candidate}")
        
        # Strategy 1: Try loading weights into a fresh ResNet50 architecture
        try:
            app.logger.info(f"Strategy 1: Loading weights into fresh ResNet50 architecture")
            
            # Create a fresh ResNet50 model with custom top layers
            base_model = ResNet50(weights=None, include_top=False, input_shape=(256, 256, 3))
            x = base_model.output
            x = keras.layers.GlobalAveragePooling2D()(x)
            x = keras.layers.Dense(512, activation='relu')(x)
            x = keras.layers.Dropout(0.5)(x)
            x = keras.layers.Dense(256, activation='relu')(x)
            x = keras.layers.Dropout(0.3)(x)
            predictions = keras.layers.Dense(8, activation='softmax')(x)
            
            model = keras.Model(inputs=base_model.input, outputs=predictions)
            
            # Try to load weights from the old model
            try:
                model.load_weights(candidate, by_name=True, skip_mismatch=True)
                app.logger.info(f"Loaded weights with skip_mismatch=True")
            except:
                # If that fails, try loading all weights
                model.load_weights(candidate)
                app.logger.info(f"Loaded all weights")
            
            # Compile model
            model.compile(
                optimizer='adam',
                loss='sparse_categorical_crossentropy',
                metrics=['accuracy']
            )
            
            app.logger.info(f"Successfully loaded model from: {candidate}")
            return model
            
        except Exception as e:
            error_str = str(e)
            app.logger.warning(f"Strategy 1 failed for {candidate}: {error_str}")
            last_error = e
        
        # Strategy 2: Try direct load_model with compile=False
        try:
            app.logger.info(f"Strategy 2: Direct load_model")
            model = load_model(candidate, compile=False)
            model.compile(
                optimizer='adam',
                loss='sparse_categorical_crossentropy',
                metrics=['accuracy']
            )
            app.logger.info(f"Successfully loaded model from: {candidate}")
            return model
        except Exception as e:
            error_str = str(e)
            app.logger.warning(f"Strategy 2 failed for {candidate}: {error_str}")
            last_error = e

    # Nothing found or all failed
    error_msg = "Model file not found or could not be loaded. Tried: " + ", ".join([str(x) for x in tried if x and 'h5py' not in x])
    if last_error:
        error_msg += f"\n\nLast error: {str(last_error)}"
        error_msg += "\n\nThe model has compatibility issues with TensorFlow 2.15."
        error_msg += "\nPlease retrain the model using the training scripts in code/ directory."
    raise FileNotFoundError(error_msg)


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
    """Create a new user with custom ID and return the created user object."""
    data = request.get_json()
    required_fields = ['user_id', 'name', 'email']
    if not data or not all(k in data for k in required_fields):
        return jsonify({'error': f'Missing required fields: {", ".join(required_fields)}'}), 400
        
    try:
        user_id = create_user(
            user_id=data['user_id'],
            name=data['name'],
            email=data['email'],
            phone=data.get('phone'),
            age=data.get('age'),
            gender=data.get('gender')
        )
        # Fetch the created user and return it
        user = get_user(user_id)
        if not user:
            return jsonify({'error': 'Failed to retrieve created user'}), 500
        return jsonify(user), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<user_id>', methods=['GET'])
def get_user_details(user_id):
    """Get user details by custom user_id."""
    user = get_user(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user)

@app.route('/api/users/<user_id>/blood-group', methods=['PUT'])
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

@app.route('/api/users/<user_id>/vitals', methods=['POST'])
def add_user_vitals(user_id):
    """Add vital signs for a user."""
    data = request.get_json()
    if not data or not all(k in data for k in ('spo2', 'heart_rate')):
        return jsonify({'error': 'Missing required fields: spo2, heart_rate'}), 400
    
    # Verify user exists
    user = get_user(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    try:
        vital_id = add_vital_signs(
            user_id=user_id,
            spo2=data['spo2'],
            heart_rate=data['heart_rate'],
            perfusion_index=data.get('perfusion_index')
        )
        return jsonify({'id': vital_id, 'status': 'success'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<user_id>/vitals', methods=['GET'])
def get_user_vitals(user_id):
    """Get vital signs history for a user."""
    user = get_user(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    limit = min(int(request.args.get('limit', 10)), 100)
    vitals = get_vital_signs_history(user_id, limit=limit)
    latest = get_latest_vital_signs(user_id)
    
    return jsonify({
        'latest': latest,
        'history': vitals
    })

@app.route('/api/users/<user_id>/reports', methods=['POST'])
def save_user_report(user_id):
    """Save a health report for a user."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Verify user exists
    user = get_user(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    try:
        report_id = save_health_report(user_id, data)
        return jsonify({'id': report_id, 'status': 'success'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<user_id>/reports', methods=['GET'])
def get_user_reports_list(user_id):
    """Get health reports for a user."""
    user = get_user(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    limit = min(int(request.args.get('limit', 10)), 100)
    reports = get_user_reports(user_id, limit=limit)
    
    return jsonify(reports)

@app.route('/api/users/<user_id>/complete', methods=['GET'])
def get_user_complete(user_id):
    """Get complete user data including vitals and reports."""
    user_data = get_user_complete_data(user_id)
    if not user_data:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user_data)

@app.route('/api/users/<user_id>/history', methods=['GET'])
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
        app.logger.error(f"Image preprocessing error: {e}")
        return jsonify({'error': f'Error preprocessing image: {str(e)}'}), 400

    try:
        # load model lazily and cache on the app object
        if not hasattr(app, 'model'):
            app.logger.info("Loading model for the first time...")
            app.model = load_model_safe(MODEL_PATH)
            app.logger.info("Model loaded successfully")
    except Exception as e:
        app.logger.error(f"Model loading error: {e}")
        return jsonify({'error': f'Model loading failed: {str(e)}'}), 500

    # Run prediction
    try:
        app.logger.info("Running prediction...")
        preds = app.model.predict(arr, verbose=0)
        app.logger.info(f"Prediction complete. Shape: {preds.shape}")
    except Exception as e:
        app.logger.error(f"Prediction error: {e}")
        return jsonify({'error': f'Error during model.predict: {str(e)}'}), 500

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

    app.logger.info(f"Prediction result: {label} (confidence: {confidence:.2f})")
    return jsonify({'label': label, 'confidence': confidence}), 200


if __name__ == '__main__':
    # Run the Flask development server. For production use a WSGI server.
    app.run(host='0.0.0.0', port=PORT)
