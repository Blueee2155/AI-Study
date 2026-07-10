"""
训练 YOLOv8 眼睛检测模型（500 epochs 版本）。

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
import argparse

from ultralytics import YOLO


ROOT = Path(__file__).resolve().parents[1]
DATA_YAML = ROOT / "datasets" / "eye-study.yaml"
OUTPUT_DIR = ROOT / "models" / "runs"
FINAL_MODEL = ROOT / "models" / "yolov8n-eye.pt"


def main():
    parser = argparse.ArgumentParser(description="Train YOLOv8 eye detection model")
    parser.add_argument("--epochs", type=int, default=500, help="number of epochs (default: 500)")
    parser.add_argument("--imgsz", type=int, default=416, help="image size (default: 416)")
    parser.add_argument("--batch", type=int, default=8, help="batch size (default: 8)")
    parser.add_argument("--patience", type=int, default=80, help="early stopping patience (default: 80)")
    parser.add_argument("--device", type=str, default="cpu", help="device (cpu/0/0,1)")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="base model")
    args = parser.parse_args()

    if not DATA_YAML.exists():
        raise FileNotFoundError(f"缺少数据集配置：{DATA_YAML}")

    model = YOLO(args.model)
    results = model.train(
        data=str(DATA_YAML),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(OUTPUT_DIR),
        name="eye-study",
        patience=args.patience,
        device=args.device,
        degrees=8,
        translate=0.12,
        scale=0.4,
        shear=3,
        perspective=0.001,
        fliplr=0.5,
        hsv_h=0.02,
        hsv_s=0.6,
        hsv_v=0.5,
        mosaic=0.6,
        mixup=0.1,
        close_mosaic=15,
        erasing=0.3,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        weight_decay=0.0005,
        warmup_epochs=3,
        warmup_momentum=0.8,
        warmup_bias_lr=0.1,
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
