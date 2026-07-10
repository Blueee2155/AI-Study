import base64
import os
from functools import lru_cache
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


class FrameRequest(BaseModel):
    image: str


def _strip_data_url(image: str) -> bytes:
    if "," in image:
        image = image.split(",", 1)[1]
    return base64.b64decode(image)


@lru_cache(maxsize=1)
def _load_yolo_model() -> Any:
    """优先加载用户训练/放置的 YOLOv8 人脸模型。"""
    model_path = os.getenv(
        "YOLO_FACE_MODEL",
        os.path.join(os.path.dirname(__file__), "..", "..", "models", "yolov8n-face.pt"),
    )
    model_path = os.path.abspath(model_path)
    if not os.path.exists(model_path):
        return None

    try:
        from ultralytics import YOLO
    except Exception:
        return None
    try:
        return YOLO(model_path)
    except Exception as e:
        # 模型加载失败(可能文件损坏或权限问题),返回None使用OpenCV fallback
        print(f"Warning: Failed to load YOLO model {model_path}: {e}")
        return None


@lru_cache(maxsize=1)
def _load_study_classifier() -> Any:
    model_path = os.getenv(
        "YOLO_STUDY_STATE_MODEL",
        os.path.join(os.path.dirname(__file__), "..", "..", "models", "yolov8n-study-cls.pt"),
    )
    model_path = os.path.abspath(model_path)
    if not os.path.exists(model_path):
        return None
    try:
        from ultralytics import YOLO
    except Exception:
        return None
    return YOLO(model_path)


def _decode_image(image: str):
    try:
        import cv2
        import numpy as np
    except Exception:
        return None

    raw = _strip_data_url(image)
    arr = np.frombuffer(raw, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return frame


def _detect_with_yolo(frame):
    model = _load_yolo_model()
    if model is None:
        return []
    results = model.predict(frame, imgsz=320, conf=0.35, verbose=False)
    faces = []
    for result in results:
        for box in result.boxes:
            conf = float(box.conf[0])
            x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
            faces.append({"bbox": [x1, y1, x2 - x1, y2 - y1], "score": conf, "source": "yolov8"})
    return faces


def _detect_with_opencv(frame):
    try:
        import cv2
    except Exception:
        return []

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    frontal = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    profile = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")
    boxes = list(frontal.detectMultiScale(gray, scaleFactor=1.06, minNeighbors=4, minSize=(34, 34)))
    boxes += list(profile.detectMultiScale(gray, scaleFactor=1.06, minNeighbors=4, minSize=(34, 34)))
    faces = []
    height, width = gray.shape[:2]
    for x, y, w, h in boxes:
        pad_x = int(w * 0.10)
        pad_y = int(h * 0.16)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(width, x + w + pad_x)
        y2 = min(height, y + h + pad_y)
        face = {"bbox": [float(x1), float(y1), float(x2 - x1), float(y2 - y1)], "score": 0.68, "source": "opencv"}
        faces.append(face)
    return faces


def _centered_face_bbox(face, width: int, height: int) -> dict[str, Any]:
    """把最终框校正为以人脸中心为中心的单框，避免框偏到背景或出现多个框。"""
    x, y, w, h = face["bbox"]
    cx = x + w / 2
    cy = y + h / 2
    new_w = min(width, max(w, h * 0.78) * 1.04)
    new_h = min(height, max(h, w * 1.12) * 1.04)
    x1 = max(0.0, min(width - new_w, cx - new_w / 2))
    y1 = max(0.0, min(height - new_h, cy - new_h / 2))
    fixed = dict(face)
    fixed["bbox"] = [float(x1), float(y1), float(new_w), float(new_h)]
    return fixed


def _valid_face(face, width: int, height: int) -> bool:
    x, y, w, h = face["bbox"]
    if w <= 0 or h <= 0:
        return False
    area_ratio = (w * h) / max(width * height, 1)
    aspect_ratio = w / h
    if area_ratio < 0.018 or area_ratio > 0.92:
        return False
    if aspect_ratio < 0.45 or aspect_ratio > 1.45:
        return False
    return True


def _choose_main_face(faces, width: int, height: int):
    """只选择最大主脸。"""
    valid_faces = [face for face in faces if _valid_face(face, width, height)]
    if not valid_faces:
        return None

    def rank(face):
        x, y, w, h = face["bbox"]
        area = w * h
        score_bonus = max(0.35, float(face.get("score", 0)))
        center_x = x + w / 2
        center_penalty = 1 - min(abs(center_x - width / 2) / max(width / 2, 1), 0.45)
        return area * score_bonus * center_penalty

    return _centered_face_bbox(max(valid_faces, key=rank), width, height)


def _analyze_status(face, width: int, height: int) -> dict[str, Any]:
    if not face:
        return {"status": "离开", "focus_score": 8, "reason": "未检测到人脸"}

    x, y, w, h = face["bbox"]
    face_cx = x + w / 2
    face_cy = y + h / 2
    center_dx = abs(face_cx - width / 2) / max(width / 2, 1)
    center_dy = abs(face_cy - height / 2) / max(height / 2, 1)
    area_ratio = (w * h) / max(width * height, 1)
    score = float(face.get("score", 0))

    focus_score = round(
        min(100, max(0, score * 48 + (1 - center_dx) * 24 + (1 - min(center_dy, 1)) * 12 + min(area_ratio / 0.15, 1) * 16))
    )

    # 放宽“离开”判定：只有当人脸非常小时才认为是离开（避免正常坐姿被误判）
    if area_ratio < 0.008:
        return {"status": "离开", "focus_score": 12, "reason": "人脸太小或离屏幕太远"}
    
    # 放宽偏离中心判定：允许更大的偏移范围
    if center_dx > 0.70 or center_dy > 0.80:
        return {"status": "开小差", "focus_score": min(focus_score, 35), "reason": "人脸偏离画面中心"}
    
    # 降低置信度阈值，避免轻微抖动就判定为分心
    if score < 0.35:
        return {"status": "分心", "focus_score": min(focus_score, 55), "reason": "检测置信度偏低"}
    
    # 只要人脸在合理范围内且置信度足够，就认为是专注
    if center_dx < 0.60 and center_dy < 0.70 and area_ratio >= 0.01:
        return {"status": "专注", "focus_score": max(focus_score, 75), "reason": "检测到稳定人脸，可视为正在学习"}
    
    return {"status": "分心", "focus_score": min(focus_score, 65), "reason": "人脸位置不稳定"}


def _classify_study_state(frame):
    model = _load_study_classifier()
    if model is None:
        return None
    try:
        results = model.predict(frame, imgsz=224, verbose=False)
        result = results[0]
        names = result.names
        probs = result.probs
        idx = int(probs.top1)
        conf = float(probs.top1conf)
        raw_label = str(names[idx])
        label_map = {
            "focused": "专注",
            "distracted": "分心",
            "off_task": "开小差",
            "away": "离开",
        }
        return {"status": label_map.get(raw_label, raw_label), "score": conf, "raw_label": raw_label}
    except Exception:
        return None


def _merge_rule_and_classifier(rule_result, cls_result, has_face: bool):
    if not cls_result or cls_result["score"] < 0.55:
        return rule_result
    cls_status = cls_result["status"]
    if not has_face:
        return {"status": "离开", "focus_score": 8, "reason": "未检测到人脸"}
    if cls_status == "离开" and has_face:
        return rule_result
    if cls_status == "专注" and rule_result["status"] in {"专注", "分心"}:
        return {"status": "专注", "focus_score": max(rule_result["focus_score"], 78), "reason": "学习状态分类模型判断为专注"}
    if cls_status == "开小差":
        return {"status": "开小差", "focus_score": min(rule_result["focus_score"], 35), "reason": "学习状态分类模型判断为开小差"}
    if cls_status == "分心":
        return {"status": "分心", "focus_score": min(rule_result["focus_score"], 58), "reason": "学习状态分类模型判断为分心"}
    return rule_result


@router.post("/detect")
async def detect_frame(payload: FrameRequest):
    frame = _decode_image(payload.image)
    if frame is None:
        return {
            "status": "离开",
            "focus_score": 0,
            "confidence": 0,
            "faces": [],
            "model": "unavailable",
            "reason": "后端缺少图像识别依赖",
        }

    height, width = frame.shape[:2]
    faces = _detect_with_yolo(frame)
    model_name = "yolov8"
    if not faces:
        faces = _detect_with_opencv(frame)
        model_name = "opencv-fallback"

    best_face = _choose_main_face(faces, width, height)
    rule_analysis = _analyze_status(best_face, width, height)
    cls_analysis = _classify_study_state(frame)
    analysis = _merge_rule_and_classifier(rule_analysis, cls_analysis, best_face is not None)

    return {
        **analysis,
        "confidence": analysis.get("focus_score", 0),
        "faces": [best_face] if best_face else [],
        "study_classifier": cls_analysis,
        "model": model_name,
        "frame": {"width": width, "height": height},
    }
