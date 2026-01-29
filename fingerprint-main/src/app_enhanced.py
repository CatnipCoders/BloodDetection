"""
Enhanced Flask API for Blood Group Detection
Supports ensemble models and TTA for maximum accuracy
"""

import os
import io
import glob
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from typing import List, Tuple, Dict

app = Flask(__name__)
CORS(app)

# Configuration
MODEL_PATHS = os.environ.get("MODEL_PATHS", "output/efficientnetb3_final.keras").split(",")
PORT = int(os.environ.get("PORT", "5000"))
USE_TTA = os.environ.get("USE_TTA", "true").lower() == "true"
TTA_STEPS = int(os.environ.get("TTA_STEPS", "10"))
IMG_SIZE = (299, 299)
CLASS_NAMES = ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']


class EnhancedModelServer:
    """Server with ensemble and TTA support"""
    
    def __init__(self):
        self.models = []
        self.tta_gen = None
        self._loaded = False
    
    def load_models(self):
        """Lazy load models"""
        if self._loaded:
            return
        
        from tensorflow.keras.models import load_model
        from tensorflow.keras.preprocessing.image import ImageDataGenerator
        
        # Find all available models
        model_candidates = list(MODEL_PATHS)
        for pattern in ["**/*.keras", "**/*.h5"]:
            model_candidates.extend(glob.glob(pattern, recursive=True))
        
        # Load unique models
        loaded_paths = set()
        for path in model_candidates:
            if path and os.path.exists(path) and path not in loaded_paths:
                try:
                    model = load_model(path)
                    self.models.append(model)
                    loaded_paths.add(path)
                    app.logger.info(f"✅ Loaded model: {path}")
                except Exception as e:
                    app.logger.warning(f"⚠️ Failed to load {path}: {e}")
        
        if not self.models:
            raise FileNotFoundError("No models found!")
        
        # Setup TTA generator
        self.tta_gen = ImageDataGenerator(
            rotation_range=15, width_shift_range=0.1,
            height_shift_range=0.1, zoom_range=0.1,
            horizontal_flip=True, fill_mode='nearest'
        )
        
        self._loaded = True
        app.logger.info(f"🚀 Loaded {len(self.models)} model(s)")

    def preprocess(self, file_bytes: bytes) -> np.ndarray:
        """Preprocess image for prediction"""
        import tensorflow as tf
        
        image = Image.open(io.BytesIO(file_bytes)).convert('RGB')
        image = image.resize(IMG_SIZE)
        arr = np.array(image).astype('float32')
        arr = tf.keras.applications.efficientnet.preprocess_input(arr)
        return arr
    
    def predict(self, file_bytes: bytes) -> Tuple[str, float, Dict[str, float]]:
        """Predict with ensemble and optional TTA"""
        self.load_models()
        
        img = self.preprocess(file_bytes)
        predictions = []
        
        # Base predictions from all models
        for model in self.models:
            pred = model.predict(np.expand_dims(img, 0), verbose=0)
            predictions.append(pred[0])
        
        # TTA predictions
        if USE_TTA and self.tta_gen:
            for _ in range(TTA_STEPS):
                aug_img = self.tta_gen.random_transform(img)
                for model in self.models:
                    pred = model.predict(np.expand_dims(aug_img, 0), verbose=0)
                    predictions.append(pred[0])
        
        # Average predictions
        avg_pred = np.mean(predictions, axis=0)
        pred_idx = int(np.argmax(avg_pred))
        confidence = float(avg_pred[pred_idx])
        
        # All probabilities
        probs = {CLASS_NAMES[i]: float(avg_pred[i]) for i in range(len(CLASS_NAMES))}
        
        return CLASS_NAMES[pred_idx], confidence, probs


# Global model server
model_server = EnhancedModelServer()


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'models_loaded': len(model_server.models)}), 200


@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'service': 'Enhanced Blood Group Detection API',
        'features': ['Ensemble Models', 'Test-Time Augmentation'],
        'endpoints': {
            '/health': 'GET - health check',
            '/predict': 'POST - predict blood group from fingerprint image',
            '/predict/detailed': 'POST - detailed prediction with all probabilities'
        }
    }), 200


@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': "Missing 'image' file"}), 400
    
    try:
        file_bytes = request.files['image'].read()
        label, confidence, _ = model_server.predict(file_bytes)
        return jsonify({'label': label, 'confidence': confidence}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict/detailed', methods=['POST'])
def predict_detailed():
    if 'image' not in request.files:
        return jsonify({'error': "Missing 'image' file"}), 400
    
    try:
        file_bytes = request.files['image'].read()
        label, confidence, probs = model_server.predict(file_bytes)
        return jsonify({
            'label': label,
            'confidence': confidence,
            'probabilities': probs,
            'models_used': len(model_server.models),
            'tta_enabled': USE_TTA
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)
