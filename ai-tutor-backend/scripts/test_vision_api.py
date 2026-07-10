"""Test vision API"""
import requests
import base64
import cv2
import numpy as np

# Create a blank test image
img = np.zeros((480, 640, 3), dtype=np.uint8)
_, buffer = cv2.imencode('.jpg', img)
image_b64 = base64.b64encode(buffer).decode('utf-8')

# Call the API
r = requests.post('http://127.0.0.1:8000/api/vision/detect', json={'image': image_b64})
print(f'Status: {r.status_code}')
data = r.json()
print(f'Status field: {data.get("status")}')
print(f'Model used: {data.get("model")}')
print(f'Reason: {data.get("reason")}')
