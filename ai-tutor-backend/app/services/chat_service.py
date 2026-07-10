"""
问答服务 - 核心：DeepSeek API 流式调用 + 结合 RAG
"""

import os
import httpx
from typing import AsyncGenerator

from app.config import get_settings
from app.services.rag_service import search_knowledge
from app.core.runtime_config import get_api_key

settings = get_settings()

_proxy_vars = ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"]
for _var in _proxy_vars:
    os.environ.pop(_var, None)

_httpx_client: httpx.AsyncClient | None = None


def _get_httpx_client() -> httpx.AsyncClient:
    global _httpx_client
    if _httpx_client is None:
        _httpx_client = httpx.AsyncClient(timeout=120.0)
    return _httpx_client


SYSTEM_PROMPTS = {
    "政治": "你是一位专业的考研政治辅导老师。擅长马克思主义原理、毛泽东思想和中国特色社会主义理论体系、中国近现代史纲要、思想道德修养与法律基础等科目。请用清晰有条理的方式解答问题，适当引用经典著作原文。",
    "英语": "你是一位专业的考研英语辅导老师。擅长考研英语词汇、语法、阅读理解、完形填空、翻译和写作。请用中英双语解答问题，注重答题技巧和常见考点。",
    "数学": "你是一位专业的考研数学辅导老师。擅长高等数学、线性代数、概率论与数理统计。解题时请给出详细步骤，行内公式用 $公式$ 格式，独立公式块用 $$公式$$ 格式，注重解题思路和方法总结。",
    "专业课": "你是一位专业的考研专业课辅导老师。请根据具体问题提供准确的学科知识解答，涉及概念时给出完整定义，注重理论与实践结合。",
}


async def generate_answer_stream(
    question: str,
    subject: str,
    history: list[dict],
) -> AsyncGenerator[str, None]:
    """
    流式生成回答，结合 RAG 知识检索

    Args:
        question: 用户提问
        subject: 科目（政治/英语/数学/专业课）
        history: 历史消息列表 [{"role": ..., "content": ...}]

    Yields:
        文本片段
    """
    relevant_docs = []
    try:
        relevant_docs = await search_knowledge(question, subject, top_k=5)
    except Exception as e:
        print(f"RAG search failed (non-critical): {e}")

    system_prompt = SYSTEM_PROMPTS.get(subject, SYSTEM_PROMPTS["专业课"])

    if relevant_docs:
        doc_text = "\n\n".join(
            f"【参考资料 {i+1}】\n{doc.content}"
            for i, doc in enumerate(relevant_docs)
        )
        system_prompt += f"""

请参考以下考研资料来回答问题。如果资料不足以完全回答，请基于你的知识补充，但要说明哪些是参考资料内容，哪些是你的补充。

{doc_text}

【回答要求】
- 条理清晰，适当使用序号或分段
- 涉及重要概念时给出定义和解释
- 数学公式使用 LaTeX 格式：行内公式用 $公式$，独立公式块用 $$公式$$
- 结束时可以推荐 1-2 道相关真题供练习
- 语气耐心、鼓励，适合考研备考场景
- 回答末尾自动生成知识总结板块
"""
    else:
        system_prompt += """

【回答要求】
- 条理清晰，适当使用序号或分段
- 涉及重要概念时给出定义和解释
- 数学公式使用 LaTeX 格式：行内公式用 $公式$，独立公式块用 $$公式$$
- 结束时可以推荐 1-2 道相关真题供练习
- 语气耐心、鼓励，适合考研备考场景
- 回答末尾自动生成知识总结板块
"""

    api_key = get_api_key("DEEPSEEK_API_KEY") or settings.DEEPSEEK_API_KEY
    if not api_key:
        yield f"（开发模式）关于「{question}」的问题，"
        yield f"在 {subject} 科目中，这是一个重要的考点。"
        yield "建议从概念定义、基本原理和实际应用三个层面来理解。"
        yield "\n\n> 💡 **提示**：设置 DEEPSEEK_API_KEY 环境变量后即可获得真实的 AI 回答。"
        return

    try:
        client = _get_httpx_client()

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": question})

        url = f"{settings.DEEPSEEK_BASE_URL}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.DEEPSEEK_MODEL,
            "messages": messages,
            "max_tokens": 4096,
            "stream": True,
        }

        async with client.stream("POST", url, headers=headers, json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line:
                    continue
                if line.startswith("data: "):
                    line = line[6:]
                if line == "[DONE]":
                    break
                try:
                    import json
                    data = json.loads(line)
                    delta = data.get("choices", [{}])[0].get("delta", {}).get("content")
                    if delta:
                        yield delta
                except Exception:
                    continue

    except Exception as e:
        yield f"\n\n抱歉，AI 服务暂时不可用（{str(e)}）。请稍后再试。"
