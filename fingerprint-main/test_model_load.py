"""Quick test to verify model loading works"""
import requests
import os

# Test health endpoint
print("Testing /health endpoint...")
try:
    response = requests.get('http://localhost:5000/health', timeout=5)
    print(f"Health check: {response.status_code} - {response.json()}")
except Exception as e:
    print(f"Health check failed: {e}")
    exit(1)

# Test predict endpoint with a sample image
print("\nTesting /predict endpoint...")
test_image_path = 'test/O- blood group.BMP'

if not os.path.exists(test_image_path):
    print(f"Test image not found: {test_image_path}")
    print("Please provide a valid test image path")
    exit(1)

try:
    with open(test_image_path, 'rb') as f:
        files = {'image': f}
        response = requests.post('http://localhost:5000/predict', files=files, timeout=30)
        
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✓ SUCCESS!")
        print(f"  Blood Group: {result['label']}")
        print(f"  Confidence: {result['confidence']:.2%}")
    else:
        print(f"\n✗ FAILED: {response.json()}")
        
except Exception as e:
    print(f"Prediction test failed: {e}")
    exit(1)
