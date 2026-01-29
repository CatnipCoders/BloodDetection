"""
Model Aggregation Script
Combines models trained on different platforms into a single ensemble

Usage:
1. Train models on Kaggle, Colab, and Local
2. Download all .keras files to a single directory
3. Run: python aggregate_models.py --models-dir ./all_models
"""

import os
import sys
import json
import argparse
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple

import tensorflow as tf
from tensorflow.keras.models import load_model, Model
from tensorflow.keras.layers import Input, Average, Concatenate, Dense
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# Configuration
IMG_SIZE = (299, 299)
CLASS_NAMES = ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']


def find_models(models_dir: str) -> List[str]:
    """Find all model files in directory"""
    model_files = []
    for ext in ['*.keras', '*.h5']:
        model_files.extend(Path(models_dir).glob(f'**/{ext}'))
    return [str(p) for p in model_files]


def load_and_evaluate_models(model_paths: List[str], 
                              val_generator) -> List[Tuple[Model, float]]:
    """Load models and evaluate their accuracy"""
    results = []
    
    for path in model_paths:
        try:
            print(f"Loading: {path}")
            model = load_model(path)
            
            # Evaluate
            _, accuracy = model.evaluate(val_generator, verbose=0)
            results.append((model, accuracy, path))
            print(f"  ✅ Accuracy: {accuracy:.4f}")
            
        except Exception as e:
            print(f"  ❌ Failed: {e}")
    
    # Sort by accuracy
    results.sort(key=lambda x: x[1], reverse=True)
    return results


def create_ensemble_model(models: List[Model], 
                          input_shape: Tuple[int, int, int] = (*IMG_SIZE, 3),
                          num_classes: int = 8) -> Model:
    """Create an ensemble model that averages predictions"""
    
    # Create shared input
    inputs = Input(shape=input_shape)
    
    # Get predictions from each model
    predictions = []
    for i, model in enumerate(models):
        # Make model layers unique
        for layer in model.layers:
            layer._name = f'{layer.name}_model{i}'
        
        pred = model(inputs)
        predictions.append(pred)
    
    # Average predictions
    if len(predictions) > 1:
        averaged = Average()(predictions)
    else:
        averaged = predictions[0]
    
    ensemble = Model(inputs=inputs, outputs=averaged, name='ensemble_model')
    return ensemble


def create_weighted_ensemble(models: List[Model], 
                              weights: List[float],
                              input_shape: Tuple[int, int, int] = (*IMG_SIZE, 3)) -> Model:
    """Create weighted ensemble based on individual model accuracies"""
    
    inputs = Input(shape=input_shape)
    
    # Normalize weights
    total = sum(weights)
    norm_weights = [w / total for w in weights]
    
    # Get weighted predictions
    weighted_preds = []
    for i, (model, weight) in enumerate(zip(models, norm_weights)):
        for layer in model.layers:
            layer._name = f'{layer.name}_wmodel{i}'
        
        pred = model(inputs)
        weighted_pred = pred * weight
        weighted_preds.append(weighted_pred)
    
    # Sum weighted predictions
    if len(weighted_preds) > 1:
        from tensorflow.keras.layers import Add
        output = Add()(weighted_preds)
    else:
        output = weighted_preds[0]
    
    ensemble = Model(inputs=inputs, outputs=output, name='weighted_ensemble')
    return ensemble


def main():
    parser = argparse.ArgumentParser(description='Aggregate models from distributed training')
    parser.add_argument('--models-dir', '-d', default='./models',
                        help='Directory containing model files')
    parser.add_argument('--data-dir', default='dataset/dataset_blood_group',
                        help='Dataset directory for evaluation')
    parser.add_argument('--output', '-o', default='ensemble_final.keras',
                        help='Output ensemble model path')
    parser.add_argument('--top-n', type=int, default=3,
                        help='Number of top models to include in ensemble')
    parser.add_argument('--weighted', action='store_true',
                        help='Use accuracy-weighted ensemble')
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("🔗 MODEL AGGREGATION")
    print("="*60)
    
    # Find models
    model_paths = find_models(args.models_dir)
    print(f"Found {len(model_paths)} model files")
    
    if not model_paths:
        print("❌ No models found!")
        return
    
    # Create validation generator
    from enhanced_training import EnhancedDataLoader
    data_loader = EnhancedDataLoader(args.data_dir, IMG_SIZE)
    data = data_loader.load_data()
    _, val_gen, _, _ = data_loader.get_generators(data, batch_size=16)
    
    # Load and evaluate models
    print("\n📊 Evaluating models...")
    results = load_and_evaluate_models(model_paths, val_gen)
    
    # Select top N models
    top_models = results[:args.top_n]
    print(f"\n🏆 Top {args.top_n} models:")
    for model, acc, path in top_models:
        print(f"   {Path(path).name}: {acc:.4f}")
    
    # Create ensemble
    print("\n🔧 Creating ensemble...")
    models = [m for m, _, _ in top_models]
    
    if args.weighted:
        weights = [acc for _, acc, _ in top_models]
        ensemble = create_weighted_ensemble(models, weights)
        print("   Using accuracy-weighted ensemble")
    else:
        ensemble = create_ensemble_model(models)
        print("   Using simple averaging ensemble")
    
    # Evaluate ensemble
    print("\n📊 Evaluating ensemble...")
    ensemble.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
    _, ensemble_acc = ensemble.evaluate(val_gen, verbose=0)
    print(f"✅ Ensemble Accuracy: {ensemble_acc:.4f}")
    
    # Compare with best single model
    best_single = top_models[0][1]
    improvement = (ensemble_acc - best_single) * 100
    print(f"📈 Improvement over best single model: {improvement:+.2f}%")
    
    # Save ensemble
    ensemble.save(args.output)
    print(f"\n💾 Saved ensemble to: {args.output}")
    
    # Save metadata
    metadata = {
        'models_used': [Path(p).name for _, _, p in top_models],
        'individual_accuracies': [acc for _, acc, _ in top_models],
        'ensemble_accuracy': float(ensemble_acc),
        'weighted': args.weighted
    }
    with open(args.output.replace('.keras', '_metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)


if __name__ == '__main__':
    main()
