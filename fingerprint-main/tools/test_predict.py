"""Small test client to POST an image file to the Flask /predict endpoint and print the response.

Usage:
    # from project root (activate your venv first)
    python tools/test_predict.py dataset_blood_group/A+/cluster_0_1001.BMP

You can also specify --url if your server runs on a different host/port.
"""

import requests
import sys
from pathlib import Path


def main(image_path: str = 'dataset_blood_group/A+/cluster_0_1001.BMP', url: str = 'http://127.0.0.1:5000/predict'):
    p = Path(image_path)
    if not p.exists():
        print(f'Image not found: {p}')
        return 2

    with open(p, 'rb') as f:
        files = {'image': (p.name, f, 'application/octet-stream')}
        try:
            r = requests.post(url, files=files, timeout=30)
        except requests.exceptions.RequestException as e:
            print('Request failed:', e)
            return 3

    print('HTTP status:', r.status_code)
    try:
        print('JSON response:', r.json())
    except Exception:
        print('Response text:', r.text)
    return 0


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Test /predict endpoint by uploading an image')
    parser.add_argument('image', nargs='?', default='C:/Users/Mi/Desktop/project/BloodDetection/fingerprint-main/dataset/dataset_blood_group/A+/cluster_0_1001.BMP', help='Path to image to upload')
    parser.add_argument('--url', default='http://127.0.0.1:5000/predict', help='Predict endpoint URL')
    args = parser.parse_args()
    sys.exit(main(args.image, args.url))
