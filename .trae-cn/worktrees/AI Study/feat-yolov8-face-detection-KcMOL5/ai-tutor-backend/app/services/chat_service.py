"""
问答服务 - 核心：DeepSeek API 流式调用 + 结合 RAG

直接使用 httpx 原生调用 DeepSeek API（兼容 OpenAI 格式），
完全绕过 openai 库，避免 httpx 版本与代理环境变量导致的
"AsyncClient.init() got an unexpected keyword argument 'proxies'" 错误。
"""

import json
import os
import traceback
from typing import AsyncGenerator

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
    print(f"[chat_service] 导入时清除代理环境变量: {list(_removed_on_import.keys())}")

import httpx

from app.config import get_settings
from app.services.rag_service import search_knowledge
from app.core.runtime_config import get_api_key

settings = get_settings()

# 各科目的系统提示模板（末尾固定要求总结，帮助用户快速掌握知识点）
SYSTEM_PROMPTS = {
    "政治": "你是一位专业的考研政治辅导老师。擅长马克思主义原理、毛泽东思想和中国特色社会主义理论体系、中国近现代史纲要、思想道德修养与法律基础等科目。请用清晰有条理的方式解答问题，适当引用经典著作原文。",
    "英语": "你是一位专业的考研英语辅导老师。擅长考研英语词汇、语法、阅读理解、完形填空、翻译和写作。请用中英双语解答问题，注重答题技巧和常见考点。",
    "数学": "你是一位专业的考研数学辅导老师。擅长高等数学、线性代数、概率论与数理统计。解题时请给出详细步骤，涉及公式使用 LaTeX 格式（$$公式$$），注重解题思路和方法总结。",
    "专业课": "你是一位专业的考研专业课辅导老师。请根据具体问题提供准确的学科知识解答，涉及概念时给出完整定义，注重理论与实践结合。",
}

# 所有科目的回答末尾固定要求：生成总结
SUMMARY_REQUIREMENT = """

---

## 📝 知识总结

在回答的最后，**必须**添加一个「知识总结」板块，格式如下：

## 📝 知识总结
- **核心要点**：用 1-2 句话概括本问题的核心答案
- **关键公式/概念**：列出本次回答中最重要的公式或概念
- **记忆技巧**：提供一个好记的口诀、对比或记忆方法
- **常见考点**：指出考研中这个知识点常见的考查方式

总结要简洁、精炼，让用户能快速复习掌握。"""

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
        # 最简化的创建方式，只传 timeout，确保最大兼容性
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(120.0, connect=30.0),
        )
        print(f"[chat_service] httpx 客户端创建成功，版本: "
              f"{getattr(httpx, '__version__', 'unknown')}")
        return _http_client
    except TypeError as e:
        # 如果带 Timeout 也报错，直接超时参数也可能有问题。
        # 尝试最简单的方式：不传任何参数
        print(f"[chat_service] 带 timeout 创建失败: {e}")
        try:
            _http_client = httpx.AsyncClient()
            print("[chat_service] 使用默认参数创建 httpx 客户端")
            return _http_client
        except Exception as e2:
            print(f"[chat_service] 简化版创建也失败: {e2}")
            traceback.print_exc()
            raise

def _get_api_config():
    """获取 DeepSeek API 配置。"""
    api_key = get_api_key("DEEPSEEK_API_KEY") or settings.DEEPSEEK_API_KEY
    base_url = settings.DEEPSEEK_BASE_URL.rstrip("/")
    model = settings.DEEPSEEK_MODEL
    return api_key, base_url, model


async def generate_answer_stream(
    question: str,
    subject: str,
    history: list,
):
    """
    流式生成回答，结合 RAG 知识检索

    Args:
        question: 用户提问
        subject: 科目（政治/英语/数学/专业课）
        history: 历史消息列表 [{"role": ..., "content": ...}]

    Yields:
        文本片段
    """
    api_key, base_url, model = _get_api_config()

    # 1. 检索相关知识
    relevant_docs = []
    try:
        relevant_docs = await search_knowledge(question, subject, top_k=5)
    except Exception as e:
        print(f"[chat_service] RAG 知识检索失败（不影响主流程）: {e}")

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
- 语气耐心、鼓励，适合考研备考场景
- **必须在回答末尾添加「知识总结」板块**
{SUMMARY_REQUIREMENT}
"""
    else:
        system_prompt += """

【回答要求】
- 条理清晰，适当使用序号或分段
- 涉及重要概念时给出定义和解释
- 如有公式，使用 LaTeX 格式 $$公式$$
- 语气耐心、鼓励，适合考研备考场景
- **必须在回答末尾添加「知识总结」板块**
""" + SUMMARY_REQUIREMENT

    # 3. 无 API Key 时返回模拟回答
    if not api_key:
        yield f"（开发模式）关于「{question}」的问题，"
        yield f"在 {subject} 科目中，这是一个重要的考点。"
        yield "建议从概念定义、基本原理和实际应用三个层面来理解。"
        yield "\n\n> 💡 **提示**：设置 DeepSeek API Key 后即可获得真实的 AI 回答。"
        return

    # 4. 直接用 httpx 原生调用 DeepSeek API（流式）
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": question})

    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 4096,
        "stream": True,
        "temperature": 0.7,
    }

    try:
        client = _get_http_client()
        print(f"[chat_service] 开始调用 DeepSeek API: {url}, model={model}")
        
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                try:
                    error_data = json.loads(error_text)
                    error_msg = error_data.get("error", {}).get("message", str(error_text))
                except Exception:
                    error_msg = str(error_text[:200])
                print(f"[chat_service] API 返回错误: HTTP {response.status_code}, {error_msg}")
                yield f"\n\n抱歉，AI 服务暂时不可用（HTTP {response.status_code}: {error_msg}）。请检查 API Key 是否正确。"
                return

            # 解析 SSE 流式响应
            async for line in response.aiter_lines():
                if not line:
                    continue
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        choices = data.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            content = delta.get("content")
                            if content:
                                yield content
                    except Exception:
                        continue
        print("[chat_service] API 调用完成")
    except Exception as e:
        print(f"[chat_service] API 调用异常: {type(e).__name__}: {e}")
        traceback.print_exc()
        yield f"\n\n抱歉，AI 服务暂时不可用（{type(e).__name__}: {str(e)}）。请稍后再试。"
