"""
Google Colab Training Script
Copy this entire file into a Colab notebook cell and run

Instructions:
1. Upload your dataset to Google Drive
2. Mount Drive and update DATASET_PATH
3. Run all cells
"""

# ============================================
# CELL 1: Setup Colab Environment
# ============================================

# Mount Google Drive
from google.colab import drive
drive.mount('/content/drive')

# Install dependencies
!pip install -q albumentations

# Clone or upload your dataset
# Option 1: From Drive
# !cp -r "/content/drive/MyDrive/dataset_blood_group" /content/

# Option 2: From Kaggle (requires kaggle.json)
# !pip install -q kaggle
# !mkdir -p ~/.kaggle
# !cp /content/drive/MyDrive/kaggle.json ~/.kaggle/
# !chmod 600 ~/.kaggle/kaggle.json
# !kaggle datasets download -d your-dataset-name
# !unzip -q your-dataset-name.zip -d /content/

print("✅ Environment ready!")

# ============================================
# CELL 2: Configuration
# ============================================

import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import EfficientNetB3, ResNet101, DenseNet169
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
import pandas as pd
import glob

# Configuration
DATASET_PATH = '/content/dataset_blood_group'  # Update this!
OUTPUT_PATH = '/content/output'
IMG_SIZE = (299, 299)
BATCH_SIZE = 16
EPOCHS = 100
NUM_CLASSES = 8
SEED = 42

os.makedirs(OUTPUT_PATH, exist_ok=True)
np.random.seed(SEED)
tf.random.set_seed(SEED)

# Enable mixed precision
tf.keras.mixed_precision.set_global_policy('mixed_float16')
print(f"✅ GPU: {tf.config.list_physical_devices('GPU')}")


# ============================================
# CELL 3: Data Loading
# ============================================

def load_data(data_path):
    """Load dataset"""
    filepaths = []
    labels = []
    
    for class_name in sorted(os.listdir(data_path)):
        class_path = os.path.join(data_path, class_name)
        if os.path.isdir(class_path):
            for img_file in os.listdir(class_path):
                if img_file.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
                    filepaths.append(os.path.join(class_path, img_file))
                    labels.append(class_name)
    
    data = pd.DataFrame({'Filepath': filepaths, 'Label': labels})
    data = data.sample(frac=1, random_state=SEED).reset_index(drop=True)
    print(f"📊 Loaded {len(data)} images from {len(data['Label'].unique())} classes")
    return data

data = load_data(DATASET_PATH)
print(data['Label'].value_counts())

# ============================================
# CELL 4: Data Generators
# ============================================

train_data, val_data = train_test_split(
    data, test_size=0.2, stratify=data['Label'], random_state=SEED
)

# Advanced augmentation
train_gen = ImageDataGenerator(
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

val_gen = ImageDataGenerator(
    preprocessing_function=tf.keras.applications.efficientnet.preprocess_input
)

train_generator = train_gen.flow_from_dataframe(
    dataframe=train_data, x_col='Filepath', y_col='Label',
    target_size=IMG_SIZE, class_mode='categorical',
    batch_size=BATCH_SIZE, shuffle=True, seed=SEED
)

val_generator = val_gen.flow_from_dataframe(
    dataframe=val_data, x_col='Filepath', y_col='Label',
    target_size=IMG_SIZE, class_mode='categorical',
    batch_size=BATCH_SIZE, shuffle=False, seed=SEED
)

# Class weights
class_weights = compute_class_weight(
    'balanced', classes=np.unique(train_data['Label']), y=train_data['Label']
)
class_weight_dict = dict(enumerate(class_weights))
print("✅ Data generators ready")


# ============================================
# CELL 5: Model Creation
# ============================================

def create_model(architecture='efficientnetb3', trainable=False):
    """Create model with specified architecture"""
    input_shape = (*IMG_SIZE, 3)
    
    if architecture == 'efficientnetb3':
        base = EfficientNetB3(input_shape=input_shape, include_top=False, 
                              weights='imagenet', pooling='avg')
    elif architecture == 'resnet101':
        base = ResNet101(input_shape=input_shape, include_top=False,
                         weights='imagenet', pooling='avg')
    elif architecture == 'densenet169':
        base = DenseNet169(input_shape=input_shape, include_top=False,
                           weights='imagenet', pooling='avg')
    
    base.trainable = trainable
    
    inputs = layers.Input(shape=input_shape)
    x = base(inputs, training=trainable)
    x = layers.BatchNormalization()(x)
    x = layers.Dense(512, kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.5)(x)
    x = layers.Dense(256, kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(NUM_CLASSES, activation='softmax', dtype='float32')(x)
    
    return Model(inputs, outputs), base

# ============================================
# CELL 6: Training
# ============================================

def train_model(architecture='efficientnetb3'):
    """Train with two-phase approach"""
    print(f"\n{'='*50}")
    print(f"🏋️ Training {architecture.upper()}")
    print(f"{'='*50}")
    
    # Phase 1: Train head only
    print("\n📌 Phase 1: Training classification head...")
    model, base = create_model(architecture, trainable=False)
    model.compile(optimizer=Adam(1e-4), loss='categorical_crossentropy', metrics=['accuracy'])
    
    callbacks = [
        ModelCheckpoint(f'{OUTPUT_PATH}/{architecture}_best.keras', 
                       monitor='val_accuracy', save_best_only=True, mode='max'),
        EarlyStopping(monitor='val_accuracy', patience=10, restore_best_weights=True),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-7)
    ]
    
    history1 = model.fit(
        train_generator, validation_data=val_generator,
        epochs=EPOCHS//2, class_weight=class_weight_dict,
        callbacks=callbacks, verbose=1
    )
    
    # Phase 2: Fine-tune
    print("\n📌 Phase 2: Fine-tuning...")
    base.trainable = True
    for layer in base.layers[:-50]:
        layer.trainable = False
    
    model.compile(optimizer=Adam(1e-5), loss='categorical_crossentropy', metrics=['accuracy'])
    
    history2 = model.fit(
        train_generator, validation_data=val_generator,
        epochs=50, class_weight=class_weight_dict,
        callbacks=callbacks, verbose=1
    )
    
    return model, {
        'accuracy': history1.history['accuracy'] + history2.history['accuracy'],
        'val_accuracy': history1.history['val_accuracy'] + history2.history['val_accuracy']
    }

# Train ensemble
models = []
for arch in ['efficientnetb3', 'resnet101', 'densenet169']:
    model, history = train_model(arch)
    models.append(model)
    model.save(f'{OUTPUT_PATH}/{arch}_final.keras')

print("\n✅ Training complete!")


# ============================================
# CELL 7: Ensemble Evaluation with TTA
# ============================================

def predict_with_tta(models, image, tta_steps=10):
    """Predict with Test-Time Augmentation"""
    predictions = []
    
    tta_gen = ImageDataGenerator(
        rotation_range=15, width_shift_range=0.1,
        height_shift_range=0.1, zoom_range=0.1,
        horizontal_flip=True, fill_mode='nearest'
    )
    
    # Original predictions
    for model in models:
        pred = model.predict(np.expand_dims(image, 0), verbose=0)
        predictions.append(pred[0])
    
    # TTA predictions
    for _ in range(tta_steps):
        aug_img = tta_gen.random_transform(image)
        for model in models:
            pred = model.predict(np.expand_dims(aug_img, 0), verbose=0)
            predictions.append(pred[0])
    
    return np.mean(predictions, axis=0)

# Evaluate ensemble
print("\n📊 Evaluating Ensemble with TTA...")
from sklearn.metrics import accuracy_score, classification_report

y_true = []
y_pred = []

for i in range(len(val_generator)):
    batch_x, batch_y = val_generator[i]
    for j in range(len(batch_x)):
        img = batch_x[j]
        true_label = np.argmax(batch_y[j])
        
        # Ensemble + TTA prediction
        pred = predict_with_tta(models, img, tta_steps=10)
        pred_label = np.argmax(pred)
        
        y_true.append(true_label)
        y_pred.append(pred_label)
    
    if i >= 5:  # Limit for speed
        break

accuracy = accuracy_score(y_true, y_pred)
print(f"\n✅ ENSEMBLE + TTA ACCURACY: {accuracy:.4f}")

# ============================================
# CELL 8: Save to Drive
# ============================================

# Copy models to Drive for persistence
!cp -r {OUTPUT_PATH}/* "/content/drive/MyDrive/blood_group_models/"
print("✅ Models saved to Google Drive!")

# ============================================
# CELL 9: Quick Prediction Test
# ============================================

def predict_blood_group(image_path, models, use_tta=True):
    """Predict blood group from fingerprint image"""
    from tensorflow.keras.preprocessing.image import load_img, img_to_array
    
    img = load_img(image_path, target_size=IMG_SIZE)
    img_array = img_to_array(img)
    img_array = tf.keras.applications.efficientnet.preprocess_input(img_array)
    
    if use_tta:
        pred = predict_with_tta(models, img_array, tta_steps=10)
    else:
        predictions = [m.predict(np.expand_dims(img_array, 0), verbose=0)[0] for m in models]
        pred = np.mean(predictions, axis=0)
    
    class_names = sorted(os.listdir(DATASET_PATH))
    pred_idx = np.argmax(pred)
    confidence = pred[pred_idx]
    
    print(f"🩸 Predicted Blood Group: {class_names[pred_idx]}")
    print(f"📊 Confidence: {confidence:.2%}")
    return class_names[pred_idx], confidence

# Test with a sample image
# predict_blood_group('/content/test_fingerprint.jpg', models)
