"""
测试 AI 聊天服务 - 验证代理环境变量不会导致 proxies 错误

TDD: RED -> GREEN -> REFACTOR
"""

import os
import sys
import asyncio
import importlib
import pytest


sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


class TestProxyEnvHandling:
    """测试代理环境变量处理"""

    def test_chat_http_client_no_proxies_error(self):
        """聊天服务：httpx 客户端创建不应该报 proxies 错误"""
        # 先设置代理环境变量
        os.environ["HTTP_PROXY"] = "http://127.0.0.1:7890"
        os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7890"

        # 重新导入模块，测试导入时是否清除代理变量
        import app.services.chat_service
        importlib.reload(app.services.chat_service)

        # 代理环境变量应该被清除
        assert os.environ.get("HTTP_PROXY") is None or os.environ.get("HTTP_PROXY") == ""

        # 创建客户端不应该抛出 proxies 相关错误
        try:
            client = app.services.chat_service._get_http_client()
            assert client is not None
            assert hasattr(client, 'stream')
            # 验证 trust_env=False，httpx 不会读取代理环境变量
            assert client._trust_env == False
        except TypeError as e:
            if "proxies" in str(e).lower() or "proxy" in str(e).lower():
                pytest.fail(f"代理环境变量导致了 proxies 错误: {e}")
            raise

    def test_embedding_http_client_no_proxies_error(self):
        """Embedding 服务：httpx 客户端创建不应该报 proxies 错误"""
        os.environ["HTTP_PROXY"] = "http://127.0.0.1:7890"
        os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7890"

        import app.utils.embedding
        importlib.reload(app.utils.embedding)

        assert os.environ.get("HTTP_PROXY") is None or os.environ.get("HTTP_PROXY") == ""

        try:
            client = app.utils.embedding._get_http_client()
            assert client is not None
            assert hasattr(client, 'post')
            assert client._trust_env == False
        except TypeError as e:
            if "proxies" in str(e).lower() or "proxy" in str(e).lower():
                pytest.fail(f"代理环境变量导致了 proxies 错误: {e}")
            raise

    def test_no_openai_library_in_services(self):
        """确认服务模块没有导入 openai 库"""
        import app.services.chat_service as chat_module
        assert not hasattr(chat_module, 'openai'), "chat_service 不应该导入 openai 库"

        import app.utils.embedding as embedding_module
        assert not hasattr(embedding_module, 'openai'), "embedding 不应该导入 openai 库"

        # 检查 sys.modules 中 chat_service 的全局命名空间没有 openai
        assert 'openai' not in chat_module.__dict__, "chat_module 全局命名空间不应有 openai"
        assert 'openai' not in embedding_module.__dict__, "embedding_module 全局命名空间不应有 openai"

    def test_generate_answer_stream_no_api_key(self):
        """无 API Key 时返回模拟回答（不调用网络）"""
        import app.services.chat_service as chat_module

        async def _test():
            chunks = []
            async for chunk in chat_module.generate_answer_stream("测试问题", "数学", []):
                chunks.append(chunk)
            return chunks

        result = asyncio.run(_test())
        assert len(result) > 0
        full_text = "".join(result)
        assert "测试问题" in full_text or "数学" in full_text

    def test_trust_env_false_prevents_proxy_detection(self):
        """trust_env=False 应该阻止 httpx 读取环境变量中的代理设置"""
        import httpx

        # 设置代理环境变量
        os.environ["HTTP_PROXY"] = "http://127.0.0.1:7890"

        # 用 trust_env=False 创建的客户端，不应检测到代理
        client = httpx.AsyncClient(trust_env=False)
        assert client._trust_env == False

        # 用 trust_env=True 创建的客户端，会检测到代理
        client_with_proxy = httpx.AsyncClient(trust_env=True)
        assert client_with_proxy._trust_env == True

        import asyncio
        asyncio.run(client.aclose())
        asyncio.run(client_with_proxy.aclose())
