"""
把 WIDER FACE 标注转换为 YOLOv8 人脸检测训练格式。

输入目录示例：
datasets/raw/widerface/
  WIDER_train/images/...
  WIDER_val/images/...
  wider_face_split/wider_face_train_bbx_gt.txt
  wider_face_split/wider_face_val_bbx_gt.txt

输出目录：
datasets/face-study/
  images/train
  images/val
  labels/train
  labels/val
"""

from __future__ import annotations

import shutil
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "datasets" / "raw" / "widerface"
OUT = ROOT / "datasets" / "face-study"


def _convert_split(split: str, image_root: Path, annotation_file: Path):
    image_out = OUT / "images" / split
    label_out = OUT / "labels" / split
    image_out.mkdir(parents=True, exist_ok=True)
    label_out.mkdir(parents=True, exist_ok=True)

    lines = annotation_file.read_text(encoding="utf-8").splitlines()
    i = 0
    converted = 0
    while i < len(lines):
        rel_path = lines[i].strip()
        i += 1
        if not rel_path:
            continue
        box_count = int(lines[i].strip())
        i += 1
        boxes = []
        for _ in range(box_count):
            parts = lines[i].strip().split()
            i += 1
            if len(parts) < 4:
                continue
            x, y, w, h = map(float, parts[:4])
            if w < 8 or h < 8:
                continue
            boxes.append((x, y, w, h))

        src = image_root / rel_path
        if not src.exists() or not boxes:
            continue
        try:
            with Image.open(src) as img:
                img_w, img_h = img.size
        except Exception:
            continue

        dst_name = rel_path.replace("/", "_").replace("\\", "_")
        dst_img = image_out / dst_name
        shutil.copy2(src, dst_img)

        yolo_lines = []
        for x, y, w, h in boxes:
            cx = (x + w / 2) / img_w
            cy = (y + h / 2) / img_h
            nw = w / img_w
            nh = h / img_h
            if 0 < cx < 1 and 0 < cy < 1 and nw > 0 and nh > 0:
                yolo_lines.append(f"0 {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")

        if yolo_lines:
            (label_out / f"{Path(dst_name).stem}.txt").write_text("\n".join(yolo_lines), encoding="utf-8")
            converted += 1

    print(f"{split}: 已转换 {converted} 张图片")


def main():
    train_ann = RAW / "wider_face_split" / "wider_face_train_bbx_gt.txt"
    val_ann = RAW / "wider_face_split" / "wider_face_val_bbx_gt.txt"
    train_images = RAW / "WIDER_train" / "images"
    val_images = RAW / "WIDER_val" / "images"

    missing = [p for p in [train_ann, val_ann, train_images, val_images] if not p.exists()]
    if missing:
        raise FileNotFoundError("缺少 WIDER FACE 文件：\n" + "\n".join(str(p) for p in missing))

    _convert_split("train", train_images, train_ann)
    _convert_split("val", val_images, val_ann)
    print(f"完成，输出目录：{OUT}")


if __name__ == "__main__":
    main()
