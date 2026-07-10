"""
文本向量化工具
使用 DeepSeek embedding API（兼容 OpenAI 格式），直接用 httpx 调用，
完全绕过 openai 库，避免代理环境变量导致的 proxies 错误。
"""

import json
import os
import traceback
from typing import Optional

# ============================================================
# 在导入 httpx 之前，强制清除所有代理环境变量
# 这是避免代理相关问题的最可靠、最兼容的方法
# ============================================================
_PROXY_KEYS = [
    "HTTP_PROXY", "HTTPS_PROXY",
    "http_proxy", "https_proxy",
    "ALL_PROXY", "all_proxy",
    "NO_PROXY", "no_proxy",
]
_removed_on_import = {}
for _k in _PROXY_KEYS:
    if _k in os.environ:
        _removed_on_import[_k] = os.environ.pop(_k)
if _removed_on_import:
    print(f"[embedding] 导入时清除代理环境变量: {list(_removed_on_import.keys())}")

import httpx

from app.config import get_settings
from app.core.runtime_config import get_api_key

settings = get_settings()

_embedding_cache = {}
_http_client = None


def _clear_proxy_env():
    """清除所有代理环境变量"""
    cleared = {}
    for k in _PROXY_KEYS:
        if k in os.environ:
            cleared[k] = os.environ.pop(k)
    return cleared


def _get_http_client():
    """获取全局 httpx 客户端（单例）。

    注意：不使用 trust_env 参数以确保最大兼容性。
    通过在创建前清除环境变量来避免代理问题。
    """
    global _http_client
    if _http_client is not None:
        return _http_client

    # 创建前再次清除代理环境变量（确保万无一失）
    _clear_proxy_env()

    try:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=30.0),
        )
        print(f"[embedding] httpx 客户端创建成功，版本: "
              f"{getattr(httpx, '__version__', 'unknown')}")
        return _http_client
    except TypeError as e:
        print(f"[embedding] 带 timeout 创建失败: {e}")
        try:
            _http_client = httpx.AsyncClient()
            print("[embedding] 使用默认参数创建 httpx 客户端")
            return _http_client
        except Exception as e2:
            print(f"[embedding] 简化版创建也失败: {e2}")
            traceback.print_exc()
            raise


def _get_embedding_api_config():
    """获取 embedding API 配置。

    优先使用 DeepSeek API（与对话共用 key）。
    """
    # 优先用 DeepSeek
    api_key = get_api_key("DEEPSEEK_API_KEY") or settings.DEEPSEEK_API_KEY
    base_url = settings.DEEPSEEK_BASE_URL.rstrip("/")
    model = getattr(settings, "DEEPSEEK_EMBEDDING_MODEL", "deepseek-embedding")

    return api_key, base_url, model


async def get_embedding(text: str):
    """
    获取文本的 embedding 向量

    Args:
        text: 输入文本

    Returns:
        浮点数向量（维度由模型决定，DeepSeek 为 1536 维）
    """
    cache_key = text.strip().lower()
    if cache_key in _embedding_cache:
        return _embedding_cache[cache_key]

    api_key, base_url, model = _get_embedding_api_config()

    if not api_key:
        # 无 API key 时返回模拟 embedding（仅用于开发）
        import random
        random.seed(hash(cache_key) % (2**31))
        dim = getattr(settings, "EMBEDDING_DIMENSION", 1536)
        fake_embedding = [random.uniform(-0.1, 0.1) for _ in range(dim)]
        norm = sum(x**2 for x in fake_embedding) ** 0.5
        fake_embedding = [x / norm for x in fake_embedding]
        return fake_embedding

    try:
        client = _get_http_client()
        url = f"{base_url}/embeddings"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "input": text,
        }

        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

        embedding = data["data"][0]["embedding"]
        _embedding_cache[cache_key] = embedding
        return embedding

    except Exception as e:
        print(f"[embedding] get_embedding 失败: {type(e).__name__}: {e}")
        raise RuntimeError(f"Embedding API call failed: {e}")


async def get_embeddings_batch(texts):
    """
    批量获取 embedding 向量
    """
    uncached = []
    result = []
    for t in texts:
        key = t.strip().lower()
        if key in _embedding_cache:
            result.append(_embedding_cache[key])
        else:
            uncached.append(t)
            result.append(None)

    if not uncached:
        return result

    api_key, base_url, model = _get_embedding_api_config()

    if not api_key:
        # 开发模式返回模拟向量
        import random
        for i, t in enumerate(texts):
            if result[i] is None:
                random.seed(hash(t.strip().lower()) % (2**31))
                dim = getattr(settings, "EMBEDDING_DIMENSION", 1536)
                emb = [random.uniform(-0.1, 0.1) for _ in range(dim)]
                norm = sum(x**2 for x in emb) ** 0.5
                emb = [x / norm for x in emb]
                result[i] = emb
                _embedding_cache[t.strip().lower()] = emb
        return result

    try:
        client = _get_http_client()
        url = f"{base_url}/embeddings"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "input": uncached,
        }

        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

        emb_idx = 0
        for i, r in enumerate(result):
            if r is None:
                embedding = data["data"][emb_idx]["embedding"]
                result[i] = embedding
                _embedding_cache[texts[i].strip().lower()] = embedding
                emb_idx += 1

        return result

    except Exception as e:
        print(f"[embedding] get_embeddings_batch 失败: {type(e).__name__}: {e}")
        raise RuntimeError(f"Batch embedding API call failed: {e}")
