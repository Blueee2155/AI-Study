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


@lru_cache(maxsize=1)
def _load_eye_model() -> Any:
    model_path = os.getenv(
        "YOLO_EYE_MODEL",
        os.path.join(os.path.dirname(__file__), "..", "..", "models", "yolov8n-eye.pt"),
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
def _load_eye_state_classifier() -> Any:
    model_path = os.getenv(
        "YOLO_EYE_STATE_MODEL",
        os.path.join(os.path.dirname(__file__), "..", "..", "models", "yolov8n-eye-state-cls.pt"),
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
        face["eyes"] = _detect_eyes(frame, face["bbox"])
        faces.append(face)
    if not faces:
        inferred = _infer_close_face_from_eyes(frame)
        if inferred:
            faces.append(inferred)
    return faces


def _detect_eyes(frame, bbox):
    yolo_eyes = _detect_eyes_with_yolo(frame, bbox)
    eyes = yolo_eyes if yolo_eyes else _detect_eyes_with_opencv(frame, bbox)
    return _classify_eye_states(frame, eyes)


def _classify_eye_states(frame, eyes):
    model = _load_eye_state_classifier()
    if model is None or not eyes:
        return eyes
    height, width = frame.shape[:2]
    label_map = {
        "attentive": "稳定",
        "distracted": "涣散",
        "closed": "闭眼",
    }
    for eye in eyes:
        x, y, w, h = [int(v) for v in eye["bbox"]]
        pad_x = int(w * 0.35)
        pad_y = int(h * 0.45)
        x1, y1 = max(0, x - pad_x), max(0, y - pad_y)
        x2, y2 = min(width, x + w + pad_x), min(height, y + h + pad_y)
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            continue
        try:
            result = model.predict(crop, imgsz=160, verbose=False)[0]
            idx = int(result.probs.top1)
            conf = float(result.probs.top1conf)
            raw = str(result.names[idx])
            eye["state"] = label_map.get(raw, raw)
            eye["state_score"] = conf
        except Exception:
            continue
    return eyes


def _detect_eyes_with_yolo(frame, bbox):
    model = _load_eye_model()
    if model is None:
        return []
    try:
        import cv2
    except Exception:
        return []

    x, y, w, h = [int(v) for v in bbox]
    height, width = frame.shape[:2]
    x1, y1 = max(0, x), max(0, y)
    x2, y2 = min(width, x + w), min(height, y + h)
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return []
    try:
        results = model.predict(crop, imgsz=192, conf=0.35, verbose=False)
    except Exception:
        return []

    eyes = []
    for result in results:
        for box in result.boxes:
            conf = float(box.conf[0])
            ex1, ey1, ex2, ey2 = [float(v) for v in box.xyxy[0].tolist()]
            eyes.append({
                "bbox": [float(x1 + ex1), float(y1 + ey1), float(ex2 - ex1), float(ey2 - ey1)],
                "score": conf,
                "source": "yolov8-eye",
            })
    eyes.sort(key=lambda e: e["score"] * e["bbox"][2] * e["bbox"][3], reverse=True)
    return eyes[:2]


def _detect_eyes_with_opencv(frame, bbox):
    try:
        import cv2
    except Exception:
        return []
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    x, y, w, h = [int(v) for v in bbox]
    upper_h = max(1, int(h * 0.62))
    roi = gray[y : y + upper_h, x : x + w]
    if roi.size == 0:
        return []
    eye_tree = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye_tree_eyeglasses.xml")
    eye_plain = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
    eyes = list(eye_tree.detectMultiScale(roi, scaleFactor=1.05, minNeighbors=3, minSize=(8, 7)))
    eyes += list(eye_plain.detectMultiScale(roi, scaleFactor=1.05, minNeighbors=4, minSize=(8, 7)))
    result = []
    for ex, ey, ew, eh in eyes:
        result.append({"bbox": [float(x + ex), float(y + ey), float(ew), float(eh)], "score": 0.55, "source": "opencv-eye"})
    return _dedupe_eyes(result)


def _dedupe_eyes(eyes):
    eyes.sort(key=lambda e: e["score"] * e["bbox"][2] * e["bbox"][3], reverse=True)
    kept = []
    for eye in eyes:
        x, y, w, h = eye["bbox"]
        cx, cy = x + w / 2, y + h / 2
        duplicate = False
        for other in kept:
            ox, oy, ow, oh = other["bbox"]
            ocx, ocy = ox + ow / 2, oy + oh / 2
            if abs(cx - ocx) < max(w, ow) * 0.75 and abs(cy - ocy) < max(h, oh) * 0.75:
                duplicate = True
                break
        if not duplicate:
            kept.append(eye)
        if len(kept) >= 2:
            break
    return kept


def _infer_close_face_from_eyes(frame):
    height, width = frame.shape[:2]
    eyes = _detect_eyes(frame, [0, 0, width, height])
    if not eyes:
        return None
    eyes = _dedupe_eyes(eyes)
    centers = []
    for eye in eyes:
        x, y, w, h = eye["bbox"]
        centers.append((x + w / 2, y + h / 2))
    if len(centers) >= 2:
        centers = sorted(centers, key=lambda p: p[0])[:2]
        eye_cx = (centers[0][0] + centers[1][0]) / 2
        eye_cy = (centers[0][1] + centers[1][1]) / 2
        eye_dist = max(32.0, abs(centers[1][0] - centers[0][0]))
        face_w = min(width * 0.95, eye_dist * 3.2)
        face_h = min(height * 0.98, eye_dist * 4.3)
    else:
        eye_cx, eye_cy = centers[0]
        face_w = width * 0.72
        face_h = height * 0.92
    x1 = max(0.0, min(width - face_w, eye_cx - face_w / 2))
    # 眼睛在脸部上半区，向下多留空间，适配靠近摄像头的大脸。
    y1 = max(0.0, min(height - face_h, eye_cy - face_h * 0.34))
    face = {
        "bbox": [float(x1), float(y1), float(face_w), float(face_h)],
        "score": 0.50,
        "source": "eye-inferred-close-face",
        "eyes": eyes,
    }
    return face


def _centered_face_bbox(face, width: int, height: int) -> dict[str, Any]:
    """把最终框校正为以人脸中心为中心的单框，避免框偏到背景或出现多个框。"""
    x, y, w, h = face["bbox"]
    cx = x + w / 2
    cy = y + h / 2
    # 人脸框略微扩展，但不扩展到右侧背景/屏幕区域。
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
    """只选择最大主脸。眼睛检测只参与排序，不再单独绘制。"""
    valid_faces = [face for face in faces if _valid_face(face, width, height)]
    if not valid_faces:
        return None

    def rank(face):
        x, y, w, h = face["bbox"]
        area = w * h
        eye_bonus = 1.18 if len(face.get("eyes", [])) >= 1 else 1.0
        score_bonus = max(0.35, float(face.get("score", 0)))
        center_x = x + w / 2
        center_penalty = 1 - min(abs(center_x - width / 2) / max(width / 2, 1), 0.45)
        return area * eye_bonus * score_bonus * center_penalty

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
    eye_count = len(face.get("eyes", []))
    unstable_eye = any(e.get("state") in {"涣散", "闭眼"} and e.get("state_score", 0) >= 0.55 for e in face.get("eyes", []))

    focus_score = round(
        min(100, max(0, score * 48 + (1 - center_dx) * 24 + (1 - min(center_dy, 1)) * 12 + min(area_ratio / 0.15, 1) * 16))
    )

    if area_ratio < 0.018:
        return {"status": "离开", "focus_score": 12, "reason": "人脸太小或离屏幕太远"}
    if center_dx > 0.62 or center_dy > 0.72:
        return {"status": "开小差", "focus_score": min(focus_score, 35), "reason": "人脸偏离画面中心"}
    if score < 0.45:
        return {"status": "分心", "focus_score": min(focus_score, 55), "reason": "检测置信度偏低"}
    if eye_count == 0 and area_ratio > 0.055 and center_dx < 0.42:
        return {"status": "分心", "focus_score": min(focus_score, 58), "reason": "检测到人脸但眼部特征不稳定"}
    if unstable_eye:
        return {"status": "分心", "focus_score": min(focus_score, 52), "reason": "眼部状态显示闭眼或视线涣散"}
    if center_dx < 0.50 and center_dy < 0.62 and area_ratio >= 0.022:
        return {"status": "专注", "focus_score": max(focus_score, 75), "reason": "检测到稳定人脸，可视为正在学习"}
    return {"status": "分心", "focus_score": min(focus_score, 65), "reason": "人脸位置或眼部状态不稳定"}


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
            "faces": [],
            "model": "unavailable",
            "reason": "后端缺少图像识别依赖",
        }

    height, width = frame.shape[:2]
    faces = _detect_with_yolo(frame)
    model_name = "yolov8"
    for face in faces:
        face["eyes"] = _detect_eyes(frame, face["bbox"])
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
