"""快速下载YOLOv8预训练模型"""
import requests
import os

url = 'https://github.com/ultralytics/assets/releases/download/v8.3.0/yolov8n.pt'
dest = 'yolov8n.pt'

print(f"Downloading YOLOv8 nano model...")
r = requests.get(url, stream=True)
total = int(r.headers.get('content-length', 0))
downloaded = 0

with open(dest, 'wb') as f:
    for chunk in r.iter_content(8192):
        f.write(chunk)
        downloaded += len(chunk)
        if total > 0:
            percent = downloaded / total * 100
            print(f"\rProgress: {percent:.1f}% ({downloaded / 1024 / 1024:.1f} MB)", end='')

print(f"\nDownloaded {os.path.getsize(dest)} bytes to {dest}")
