"""
Distributed Training for Blood Group Detection
Supports training across multiple VPS/Cloud instances (Kaggle, Colab, Local)

This script enables:
1. Training different model architectures on different machines
2. Aggregating results from multiple training runs
3. Creating ensemble from best models across platforms
"""

import os
import sys
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np

# ============================================
# DISTRIBUTED TRAINING CONFIGURATION
# ============================================

class DistributedConfig:
    """Configuration for distributed training"""
    
    # Unique identifier for this training run
    RUN_ID = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Platform-specific model assignments
    # Each platform trains different architectures to maximize diversity
    PLATFORM_ASSIGNMENTS = {
        'kaggle': {
            'architectures': ['efficientnetb4', 'resnet152'],
            'epochs': 100,
            'batch_size': 16,
            'img_size': (380, 380)  # Larger for Kaggle's GPU
        },
        'colab': {
            'architectures': ['efficientnetb3', 'densenet169'],
            'epochs': 80,
            'batch_size': 16,
            'img_size': (299, 299)
        },
        'local': {
            'architectures': ['resnet101', 'mobilenetv2'],
            'epochs': 50,
            'batch_size': 8,
            'img_size': (256, 256)
        }
    }
    
    # Shared training parameters
    LEARNING_RATE = 1e-4
    FINE_TUNE_LR = 1e-5
    NUM_CLASSES = 8
    CLASS_NAMES = ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']
    
    # Results aggregation
    RESULTS_FILE = 'distributed_results.json'


def detect_platform() -> str:
    """Detect current platform"""
    if 'KAGGLE_KERNEL_RUN_TYPE' in os.environ:
        return 'kaggle'
    try:
        import google.colab
        return 'colab'
    except ImportError:
        return 'local'


def get_platform_config(platform: str) -> Dict:
    """Get configuration for current platform"""
    return DistributedConfig.PLATFORM_ASSIGNMENTS.get(
        platform, 
        DistributedConfig.PLATFORM_ASSIGNMENTS['local']
    )


# ============================================
# TRAINING RESULT TRACKING
# ============================================

class TrainingResultTracker:
    """Track and aggregate results from distributed training"""
    
    def __init__(self, results_path: str = 'distributed_results.json'):
        self.results_path = results_path
        self.results = self._load_results()
    
    def _load_results(self) -> Dict:
        """Load existing results or create new"""
        if os.path.exists(self.results_path):
            with open(self.results_path, 'r') as f:
                return json.load(f)
        return {'runs': [], 'best_models': {}}
    
    def save_results(self):
        """Save results to file"""
        with open(self.results_path, 'w') as f:
            json.dump(self.results, f, indent=2)
    
    def add_run(self, platform: str, architecture: str, 
                accuracy: float, val_accuracy: float,
                model_path: str, config: Dict):
        """Add a training run result"""
        run = {
            'timestamp': datetime.now().isoformat(),
            'platform': platform,
            'architecture': architecture,
            'accuracy': accuracy,
            'val_accuracy': val_accuracy,
            'model_path': model_path,
            'config': config
        }
        self.results['runs'].append(run)
        
        # Update best model for this architecture
        if architecture not in self.results['best_models'] or \
           val_accuracy > self.results['best_models'][architecture]['val_accuracy']:
            self.results['best_models'][architecture] = run
        
        self.save_results()
        print(f"✅ Saved result: {architecture} on {platform} - {val_accuracy:.4f}")
    
    def get_best_models(self, top_n: int = 3) -> List[Dict]:
        """Get top N best models across all runs"""
        all_runs = sorted(
            self.results['runs'],
            key=lambda x: x['val_accuracy'],
            reverse=True
        )
        return all_runs[:top_n]
    
    def print_summary(self):
        """Print summary of all training runs"""
        print("\n" + "="*60)
        print("📊 DISTRIBUTED TRAINING SUMMARY")
        print("="*60)
        
        if not self.results['runs']:
            print("No training runs recorded yet.")
            return
        
        # Group by platform
        by_platform = {}
        for run in self.results['runs']:
            platform = run['platform']
            if platform not in by_platform:
                by_platform[platform] = []
            by_platform[platform].append(run)
        
        for platform, runs in by_platform.items():
            print(f"\n🖥️ {platform.upper()}:")
            for run in runs:
                print(f"   {run['architecture']}: {run['val_accuracy']:.4f}")
        
        # Best overall
        best = self.get_best_models(3)
        print(f"\n🏆 TOP 3 MODELS:")
        for i, model in enumerate(best, 1):
            print(f"   {i}. {model['architecture']} ({model['platform']}): {model['val_accuracy']:.4f}")


# ============================================
# DISTRIBUTED TRAINING RUNNER
# ============================================

def run_distributed_training():
    """Run training for current platform's assigned architectures"""
    
    platform = detect_platform()
    config = get_platform_config(platform)
    tracker = TrainingResultTracker()
    
    print("\n" + "="*60)
    print(f"🚀 DISTRIBUTED TRAINING - {platform.upper()}")
    print("="*60)
    print(f"Architectures: {config['architectures']}")
    print(f"Epochs: {config['epochs']}")
    print(f"Image Size: {config['img_size']}")
    
    # Import training components
    from enhanced_training import (
        EnhancedDataLoader, train_single_model, 
        setup_hardware, Config, env_config
    )
    
    # Setup hardware
    strategy = setup_hardware()
    
    # Load data
    data_loader = EnhancedDataLoader(
        env_config['dataset_path'], 
        config['img_size']
    )
    data = data_loader.load_data()
    class_weights = data_loader.get_class_weights(data['Label'].values)
    
    # Train each assigned architecture
    for arch in config['architectures']:
        print(f"\n{'='*40}")
        print(f"🏋️ Training {arch}")
        print(f"{'='*40}")
        
        # Get generators
        train_gen, val_gen, _, _ = data_loader.get_generators(
            data, 
            batch_size=config['batch_size']
        )
        
        # Update config for this architecture
        Config.IMG_SIZE = config['img_size']
        Config.BATCH_SIZE = config['batch_size']
        Config.EPOCHS = config['epochs']
        
        # Train
        model, history = train_single_model(
            arch, train_gen, val_gen, class_weights, fold=0
        )
        
        # Evaluate
        val_loss, val_acc = model.evaluate(val_gen, verbose=0)
        train_acc = history['accuracy'][-1]
        
        # Save model
        model_path = f"{env_config['output_path']}/{arch}_{platform}.keras"
        model.save(model_path)
        
        # Track result
        tracker.add_run(
            platform=platform,
            architecture=arch,
            accuracy=train_acc,
            val_accuracy=val_acc,
            model_path=model_path,
            config=config
        )
    
    # Print summary
    tracker.print_summary()
    
    return tracker


if __name__ == '__main__':
    run_distributed_training()
