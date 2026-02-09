"""Quick test to verify TensorFlow and Flask are working"""

print("Testing TensorFlow import...")
try:
    import tensorflow as tf
    print(f"✓ TensorFlow {tf.__version__} imported successfully!")
except Exception as e:
    print(f"✗ TensorFlow import failed: {e}")
    exit(1)

print("\nTesting Flask import...")
try:
    from flask import Flask
    print("✓ Flask imported successfully!")
except Exception as e:
    print(f"✗ Flask import failed: {e}")
    exit(1)

print("\nTesting model loading simulation...")
try:
    # Test if we can create a simple model
    from tensorflow import keras
    model = keras.Sequential([
        keras.layers.Dense(10, activation='relu', input_shape=(5,)),
        keras.layers.Dense(8, activation='softmax')
    ])
    print("✓ Model creation successful!")
except Exception as e:
    print(f"✗ Model creation failed: {e}")
    exit(1)

print("\n" + "="*60)
print("ALL TESTS PASSED! ✓")
print("="*60)
print("\nYour backend is ready to run!")
print("\nNext steps:")
print("1. Start the backend server:")
print("   cd fingerprint-main")
print("   start.bat")
print("\n2. Test the health endpoint:")
print("   Open browser: http://localhost:5000/health")
print("\n3. Start the frontend:")
print("   cd AApp_module")
print("   npm run dev")
