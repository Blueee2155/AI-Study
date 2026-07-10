"""
训练 YOLOv8 人脸检测模型。

使用前请先准备 YOLO 格式数据集：
datasets/face-study/
  images/train/*.jpg
  images/val/*.jpg
  labels/train/*.txt
  labels/val/*.txt

标签格式：
class x_center y_center width height

当前默认只训练 1 类：face。
"""

from pathlib import Path

from ultralytics import YOLO


ROOT = Path(__file__).resolve().parents[1]
DATA_YAML = ROOT / "datasets" / "face-study.yaml"
OUTPUT_DIR = ROOT / "models" / "runs"
FINAL_MODEL = ROOT / "models" / "yolov8n-face.pt"


def main():
    if not DATA_YAML.exists():
        raise FileNotFoundError(f"缺少数据集配置：{DATA_YAML}")

    model = YOLO("yolov8n.pt")
    results = model.train(
        data=str(DATA_YAML),
        epochs=50,
        imgsz=640,
        batch=4,
        project=str(OUTPUT_DIR),
        name="face-study",
        patience=20,
        device="cpu",
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
