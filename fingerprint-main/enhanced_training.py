"""
Enhanced Blood Group Detection from Fingerprints
Multi-Platform Training Script (Kaggle / Colab / Local)

This script implements advanced techniques to maximize model accuracy:
- Advanced Data Augmentation
- Fine-tuning with gradual unfreezing
- Ensemble Learning
- Learning Rate Scheduling
- Class Balancing
- Test-Time Augmentation (TTA)
- K-Fold Cross Validation
- Mixed Precision Training
"""

import os
import sys
import numpy as np
import pandas as pd
import glob
import json
import warnings
from pathlib import Path
from datetime import datetime
from collections import Counter
from typing import Tuple, List, Dict, Optional

# ============================================
# ENVIRONMENT DETECTION
# ============================================

def detect_environment() -> str:
    """Detect if running on Kaggle, Colab, or Local"""
    if 'KAGGLE_KERNEL_RUN_TYPE' in os.environ:
        return 'kaggle'
    try:
        import google.colab
        return 'colab'
    except ImportError:
        pass
    return 'local'

ENV = detect_environment()
print(f"🖥️ Running on: {ENV.upper()}")

# Environment-specific configurations
ENV_CONFIG = {
    'kaggle': {
        'dataset_path': '/kaggle/input/fingerprint-blood-group/dataset_blood_group',
        'output_path': '/kaggle/working',
        'use_tpu': False,
        'mixed_precision': True
    },
    'colab': {
        'dataset_path': '/content/dataset_blood_group',
        'output_path': '/content/output',
        'use_tpu': True,
        'mixed_precision': True
    },
    'local': {
        'dataset_path': 'dataset/dataset_blood_group',
        'output_path': 'output',
        'use_tpu': False,
        'mixed_precision': True
    }
}

env_config = ENV_CONFIG[ENV]

# ============================================
# IMPORTS
# ============================================

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import (
    ResNet50, ResNet101, ResNet152,
    EfficientNetB0, EfficientNetB3, EfficientNetB4,
    DenseNet121, DenseNet169,
    InceptionV3, Xception,
    MobileNetV2
)
from tensorflow.keras.callbacks import (
    ModelCheckpoint, EarlyStopping, ReduceLROnPlateau,
    TensorBoard, LearningRateScheduler
)
from tensorflow.keras.optimizers import Adam, AdamW

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, f1_score
)
from sklearn.utils.class_weight import compute_class_weight

import matplotlib.pyplot as plt
import seaborn as sns

warnings.filterwarnings('ignore')

# Set random seeds
SEED = 42
np.random.seed(SEED)
tf.random.set_seed(SEED)

print(f"✅ TensorFlow version: {tf.__version__}")
print(f"✅ GPU available: {tf.config.list_physical_devices('GPU')}")


# ============================================
# HARDWARE SETUP
# ============================================

def setup_hardware():
    """Configure GPU/TPU for optimal performance"""
    strategy = None
    
    # Try TPU first (Colab/Kaggle)
    if env_config.get('use_tpu', False):
        try:
            tpu = tf.distribute.cluster_resolver.TPUClusterResolver()
            tf.config.experimental_connect_to_cluster(tpu)
            tf.tpu.experimental.initialize_tpu_system(tpu)
            strategy = tf.distribute.TPUStrategy(tpu)
            print(f"🚀 TPU initialized with {strategy.num_replicas_in_sync} cores")
            return strategy
        except Exception as e:
            print(f"⚠️ TPU not available: {e}")
    
    # Try GPU
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            
            if len(gpus) > 1:
                strategy = tf.distribute.MirroredStrategy()
                print(f"🚀 Multi-GPU strategy with {strategy.num_replicas_in_sync} GPUs")
            else:
                strategy = tf.distribute.get_strategy()
                print(f"🚀 Single GPU: {gpus[0].name}")
        except RuntimeError as e:
            print(f"⚠️ GPU setup error: {e}")
    else:
        strategy = tf.distribute.get_strategy()
        print("💻 Running on CPU")
    
    # Enable mixed precision
    if env_config.get('mixed_precision', False) and gpus:
        try:
            tf.keras.mixed_precision.set_global_policy('mixed_float16')
            print("⚡ Mixed precision enabled (float16)")
        except Exception as e:
            print(f"⚠️ Mixed precision not available: {e}")
    
    return strategy

strategy = setup_hardware()


# ============================================
# CONFIGURATION
# ============================================

class Config:
    """Centralized configuration for the training pipeline"""
    
    # Data
    DATASET_PATH = env_config['dataset_path']
    OUTPUT_PATH = env_config['output_path']
    IMG_SIZE = (299, 299)  # Larger size for better features
    BATCH_SIZE = 16
    NUM_CLASSES = 8
    CLASS_NAMES = ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']
    
    # Training
    EPOCHS = 100
    INITIAL_LR = 1e-4
    MIN_LR = 1e-7
    WARMUP_EPOCHS = 5
    PATIENCE = 15
    
    # Fine-tuning
    FINE_TUNE_EPOCHS = 50
    FINE_TUNE_LR = 1e-5
    UNFREEZE_LAYERS = 50
    
    # Augmentation
    ROTATION_RANGE = 30
    WIDTH_SHIFT = 0.2
    HEIGHT_SHIFT = 0.2
    ZOOM_RANGE = 0.2
    BRIGHTNESS_RANGE = (0.8, 1.2)
    
    # Ensemble
    USE_ENSEMBLE = True
    ENSEMBLE_MODELS = ['efficientnetb3', 'resnet101', 'densenet169']
    
    # Cross-validation
    USE_KFOLD = True
    N_FOLDS = 5
    
    # Test-Time Augmentation
    USE_TTA = True
    TTA_STEPS = 10

config = Config()
os.makedirs(config.OUTPUT_PATH, exist_ok=True)


# ============================================
# DATA LOADING & AUGMENTATION
# ============================================

class EnhancedDataLoader:
    """Advanced data loader with augmentation and balancing"""
    
    def __init__(self, data_path: str, img_size: Tuple[int, int] = (299, 299)):
        self.data_path = data_path
        self.img_size = img_size
        self.class_names = sorted(os.listdir(data_path))
        
    def load_data(self) -> pd.DataFrame:
        """Load all image paths and labels"""
        filepaths = []
        labels = []
        
        for class_name in self.class_names:
            class_path = os.path.join(self.data_path, class_name)
            if os.path.isdir(class_path):
                for img_file in os.listdir(class_path):
                    if img_file.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
                        filepaths.append(os.path.join(class_path, img_file))
                        labels.append(class_name)
        
        data = pd.DataFrame({'Filepath': filepaths, 'Label': labels})
        data = data.sample(frac=1, random_state=SEED).reset_index(drop=True)
        
        print(f"📊 Loaded {len(data)} images from {len(self.class_names)} classes")
        return data
    
    def get_class_weights(self, labels: List[str]) -> Dict[int, float]:
        """Compute class weights for imbalanced data"""
        class_weights = compute_class_weight(
            class_weight='balanced',
            classes=np.unique(labels),
            y=labels
        )
        return dict(enumerate(class_weights))
    
    def create_augmented_generator(self, is_training: bool = True):
        """Create ImageDataGenerator with advanced augmentation"""
        if is_training:
            return ImageDataGenerator(
                preprocessing_function=tf.keras.applications.efficientnet.preprocess_input,
                rotation_range=config.ROTATION_RANGE,
                width_shift_range=config.WIDTH_SHIFT,
                height_shift_range=config.HEIGHT_SHIFT,
                zoom_range=config.ZOOM_RANGE,
                horizontal_flip=True,
                vertical_flip=False,
                brightness_range=config.BRIGHTNESS_RANGE,
                shear_range=0.15,
                fill_mode='nearest'
            )
        else:
            return ImageDataGenerator(
                preprocessing_function=tf.keras.applications.efficientnet.preprocess_input
            )

    
    def get_generators(self, data: pd.DataFrame, batch_size: int = 16, 
                       val_split: float = 0.2) -> Tuple:
        """Create train and validation generators"""
        train_data, val_data = train_test_split(
            data, test_size=val_split, stratify=data['Label'], random_state=SEED
        )
        
        train_gen = self.create_augmented_generator(is_training=True)
        val_gen = self.create_augmented_generator(is_training=False)
        
        train_generator = train_gen.flow_from_dataframe(
            dataframe=train_data,
            x_col='Filepath',
            y_col='Label',
            target_size=self.img_size,
            class_mode='categorical',
            batch_size=batch_size,
            shuffle=True,
            seed=SEED
        )
        
        val_generator = val_gen.flow_from_dataframe(
            dataframe=val_data,
            x_col='Filepath',
            y_col='Label',
            target_size=self.img_size,
            class_mode='categorical',
            batch_size=batch_size,
            shuffle=False,
            seed=SEED
        )
        
        return train_generator, val_generator, train_data, val_data


# ============================================
# MODEL ARCHITECTURES
# ============================================

def create_model(architecture: str, input_shape: Tuple[int, int, int], 
                 num_classes: int, trainable: bool = False) -> Model:
    """Create a model with specified architecture"""
    
    base_models = {
        'resnet50': (ResNet50, tf.keras.applications.resnet50.preprocess_input),
        'resnet101': (ResNet101, tf.keras.applications.resnet.preprocess_input),
        'resnet152': (ResNet152, tf.keras.applications.resnet.preprocess_input),
        'efficientnetb0': (EfficientNetB0, tf.keras.applications.efficientnet.preprocess_input),
        'efficientnetb3': (EfficientNetB3, tf.keras.applications.efficientnet.preprocess_input),
        'efficientnetb4': (EfficientNetB4, tf.keras.applications.efficientnet.preprocess_input),
        'densenet121': (DenseNet121, tf.keras.applications.densenet.preprocess_input),
        'densenet169': (DenseNet169, tf.keras.applications.densenet.preprocess_input),
        'inceptionv3': (InceptionV3, tf.keras.applications.inception_v3.preprocess_input),
        'xception': (Xception, tf.keras.applications.xception.preprocess_input),
        'mobilenetv2': (MobileNetV2, tf.keras.applications.mobilenet_v2.preprocess_input),
    }
    
    if architecture.lower() not in base_models:
        raise ValueError(f"Unknown architecture: {architecture}")
    
    BaseModel, preprocess_fn = base_models[architecture.lower()]
    
    # Create base model
    base_model = BaseModel(
        input_shape=input_shape,
        include_top=False,
        weights='imagenet',
        pooling='avg'
    )
    base_model.trainable = trainable
    
    # Build classification head
    inputs = layers.Input(shape=input_shape)
    x = base_model(inputs, training=trainable)
    
    # Advanced classification head
    x = layers.BatchNormalization()(x)
    x = layers.Dense(512, kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.5)(x)
    
    x = layers.Dense(256, kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.3)(x)
    
    x = layers.Dense(128, kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.2)(x)
    
    # Output layer with float32 for mixed precision
    outputs = layers.Dense(num_classes, activation='softmax', dtype='float32')(x)
    
    model = Model(inputs, outputs, name=f'{architecture}_blood_group')
    return model, base_model


# ============================================
# LEARNING RATE SCHEDULES
# ============================================

def cosine_annealing_with_warmup(epoch: int, lr: float) -> float:
    """Cosine annealing with warmup"""
    warmup_epochs = config.WARMUP_EPOCHS
    total_epochs = config.EPOCHS
    initial_lr = config.INITIAL_LR
    min_lr = config.MIN_LR
    
    if epoch < warmup_epochs:
        # Linear warmup
        return initial_lr * (epoch + 1) / warmup_epochs
    else:
        # Cosine annealing
        progress = (epoch - warmup_epochs) / (total_epochs - warmup_epochs)
        return min_lr + 0.5 * (initial_lr - min_lr) * (1 + np.cos(np.pi * progress))


def get_callbacks(model_name: str, fold: int = 0) -> List:
    """Get training callbacks"""
    callbacks = [
        ModelCheckpoint(
            filepath=os.path.join(config.OUTPUT_PATH, f'{model_name}_fold{fold}_best.keras'),
            monitor='val_accuracy',
            mode='max',
            save_best_only=True,
            verbose=1
        ),
        EarlyStopping(
            monitor='val_accuracy',
            patience=config.PATIENCE,
            mode='max',
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=config.MIN_LR,
            verbose=1
        ),
        LearningRateScheduler(cosine_annealing_with_warmup, verbose=0),
        TensorBoard(
            log_dir=os.path.join(config.OUTPUT_PATH, 'logs', f'{model_name}_fold{fold}'),
            histogram_freq=1
        )
    ]
    return callbacks


# ============================================
# TRAINING FUNCTIONS
# ============================================

def train_single_model(architecture: str, train_gen, val_gen, 
                       class_weights: Dict, fold: int = 0) -> Tuple[Model, dict]:
    """Train a single model with fine-tuning"""
    
    print(f"\n{'='*60}")
    print(f"🏋️ Training {architecture.upper()} - Fold {fold}")
    print(f"{'='*60}")
    
    input_shape = (*config.IMG_SIZE, 3)
    
    with strategy.scope():
        # Phase 1: Train classification head only
        print("\n📌 Phase 1: Training classification head...")
        model, base_model = create_model(
            architecture, input_shape, config.NUM_CLASSES, trainable=False
        )
        
        model.compile(
            optimizer=Adam(learning_rate=config.INITIAL_LR),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        history1 = model.fit(
            train_gen,
            validation_data=val_gen,
            epochs=config.EPOCHS // 2,
            class_weight=class_weights,
            callbacks=get_callbacks(architecture, fold),
            verbose=1
        )
        
        # Phase 2: Fine-tune top layers
        print(f"\n📌 Phase 2: Fine-tuning top {config.UNFREEZE_LAYERS} layers...")
        base_model.trainable = True
        
        # Freeze all layers except the last UNFREEZE_LAYERS
        for layer in base_model.layers[:-config.UNFREEZE_LAYERS]:
            layer.trainable = False
        
        model.compile(
            optimizer=Adam(learning_rate=config.FINE_TUNE_LR),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        history2 = model.fit(
            train_gen,
            validation_data=val_gen,
            epochs=config.FINE_TUNE_EPOCHS,
            class_weight=class_weights,
            callbacks=get_callbacks(f'{architecture}_finetune', fold),
            verbose=1
        )
    
    # Combine histories
    history = {
        'accuracy': history1.history['accuracy'] + history2.history['accuracy'],
        'val_accuracy': history1.history['val_accuracy'] + history2.history['val_accuracy'],
        'loss': history1.history['loss'] + history2.history['loss'],
        'val_loss': history1.history['val_loss'] + history2.history['val_loss']
    }
    
    return model, history


# ============================================
# ENSEMBLE & TTA
# ============================================

class EnsembleModel:
    """Ensemble of multiple models with TTA"""
    
    def __init__(self, models: List[Model], class_names: List[str]):
        self.models = models
        self.class_names = class_names
        
    def predict_with_tta(self, image: np.ndarray, tta_steps: int = 10) -> np.ndarray:
        """Predict with Test-Time Augmentation"""
        predictions = []
        
        # Original prediction
        for model in self.models:
            pred = model.predict(np.expand_dims(image, axis=0), verbose=0)
            predictions.append(pred)
        
        # TTA predictions
        tta_gen = ImageDataGenerator(
            rotation_range=15,
            width_shift_range=0.1,
            height_shift_range=0.1,
            zoom_range=0.1,
            horizontal_flip=True,
            fill_mode='nearest'
        )
        
        for _ in range(tta_steps):
            augmented = tta_gen.random_transform(image)
            for model in self.models:
                pred = model.predict(np.expand_dims(augmented, axis=0), verbose=0)
                predictions.append(pred)
        
        # Average all predictions
        avg_prediction = np.mean(predictions, axis=0)
        return avg_prediction
    
    def predict_batch(self, images: np.ndarray, use_tta: bool = True) -> np.ndarray:
        """Predict on a batch of images"""
        if use_tta:
            predictions = [self.predict_with_tta(img) for img in images]
            return np.vstack(predictions)
        else:
            predictions = []
            for model in self.models:
                pred = model.predict(images, verbose=0)
                predictions.append(pred)
            return np.mean(predictions, axis=0)


def train_ensemble(data_loader: EnhancedDataLoader, data: pd.DataFrame) -> EnsembleModel:
    """Train ensemble of models"""
    
    print("\n" + "="*60)
    print("🎯 TRAINING ENSEMBLE MODEL")
    print("="*60)
    
    models = []
    histories = []
    
    # Get class weights
    class_weights = data_loader.get_class_weights(data['Label'].values)
    
    for arch in config.ENSEMBLE_MODELS:
        print(f"\n🔧 Training {arch}...")
        
        # Get fresh generators for each model
        train_gen, val_gen, _, _ = data_loader.get_generators(
            data, batch_size=config.BATCH_SIZE
        )
        
        model, history = train_single_model(
            arch, train_gen, val_gen, class_weights, fold=0
        )
        
        models.append(model)
        histories.append(history)
        
        # Save individual model
        model.save(os.path.join(config.OUTPUT_PATH, f'{arch}_final.keras'))
    
    ensemble = EnsembleModel(models, config.CLASS_NAMES)
    return ensemble, histories


# ============================================
# K-FOLD CROSS VALIDATION
# ============================================

def train_with_kfold(data_loader: EnhancedDataLoader, data: pd.DataFrame, 
                     architecture: str = 'efficientnetb3') -> List[Model]:
    """Train with K-Fold cross validation"""
    
    print("\n" + "="*60)
    print(f"🔄 K-FOLD CROSS VALIDATION ({config.N_FOLDS} folds)")
    print("="*60)
    
    skf = StratifiedKFold(n_splits=config.N_FOLDS, shuffle=True, random_state=SEED)
    
    fold_models = []
    fold_scores = []
    
    for fold, (train_idx, val_idx) in enumerate(skf.split(data['Filepath'], data['Label'])):
        print(f"\n{'='*40}")
        print(f"📁 FOLD {fold + 1}/{config.N_FOLDS}")
        print(f"{'='*40}")
        
        train_data = data.iloc[train_idx]
        val_data = data.iloc[val_idx]
        
        # Create generators
        train_gen = data_loader.create_augmented_generator(is_training=True)
        val_gen = data_loader.create_augmented_generator(is_training=False)
        
        train_generator = train_gen.flow_from_dataframe(
            dataframe=train_data,
            x_col='Filepath',
            y_col='Label',
            target_size=config.IMG_SIZE,
            class_mode='categorical',
            batch_size=config.BATCH_SIZE,
            shuffle=True,
            seed=SEED
        )
        
        val_generator = val_gen.flow_from_dataframe(
            dataframe=val_data,
            x_col='Filepath',
            y_col='Label',
            target_size=config.IMG_SIZE,
            class_mode='categorical',
            batch_size=config.BATCH_SIZE,
            shuffle=False,
            seed=SEED
        )
        
        # Get class weights
        class_weights = data_loader.get_class_weights(train_data['Label'].values)
        
        # Train model
        model, history = train_single_model(
            architecture, train_generator, val_generator, class_weights, fold=fold
        )
        
        # Evaluate
        val_loss, val_acc = model.evaluate(val_generator, verbose=0)
        fold_scores.append(val_acc)
        fold_models.append(model)
        
        print(f"✅ Fold {fold + 1} Accuracy: {val_acc:.4f}")
        
        # Save fold model
        model.save(os.path.join(config.OUTPUT_PATH, f'{architecture}_fold{fold}.keras'))
    
    print(f"\n{'='*60}")
    print(f"📊 K-FOLD RESULTS")
    print(f"{'='*60}")
    print(f"Mean Accuracy: {np.mean(fold_scores):.4f} (+/- {np.std(fold_scores):.4f})")
    print(f"Best Fold: {np.argmax(fold_scores) + 1} ({max(fold_scores):.4f})")
    
    return fold_models, fold_scores


# ============================================
# EVALUATION & VISUALIZATION
# ============================================

def evaluate_model(model, val_generator, class_names: List[str]) -> Dict:
    """Comprehensive model evaluation"""
    
    print("\n" + "="*60)
    print("📊 MODEL EVALUATION")
    print("="*60)
    
    # Get predictions
    predictions = model.predict(val_generator, verbose=1)
    y_pred = np.argmax(predictions, axis=1)
    y_true = val_generator.classes
    
    # Calculate metrics
    accuracy = accuracy_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred, average='weighted')
    
    print(f"\n✅ Accuracy: {accuracy:.4f}")
    print(f"✅ F1 Score: {f1:.4f}")
    
    # Classification report
    print("\n📋 Classification Report:")
    print(classification_report(y_true, y_pred, target_names=class_names))
    
    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    
    return {
        'accuracy': accuracy,
        'f1_score': f1,
        'confusion_matrix': cm,
        'predictions': predictions,
        'y_true': y_true,
        'y_pred': y_pred
    }


def plot_training_history(history: Dict, save_path: str = None):
    """Plot training history"""
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    # Accuracy
    axes[0].plot(history['accuracy'], label='Train', linewidth=2)
    axes[0].plot(history['val_accuracy'], label='Validation', linewidth=2)
    axes[0].set_title('Model Accuracy', fontsize=14)
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Accuracy')
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)
    
    # Loss
    axes[1].plot(history['loss'], label='Train', linewidth=2)
    axes[1].plot(history['val_loss'], label='Validation', linewidth=2)
    axes[1].set_title('Model Loss', fontsize=14)
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Loss')
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.show()


def plot_confusion_matrix(cm: np.ndarray, class_names: List[str], save_path: str = None):
    """Plot confusion matrix"""
    plt.figure(figsize=(10, 8))
    sns.heatmap(
        cm, annot=True, fmt='d', cmap='Blues',
        xticklabels=class_names, yticklabels=class_names
    )
    plt.title('Confusion Matrix', fontsize=14)
    plt.xlabel('Predicted')
    plt.ylabel('True')
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.show()


# ============================================
# MAIN TRAINING PIPELINE
# ============================================

def main():
    """Main training pipeline"""
    
    print("\n" + "="*60)
    print("🩸 ENHANCED BLOOD GROUP DETECTION FROM FINGERPRINTS")
    print("="*60)
    print(f"📍 Environment: {ENV.upper()}")
    print(f"📁 Dataset: {config.DATASET_PATH}")
    print(f"💾 Output: {config.OUTPUT_PATH}")
    print("="*60)
    
    # Initialize data loader
    data_loader = EnhancedDataLoader(config.DATASET_PATH, config.IMG_SIZE)
    data = data_loader.load_data()
    
    # Show class distribution
    print("\n📊 Class Distribution:")
    print(data['Label'].value_counts())
    
    # Training mode selection
    if config.USE_ENSEMBLE:
        # Train ensemble model
        ensemble, histories = train_ensemble(data_loader, data)
        
        # Evaluate ensemble
        _, val_gen, _, _ = data_loader.get_generators(data, config.BATCH_SIZE)
        
        print("\n🎯 Evaluating Ensemble Model...")
        predictions = []
        for model in ensemble.models:
            pred = model.predict(val_gen, verbose=0)
            predictions.append(pred)
        
        avg_pred = np.mean(predictions, axis=0)
        y_pred = np.argmax(avg_pred, axis=1)
        y_true = val_gen.classes
        
        ensemble_acc = accuracy_score(y_true, y_pred)
        print(f"\n✅ ENSEMBLE ACCURACY: {ensemble_acc:.4f}")
        
    elif config.USE_KFOLD:
        # K-Fold cross validation
        fold_models, fold_scores = train_with_kfold(
            data_loader, data, architecture='efficientnetb3'
        )
        
    else:
        # Single model training
        train_gen, val_gen, _, _ = data_loader.get_generators(
            data, batch_size=config.BATCH_SIZE
        )
        class_weights = data_loader.get_class_weights(data['Label'].values)
        
        model, history = train_single_model(
            'efficientnetb3', train_gen, val_gen, class_weights
        )
        
        # Evaluate
        metrics = evaluate_model(model, val_gen, config.CLASS_NAMES)
        
        # Plot results
        plot_training_history(
            history, 
            os.path.join(config.OUTPUT_PATH, 'training_history.png')
        )
        plot_confusion_matrix(
            metrics['confusion_matrix'], 
            config.CLASS_NAMES,
            os.path.join(config.OUTPUT_PATH, 'confusion_matrix.png')
        )
        
        # Save final model
        model.save(os.path.join(config.OUTPUT_PATH, 'blood_group_model_final.keras'))
    
    print("\n" + "="*60)
    print("✅ TRAINING COMPLETE!")
    print("="*60)


if __name__ == '__main__':
    main()
