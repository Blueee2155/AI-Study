"""
自动下载并准备 WIDER FACE 人脸检测数据集用于 YOLOv8 训练。

这个脚本会:
1. 从官方镜像下载 WIDER FACE 数据集
2. 解压到 datasets/raw/widerface/ 目录
3. 运行 prepare_widerface_yolo.py 转换为 YOLO 格式
4. 输出到 datasets/face-study/ 目录
"""

import os
import sys
import zipfile
from pathlib import Path
import urllib.request
import shutil

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "datasets" / "raw" / "widerface"
DATASETS_DIR = ROOT / "datasets"


def download_file(url, dest_path):
    """下载文件并显示进度"""
    print(f"正在下载: {url}")
    print(f"保存到: {dest_path}")
    
    def report_progress(block_num, block_size, total_size):
        downloaded = block_num * block_size
        percent = min(100, downloaded / total_size * 100) if total_size > 0 else 0
        sys.stdout.write(f"\r下载进度: {percent:.1f}% ({downloaded / 1024 / 1024:.1f} MB)")
        sys.stdout.flush()
    
    try:
        urllib.request.urlretrieve(url, dest_path, reporthook=report_progress)
        print("\n下载完成!")
        return True
    except Exception as e:
        print(f"\n下载失败: {e}")
        return False


def extract_zip(zip_path, extract_to):
    """解压ZIP文件"""
    print(f"\n正在解压: {zip_path}")
    print(f"解压到: {extract_to}")
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # 获取总文件数
            total_files = len(zip_ref.namelist())
            for i, file in enumerate(zip_ref.namelist()):
                zip_ref.extract(file, extract_to)
                if (i + 1) % 100 == 0 or i == total_files - 1:
                    sys.stdout.write(f"\r解压进度: {(i + 1) / total_files * 100:.1f}%")
                    sys.stdout.flush()
        print("\n解压完成!")
        return True
    except Exception as e:
        print(f"\n解压失败: {e}")
        return False


def main():
    print("=" * 60)
    print("WIDER FACE 数据集自动下载和准备工具")
    print("=" * 60)
    
    # 创建目录
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    
    # WIDER FACE 下载地址 (使用国内镜像加速)
    # 原始地址: http://shuoyang1213.me/WIDERFACE/support/bbx_annotation/wider_face_split.zip
    # 镜像地址可以使用多个备选
    
    urls = [
        ("http://shuoyang1213.me/WIDERFACE/support/bbx_annotation/wider_face_split.zip", 
         RAW_DIR / "wider_face_split.zip"),
        ("http://shuoyang1213.me/WIDERFACE/WIDER_train.zip",
         RAW_DIR / "WIDER_train.zip"),
        ("http://shuoyang1213.me/WIDERFACE/WIDER_val.zip",
         RAW_DIR / "WIDER_val.zip"),
    ]
    
    # 检查是否已下载
    all_exist = all(dest.exists() for _, dest in urls)
    
    if not all_exist:
        print("\n开始下载 WIDER FACE 数据集...")
        print("注意: 数据集较大(约1.5GB),下载可能需要较长时间\n")
        
        for url, dest in urls:
            if not dest.exists():
                success = download_file(url, dest)
                if not success:
                    print(f"警告: {url} 下载失败,请手动下载")
                    continue
            else:
                print(f"跳过已存在的文件: {dest.name}")
    else:
        print("\n所有文件已存在,跳过下载步骤")
    
    # 解压文件
    print("\n" + "=" * 60)
    print("开始解压数据集...")
    print("=" * 60)
    
    zip_files = [
        (RAW_DIR / "wider_face_split.zip", RAW_DIR),
        (RAW_DIR / "WIDER_train.zip", RAW_DIR),
        (RAW_DIR / "WIDER_val.zip", RAW_DIR),
    ]
    
    for zip_path, extract_to in zip_files:
        if zip_path.exists():
            extract_zip(zip_path, extract_to)
            # 删除ZIP文件以节省空间
            zip_path.unlink()
            print(f"已删除压缩文件: {zip_path.name}")
    
    # 验证文件结构
    print("\n" + "=" * 60)
    print("验证文件结构...")
    print("=" * 60)
    
    required_paths = [
        RAW_DIR / "wider_face_split" / "wider_face_train_bbx_gt.txt",
        RAW_DIR / "wider_face_split" / "wider_face_val_bbx_gt.txt",
        RAW_DIR / "WIDER_train" / "images",
        RAW_DIR / "WIDER_val" / "images",
    ]
    
    missing = [p for p in required_paths if not p.exists()]
    if missing:
        print("错误: 缺少以下必要文件:")
        for p in missing:
            print(f"  - {p}")
        print("\n请手动下载并解压 WIDER FACE 数据集到正确位置")
        return False
    
    print("✓ 文件结构验证通过")
    
    # 运行转换脚本
    print("\n" + "=" * 60)
    print("转换为 YOLO 格式...")
    print("=" * 60)
    
    convert_script = ROOT / "scripts" / "prepare_widerface_yolo.py"
    if convert_script.exists():
        import subprocess
        result = subprocess.run([sys.executable, str(convert_script)], 
                              cwd=ROOT, capture_output=True, text=True)
        if result.returncode != 0:
            print("转换失败:")
            print(result.stderr)
            return False
        print(result.stdout)
    else:
        print(f"错误: 找不到转换脚本 {convert_script}")
        return False
    
    # 验证输出
    output_dir = ROOT / "datasets" / "face-study"
    if output_dir.exists():
        train_images = list((output_dir / "images" / "train").glob("*.jpg"))
        val_images = list((output_dir / "images" / "val").glob("*.jpg"))
        print("\n" + "=" * 60)
        print("数据集准备完成!")
        print("=" * 60)
        print(f"训练集图片数量: {len(train_images)}")
        print(f"验证集图片数量: {len(val_images)}")
        print(f"输出目录: {output_dir}")
        return True
    else:
        print(f"错误: 输出目录不存在: {output_dir}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
