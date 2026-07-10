"""
生成合成人脸数据集并转换为YOLO格式。

由于LFW数据集无法下载，本脚本使用OpenCV生成多样化的合成人脸图片，
用于训练YOLOv8人脸检测模型。

输出目录结构:
datasets/face-study/
  images/train/*.jpg
  images/val/*.jpg
  labels/train/*.txt
  labels/val/*.txt
"""

import os
import cv2
import numpy as np
import random
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "datasets" / "face-study"
IMG_SIZE = 640
NUM_TRAIN = 2000
NUM_VAL = 500


def random_color(low=50, high=250):
    return tuple(random.randint(low, high) for _ in range(3))


def draw_face(img, cx, cy, w, h):
    """在img上绘制一个合成人脸，返回实际人脸bbox (x1, y1, x2, y2)"""
    # 人脸肤色 - 多样化
    skin_tones = [
        (200, 180, 160), (180, 150, 130), (220, 195, 170),
        (160, 130, 110), (240, 210, 180), (140, 110, 90),
        (250, 225, 200), (170, 140, 120), (190, 160, 140),
        (130, 100, 80), (210, 185, 165), (155, 125, 105),
    ]
    skin = random.choice(skin_tones)
    # 添加噪声变化
    skin = tuple(max(0, min(255, c + random.randint(-20, 20))) for c in skin)

    # 人脸椭圆 (稍作随机变形)
    face_w = int(w * random.uniform(0.85, 1.0))
    face_h = int(h * random.uniform(0.9, 1.1))
    cv2.ellipse(img, (cx, cy), (face_w // 2, face_h // 2), 0, 0, 360, skin, -1)

    # 脸部阴影 (两侧)
    shadow_color = tuple(max(0, c - 30) for c in skin)
    cv2.ellipse(img, (cx, cy), (face_w // 2, face_h // 2), 0, 0, 360, shadow_color, 2)

    # 头发区域
    hair_colors = [(30, 20, 10), (50, 35, 20), (80, 60, 40), (20, 15, 10),
                   (100, 70, 40), (60, 40, 25), (40, 30, 15)]
    hair_color = random.choice(hair_colors)
    hair_h = int(h * random.uniform(0.15, 0.3))
    hair_y = cy - face_h // 2
    # 头发形状 - 椭圆覆盖顶部
    cv2.ellipse(img, (cx, hair_y + hair_h // 2), (face_w // 2 + 5, hair_h), 0, 180, 360, hair_color, -1)

    # 眼睛
    eye_y = cy - int(h * 0.08) + random.randint(-3, 3)
    eye_sep = int(w * random.uniform(0.22, 0.32))
    eye_size = int(w * random.uniform(0.06, 0.1))

    for ex in [cx - eye_sep, cx + eye_sep]:
        # 眼白
        cv2.ellipse(img, (ex, eye_y), (eye_size, int(eye_size * 0.6)), 0, 0, 360, (240, 240, 240), -1)
        # 虹膜
        iris_color = random.choice([(60, 40, 20), (80, 50, 30), (40, 30, 15), (100, 70, 40)])
        iris_size = int(eye_size * 0.6)
        cv2.circle(img, (ex, eye_y), iris_size, iris_color, -1)
        # 瞳孔
        pupil_size = int(iris_size * 0.5)
        cv2.circle(img, (ex, eye_y), pupil_size, (10, 10, 10), -1)
        # 眉毛
        brow_y = eye_y - int(h * random.uniform(0.08, 0.12))
        brow_thickness = random.randint(2, 4)
        brow_w = int(eye_size * random.uniform(1.2, 1.8))
        cv2.line(img, (ex - brow_w, brow_y + random.randint(-2, 2)),
                 (ex + brow_w, brow_y + random.randint(-2, 2)), hair_color, brow_thickness)

    # 鼻子
    nose_y = cy + int(h * 0.05)
    nose_color = tuple(max(0, c - 15) for c in skin)
    nose_w = int(w * random.uniform(0.04, 0.08))
    nose_h = int(h * random.uniform(0.1, 0.15))
    cv2.line(img, (cx, cy - int(h * 0.02)), (cx - nose_w, nose_y), nose_color, 2)
    cv2.line(img, (cx - nose_w, nose_y), (cx + nose_w, nose_y), nose_color, 2)
    cv2.line(img, (cx + nose_w, nose_y), (cx, cy - int(h * 0.02)), nose_color, 1)

    # 嘴巴
    mouth_y = cy + int(h * random.uniform(0.2, 0.3))
    mouth_w = int(w * random.uniform(0.15, 0.25))
    lip_color = random.choice([(180, 100, 100), (160, 80, 80), (200, 120, 120), (150, 90, 90)])
    # 上唇
    pts = np.array([[cx - mouth_w, mouth_y], [cx, mouth_y - int(h * 0.03)],
                     [cx + mouth_w, mouth_y]], np.int32)
    cv2.fillPoly(img, [pts], lip_color)
    # 下唇
    pts2 = np.array([[cx - mouth_w, mouth_y], [cx, mouth_y + int(h * 0.04)],
                      [cx + mouth_w, mouth_y]], np.int32)
    cv2.fillPoly(img, [pts2], tuple(max(0, c - 20) for c in lip_color))

    # 耳朵 (简化)
    ear_y = cy + random.randint(-5, 5)
    ear_w = int(w * 0.06)
    ear_h = int(h * 0.1)
    for side in [-1, 1]:
        ear_x = cx + side * (face_w // 2)
        cv2.ellipse(img, (ear_x, ear_y), (ear_w, ear_h), 0, 0, 360, skin, -1)
        cv2.ellipse(img, (ear_x, ear_y), (ear_w, ear_h), 0, 0, 360, shadow_color, 1)

    # 计算实际bbox (包含整个脸部区域)
    x1 = cx - face_w // 2 - ear_w
    y1 = hair_y
    x2 = cx + face_w // 2 + ear_w
    y2 = cy + face_h // 2 + int(h * 0.05)

    # 确保在图片范围内
    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(IMG_SIZE - 1, x2)
    y2 = min(IMG_SIZE - 1, y2)

    return (x1, y1, x2, y2)


def random_background(img, face_x1, face_y1, face_x2, face_y2):
    """给背景添加随机元素"""
    bg_type = random.randint(0, 3)

    if bg_type == 0:
        # 纯色背景 (已经设置)
        pass
    elif bg_type == 1:
        # 渐变背景
        for y in range(IMG_SIZE):
            color_shift = int(30 * y / IMG_SIZE)
            img[y, :] = np.clip(img[y, :].astype(int) + color_shift, 0, 255).astype(np.uint8)
    elif bg_type == 2:
        # 随机纹理
        noise = np.random.randint(-15, 15, img.shape, dtype=np.int16)
        img[:] = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    elif bg_type == 3:
        # 随机几何图案
        for _ in range(random.randint(2, 8)):
            pt1 = (random.randint(0, IMG_SIZE), random.randint(0, IMG_SIZE))
            pt2 = (random.randint(0, IMG_SIZE), random.randint(0, IMG_SIZE))
            color = random_color(30, 200)
            cv2.line(img, pt1, pt2, color, random.randint(1, 3))

    return img


def generate_sample():
    """生成一张合成人脸图片"""
    # 随机背景色
    bg_color = random_color(40, 230)
    img = np.full((IMG_SIZE, IMG_SIZE, 3), bg_color, dtype=np.uint8)

    # 人脸位置和大小 - 多样化
    face_scale = random.uniform(0.25, 0.65)
    w = int(IMG_SIZE * face_scale)
    h = int(w * random.uniform(1.1, 1.4))  # 人脸通常比宽更高

    # 位置 - 允许部分偏移
    cx = int(IMG_SIZE * random.uniform(0.25, 0.75))
    cy = int(IMG_SIZE * random.uniform(0.3, 0.65))

    # 绘制人脸
    x1, y1, x2, y2 = draw_face(img, cx, cy, w, h)

    # 背景处理
    random_background(img, x1, y1, x2, y2)

    # 随机模糊 (模拟不同清晰度)
    if random.random() < 0.15:
        ksize = random.choice([3, 5])
        img = cv2.GaussianBlur(img, (ksize, ksize), 0)

    # 随机亮度/对比度调整
    alpha = random.uniform(0.8, 1.2)
    beta = random.randint(-20, 20)
    img = np.clip(alpha * img + beta, 0, 255).astype(np.uint8)

    # 转换为YOLO格式 bbox
    bbox_w = x2 - x1
    bbox_h = y2 - y1
    x_center = (x1 + x2) / 2.0 / IMG_SIZE
    y_center = (y1 + y2) / 2.0 / IMG_SIZE
    norm_w = bbox_w / IMG_SIZE
    norm_h = bbox_h / IMG_SIZE

    # 确保有效
    x_center = max(0.0, min(1.0, x_center))
    y_center = max(0.0, min(1.0, y_center))
    norm_w = max(0.01, min(1.0, norm_w))
    norm_h = max(0.01, min(1.0, norm_h))

    return img, f"0 {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}"


def main():
    # 创建输出目录
    for split in ["train", "val"]:
        (OUTPUT_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (OUTPUT_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    print(f"生成合成人脸数据集...")
    print(f"  训练集: {NUM_TRAIN} 张")
    print(f"  验证集: {NUM_VAL} 张")
    print(f"  图片尺寸: {IMG_SIZE}x{IMG_SIZE}")
    print(f"  输出目录: {OUTPUT_DIR}")

    total = NUM_TRAIN + NUM_VAL
    for i in range(total):
        if i < NUM_TRAIN:
            split = "train"
            idx = i
        else:
            split = "val"
            idx = i - NUM_TRAIN

        img, label = generate_sample()

        img_path = OUTPUT_DIR / "images" / split / f"{idx:05d}.jpg"
        lbl_path = OUTPUT_DIR / "labels" / split / f"{idx:05d}.txt"

        cv2.imwrite(str(img_path), img)
        with open(lbl_path, "w") as f:
            f.write(label)

        if (i + 1) % 200 == 0:
            print(f"  进度: {i + 1}/{total}")

    print(f"\n生成完成!")
    print(f"  训练图片: {OUTPUT_DIR / 'images' / 'train'}")
    print(f"  验证图片: {OUTPUT_DIR / 'images' / 'val'}")

    # 验证
    train_imgs = len(list((OUTPUT_DIR / "images" / "train").glob("*.jpg")))
    val_imgs = len(list((OUTPUT_DIR / "images" / "val").glob("*.jpg")))
    train_lbls = len(list((OUTPUT_DIR / "labels" / "train").glob("*.txt")))
    val_lbls = len(list((OUTPUT_DIR / "labels" / "val").glob("*.txt")))
    print(f"\n验证: 训练 {train_imgs} 图片/{train_lbls} 标签, 验证 {val_imgs} 图片/{val_lbls} 标签")


if __name__ == "__main__":
    main()
