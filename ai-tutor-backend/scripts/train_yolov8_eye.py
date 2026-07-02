"""
训练 YOLOv8 眼睛检测模型。

数据目录：
datasets/eye-study/
  images/train, images/val
  labels/train, labels/val

类别：
0 eye

训练完成后会生成：
models/yolov8n-eye.pt
"""

from pathlib import Path
from ultralytics import YOLO


ROOT = Path(__file__).resolve().parents[1]
DATA_YAML = ROOT / "datasets" / "eye-study.yaml"
OUTPUT_DIR = ROOT / "models" / "runs"
FINAL_MODEL = ROOT / "models" / "yolov8n-eye.pt"


def main():
    if not DATA_YAML.exists():
        raise FileNotFoundError(f"缺少数据集配置：{DATA_YAML}")

    model = YOLO("yolov8n.pt")
    results = model.train(
        data=str(DATA_YAML),
        epochs=120,
        imgsz=416,
        batch=8,
        project=str(OUTPUT_DIR),
        name="eye-study",
        patience=30,
        device="cpu",
        degrees=8,
        translate=0.12,
        scale=0.35,
        shear=2,
        perspective=0.0008,
        fliplr=0.5,
        hsv_h=0.015,
        hsv_s=0.55,
        hsv_v=0.45,
        mosaic=0.25,
        close_mosaic=10,
        erasing=0.25,
    )

    best = Path(results.save_dir) / "weights" / "best.pt"
    if best.exists():
        FINAL_MODEL.parent.mkdir(parents=True, exist_ok=True)
        FINAL_MODEL.write_bytes(best.read_bytes())
        print(f"训练完成，已复制最佳模型到：{FINAL_MODEL}")
    else:
        print(f"训练完成，但未找到 best.pt，请检查输出目录：{results.save_dir}")


if __name__ == "__main__":
    main()
