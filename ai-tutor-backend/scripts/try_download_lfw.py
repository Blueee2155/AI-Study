"""尝试通过多种方式获取LFW数据集"""
import os, sys, ssl, urllib.request, zipfile, tarfile, io

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "datasets", "lfw-face")

URLS = [
    # Kaggle mirror
    ("https://www.kaggle.com/api/v1/datasets/download/jessicali953/lfw-dataset", "zip"),
    # Academic torrents mirror
    ("https://raw.githubusercontent.com/davidsandberg/facenet/master/data/lfw/lfw-deepfunneled.tgz", "tgz"),
    # Another GitHub mirror
    ("https://github.com/davidsandberg/facenet/raw/master/data/lfw/lfw-deepfunneled.tgz", "tgz"),
]

def try_download(url, fmt):
    print(f"  尝试: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        resp = urllib.request.urlopen(req, timeout=60, context=ssl_ctx)
        data = resp.read()
        if len(data) < 100000:
            print(f"  文件太小 ({len(data)} bytes)")
            return False
        print(f"  下载成功: {len(data)/1024/1024:.1f} MB")
        
        os.makedirs(DEST, exist_ok=True)
        if fmt == "zip":
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                z.extractall(DEST)
        else:
            with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as t:
                t.extractall(DEST)
        print("  解压完成")
        return True
    except Exception as e:
        print(f"  失败: {e}")
        return False

for url, fmt in URLS:
    if try_download(url, fmt):
        # Check result
        for name in ["lfw-deepfunneled", "lfw", "lfw_funneled"]:
            p = os.path.join(DEST, name)
            if os.path.isdir(p):
                persons = [d for d in os.listdir(p) if os.path.isdir(os.path.join(p, d))]
                print(f"找到 {len(persons)} 个人")
                sys.exit(0)
        print("解压完成但未找到预期目录，内容:")
        print(os.listdir(DEST))
        sys.exit(0)

print("\n所有源均失败")
sys.exit(1)
