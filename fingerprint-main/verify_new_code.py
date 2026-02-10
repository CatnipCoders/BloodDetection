"""
Verify that Flask is running the NEW code with all fixes applied.

This script checks if the Flask server has the updated logging.
"""

import requests
import os
from pathlib import Path

API_URL = "http://localhost:5000"

def verify_new_code():
    """Verify Flask is running updated code."""
    
    print("="*70)
    print("VERIFYING FLASK IS RUNNING NEW CODE")
    print("="*70)
    print()
    
    # Check if server is running
    try:
        response = requests.get(f"{API_URL}/health", timeout=2)
        if response.status_code != 200:
            print("❌ Flask server returned unexpected status")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Flask server is not running!")
        print()
        print("Please start the server:")
        print("  cd fingerprint-main")
        print("  FORCE_RESTART.bat")
        print()
        return False
    
    print("✓ Flask server is running")
    print()
    
    # Find a test image
    dataset_path = Path("dataset/dataset_blood_group")
    test_image = None
    
    if dataset_path.exists():
        for blood_group in ['A+', 'B+', 'O+']:
            group_path = dataset_path / blood_group
            if group_path.exists():
                images = list(group_path.glob("*.BMP"))[:1]
                if images:
                    test_image = images[0]
                    break
    
    if not test_image:
        print("❌ No test images found")
        return False
    
    print(f"✓ Using test image: {test_image.name}")
    print()
    
    # Send test request
    print("Sending test request to Flask...")
    print()
    
    with open(test_image, 'rb') as f:
        files = {'image': (test_image.name, f, 'image/bmp')}
        response = requests.post(f"{API_URL}/predict", files=files)
    
    if response.status_code != 200:
        print(f"❌ Request failed: {response.status_code}")
        return False
    
    result = response.json()
    print(f"✓ Got response: {result['label']} (confidence: {result['confidence']:.4f})")
    print()
    
    # Check Flask terminal output
    print("="*70)
    print("NOW CHECK YOUR FLASK TERMINAL")
    print("="*70)
    print()
    print("You should see these NEW log lines:")
    print()
    print("  ✓ INFO: Received image: ..., size: ... bytes, hash: xxxxxxxx")
    print("  ✓ INFO: Preprocessed image shape: (1, 224, 224, 3), dtype: float32")
    print("  ✓ INFO: Image stats - min: ... max: ... mean: ... std: ...")
    print("  ✓ INFO: Running prediction for image hash: xxxxxxxx...")
    print("  ✓ INFO: Raw predictions: [...]")
    print("  ✓ INFO: Prediction result: ... for hash: xxxxxxxx")
    print()
    print("If you DON'T see these lines, Flask is running OLD CODE!")
    print()
    print("="*70)
    print("WHAT TO LOOK FOR")
    print("="*70)
    print()
    print("OLD CODE (Bad):")
    print("  127.0.0.1 - - [07/Feb/2026 12:43:56] \"POST /predict?t=... HTTP/1.1\" 200 -")
    print("  ← Only shows HTTP request, no detailed logs")
    print()
    print("NEW CODE (Good):")
    print("  INFO: Received image: fingerprint_1770448428064_z057i8.bmp, size: 245760 bytes, hash: a1b2c3d4")
    print("  INFO: Preprocessed image shape: (1, 224, 224, 3), dtype: float32")
    print("  INFO: Image stats - min: -1.000, max: 1.000, mean: 0.234, std: 0.456")
    print("  INFO: Running prediction for image hash: a1b2c3d4...")
    print("  INFO: Raw predictions: [0.8850 0.0234 0.0156 0.0123 0.0234 0.0156 0.0123 0.0124]")
    print("  INFO: Prediction result: A+ (index: 0, confidence: 0.8850) for hash: a1b2c3d4")
    print("  127.0.0.1 - - [07/Feb/2026 12:43:56] \"POST /predict?t=... HTTP/1.1\" 200 -")
    print("  ← Shows detailed logs BEFORE HTTP request line")
    print()
    print("="*70)
    print()
    
    if result['confidence'] < 0.2:
        print("⚠️  WARNING: Confidence is very low ({:.4f})".format(result['confidence']))
        print("   This suggests the model still has random weights!")
        print("   Flask is likely running OLD CODE with wrong architecture.")
        print()
        print("   ACTION: Run FORCE_RESTART.bat to restart with new code")
        print()
        return False
    
    print("✓ Confidence looks reasonable ({:.4f})".format(result['confidence']))
    print()
    print("If Flask terminal shows detailed logs above:")
    print("  ✅ NEW CODE IS RUNNING!")
    print()
    print("If Flask terminal only shows HTTP request line:")
    print("  ❌ OLD CODE IS STILL RUNNING!")
    print("  → Run: FORCE_RESTART.bat")
    print()
    
    return True

if __name__ == "__main__":
    verify_new_code()
