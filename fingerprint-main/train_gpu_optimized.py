"""
GPU-OPTIMIZED Blood Group Detection Training
Specifically tuned for RTX 2060 6GB + i5-12400F

Your Hardware:
- CPU: Intel i5-12400F (6 cores, 12 threads)
- GPU: RTX 2060 6GB GDDR6
- RAM: 16GB DDR5 CL30

Expected Performance:
- Training time: 45-90 minutes (vs 2-4 hours on CPU)
- Accuracy: 95-97%
- Batch size: 32 (optimized for 6GB VRAM)
"""

import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')

print("="*70)
print("🚀 GPU-OPTIMIZED BLOOD GROUP DETECTION TRAINING")
print("="*70)
print()
print("Hardware Configuration:")
print("  CPU: Intel i5-12400F (6C/12T)")
print("  GPU: RTX 2060 6GB GDDR6")
print("  RAM: 16GB DDR5 CL30")
print()

# Check TensorFlow and GPU
print("[1/9] Checking TensorFlow and GPU...")
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers, Model
    from tensorflow.keras.applications import EfficientNetB3
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from tensorflow.keras.callbacks import (
        ModelCheckpoint, EarlyStopping, ReduceLROnPlateau,
        TensorBoard, LearningRateScheduler
    )
    from tensorflow.keras.optimizers import Adam
    
    print(f"✓ TensorFlow {tf.__version__}")
    
    # Check GPU
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f"✓ GPU detected: {len(gpus)} device(s)")
        for gpu in gpus:
            print(f"  - {gpu.name}")
            # Enable memory growth
            tf.config.experimental.set_memory_growth(gpu, True)
        print(f"✓ Memory growth enabled")
        
        # Enable mixed precision for RTX 2060 (Turing architecture)
        from tensorflow.keras import mixed_precision
        policy = mixed_precision.Policy('mixed_float16')
        mixed_precision.set_global_policy(policy)
        print(f"✓ Mixed precision enabled (float16)")
        print(f"  Expected speedup: 1.5-2x faster")
        
        gpu_available = True
    else:
        print("⚠ No GPU detected - will use CPU (much slower)")
        gpu_available = False
        
except Exception as e:
    print(f"✗ TensorFlow import failed: {e}")
    sys.exit(1)

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight

# Set random seeds
SEED = 42
np.random.seed(SEED)
tf.random.set_seed(SEED)

print()

# ============================================
# GPU-OPTIMIZED CONFIGURATION
# ============================================

class Config:
    """Configuration optimized for RTX 2060 6GB"""
    
    # Dataset
    DATASET_PATH = 'dataset/dataset_blood_group'
    OUTPUT_PATH = 'models'
    LOGS_PATH = 'logs'
    
    # Image settings - Optimized for RTX 2060
    IMG_SIZE = (224, 224)  # Sweet spot for 6GB VRAM
    BATCH_SIZE = 32        # RTX 2060 can handle this easily
    
    # Training - Faster convergence with GPU
    EPOCHS = 80            # Reduced (GPU trains faster)
    INITIAL_LR = 2e-4      # Higher LR for larger batch
    MIN_LR = 1e-7
    PATIENCE = 12          # Faster convergence
    
    # Fine-tuning - More aggressive with GPU
    FINE_TUNE_EPOCHS = 40  # Reduced (GPU efficiency)
    FINE_TUNE_LR = 1e-5
    UNFREEZE_LAYERS = 60   # More layers (GPU can handle it)
    
    # Model
    MODEL_NAME = 'efficientnetb3'
    
    # Classes
    NUM_CLASSES = 8
    CLASS_NAMES = ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']
    
    # GPU-specific
    USE_MIXED_PRECISION = gpu_available
    PREFETCH_BUFFER = 2    # Prefetch batches for GPU

config = Config()

os.makedirs(config.OUTPUT_PATH, exist_ok=True)
os.makedirs(config.LOGS_PATH, exist_ok=True)

print("[2/9] Configuration loaded")
print(f"  Dataset: {config.DATASET_PATH}")
print(f"  Image size: {config.IMG_SIZE}")
print(f"  Batch size: {config.BATCH_SIZE} (optimized for RTX 2060)")
print(f"  Total epochs: {config.EPOCHS + config.FINE_TUNE_EPOCHS}")
print(f"  Mixed precision: {config.USE_MIXED_PRECISION}")
if gpu_available:
    print(f"  Expected time: 45-90 minutes ⚡")
else:
    print(f"  Expected time: 2-4 hours (CPU)")
print()

# ============================================
# DATA LOADING
# ============================================

print("[3/9] Loading dataset...")

def load_dataset(data_path):
    filepaths = []
    labels = []
    
    for class_name in os.listdir(data_path):
        class_path = os.path.join(data_path, class_name)
        if os.path.isdir(class_path):
            for img_file in os.listdir(class_path):
                if img_file.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
                    filepaths.append(os.path.join(class_path, img_file))
                    labels.append(class_name)
    
    data = pd.DataFrame({'Filepath': filepaths, 'Label': labels})
    data = data.sample(frac=1, random_state=SEED).reset_index(drop=True)
    return data

data = load_dataset(config.DATASET_PATH)

print(f"✓ Loaded {len(data)} images")
print(f"\nClass distribution:")
class_counts = data['Label'].value_counts().sort_index()
for label, count in class_counts.items():
    print(f"  {label:4s}: {count:4d} images")

# Check imbalance
max_count = class_counts.max()
min_count = class_counts.min()
imbalance_ratio = max_count / min_count
use_class_weights = imbalance_ratio > 2

if use_class_weights:
    print(f"\n⚠ Class imbalance detected ({imbalance_ratio:.2f}x) - using weights")
else:
    print(f"\n✓ Classes balanced ({imbalance_ratio:.2f}x)")

print()

# ============================================
# DATA AUGMENTATION
# ============================================

print("[4/9] Setting up data augmentation...")

# Aggressive augmentation for better generalization
train_datagen = ImageDataGenerator(
    preprocessing_function=tf.keras.applications.efficientnet.preprocess_input,
    rotation_range=30,
    width_shift_range=0.2,
    height_shift_range=0.2,
    zoom_range=0.2,
    horizontal_flip=True,
    brightness_range=(0.8, 1.2),
    shear_range=0.15,
    fill_mode='nearest'
)

val_datagen = ImageDataGenerator(
    preprocessing_function=tf.keras.applications.efficientnet.preprocess_input
)

# Split data
train_data, val_data = train_test_split(
    data, test_size=0.2, stratify=data['Label'], random_state=SEED
)

print(f"✓ Training: {len(train_data)} images")
print(f"✓ Validation: {len(val_data)} images")

# Create generators
train_generator = train_datagen.flow_from_dataframe(
    dataframe=train_data,
    x_col='Filepath',
    y_col='Label',
    target_size=config.IMG_SIZE,
    class_mode='categorical',
    batch_size=config.BATCH_SIZE,
    shuffle=True,
    seed=SEED
)

val_generator = val_datagen.flow_from_dataframe(
    dataframe=val_data,
    x_col='Filepath',
    y_col='Label',
    target_size=config.IMG_SIZE,
    class_mode='categorical',
    batch_size=config.BATCH_SIZE,
    shuffle=False,
    seed=SEED
)

print(f"✓ Augmentation configured")
print()

# ============================================
# CLASS WEIGHTS
# ============================================

if use_class_weights:
    print("[5/9] Computing class weights...")
    class_weights_array = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(train_data['Label']),
        y=train_data['Label']
    )
    class_weights = dict(enumerate(class_weights_array))
    print("✓ Class weights:")
    for idx, (label, weight) in enumerate(zip(sorted(data['Label'].unique()), class_weights_array)):
        print(f"  {label:4s}: {weight:.3f}")
else:
    class_weights = None
    print("[5/9] Skipping class weights")

print()

# ============================================
# MODEL CREATION
# ============================================

print("[6/9] Building model...")

def create_model(input_shape, num_classes, trainable=False):
    base_model = EfficientNetB3(
        input_shape=input_shape,
        include_top=False,
        weights='imagenet',
        pooling='avg'
    )
    base_model.trainable = trainable
    
    inputs = layers.Input(shape=input_shape)
    x = base_model(inputs, training=trainable)
    
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
    
    # Output with float32 for mixed precision
    outputs = layers.Dense(num_classes, activation='softmax', dtype='float32')(x)
    
    model = Model(inputs, outputs, name='blood_group_efficientnetb3')
    return model, base_model

input_shape = (*config.IMG_SIZE, 3)
model, base_model = create_model(input_shape, config.NUM_CLASSES, trainable=False)

print(f"✓ Model: {config.MODEL_NAME}")
print(f"  Parameters: {model.count_params():,}")
print()

# ============================================
# CALLBACKS
# ============================================

print("[7/9] Setting up callbacks...")

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
best_model_path = os.path.join(config.OUTPUT_PATH, 'blood_group_model_best.keras')

callbacks = [
    ModelCheckpoint(
        filepath=best_model_path,
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
    TensorBoard(
        log_dir=os.path.join(config.LOGS_PATH, f'gpu_training_{timestamp}'),
        histogram_freq=1
    )
]

print("✓ Callbacks ready")
print()

# ============================================
# TRAINING - PHASE 1
# ============================================

print("="*70)
print("PHASE 1: TRAINING HEAD (GPU ACCELERATED)")
print("="*70)
print()

model.compile(
    optimizer=Adam(learning_rate=config.INITIAL_LR),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

print(f"Training for {config.EPOCHS} epochs...")
print(f"Batch size: {config.BATCH_SIZE}")
print(f"Steps per epoch: {len(train_generator)}")
print()

history1 = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=config.EPOCHS,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1
)

print()
print("✓ Phase 1 complete!")
print(f"  Best val accuracy: {max(history1.history['val_accuracy']):.4f}")
print()

# ============================================
# TRAINING - PHASE 2
# ============================================

print("="*70)
print("PHASE 2: FINE-TUNING (GPU ACCELERATED)")
print("="*70)
print()

base_model.trainable = True
for layer in base_model.layers[:-config.UNFREEZE_LAYERS]:
    layer.trainable = False

print(f"Unfreezing top {config.UNFREEZE_LAYERS} layers...")
print(f"Trainable params: {sum([tf.size(w).numpy() for w in model.trainable_weights]):,}")
print()

model.compile(
    optimizer=Adam(learning_rate=config.FINE_TUNE_LR),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

print(f"Fine-tuning for {config.FINE_TUNE_EPOCHS} epochs...")
print()

history2 = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=config.FINE_TUNE_EPOCHS,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1
)

print()
print("✓ Phase 2 complete!")
print(f"  Best val accuracy: {max(history2.history['val_accuracy']):.4f}")
print()

# ============================================
# EVALUATION
# ============================================

print("="*70)
print("FINAL EVALUATION")
print("="*70)
print()

best_model = keras.models.load_model(best_model_path)

val_loss, val_accuracy = best_model.evaluate(val_generator, verbose=0)

print(f"✓ Validation Results:")
print(f"  Loss: {val_loss:.4f}")
print(f"  Accuracy: {val_accuracy:.4f} ({val_accuracy*100:.2f}%)")
print()

predictions = best_model.predict(val_generator, verbose=0)
y_pred = np.argmax(predictions, axis=1)
y_true = val_generator.classes

print("Classification Report:")
print("="*70)
report = classification_report(
    y_true, y_pred, target_names=config.CLASS_NAMES, digits=4
)
print(report)

cm = confusion_matrix(y_true, y_pred)

print("\nPer-Class Accuracy:")
print("="*70)
for idx, class_name in enumerate(config.CLASS_NAMES):
    class_acc = cm[idx, idx] / cm[idx].sum() if cm[idx].sum() > 0 else 0
    print(f"  {class_name:4s}: {class_acc:.4f} ({class_acc*100:.2f}%)")

print()

# ============================================
# SAVE RESULTS
# ============================================

print("[8/9] Saving results...")

# Save models
final_model_path = os.path.join(config.OUTPUT_PATH, 'blood_group_model_final.keras')
h5_model_path = os.path.join(config.OUTPUT_PATH, 'model_blood_group_detection_resnet.h5')

best_model.save(final_model_path)
best_model.save(h5_model_path)

print(f"✓ Models saved:")
print(f"  - {best_model_path}")
print(f"  - {final_model_path}")
print(f"  - {h5_model_path}")

# Plot history
plt.figure(figsize=(14, 5))

all_accuracy = history1.history['accuracy'] + history2.history['accuracy']
all_val_accuracy = history1.history['val_accuracy'] + history2.history['val_accuracy']
all_loss = history1.history['loss'] + history2.history['loss']
all_val_loss = history1.history['val_loss'] + history2.history['val_loss']

plt.subplot(1, 2, 1)
plt.plot(all_accuracy, label='Train', linewidth=2)
plt.plot(all_val_accuracy, label='Validation', linewidth=2)
plt.axvline(x=len(history1.history['accuracy']), color='red', linestyle='--', label='Fine-tuning')
plt.title('Model Accuracy (GPU Training)', fontsize=14)
plt.xlabel('Epoch')
plt.ylabel('Accuracy')
plt.legend()
plt.grid(True, alpha=0.3)

plt.subplot(1, 2, 2)
plt.plot(all_loss, label='Train', linewidth=2)
plt.plot(all_val_loss, label='Validation', linewidth=2)
plt.axvline(x=len(history1.history['loss']), color='red', linestyle='--', label='Fine-tuning')
plt.title('Model Loss (GPU Training)', fontsize=14)
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.legend()
plt.grid(True, alpha=0.3)

plt.tight_layout()
history_plot = os.path.join(config.OUTPUT_PATH, 'training_history_gpu.png')
plt.savefig(history_plot, dpi=150, bbox_inches='tight')

# Confusion matrix
plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=config.CLASS_NAMES, yticklabels=config.CLASS_NAMES)
plt.title('Confusion Matrix (GPU Training)', fontsize=14)
plt.xlabel('Predicted')
plt.ylabel('True')
plt.tight_layout()
cm_plot = os.path.join(config.OUTPUT_PATH, 'confusion_matrix_gpu.png')
plt.savefig(cm_plot, dpi=150, bbox_inches='tight')

print(f"✓ Plots saved:")
print(f"  - {history_plot}")
print(f"  - {cm_plot}")

# Summary
summary_path = os.path.join(config.OUTPUT_PATH, 'training_summary_gpu.txt')
with open(summary_path, 'w') as f:
    f.write("="*70 + "\n")
    f.write("GPU-OPTIMIZED TRAINING SUMMARY\n")
    f.write("="*70 + "\n\n")
    f.write(f"Hardware:\n")
    f.write(f"  CPU: Intel i5-12400F\n")
    f.write(f"  GPU: RTX 2060 6GB\n")
    f.write(f"  RAM: 16GB DDR5\n\n")
    f.write(f"Configuration:\n")
    f.write(f"  Batch size: {config.BATCH_SIZE}\n")
    f.write(f"  Image size: {config.IMG_SIZE}\n")
    f.write(f"  Mixed precision: {config.USE_MIXED_PRECISION}\n\n")
    f.write(f"Results:\n")
    f.write(f"  Final accuracy: {val_accuracy:.4f} ({val_accuracy*100:.2f}%)\n")
    f.write(f"  Final loss: {val_loss:.4f}\n\n")
    f.write("Per-Class Accuracy:\n")
    for idx, class_name in enumerate(config.CLASS_NAMES):
        class_acc = cm[idx, idx] / cm[idx].sum() if cm[idx].sum() > 0 else 0
        f.write(f"  {class_name:4s}: {class_acc:.4f} ({class_acc*100:.2f}%)\n")
    f.write("\n" + "="*70 + "\n")
    f.write(report)

print(f"✓ Summary saved: {summary_path}")

print()
print("="*70)
print("✅ GPU TRAINING COMPLETE!")
print("="*70)
print()
print(f"🎯 Final Accuracy: {val_accuracy*100:.2f}%")
print()
print("📁 Files created:")
print(f"  • {h5_model_path}")
print(f"  • {history_plot}")
print(f"  • {cm_plot}")
print(f"  • {summary_path}")
print()
print("🚀 Next steps:")
print("  1. Copy model: copy models\\model_blood_group_detection_resnet.h5 .")
print("  2. Start server: start.bat")
print("  3. Test predictions!")
print()
print("="*70)
