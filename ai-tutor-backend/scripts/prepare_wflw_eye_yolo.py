"""
把 WFLW 98 点关键点数据转换为 YOLOv8 眼睛检测数据集。

WFLW 常见标注格式每行包含：
  98 个关键点的 x y 坐标（共 196 个数字） + 其他属性 + 图片相对路径

默认使用 60-67、68-75 两组眼部关键点生成左右眼框。
如果你的 WFLW 标注版本索引不同，请修改 LEFT_EYE_IDX / RIGHT_EYE_IDX。

输入目录：
datasets/raw/wflw/
  WFLW_images/
  list_98pt_rect_attr_train_test/
    list_98pt_rect_attr_train.txt
    list_98pt_rect_attr_test.txt

输出目录：
datasets/eye-study/
  images/train, images/val
  labels/train, labels/val
"""

from __future__ import annotations

import shutil
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "datasets" / "raw" / "wflw"
OUT = ROOT / "datasets" / "eye-study"

LEFT_EYE_IDX = list(range(60, 68))
RIGHT_EYE_IDX = list(range(68, 76))


def _eye_box(points, idxs, img_w, img_h, pad=0.28):
    xs = [points[i][0] for i in idxs]
    ys = [points[i][1] for i in idxs]
    x1, x2 = min(xs), max(xs)
    y1, y2 = min(ys), max(ys)
    w, h = x2 - x1, y2 - y1
    if w <= 2 or h <= 2:
        return None
    x1 = max(0, x1 - w * pad)
    x2 = min(img_w, x2 + w * pad)
    y1 = max(0, y1 - h * pad)
    y2 = min(img_h, y2 + h * pad)
    cx = ((x1 + x2) / 2) / img_w
    cy = ((y1 + y2) / 2) / img_h
    bw = (x2 - x1) / img_w
    bh = (y2 - y1) / img_h
    if bw <= 0 or bh <= 0:
        return None
    return f"0 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}"


def _convert(annotation_file: Path, split: str):
    image_root = RAW / "WFLW_images"
    image_out = OUT / "images" / split
    label_out = OUT / "labels" / split
    image_out.mkdir(parents=True, exist_ok=True)
    label_out.mkdir(parents=True, exist_ok=True)

    converted = 0
    for line in annotation_file.read_text(encoding="utf-8").splitlines():
        parts = line.strip().split()
        if len(parts) < 197:
            continue
        coords = list(map(float, parts[:196]))
        rel_path = parts[-1]
        points = [(coords[i], coords[i + 1]) for i in range(0, 196, 2)]
        src = image_root / rel_path
        if not src.exists():
            continue
        try:
            with Image.open(src) as img:
                img_w, img_h = img.size
        except Exception:
            continue

        labels = []
        for idxs in (LEFT_EYE_IDX, RIGHT_EYE_IDX):
            label = _eye_box(points, idxs, img_w, img_h)
            if label:
                labels.append(label)
        if not labels:
            continue

        dst_name = rel_path.replace("/", "_").replace("\\", "_")
        shutil.copy2(src, image_out / dst_name)
        (label_out / f"{Path(dst_name).stem}.txt").write_text("\n".join(labels), encoding="utf-8")
        converted += 1

    print(f"{split}: 已转换 {converted} 张图片")


def main():
    train_ann = RAW / "list_98pt_rect_attr_train_test" / "list_98pt_rect_attr_train.txt"
    val_ann = RAW / "list_98pt_rect_attr_train_test" / "list_98pt_rect_attr_test.txt"
    missing = [p for p in [train_ann, val_ann, RAW / "WFLW_images"] if not p.exists()]
    if missing:
        raise FileNotFoundError("缺少 WFLW 文件：\n" + "\n".join(str(p) for p in missing))
    _convert(train_ann, "train")
    _convert(val_ann, "val")
    print(f"完成，输出目录：{OUT}")


if __name__ == "__main__":
    main()
