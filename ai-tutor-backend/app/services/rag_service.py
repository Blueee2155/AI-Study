"""
RAG 检索服务 - 向量相似度检索考研知识库
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.core.database import async_session
from app.models.chat import KnowledgeBase
from app.utils.embedding import get_embedding


async def search_knowledge(
    query: str,
    subject: str,
    top_k: int = 5,
    similarity_threshold: float = 0.7,
) -> list[KnowledgeBase]:
    """
    向量检索知识库

    使用 pgvector 的余弦相似度搜索最相关的内容。
    如果向量检索不可用（无 embedding 或无 pgvector），
    回退到基于关键词的文本搜索。

    Args:
        query: 查询文本
        subject: 科目
        top_k: 返回结果数
        similarity_threshold: 相似度阈值

    Returns:
        匹配的知识条目列表
    """
    # 获取查询的 embedding
    query_embedding = None
    try:
        query_embedding = await get_embedding(query)
    except Exception as e:
        print(f"Embedding generation failed: {e}")

    async with async_session() as db:
        if query_embedding:
            # 使用 pgvector 向量检索
            try:
                embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
                sql = text(f"""
                    SELECT id, subject, content, source, created_at,
                           1 - (embedding <=> '{embedding_str}'::vector) AS similarity
                    FROM knowledge_base
                    WHERE subject = :subject
                      AND 1 - (embedding <=> '{embedding_str}'::vector) > :threshold
                    ORDER BY similarity DESC
                    LIMIT :top_k
                """)
                result = await db.execute(
                    sql,
                    {"subject": subject, "threshold": similarity_threshold, "top_k": top_k},
                )
                rows = result.all()
                if rows:
                    return [
                        KnowledgeBase(
                            id=row.id,
                            subject=row.subject,
                            content=row.content,
                            source=row.source,
                        )
                        for row in rows
                    ]
            except Exception as e:
                print(f"pgvector search failed, falling back to text search: {e}")

        # 回退：基于关键词的文本搜索
        keywords = query.split()
        conditions = " OR ".join(
            f"content ILIKE '%{kw}%'" for kw in keywords if len(kw) > 1
        )
        if not conditions:
            return []

        try:
            sql = text(f"""
                SELECT id, subject, content, source, created_at
                FROM knowledge_base
                WHERE subject = :subject AND ({conditions})
                LIMIT :top_k
            """)
            result = await db.execute(sql, {"subject": subject, "top_k": top_k})
            rows = result.all()
            return [
                KnowledgeBase(
                    id=row.id,
                    subject=row.subject,
                    content=row.content,
                    source=row.source,
                )
                for row in rows
            ]
        except Exception as e:
            print(f"Text search failed: {e}")
            return []
