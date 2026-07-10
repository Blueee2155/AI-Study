# 数据集准备说明

## 人脸检测：WIDER FACE

推荐使用 WIDER FACE 训练 `yolov8n-face.pt`。准备目录：

```text
ai-tutor-backend/datasets/raw/widerface/
  WIDER_train/images/
  WIDER_val/images/
  wider_face_split/
    wider_face_train_bbx_gt.txt
    wider_face_val_bbx_gt.txt
```

转换为 YOLO 格式：

```bat
cd ai-tutor-backend
.venv\Scripts\python.exe scripts\prepare_widerface_yolo.py
```

训练人脸检测模型：

```bat
.venv\Scripts\python.exe scripts\train_yolov8_face.py
```

## 学习状态分类

学习状态建议使用你自己的摄像头场景补充数据，因为不同电脑高度、房间光照、眼镜反光、看书角度差异很大。

目录结构：

```text
ai-tutor-backend/datasets/study-state/
  train/
    focused/
    distracted/
    off_task/
    away/
  val/
    focused/
    distracted/
    off_task/
    away/
```

标注建议：

- `focused`：看书、写字、看题、低头阅读
- `distracted`：眼神涣散、发呆、闭眼疲惫
- `off_task`：玩手机、转头聊天、明显看向学习外目标
- `away`：座位无人、摄像头前无人脸

训练学习状态分类模型：

```bat
.venv\Scripts\python.exe scripts\train_study_state_classifier.py
```

训练完成后会生成：

```text
ai-tutor-backend/models/yolov8n-study-cls.pt
```

后端会自动加载该模型，并与人脸检测规则融合判断状态。

## 眼睛检测：WFLW 转 YOLO

为了让眼睛框更准，推荐用 WFLW 这类 98 点人脸关键点数据生成左右眼框。

准备目录：

```text
ai-tutor-backend/datasets/raw/wflw/
  WFLW_images/
  list_98pt_rect_attr_train_test/
    list_98pt_rect_attr_train.txt
    list_98pt_rect_attr_test.txt
```

转换为 YOLO 眼睛框数据：

```bat
cd ai-tutor-backend
.venv\Scripts\python.exe scripts\prepare_wflw_eye_yolo.py
```

训练眼睛检测模型：

```bat
.venv\Scripts\python.exe scripts\train_yolov8_eye.py
```

训练完成后会生成：

```text
ai-tutor-backend/models/yolov8n-eye.pt
```

后端会自动加载该模型，在主脸框内部检测并返回最多两个眼睛框。

## 眼部状态和视线

眼睛框只负责定位眼睛。若要进一步判断“瞳孔涣散 / 视线偏离 / 疲惫闭眼”，建议继续准备：

- 睁眼/闭眼数据：用于判断疲惫、闭眼、瞌睡。
- gaze 数据：用于判断视线是否偏离书本/屏幕。
- 自己摄像头采集数据：用于适配眼镜反光、摄像头高度、桌面光线。

当前项目会先使用眼睛框数量、位置稳定性、人脸位置稳定性做规则判断；如果训练出学习状态分类模型，会再融合分类模型结果。

眼部状态分类目录：

```text
ai-tutor-backend/datasets/eye-state/
  train/
    attentive/
    distracted/
    closed/
  val/
    attentive/
    distracted/
    closed/
```

训练眼部状态分类模型：

```bat
.venv\Scripts\python.exe scripts\train_eye_state_classifier.py
```

训练完成后会生成：

```text
ai-tutor-backend/models/yolov8n-eye-state-cls.pt
```

后端会自动加载该模型，对眼睛小框裁剪图进行分类，并把 `closed`、`distracted` 作为“分心”的依据之一。
