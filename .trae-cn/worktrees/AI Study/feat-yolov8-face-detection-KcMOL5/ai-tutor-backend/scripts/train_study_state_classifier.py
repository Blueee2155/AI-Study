"""
训练学习状态分类模型（500 epochs 版本）。

目录结构：
datasets/study-state/
  train/
    focused/      专注：看书、写字、看题、低头阅读
    distracted/   分心：眼神涣散、发呆、闭眼疲惫
    off_task/     开小差：玩手机、转头聊天、看其他地方
    away/         离开：座位无人或摄像头前无人脸
  val/
    focused/
    distracted/
    off_task/
    away/

训练完成后会复制到：
models/yolov8n-study-cls.pt
"""

from pathlib import Path
import argparse
from ultralytics import YOLO


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "datasets" / "study-state"
OUTPUT_DIR = ROOT / "models" / "runs"
FINAL_MODEL = ROOT / "models" / "yolov8n-study-cls.pt"


def main():
    parser = argparse.ArgumentParser(description="Train YOLOv8 study state classifier")
    parser.add_argument("--epochs", type=int, default=500, help="number of epochs (default: 500)")
    parser.add_argument("--imgsz", type=int, default=224, help="image size (default: 224)")
    parser.add_argument("--batch", type=int, default=16, help="batch size (default: 16)")
    parser.add_argument("--patience", type=int, default=80, help="early stopping patience (default: 80)")
    parser.add_argument("--device", type=str, default="cpu", help="device (cpu/0/0,1)")
    parser.add_argument("--model", type=str, default="yolov8n-cls.pt", help="base model")
    args = parser.parse_args()

    if not DATA_DIR.exists():
        raise FileNotFoundError(f"缺少学习状态数据集目录：{DATA_DIR}")

    model = YOLO(args.model)
    results = model.train(
        data=str(DATA_DIR),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(OUTPUT_DIR),
        name="study-state-cls",
        patience=args.patience,
        device=args.device,
        degrees=8,
        translate=0.12,
        scale=0.35,
        fliplr=0.5,
        hsv_h=0.02,
        hsv_s=0.5,
        hsv_v=0.45,
        erasing=0.25,
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
