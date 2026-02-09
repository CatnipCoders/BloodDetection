"""
Convert old Keras model to new format compatible with TensorFlow 2.15
This script loads the model with TensorFlow 2.10 and saves it in the new format
"""
import os
import sys

print("=" * 60)
print("Model Converter for TensorFlow 2.15 Compatibility")
print("=" * 60)

# First, try with current TensorFlow version using h5py manipulation
try:
    import h5py
    import json
    import numpy as np
    from tensorflow import keras
    from tensorflow.keras.models import model_from_json
    
    model_path = 'test/model_blood_group_detection_resnet.h5'
    output_path = 'test/model_blood_group_detection_resnet_converted.h5'
    
    if not os.path.exists(model_path):
        print(f"Error: Model file not found: {model_path}")
        sys.exit(1)
    
    print(f"\nReading model from: {model_path}")
    
    # Open the h5 file and read model config
    with h5py.File(model_path, 'r') as f:
        if 'model_config' not in f.attrs:
            print("Error: No model_config found in file")
            sys.exit(1)
        
        model_config = json.loads(f.attrs['model_config'])
        print(f"Model class: {model_config.get('class_name', 'Unknown')}")
        
        # Fix InputLayer configs and DTypePolicy
        fixed_layers = 0
        if 'config' in model_config and 'layers' in model_config['config']:
            for layer in model_config['config']['layers']:
                # Fix InputLayer batch_shape
                if layer.get('class_name') == 'InputLayer':
                    if 'batch_shape' in layer['config']:
                        batch_shape = layer['config'].pop('batch_shape')
                        if batch_shape and len(batch_shape) > 1:
                            layer['config']['input_shape'] = batch_shape[1:]
                            fixed_layers += 1
                            print(f"  Fixed InputLayer: batch_shape {batch_shape} -> input_shape {layer['config']['input_shape']}")
                
                # Fix DTypePolicy in all layers
                if 'dtype' in layer['config']:
                    dtype_value = layer['config']['dtype']
                    if isinstance(dtype_value, dict) and dtype_value.get('class_name') == 'DTypePolicy':
                        # Replace DTypePolicy dict with simple string
                        layer['config']['dtype'] = dtype_value.get('config', {}).get('name', 'float32')
                        print(f"  Fixed DTypePolicy in {layer.get('name', 'unknown')}: {dtype_value} -> {layer['config']['dtype']}")
        
        print(f"\nFixed {fixed_layers} InputLayer(s)")
        
        # Create model from fixed config
        print("Creating model from fixed config...")
        model = model_from_json(json.dumps(model_config))
        
        # Load weights from original file
        print("Loading weights...")
        model.load_weights(model_path)
        
        # Compile model
        print("Compiling model...")
        model.compile(
            optimizer='adam',
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        # Save in new format
        print(f"\nSaving converted model to: {output_path}")
        model.save(output_path)
        
        print("\n" + "=" * 60)
        print("✓ SUCCESS! Model converted successfully")
        print("=" * 60)
        print(f"\nConverted model saved to: {output_path}")
        print("\nTo use the converted model, update your code to load:")
        print(f"  {output_path}")
        print("\nOr rename it to replace the original:")
        print(f"  move {output_path} {model_path}.backup")
        print(f"  move {output_path} {model_path}")
        
except Exception as e:
    print(f"\n✗ Conversion failed: {e}")
    print("\n" + "=" * 60)
    print("Alternative Solution: Use TensorFlow 2.10")
    print("=" * 60)
    print("\nThe model was created with an older TensorFlow version.")
    print("To convert it, you need to:")
    print("\n1. Create a new virtual environment with TensorFlow 2.10:")
    print("   python -m venv myenv_tf210")
    print("   myenv_tf210\\Scripts\\activate")
    print("   pip install tensorflow==2.10.0")
    print("\n2. Run this conversion script:")
    print("   python convert_model_tf210.py")
    print("\n3. The converted model will work with TensorFlow 2.15")
    sys.exit(1)
