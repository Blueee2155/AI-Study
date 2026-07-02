"""
训练学习状态分类模型。

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
from ultralytics import YOLO


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "datasets" / "study-state"
OUTPUT_DIR = ROOT / "models" / "runs"
FINAL_MODEL = ROOT / "models" / "yolov8n-study-cls.pt"


def main():
    if not DATA_DIR.exists():
        raise FileNotFoundError(f"缺少学习状态数据集目录：{DATA_DIR}")

    model = YOLO("yolov8n-cls.pt")
    results = model.train(
        data=str(DATA_DIR),
        epochs=60,
        imgsz=224,
        batch=16,
        project=str(OUTPUT_DIR),
        name="study-state-cls",
        patience=15,
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
