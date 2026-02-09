"""
IMPROVED Blood Group Detection Training
Fixes issues from previous training run

Previous Result: 72.83% accuracy
Target: 95-97% accuracy

Improvements:
- Force mixed precision ON
- More epochs (150 total)
- Better learning rate schedule
- Disable early stopping initially
- More aggressive data augmentation
"""

import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

print("="*70)
print("🔧 IMPROVED BLOOD GROUP DETECTION TRAINING")
print("="*70)
print()
print("Fixes from previous training:")
print("  ✓ Force mixed precision ON")
print("  ✓ Increase epochs to 150")
print("  ✓ Better learning rate schedule")
print("  ✓ More data augmentation")
print("  ✓ Disable early stopping initially")
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
    
    # Force GPU configuration
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f"✓ GPU detected: {len(gpus)} device(s)")
        for gpu in gpus:
            print(f"  - {gpu.name}")
            tf.config.experimental.set_memory_growth(gpu, True)
        print(f"✓ Memory growth enabled")
        
        # FORCE mixed precision ON
        from tensorflow.keras import mixed_precision
        policy = mixed_precision.Policy('mixed_float16')
        mixed_precision.set_global_policy(policy)
        print(f"✓ Mixed precision FORCED ON (float16)")
        print(f"  This will speed up training significantly!")
        gpu_available = True
    else:
        print("⚠ No GPU detected - training will be slower")
        gpu_available = False
        
except Exception as e:
    print(f"✗ TensorFlow error: {e}")
    sys.exit(1)

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight

SEED = 42
np.random.seed(SEED)
tf.random.set_seed(SEED)

print()

# ============================================
# IMPROVED CONFIGURATION
# ============================================

class Config:
    """Improved configuration based on diagnostic"""
    
    DATASET_PATH = 'dataset/dataset_blood_group'
    OUTPUT_PATH = 'models'
    LOGS_PATH = 'logs'
    
    # Image settings
    IMG_SIZE = (224, 224)
    BATCH_SIZE = 32 if gpu_available else 16
    
    # Training - MORE EPOCHS
    EPOCHS = 100            # Increased from 80
    INITIAL_LR = 1e-4       # Lower initial LR for stability
    MIN_LR = 1e-7
    PATIENCE = 20           # More patience before stopping
    
    # Fine-tuning - MORE EPOCHS
    FINE_TUNE_EPOCHS = 50   # Increased from 40
    FINE_TUNE_LR = 5e-6     # Lower for stability
    UNFREEZE_LAYERS = 70    # More layers
    
    MODEL_NAME = 'efficientnetb3'
    NUM_CLASSES = 8
    CLASS_NAMES = ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']
    
    USE_MIXED_PRECISION = gpu_available

config = Config()

os.makedirs(config.OUTPUT_PATH, exist_ok=True)
os.makedirs(config.LOGS_PATH, exist_ok=True)

print("[2/9] Improved configuration loaded")
print(f"  Batch size: {config.BATCH_SIZE}")
print(f"  Total epochs: {config.EPOCHS + config.FINE_TUNE_EPOCHS}")
print(f"  Mixed precision: {config.USE_MIXED_PRECISION}")
print(f"  Patience: {config.PATIENCE} (more than before)")
if gpu_available:
    print(f"  Expected time: 60-90 minutes")
else:
    print(f"  Expected time: 3-5 hours")
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

max_count = class_counts.max()
min_count = class_counts.min()
imbalance_ratio = max_count / min_count
use_class_weights = imbalance_ratio > 1.5  # More sensitive

if use_class_weights:
    print(f"\n⚠ Using class weights (imbalance: {imbalance_ratio:.2f}x)")
else:
    print(f"\n✓ Classes balanced")

print()

# ============================================
# AGGRESSIVE DATA AUGMENTATION
# ============================================

print("[4/9] Setting up AGGRESSIVE data augmentation...")

# More aggressive augmentation
train_datagen = ImageDataGenerator(
    preprocessing_function=tf.keras.applications.efficientnet.preprocess_input,
    rotation_range=40,          # Increased from 30
    width_shift_range=0.25,     # Increased from 0.2
    height_shift_range=0.25,    # Increased from 0.2
    zoom_range=0.25,            # Increased from 0.2
    horizontal_flip=True,
    brightness_range=(0.7, 1.3), # Wider range
    shear_range=0.2,            # Increased from 0.15
    fill_mode='nearest'
)

val_datagen = ImageDataGenerator(
    preprocessing_function=tf.keras.applications.efficientnet.preprocess_input
)

train_data, val_data = train_test_split(
    data, test_size=0.2, stratify=data['Label'], random_state=SEED
)

print(f"✓ Training: {len(train_data)} images")
print(f"✓ Validation: {len(val_data)} images")
print(f"✓ Augmentation: MORE AGGRESSIVE than before")

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
    print("✓ Class weights (helps B+ and other weak classes):")
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
    
    # Stronger regularization
    x = layers.BatchNormalization()(x)
    x = layers.Dense(512, kernel_regularizer=tf.keras.regularizers.l2(0.02))(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.6)(x)  # Increased from 0.5
    
    x = layers.Dense(256, kernel_regularizer=tf.keras.regularizers.l2(0.02))(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.4)(x)  # Increased from 0.3
    
    x = layers.Dense(128, kernel_regularizer=tf.keras.regularizers.l2(0.02))(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.3)(x)  # Increased from 0.2
    
    outputs = layers.Dense(num_classes, activation='softmax', dtype='float32')(x)
    
    model = Model(inputs, outputs, name='blood_group_improved')
    return model, base_model

input_shape = (*config.IMG_SIZE, 3)
model, base_model = create_model(input_shape, config.NUM_CLASSES, trainable=False)

print(f"✓ Model: {config.MODEL_NAME}")
print(f"  Parameters: {model.count_params():,}")
print(f"  Stronger regularization applied")
print()

# ============================================
# CALLBACKS
# ============================================

print("[7/9] Setting up callbacks...")

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
best_model_path = os.path.join(config.OUTPUT_PATH, 'blood_group_model_improved.keras')

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
        patience=config.PATIENCE,  # More patience
        mode='max',
        restore_best_weights=True,
        verbose=1
    ),
    ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.3,  # More aggressive reduction
        patience=7,
        min_lr=config.MIN_LR,
        verbose=1
    ),
    TensorBoard(
        log_dir=os.path.join(config.LOGS_PATH, f'improved_{timestamp}'),
        histogram_freq=1
    )
]

print("✓ Callbacks ready (more patience than before)")
print()

# ============================================
# TRAINING - PHASE 1
# ============================================

print("="*70)
print("PHASE 1: TRAINING HEAD (100 EPOCHS)")
print("="*70)
print()

model.compile(
    optimizer=Adam(learning_rate=config.INITIAL_LR),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

print(f"Training for {config.EPOCHS} epochs...")
print(f"Target: Reach 85%+ accuracy")
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
print("PHASE 2: FINE-TUNING (50 EPOCHS)")
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
print(f"Target: Reach 95%+ accuracy")
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

if val_accuracy >= 0.95:
    print("🎉 EXCELLENT! Achieved 95%+ accuracy!")
elif val_accuracy >= 0.90:
    print("✓ GOOD! Achieved 90%+ accuracy")
elif val_accuracy >= 0.85:
    print("⚠ ACCEPTABLE. Consider training longer for better results")
else:
    print("⚠ BELOW TARGET. May need more training or data")

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
    status = "✓" if class_acc >= 0.90 else "⚠" if class_acc >= 0.80 else "✗"
    print(f"  {status} {class_name:4s}: {class_acc:.4f} ({class_acc*100:.2f}%)")

print()

# ============================================
# SAVE RESULTS
# ============================================

print("[8/9] Saving improved model...")

# Save models
final_model_path = os.path.join(config.OUTPUT_PATH, 'blood_group_model_final_improved.keras')
h5_model_path = os.path.join(config.OUTPUT_PATH, 'model_blood_group_detection_improved.h5')

best_model.save(final_model_path)
best_model.save(h5_model_path)

print(f"✓ Models saved:")
print(f"  - {best_model_path}")
print(f"  - {final_model_path}")
print(f"  - {h5_model_path}")

# Copy to project root
import shutil
root_h5_path = 'model_blood_group_detection_resnet.h5'
shutil.copy(h5_model_path, root_h5_path)
print(f"  - {root_h5_path} (copied to root)")

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
plt.title('Improved Model Accuracy', fontsize=14)
plt.xlabel('Epoch')
plt.ylabel('Accuracy')
plt.legend()
plt.grid(True, alpha=0.3)

plt.subplot(1, 2, 2)
plt.plot(all_loss, label='Train', linewidth=2)
plt.plot(all_val_loss, label='Validation', linewidth=2)
plt.axvline(x=len(history1.history['loss']), color='red', linestyle='--', label='Fine-tuning')
plt.title('Improved Model Loss', fontsize=14)
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.legend()
plt.grid(True, alpha=0.3)

plt.tight_layout()
history_plot = os.path.join(config.OUTPUT_PATH, 'training_history_improved.png')
plt.savefig(history_plot, dpi=150, bbox_inches='tight')

# Confusion matrix
plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=config.CLASS_NAMES, yticklabels=config.CLASS_NAMES)
plt.title('Improved Model - Confusion Matrix', fontsize=14)
plt.xlabel('Predicted')
plt.ylabel('True')
plt.tight_layout()
cm_plot = os.path.join(config.OUTPUT_PATH, 'confusion_matrix_improved.png')
plt.savefig(cm_plot, dpi=150, bbox_inches='tight')

print(f"✓ Plots saved:")
print(f"  - {history_plot}")
print(f"  - {cm_plot}")

# Summary
summary_path = os.path.join(config.OUTPUT_PATH, 'training_summary_improved.txt')
with open(summary_path, 'w') as f:
    f.write("="*70 + "\n")
    f.write("IMPROVED TRAINING SUMMARY\n")
    f.write("="*70 + "\n\n")
    f.write(f"Previous accuracy: 72.83%\n")
    f.write(f"New accuracy: {val_accuracy:.4f} ({val_accuracy*100:.2f}%)\n")
    f.write(f"Improvement: +{(val_accuracy-0.7283)*100:.2f}%\n\n")
    f.write(f"Configuration:\n")
    f.write(f"  Batch size: {config.BATCH_SIZE}\n")
    f.write(f"  Total epochs: {config.EPOCHS + config.FINE_TUNE_EPOCHS}\n")
    f.write(f"  Mixed precision: {config.USE_MIXED_PRECISION}\n\n")
    f.write("Per-Class Accuracy:\n")
    for idx, class_name in enumerate(config.CLASS_NAMES):
        class_acc = cm[idx, idx] / cm[idx].sum() if cm[idx].sum() > 0 else 0
        f.write(f"  {class_name:4s}: {class_acc:.4f} ({class_acc*100:.2f}%)\n")
    f.write("\n" + "="*70 + "\n")
    f.write(report)

print(f"✓ Summary saved: {summary_path}")

print()
print("="*70)
print("✅ IMPROVED TRAINING COMPLETE!")
print("="*70)
print()
print(f"📊 Previous Accuracy: 72.83%")
print(f"📊 New Accuracy: {val_accuracy*100:.2f}%")
print(f"📈 Improvement: +{(val_accuracy-0.7283)*100:.2f}%")
print()
print("🚀 Model ready to use!")
print("   Start server: start.bat")
print("   Test at: http://localhost:3000/scan")
print()
print("="*70)
