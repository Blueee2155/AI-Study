"""
问答服务 - 核心：DeepSeek API 流式调用 + 结合 RAG
"""

from typing import AsyncGenerator
from openai import AsyncOpenAI

from app.config import get_settings
from app.services.rag_service import search_knowledge
from app.core.runtime_config import get_api_key

settings = get_settings()

# 各科目的系统提示模板
SYSTEM_PROMPTS = {
    "政治": "你是一位专业的考研政治辅导老师。擅长马克思主义原理、毛泽东思想和中国特色社会主义理论体系、中国近现代史纲要、思想道德修养与法律基础等科目。请用清晰有条理的方式解答问题，适当引用经典著作原文。",
    "英语": "你是一位专业的考研英语辅导老师。擅长考研英语词汇、语法、阅读理解、完形填空、翻译和写作。请用中英双语解答问题，注重答题技巧和常见考点。",
    "数学": "你是一位专业的考研数学辅导老师。擅长高等数学、线性代数、概率论与数理统计。解题时请给出详细步骤，涉及公式使用 LaTeX 格式（$$公式$$），注重解题思路和方法总结。",
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
    # 1. 检索相关知识
    relevant_docs = []
    try:
        relevant_docs = await search_knowledge(question, subject, top_k=5)
    except Exception as e:
        print(f"RAG search failed (non-critical): {e}")

    # 2. 构建 system prompt
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
- 如有公式，使用 LaTeX 格式 $$公式$$
- 结束时可以推荐 1-2 道相关真题供练习
- 语气耐心、鼓励，适合考研备考场景
"""
    else:
        system_prompt += """

【回答要求】
- 条理清晰，适当使用序号或分段
- 涉及重要概念时给出定义和解释
- 如有公式，使用 LaTeX 格式 $$公式$$
- 结束时可以推荐 1-2 道相关真题供练习
- 语气耐心、鼓励，适合考研备考场景
"""

    # 3. 调用 DeepSeek API（流式，兼容 OpenAI 格式）
    api_key = get_api_key("DEEPSEEK_API_KEY") or settings.DEEPSEEK_API_KEY
    if not api_key:
        # 开发环境无 API key 时返回模拟回答
        yield f"（开发模式）关于「{question}」的问题，"
        yield f"在 {subject} 科目中，这是一个重要的考点。"
        yield "建议从概念定义、基本原理和实际应用三个层面来理解。"
        yield "\n\n> 💡 **提示**：设置 DEEPSEEK_API_KEY 环境变量后即可获得真实的 AI 回答。"
        return

    try:
        client = AsyncOpenAI(
            api_key=api_key,
            base_url=settings.DEEPSEEK_BASE_URL,
        )

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": question})

        stream = await client.chat.completions.create(
            model=settings.DEEPSEEK_MODEL,
            messages=messages,
            max_tokens=4096,
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    except Exception as e:
        yield f"\n\n抱歉，AI 服务暂时不可用（{str(e)}）。请稍后再试。"
