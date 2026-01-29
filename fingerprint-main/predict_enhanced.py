"""
Enhanced Blood Group Prediction Script
Supports single image, batch prediction, and TTA
"""

import os
import sys
import numpy as np
from pathlib import Path
from typing import Tuple, List, Optional

import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, img_to_array, ImageDataGenerator

# Configuration
IMG_SIZE = (299, 299)
CLASS_NAMES = ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']


class EnhancedPredictor:
    """Enhanced predictor with TTA and ensemble support"""
    
    def __init__(self, model_paths: List[str], use_tta: bool = True, tta_steps: int = 10):
        self.models = [load_model(p) for p in model_paths if os.path.exists(p)]
        if not self.models:
            raise FileNotFoundError(f"No models found at: {model_paths}")
        self.use_tta = use_tta
        self.tta_steps = tta_steps
        self.tta_gen = ImageDataGenerator(
            rotation_range=15, width_shift_range=0.1,
            height_shift_range=0.1, zoom_range=0.1,
            horizontal_flip=True, fill_mode='nearest'
        )
        print(f"✅ Loaded {len(self.models)} model(s)")
    
    def preprocess(self, image_path: str) -> np.ndarray:
        """Load and preprocess image"""
        img = load_img(image_path, target_size=IMG_SIZE)
        arr = img_to_array(img)
        arr = tf.keras.applications.efficientnet.preprocess_input(arr)
        return arr
    
    def predict_single(self, image_path: str) -> Tuple[str, float, dict]:
        """Predict blood group for single image"""
        img = self.preprocess(image_path)
        predictions = []
        
        # Base predictions from all models
        for model in self.models:
            pred = model.predict(np.expand_dims(img, 0), verbose=0)
            predictions.append(pred[0])
        
        # TTA predictions
        if self.use_tta:
            for _ in range(self.tta_steps):
                aug_img = self.tta_gen.random_transform(img)
                for model in self.models:
                    pred = model.predict(np.expand_dims(aug_img, 0), verbose=0)
                    predictions.append(pred[0])
        
        # Average predictions
        avg_pred = np.mean(predictions, axis=0)
        pred_idx = np.argmax(avg_pred)
        confidence = avg_pred[pred_idx]
        
        # All class probabilities
        probs = {CLASS_NAMES[i]: float(avg_pred[i]) for i in range(len(CLASS_NAMES))}
        
        return CLASS_NAMES[pred_idx], float(confidence), probs


def main():
    """CLI for prediction"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Blood Group Prediction from Fingerprint')
    parser.add_argument('image', help='Path to fingerprint image')
    parser.add_argument('--model', '-m', nargs='+', 
                        default=['output/efficientnetb3_final.keras'],
                        help='Path(s) to model file(s)')
    parser.add_argument('--no-tta', action='store_true', help='Disable TTA')
    parser.add_argument('--tta-steps', type=int, default=10, help='TTA steps')
    
    args = parser.parse_args()
    
    # Initialize predictor
    predictor = EnhancedPredictor(
        model_paths=args.model,
        use_tta=not args.no_tta,
        tta_steps=args.tta_steps
    )
    
    # Predict
    blood_group, confidence, probs = predictor.predict_single(args.image)
    
    print(f"\n{'='*50}")
    print(f"🩸 BLOOD GROUP PREDICTION")
    print(f"{'='*50}")
    print(f"Image: {args.image}")
    print(f"\n✅ Predicted: {blood_group}")
    print(f"📊 Confidence: {confidence:.2%}")
    print(f"\n📋 All Probabilities:")
    for bg, prob in sorted(probs.items(), key=lambda x: -x[1]):
        bar = '█' * int(prob * 30)
        print(f"   {bg}: {prob:.2%} {bar}")


if __name__ == '__main__':
    main()
