"""
TensorFlow Installation Checker
Diagnoses TensorFlow DLL issues on Windows
"""

import sys
import os
import platform

print("=" * 60)
print("TensorFlow Installation Diagnostic Tool")
print("=" * 60)
print()

# Check Python version
print(f"✓ Python Version: {sys.version}")
print(f"✓ Platform: {platform.platform()}")
print(f"✓ Architecture: {platform.machine()}")
print()

# Check if we're in virtual environment
in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
print(f"{'✓' if in_venv else '✗'} Virtual Environment: {'Active' if in_venv else 'Not Active'}")
if not in_venv:
    print("  WARNING: You should activate the virtual environment first!")
    print("  Run: myenv\\Scripts\\activate")
print()

# Try to import TensorFlow
print("Attempting to import TensorFlow...")
try:
    import tensorflow as tf
    print(f"✓ TensorFlow imported successfully!")
    print(f"  Version: {tf.__version__}")
    print(f"  Location: {tf.__file__}")
    
    # Check for GPU
    gpus = tf.config.list_physical_devices('GPU')
    print(f"  GPU Available: {len(gpus) > 0}")
    if gpus:
        for gpu in gpus:
            print(f"    - {gpu}")
    
    # Try a simple operation
    print()
    print("Testing TensorFlow operations...")
    x = tf.constant([[1.0, 2.0], [3.0, 4.0]])
    y = tf.constant([[1.0], [1.0]])
    result = tf.matmul(x, y)
    print(f"✓ Matrix multiplication test passed!")
    print(f"  Result: {result.numpy().flatten()}")
    
    print()
    print("=" * 60)
    print("SUCCESS! TensorFlow is working correctly!")
    print("=" * 60)
    print()
    print("You can now start the Flask server:")
    print("  python src\\app.py")
    
except ImportError as e:
    print(f"✗ TensorFlow import failed!")
    print(f"  Error: {str(e)}")
    print()
    
    # Diagnose the issue
    print("=" * 60)
    print("DIAGNOSIS")
    print("=" * 60)
    
    error_msg = str(e).lower()
    
    if "dll load failed" in error_msg or "pywrap" in error_msg:
        print()
        print("Issue: Missing Microsoft Visual C++ Redistributable")
        print()
        print("Solution:")
        print("1. Download VC++ Redistributable:")
        print("   https://aka.ms/vs/17/release/vc_redist.x64.exe")
        print()
        print("2. Install it (requires admin rights)")
        print()
        print("3. Restart your computer")
        print()
        print("4. Run this script again to verify")
        print()
        print("Alternative: Reinstall TensorFlow")
        print("  pip uninstall tensorflow tensorflow-intel")
        print("  pip install tensorflow-intel==2.15.0 --no-cache-dir")
        
    elif "no module named" in error_msg:
        print()
        print("Issue: TensorFlow is not installed")
        print()
        print("Solution:")
        print("  pip install tensorflow-intel==2.15.0")
        
    else:
        print()
        print("Issue: Unknown TensorFlow error")
        print()
        print("Try these steps:")
        print("1. Reinstall TensorFlow:")
        print("   pip uninstall tensorflow tensorflow-intel")
        print("   pip install tensorflow-intel==2.15.0 --no-cache-dir")
        print()
        print("2. Install VC++ Redistributable:")
        print("   https://aka.ms/vs/17/release/vc_redist.x64.exe")
        print()
        print("3. Check Python version (3.8-3.11 recommended)")
        print("   Current: " + sys.version)
    
    print()
    print("=" * 60)
    sys.exit(1)

except Exception as e:
    print(f"✗ Unexpected error: {str(e)}")
    print()
    print("Please report this error with the full output above.")
    sys.exit(1)
