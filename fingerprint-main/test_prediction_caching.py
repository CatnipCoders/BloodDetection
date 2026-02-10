"""
Test script to verify that predictions are NOT cached between requests.

This script sends the same image twice and different images to ensure
each prediction is calculated fresh.
"""

import requests
import os
import glob
from pathlib import Path

API_URL = "http://localhost:5000"

def test_prediction_caching():
    """Test that predictions are not cached."""
    
    print("="*70)
    print("TESTING PREDICTION CACHING FIX")
    print("="*70)
    print()
    
    # Find some test images
    dataset_path = Path("dataset/dataset_blood_group")
    
    if not dataset_path.exists():
        print("❌ Dataset not found. Please ensure dataset exists.")
        return
    
    # Get 3 different images from different blood groups
    test_images = []
    for blood_group in ['A+', 'B+', 'O+']:
        group_path = dataset_path / blood_group
        if group_path.exists():
            images = list(group_path.glob("*.BMP"))[:1]
            if images:
                test_images.append((blood_group, images[0]))
    
    if len(test_images) < 2:
        print("❌ Not enough test images found")
        return
    
    print(f"✓ Found {len(test_images)} test images")
    print()
    
    # Test 1: Same image twice - should get same result
    print("TEST 1: Same image uploaded twice")
    print("-" * 70)
    
    blood_group, image_path = test_images[0]
    print(f"Testing with: {image_path.name} (Expected: {blood_group})")
    
    with open(image_path, 'rb') as f:
        files = {'image': (image_path.name, f, 'image/bmp')}
        response1 = requests.post(f"{API_URL}/predict", files=files)
    
    if response1.status_code == 200:
        result1 = response1.json()
        print(f"  First prediction:  {result1['label']} (confidence: {result1['confidence']:.4f})")
    else:
        print(f"  ❌ First request failed: {response1.status_code}")
        return
    
    # Send same image again
    with open(image_path, 'rb') as f:
        files = {'image': (image_path.name, f, 'image/bmp')}
        response2 = requests.post(f"{API_URL}/predict", files=files)
    
    if response2.status_code == 200:
        result2 = response2.json()
        print(f"  Second prediction: {result2['label']} (confidence: {result2['confidence']:.4f})")
    else:
        print(f"  ❌ Second request failed: {response2.status_code}")
        return
    
    if result1['label'] == result2['label']:
        print(f"  ✓ PASS: Same image gives same result (as expected)")
    else:
        print(f"  ⚠ WARNING: Same image gave different results!")
    
    print()
    
    # Test 2: Different images - should get different results
    print("TEST 2: Different images uploaded")
    print("-" * 70)
    
    results = []
    for blood_group, image_path in test_images:
        print(f"Testing: {image_path.name} (Expected: {blood_group})")
        
        with open(image_path, 'rb') as f:
            files = {'image': (image_path.name, f, 'image/bmp')}
            response = requests.post(f"{API_URL}/predict", files=files)
        
        if response.status_code == 200:
            result = response.json()
            results.append(result)
            print(f"  Predicted: {result['label']} (confidence: {result['confidence']:.4f})")
        else:
            print(f"  ❌ Request failed: {response.status_code}")
            return
    
    print()
    
    # Check if we got different predictions
    unique_predictions = set(r['label'] for r in results)
    
    if len(unique_predictions) > 1:
        print(f"  ✓ PASS: Got {len(unique_predictions)} different predictions from {len(results)} images")
        print(f"  ✓ NO CACHING DETECTED - Each image processed independently")
    else:
        print(f"  ❌ FAIL: All images gave same prediction: {unique_predictions}")
        print(f"  ❌ CACHING ISSUE DETECTED - All predictions are the same!")
    
    print()
    print("="*70)
    print("TEST COMPLETE")
    print("="*70)
    print()
    
    if len(unique_predictions) > 1:
        print("✅ Prediction caching fix is working correctly!")
        print("   Each image is processed independently.")
    else:
        print("⚠️ Caching issue still present!")
        print("   Please restart the Flask server and try again.")
    
    print()

if __name__ == "__main__":
    # Check if server is running
    try:
        response = requests.get(f"{API_URL}/health", timeout=2)
        if response.status_code == 200:
            print("✓ Flask server is running")
            print()
            test_prediction_caching()
        else:
            print("❌ Flask server returned unexpected status")
    except requests.exceptions.ConnectionError:
        print("❌ Flask server is not running!")
        print()
        print("Please start the server first:")
        print("  cd fingerprint-main")
        print("  start.bat")
        print()
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")
