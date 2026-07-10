"""下载并解压 LFW-deepfunneled 数据集 - 尝试多个源"""
import os
import sys
import tarfile
import urllib.request
import ssl

# 忽略SSL验证问题
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

URLS = [
    "https://s3.amazonaws.com/lfwcrop/lfw-deepfunneled.tgz",
    "http://vis-www.cs.umass.edu/lfw/lfw-deepfunneled.tgz",
    "https://ndownloader.figshare.com/articles/3682865/versions/1",
]

DEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "datasets", "lfw-face", "raw")
TGZ_PATH = os.path.join(DEST_DIR, "lfw-deepfunneled.tgz")


def download(url, dest):
    print(f"  尝试: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        resp = urllib.request.urlopen(req, timeout=30, context=ssl_ctx)
        total = int(resp.headers.get("Content-Length", 0))
        downloaded = 0
        block_size = 8192
        with open(dest, "wb") as f:
            while True:
                chunk = resp.read(block_size)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                if total > 0:
                    pct = downloaded * 100 / total
                    print(f"\r  {pct:.1f}% ({downloaded/1024/1024:.1f}/{total/1024/1024:.1f} MB)", end="", flush=True)
        print()
        if downloaded < 1000:
            print(f"  文件太小 ({downloaded} bytes)，可能不是有效数据集")
            os.remove(dest)
            return False
        return True
    except Exception as e:
        print(f"  失败: {e}")
        if os.path.exists(dest):
            os.remove(dest)
        return False


def main():
    os.makedirs(DEST_DIR, exist_ok=True)

    if os.path.exists(TGZ_PATH) and os.path.getsize(TGZ_PATH) > 1000000:
        print(f"已存在: {TGZ_PATH} ({os.path.getsize(TGZ_PATH)/1024/1024:.1f} MB)")
    else:
        print("正在下载 LFW-deepfunneled 数据集...")
        ok = False
        for url in URLS:
            if download(url, TGZ_PATH):
                ok = True
                break
        if not ok:
            print("\n所有下载源均失败。")
            print("请手动下载 LFW-deepfunneled 数据集:")
            print("  1. 访问 http://vis-www.cs.umass.edu/lfw/ ")
            print("  2. 下载 lfw-deepfunneled.tgz")
            print(f"  3. 放到 {DEST_DIR}")
            sys.exit(1)

    # 解压
    extract_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "datasets", "lfw-face")
    lfw_dir = os.path.join(extract_dir, "lfw-deepfunneled")
    if os.path.isdir(lfw_dir):
        print(f"已解压: {lfw_dir}")
    else:
        print(f"正在解压到: {extract_dir}")
        with tarfile.open(TGZ_PATH, "r:*") as tar:
            tar.extractall(path=extract_dir)
        print("解压完成!")

    # 验证
    if os.path.isdir(lfw_dir):
        persons = [d for d in os.listdir(lfw_dir) if os.path.isdir(os.path.join(lfw_dir, d))]
        total = sum(len([f for f in os.listdir(os.path.join(lfw_dir, p)) if f.lower().endswith(('.jpg','.jpeg','.png'))]) for p in persons)
        print(f"数据集包含 {len(persons)} 个人, 共 {total} 张图片")
    else:
        print(f"警告: 未找到预期目录 {lfw_dir}")
        # 列出实际内容
        print(f"目录内容: {os.listdir(extract_dir)}")


if __name__ == "__main__":
    main()
