"""
文本向量化工具
使用 DeepSeek embedding API
"""

import os
import httpx
from app.config import get_settings

settings = get_settings()

_proxy_vars = ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"]
for _var in _proxy_vars:
    os.environ.pop(_var, None)

_httpx_client: httpx.AsyncClient | None = None


def _get_httpx_client() -> httpx.AsyncClient:
    global _httpx_client
    if _httpx_client is None:
        _httpx_client = httpx.AsyncClient(timeout=60.0)
    return _httpx_client


_embedding_cache: dict[str, list[float]] = {}


async def get_embedding(text: str) -> list[float]:
    """
    获取文本的 embedding 向量

    Args:
        text: 输入文本

    Returns:
        浮点数向量
    """
    cache_key = text.strip().lower()
    if cache_key in _embedding_cache:
        return _embedding_cache[cache_key]

    api_key = settings.DEEPSEEK_API_KEY
    if not api_key:
        import random
        random.seed(hash(cache_key) % (2**31))
        fake_embedding = [random.uniform(-0.1, 0.1) for _ in range(settings.EMBEDDING_DIMENSION)]
        norm = sum(x**2 for x in fake_embedding) ** 0.5
        fake_embedding = [x / norm for x in fake_embedding]
        return fake_embedding

    try:
        client = _get_httpx_client()
        url = f"{settings.DEEPSEEK_BASE_URL}/embeddings"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.DEEPSEEK_EMBEDDING_MODEL,
            "input": text,
        }
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        embedding = data["data"][0]["embedding"]

        _embedding_cache[cache_key] = embedding
        return embedding

    except Exception as e:
        raise RuntimeError(f"Embedding API call failed: {e}")


async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
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

    if uncached:
        api_key = settings.DEEPSEEK_API_KEY
        if not api_key:
            import random
            for i, t in enumerate(texts):
                if result[i] is None:
                    random.seed(hash(t.strip().lower()) % (2**31))
                    emb = [random.uniform(-0.1, 0.1) for _ in range(settings.EMBEDDING_DIMENSION)]
                    norm = sum(x**2 for x in emb) ** 0.5
                    emb = [x / norm for x in emb]
                    result[i] = emb
                    _embedding_cache[t.strip().lower()] = emb
            return result

        client = _get_httpx_client()
        url = f"{settings.DEEPSEEK_BASE_URL}/embeddings"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.DEEPSEEK_EMBEDDING_MODEL,
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
