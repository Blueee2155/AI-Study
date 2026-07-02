"""
文本向量化工具
使用 OpenAI 的 text-embedding-3-small 模型
"""

from openai import AsyncOpenAI
from app.config import get_settings

settings = get_settings()

# 缓存嵌入向量，减少 API 调用
_embedding_cache: dict[str, list[float]] = {}


async def get_embedding(text: str) -> list[float]:
    """
    获取文本的 embedding 向量

    Args:
        text: 输入文本

    Returns:
        1536 维的浮点数向量
    """
    # 检查缓存
    cache_key = text.strip().lower()
    if cache_key in _embedding_cache:
        return _embedding_cache[cache_key]

    if not settings.OPENAI_API_KEY:
        # 无 API key 时返回模拟 embedding（仅用于开发）
        import random
        random.seed(hash(cache_key) % (2**31))
        fake_embedding = [random.uniform(-0.1, 0.1) for _ in range(settings.EMBEDDING_DIMENSION)]
        # 归一化
        norm = sum(x**2 for x in fake_embedding) ** 0.5
        fake_embedding = [x / norm for x in fake_embedding]
        return fake_embedding

    try:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=text,
        )
        embedding = response.data[0].embedding

        # 写入缓存
        _embedding_cache[cache_key] = embedding
        return embedding

    except Exception as e:
        raise RuntimeError(f"Embedding API call failed: {e}")


async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    批量获取 embedding 向量
    """
    # 检查缓存
    uncached = []
    result = []
    for t in texts:
        key = t.strip().lower()
        if key in _embedding_cache:
            result.append(_embedding_cache[key])
        else:
            uncached.append(t)
            result.append(None)  # 占位

    if uncached:
        if not settings.OPENAI_API_KEY:
            # 开发模式返回模拟向量
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

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=uncached,
        )
        emb_idx = 0
        for i, r in enumerate(result):
            if r is None:
                embedding = response.data[emb_idx].embedding
                result[i] = embedding
                _embedding_cache[texts[i].strip().lower()] = embedding
                emb_idx += 1

    return result
