"""
Optimized Blood Group Detection Training
Designed for maximum accuracy with your dataset

Dataset: 6,000 fingerprint images across 8 blood groups
Goal: Achieve 95%+ accuracy
"""

import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
from pathlib import Path

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')

print("="*70)
print("🩸 OPTIMIZED BLOOD GROUP DETECTION TRAINING")
print("="*70)
print()

# Check TensorFlow
print("[1/8] Checking TensorFlow...")
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers, Model
    from tensorflow.keras.applications import EfficientNetB3, ResNet101, DenseNet169
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from tensorflow.keras.callbacks import (
        ModelCheckpoint, EarlyStopping, ReduceLROnPlateau,
        TensorBoard, LearningRateScheduler
    )
    from tensorflow.keras.optimizers import Adam
    
    print(f"✓ TensorFlow {tf.__version__}")
    print(f"✓ GPU Available: {len(tf.config.list_physical_devices('GPU')) > 0}")
except Exception as e:
    print(f"✗ TensorFlow import failed: {e}")
    print("\nPlease run: python check_tensorflow.py")
    sys.exit(1)

# Import other dependencies
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.utils.class_weight import compute_class_weight

# Set random seeds for reproducibility
SEED = 42
np.random.seed(SEED)
tf.random.set_seed(SEED)

print()

# ============================================
# CONFIGURATION
# ============================================

class Config:
    """Training configuration optimized for RTX 2060 6GB + i5-12400F"""
    
    # Dataset
    DATASET_PATH = 'dataset/dataset_blood_group'
    OUTPUT_PATH = 'models'
    LOGS_PATH = 'logs'
    
    # Image settings - Optimized for RTX 2060 6GB
    IMG_SIZE = (224, 224)  # Perfect balance for 6GB VRAM
    BATCH_SIZE = 32        # RTX 2060 can handle this! (was 16)
    
    # Training - Faster with GPU
    EPOCHS = 80            # Reduced from 100 (GPU trains faster)
    INITIAL_LR = 2e-4      # Slightly higher for larger batch
    MIN_LR = 1e-7
    PATIENCE = 12          # Reduced from 15 (faster convergence)
    
    # Fine-tuning
    FINE_TUNE_EPOCHS = 40  # Reduced from 50 (GPU efficiency)
    FINE_TUNE_LR = 1e-5
    UNFREEZE_LAYERS = 60   # More layers (GPU can handle it)
    
    # Model
    MODEL_NAME = 'efficientnetb3'  # Best accuracy/speed ratio
    
    # Classes
    NUM_CLASSES = 8
    CLASS_NAMES = ['A+', 'A-', 'AB+', 'AB-', 'B+', 'B-', 'O+', 'O-']

config = Config()

# Create output directories
os.makedirs(config.OUTPUT_PATH, exist_ok=True)
os.makedirs(config.LOGS_PATH, exist_ok=True)

# ============================================
# GPU OPTIMIZATION FOR RTX 2060
# ============================================

print("[2/8] Configuring GPU...")

# Enable GPU memory growth (prevents OOM errors)
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        print(f"✓ GPU detected: {gpus[0].name}")
        print(f"  Memory growth enabled (prevents OOM)")
        
        # Enable mixed precision for RTX 2060 (faster training)
        from tensorflow.keras import mixed_precision
        policy = mixed_precision.Policy('mixed_float16')
        mixed_precision.set_global_policy(policy)
        print(f"✓ Mixed precision enabled (float16)")
        print(f"  Expected speedup: 1.5-2x faster training")
    except RuntimeError as e:
        print(f"⚠ GPU configuration warning: {e}")
else:
    print("⚠ No GPU detected - training will use CPU (slower)")

print()
print("[3/8] Configuration loaded")
print(f"  Dataset: {config.DATASET_PATH}")
print(f"  Image size: {config.IMG_SIZE}")
print(f"  Batch size: {config.BATCH_SIZE} (optimized for RTX 2060)")
print(f"  Model: {config.MODEL_NAME}")
print(f"  Expected training time: 45-90 minutes (with GPU)")
print()

# ============================================
# DATA LOADING
# ============================================

print("[4/8] Loading dataset...")

def load_dataset(data_path):
    """Load all image paths and labels"""
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
    print(f"  {label:4s}: {count:4d} images ({count/len(data)*100:.1f}%)")

# Check for class imbalance
max_count = class_counts.max()
min_count = class_counts.min()
imbalance_ratio = max_count / min_count
print(f"\nImbalance ratio: {imbalance_ratio:.2f}x")
if imbalance_ratio > 2:
    print("⚠ Significant class imbalance detected - using class weights")
    use_class_weights = True
else:
    print("✓ Classes are relatively balanced")
    use_class_weights = False

print()

# ============================================
# DATA AUGMENTATION
# ============================================

print("[5/8] Setting up data augmentation...")

# Training augmentation (aggressive for better generalization)
train_datagen = ImageDataGenerator(
    preprocessing_function=tf.keras.applications.efficientnet.preprocess_input,
    rotation_range=30,
    width_shift_range=0.2,
    height_shift_range=0.2,
    zoom_range=0.2,
    horizontal_flip=True,
    vertical_flip=False,
    brightness_range=(0.8, 1.2),
    shear_range=0.15,
    fill_mode='nearest'
)

# Validation augmentation (no augmentation, just preprocessing)
val_datagen = ImageDataGenerator(
    preprocessing_function=tf.keras.applications.efficientnet.preprocess_input
)

# Split data
train_data, val_data = train_test_split(
    data, 
    test_size=0.2, 
    stratify=data['Label'], 
    random_state=SEED
)

print(f"✓ Training samples: {len(train_data)}")
print(f"✓ Validation samples: {len(val_data)}")

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

print(f"✓ Data augmentation configured")
print()

# ============================================
# CLASS WEIGHTS
# ============================================

if use_class_weights:
    print("[6/8] Computing class weights...")
    class_weights_array = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(train_data['Label']),
        y=train_data['Label']
    )
    class_weights = dict(enumerate(class_weights_array))
    print("✓ Class weights computed:")
    for idx, (label, weight) in enumerate(zip(sorted(data['Label'].unique()), class_weights_array)):
        print(f"  {label:4s}: {weight:.3f}")
else:
    class_weights = None
    print("[6/8] Skipping class weights (balanced dataset)")

print()

# ============================================
# MODEL CREATION
# ============================================

print("[7/8] Building model...")

def create_model(input_shape, num_classes, trainable=False):
    """Create EfficientNetB3 model with custom head"""
    
    # Base model
    base_model = EfficientNetB3(
        input_shape=input_shape,
        include_top=False,
        weights='imagenet',
        pooling='avg'
    )
    base_model.trainable = trainable
    
    # Custom classification head
    inputs = layers.Input(shape=input_shape)
    x = base_model(inputs, training=trainable)
    
    # Dense layers with regularization
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
    
    # Output layer
    outputs = layers.Dense(num_classes, activation='softmax', dtype='float32')(x)
    
    model = Model(inputs, outputs, name='blood_group_efficientnetb3')
    return model, base_model

input_shape = (*config.IMG_SIZE, 3)
model, base_model = create_model(input_shape, config.NUM_CLASSES, trainable=False)

print(f"✓ Model created: {config.MODEL_NAME}")
print(f"  Total parameters: {model.count_params():,}")
print(f"  Trainable parameters: {sum([tf.size(w).numpy() for w in model.trainable_weights]):,}")
print()

# ============================================
# CALLBACKS
# ============================================

print("[8/8] Setting up callbacks...")

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
model_path = os.path.join(config.OUTPUT_PATH, f'blood_group_model_{timestamp}.keras')
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
        log_dir=os.path.join(config.LOGS_PATH, f'training_{timestamp}'),
        histogram_freq=1
    )
]

print("✓ Callbacks configured")
print(f"  Best model will be saved to: {best_model_path}")
print()

# ============================================
# TRAINING - PHASE 1: HEAD ONLY
# ============================================

print("="*70)
print("PHASE 1: TRAINING CLASSIFICATION HEAD")
print("="*70)
print()

model.compile(
    optimizer=Adam(learning_rate=config.INITIAL_LR),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

print(f"Training for {config.EPOCHS // 2} epochs...")
print(f"Learning rate: {config.INITIAL_LR}")
print()

history1 = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=config.EPOCHS // 2,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1
)

print()
print("✓ Phase 1 complete!")
print(f"  Best validation accuracy: {max(history1.history['val_accuracy']):.4f}")
print()

# ============================================
# TRAINING - PHASE 2: FINE-TUNING
# ============================================

print("="*70)
print("PHASE 2: FINE-TUNING TOP LAYERS")
print("="*70)
print()

# Unfreeze top layers
base_model.trainable = True
for layer in base_model.layers[:-config.UNFREEZE_LAYERS]:
    layer.trainable = False

print(f"Unfreezing top {config.UNFREEZE_LAYERS} layers...")
print(f"Trainable parameters: {sum([tf.size(w).numpy() for w in model.trainable_weights]):,}")
print()

model.compile(
    optimizer=Adam(learning_rate=config.FINE_TUNE_LR),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

print(f"Fine-tuning for {config.FINE_TUNE_EPOCHS} epochs...")
print(f"Learning rate: {config.FINE_TUNE_LR}")
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
print(f"  Best validation accuracy: {max(history2.history['val_accuracy']):.4f}")
print()

# ============================================
# EVALUATION
# ============================================

print("="*70)
print("FINAL EVALUATION")
print("="*70)
print()

# Load best model
print("Loading best model...")
best_model = keras.models.load_model(best_model_path)

# Evaluate on validation set
print("Evaluating on validation set...")
val_loss, val_accuracy = best_model.evaluate(val_generator, verbose=0)

print(f"\n✓ Validation Results:")
print(f"  Loss: {val_loss:.4f}")
print(f"  Accuracy: {val_accuracy:.4f} ({val_accuracy*100:.2f}%)")
print()

# Get predictions
print("Generating predictions...")
predictions = best_model.predict(val_generator, verbose=0)
y_pred = np.argmax(predictions, axis=1)
y_true = val_generator.classes

# Classification report
print("\nClassification Report:")
print("="*70)
report = classification_report(
    y_true, 
    y_pred, 
    target_names=config.CLASS_NAMES,
    digits=4
)
print(report)

# Confusion matrix
cm = confusion_matrix(y_true, y_pred)

# Per-class accuracy
print("\nPer-Class Accuracy:")
print("="*70)
for idx, class_name in enumerate(config.CLASS_NAMES):
    class_acc = cm[idx, idx] / cm[idx].sum() if cm[idx].sum() > 0 else 0
    print(f"  {class_name:4s}: {class_acc:.4f} ({class_acc*100:.2f}%)")

print()

# ============================================
# SAVE RESULTS
# ============================================

print("[9/9] Saving results...")

# Save final model
final_model_path = os.path.join(config.OUTPUT_PATH, 'blood_group_model_final.keras')
best_model.save(final_model_path)
print(f"✓ Final model saved: {final_model_path}")

# Save as .h5 for compatibility
h5_model_path = os.path.join(config.OUTPUT_PATH, 'model_blood_group_detection_resnet.h5')
best_model.save(h5_model_path)
print(f"✓ H5 model saved: {h5_model_path}")

# Plot training history
plt.figure(figsize=(14, 5))

# Combine histories
all_accuracy = history1.history['accuracy'] + history2.history['accuracy']
all_val_accuracy = history1.history['val_accuracy'] + history2.history['val_accuracy']
all_loss = history1.history['loss'] + history2.history['loss']
all_val_loss = history1.history['val_loss'] + history2.history['val_loss']

# Accuracy plot
plt.subplot(1, 2, 1)
plt.plot(all_accuracy, label='Train', linewidth=2)
plt.plot(all_val_accuracy, label='Validation', linewidth=2)
plt.axvline(x=len(history1.history['accuracy']), color='red', linestyle='--', label='Fine-tuning starts')
plt.title('Model Accuracy', fontsize=14)
plt.xlabel('Epoch')
plt.ylabel('Accuracy')
plt.legend()
plt.grid(True, alpha=0.3)

# Loss plot
plt.subplot(1, 2, 2)
plt.plot(all_loss, label='Train', linewidth=2)
plt.plot(all_val_loss, label='Validation', linewidth=2)
plt.axvline(x=len(history1.history['loss']), color='red', linestyle='--', label='Fine-tuning starts')
plt.title('Model Loss', fontsize=14)
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.legend()
plt.grid(True, alpha=0.3)

plt.tight_layout()
history_plot_path = os.path.join(config.OUTPUT_PATH, 'training_history.png')
plt.savefig(history_plot_path, dpi=150, bbox_inches='tight')
print(f"✓ Training history plot saved: {history_plot_path}")

# Plot confusion matrix
plt.figure(figsize=(10, 8))
sns.heatmap(
    cm, 
    annot=True, 
    fmt='d', 
    cmap='Blues',
    xticklabels=config.CLASS_NAMES,
    yticklabels=config.CLASS_NAMES,
    cbar_kws={'label': 'Count'}
)
plt.title('Confusion Matrix', fontsize=14)
plt.xlabel('Predicted')
plt.ylabel('True')
plt.tight_layout()
cm_plot_path = os.path.join(config.OUTPUT_PATH, 'confusion_matrix.png')
plt.savefig(cm_plot_path, dpi=150, bbox_inches='tight')
print(f"✓ Confusion matrix saved: {cm_plot_path}")

# Save training summary
summary_path = os.path.join(config.OUTPUT_PATH, 'training_summary.txt')
with open(summary_path, 'w') as f:
    f.write("="*70 + "\n")
    f.write("BLOOD GROUP DETECTION - TRAINING SUMMARY\n")
    f.write("="*70 + "\n\n")
    f.write(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    f.write(f"Dataset:\n")
    f.write(f"  Total images: {len(data)}\n")
    f.write(f"  Training images: {len(train_data)}\n")
    f.write(f"  Validation images: {len(val_data)}\n\n")
    f.write(f"Model: {config.MODEL_NAME}\n")
    f.write(f"Image size: {config.IMG_SIZE}\n")
    f.write(f"Batch size: {config.BATCH_SIZE}\n\n")
    f.write(f"Training:\n")
    f.write(f"  Phase 1 epochs: {config.EPOCHS // 2}\n")
    f.write(f"  Phase 2 epochs: {config.FINE_TUNE_EPOCHS}\n")
    f.write(f"  Total epochs: {len(all_accuracy)}\n\n")
    f.write(f"Results:\n")
    f.write(f"  Final validation accuracy: {val_accuracy:.4f} ({val_accuracy*100:.2f}%)\n")
    f.write(f"  Final validation loss: {val_loss:.4f}\n\n")
    f.write("Per-Class Accuracy:\n")
    for idx, class_name in enumerate(config.CLASS_NAMES):
        class_acc = cm[idx, idx] / cm[idx].sum() if cm[idx].sum() > 0 else 0
        f.write(f"  {class_name:4s}: {class_acc:.4f} ({class_acc*100:.2f}%)\n")
    f.write("\n" + "="*70 + "\n")
    f.write("Classification Report:\n")
    f.write("="*70 + "\n")
    f.write(report)

print(f"✓ Training summary saved: {summary_path}")

print()
print("="*70)
print("✅ TRAINING COMPLETE!")
print("="*70)
print()
print(f"📊 Final Accuracy: {val_accuracy*100:.2f}%")
print()
print("📁 Generated Files:")
print(f"  • {best_model_path}")
print(f"  • {final_model_path}")
print(f"  • {h5_model_path}")
print(f"  • {history_plot_path}")
print(f"  • {cm_plot_path}")
print(f"  • {summary_path}")
print()
print("🚀 Next Steps:")
print("  1. Copy the .h5 model to project root:")
print(f"     copy {h5_model_path} .")
print("  2. Start the Flask server:")
print("     start.bat")
print("  3. Test predictions with your frontend!")
print()
print("="*70)
