import base64
import math
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
    return YOLO(model_path)


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
    results = model.predict(frame, imgsz=416, conf=0.25, iou=0.45, verbose=False)
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
        import numpy as np
        import os
    except Exception:
        return []

    height, width = frame.shape[:2]
    
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray_clahe = clahe.apply(gray)
    
    cascade_dirs = [
        'D:\\anaconda\\Lib\\site-packages\\cv2\\data\\',
        os.path.join(os.path.dirname(cv2.__file__), 'data'),
    ]
    
    cascade_files = [
        "haarcascade_frontalface_default.xml",
        "haarcascade_frontalface_alt2.xml",
        "haarcascade_frontalface_alt.xml",
        "haarcascade_frontalface_alt_tree.xml",
    ]
    
    detectors = []
    found_dir = None
    for cascade_dir in cascade_dirs:
        if not os.path.isdir(cascade_dir):
            continue
        for cascade_file in cascade_files:
            full_path = os.path.join(cascade_dir, cascade_file)
            if os.path.exists(full_path):
                detector = cv2.CascadeClassifier(full_path)
                if not detector.empty():
                    detectors.append(detector)
        if detectors:
            found_dir = cascade_dir
            break
    
    if not detectors:
        return []
    
    all_boxes = []
    scale_factors = [1.03, 1.04, 1.05]
    min_sizes = [(20, 20), (25, 25), (30, 30)]
    
    for detector in detectors:
        for scale_factor in scale_factors:
            for min_size in min_sizes:
                try:
                    boxes = detector.detectMultiScale(
                        gray_clahe,
                        scaleFactor=scale_factor,
                        minNeighbors=3,
                        minSize=min_size,
                        flags=cv2.CASCADE_SCALE_IMAGE
                    )
                    for x, y, w, h in boxes:
                        all_boxes.append((x, y, w, h))
                except Exception:
                    pass
    
    if not all_boxes:
        for detector in detectors:
            try:
                boxes = detector.detectMultiScale(
                    gray,
                    scaleFactor=1.05,
                    minNeighbors=2,
                    minSize=(20, 20),
                    flags=cv2.CASCADE_SCALE_IMAGE
                )
                for x, y, w, h in boxes:
                    all_boxes.append((x, y, w, h))
            except Exception:
                pass
    
    if not all_boxes:
        return []
    
    merged_boxes = _merge_overlapping_boxes(all_boxes)
    
    faces = []
    for x, y, w, h in merged_boxes:
        pad_x = int(w * 0.15)
        pad_y = int(h * 0.20)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(width, x + w + pad_x)
        y2 = min(height, y + h + pad_y)
        
        face_w = x2 - x1
        face_h = y2 - y1
        
        if face_w <= 0 or face_h <= 0:
            continue
        
        area_ratio = (face_w * face_h) / max(width * height, 1)
        if area_ratio < 0.005 or area_ratio > 0.95:
            continue
        
        aspect_ratio = face_w / face_h
        if aspect_ratio < 0.3 or aspect_ratio > 2.0:
            continue
        
        face = {"bbox": [float(x1), float(y1), float(face_w), float(face_h)], "score": 0.80, "source": "opencv"}
        faces.append(face)
    
    if not faces:
        inferred = _infer_close_face_from_eyes(frame)
        if inferred:
            faces.append(inferred)
    
    return faces


def _merge_overlapping_boxes(boxes):
    if not boxes:
        return []
    
    boxes.sort(key=lambda b: b[2] * b[3], reverse=True)
    
    merged = []
    for box in boxes:
        x, y, w, h = box
        area = w * h
        if area < 25:
            continue
        
        overlap = False
        for i, (mx, my, mw, mh) in enumerate(merged):
            inter_x = max(x, mx)
            inter_y = max(y, my)
            inter_w = min(x + w, mx + mw) - inter_x
            inter_h = min(y + h, my + mh) - inter_y
            
            if inter_w > 0 and inter_h > 0:
                inter_area = inter_w * inter_h
                union_area = area + (mw * mh) - inter_area
                
                if inter_area / union_area > 0.3:
                    nx = min(x, mx)
                    ny = min(y, my)
                    nw = max(x + w, mx + mw) - nx
                    nh = max(y + h, my + mh) - ny
                    merged[i] = (nx, ny, nw, nh)
                    overlap = True
                    break
        
        if not overlap:
            merged.append(box)
    
    return merged


def _centered_face_bbox(face, width: int, height: int) -> dict[str, Any]:
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
    if area_ratio < 0.008 or area_ratio > 0.92:
        return False
    if aspect_ratio < 0.35 or aspect_ratio > 1.8:
        return False
    return True


def _choose_main_face(faces, width: int, height: int):
    valid_faces = [face for face in faces if _valid_face(face, width, height)]
    if not valid_faces:
        return None

    def rank(face):
        x, y, w, h = face["bbox"]
        area = w * h
        score_bonus = max(0.3, float(face.get("score", 0)))
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
        min(100, max(0, score * 42 + (1 - center_dx) * 22 + (1 - min(center_dy, 1)) * 12 + min(area_ratio / 0.15, 1) * 14))
    )

    if area_ratio < 0.015:
        return {"status": "离开", "focus_score": 10, "reason": "人脸太小或离屏幕太远"}
    if center_dx > 0.62 or center_dy > 0.72:
        return {"status": "开小差", "focus_score": min(focus_score, 32), "reason": "人脸偏离画面中心"}
    if score < 0.4:
        return {"status": "分心", "focus_score": min(focus_score, 55), "reason": "检测置信度偏低"}
    if center_dx < 0.50 and center_dy < 0.62 and area_ratio >= 0.02:
        return {"status": "专注", "focus_score": max(focus_score, 78), "reason": "检测到稳定人脸，视线集中"}
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
    if not cls_result or cls_result["score"] < 0.5:
        return rule_result
    cls_status = cls_result["status"]
    if not has_face:
        return {"status": "离开", "focus_score": 8, "reason": "未检测到人脸"}
    if cls_status == "离开" and has_face:
        return rule_result
    if cls_status == "专注" and rule_result["status"] in {"专注", "分心"}:
        return {"status": "专注", "focus_score": max(rule_result["focus_score"], 80), "reason": "学习状态分类模型判断为专注"}
    if cls_status == "开小差":
        return {"status": "开小差", "focus_score": min(rule_result["focus_score"], 32), "reason": "学习状态分类模型判断为开小差"}
    if cls_status == "分心":
        return {"status": "分心", "focus_score": min(rule_result["focus_score"], 55), "reason": "学习状态分类模型判断为分心"}
    return rule_result


@router.post("/detect")
async def detect_frame(payload: FrameRequest):
    frame = _decode_image(payload.image)
    if frame is None:
        return {
            "status": "离开",
            "focus_score": 0,
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
        "faces": [best_face] if best_face else [],
        "study_classifier": cls_analysis,
        "model": model_name,
        "frame": {"width": width, "height": height},
    }
