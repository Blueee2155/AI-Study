"""
训练眼部状态分类模型，用于辅助判断分心/疲惫。

目录结构：
datasets/eye-state/
  train/
    attentive/   正常睁眼、视线稳定
    distracted/  眼神偏移、发呆、视线涣散
    closed/      闭眼、困倦
  val/
    attentive/
    distracted/
    closed/

可用数据来源：
- MRL Eye：适合补充睁眼/闭眼数据。
- GazeCapture / MPIIGaze：适合补充视线方向数据。
- 自己摄像头采集：最适合适配眼镜反光、桌面光照和摄像头角度。

训练完成后会生成：
models/yolov8n-eye-state-cls.pt
"""

from pathlib import Path
from ultralytics import YOLO


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "datasets" / "eye-state"
OUTPUT_DIR = ROOT / "models" / "runs"
FINAL_MODEL = ROOT / "models" / "yolov8n-eye-state-cls.pt"


def main():
    if not DATA_DIR.exists():
        raise FileNotFoundError(f"缺少眼部状态数据集目录：{DATA_DIR}")

    model = YOLO("yolov8n-cls.pt")
    results = model.train(
        data=str(DATA_DIR),
        epochs=80,
        imgsz=160,
        batch=16,
        project=str(OUTPUT_DIR),
        name="eye-state-cls",
        patience=20,
        device="cpu",
        degrees=6,
        translate=0.08,
        scale=0.25,
        fliplr=0.5,
        hsv_s=0.45,
        hsv_v=0.45,
        erasing=0.20,
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
