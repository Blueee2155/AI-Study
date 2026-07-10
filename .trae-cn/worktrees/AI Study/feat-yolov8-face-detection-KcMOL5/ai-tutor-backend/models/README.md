# YOLOv8 人脸检测模型

默认后端会优先读取：

```text
ai-tutor-backend/models/yolov8n-face.pt
```

如果这个文件存在，接口 `/api/vision/detect` 会使用 YOLOv8 人脸检测；如果不存在，会自动降级为 OpenCV 人脸检测，页面仍可显示人脸框和学习状态。

## 训练自己的模型

1. 准备 YOLO 格式数据集：

```text
ai-tutor-backend/datasets/face-study/
  images/train/
  images/val/
  labels/train/
  labels/val/
```

2. 标签类别只需要 `face`：

```text
0 x_center y_center width height
```

3. 运行训练：

```bat
cd ai-tutor-backend
.venv\Scripts\python.exe scripts\train_yolov8_face.py
```

训练完成后脚本会把最佳权重复制到：

```text
ai-tutor-backend/models/yolov8n-face.pt
```

## 学习状态判断

当前学习状态不是单独分类模型，而是在“人脸检测”基础上综合判断：

- `专注`：人脸稳定、居中、大小合适、置信度高
- `分心`：检测到人脸，但位置或置信度不稳定
- `开小差`：人脸明显偏离画面中心
- `离开`：未检测到有效人脸，或人脸太小

如果后续你提供“专注/分心/开小差/离开”四类标注数据，可以继续扩展为 YOLO 分类或姿态模型。
