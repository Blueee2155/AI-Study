"""
AI 学习助手 - FastAPI 后端入口
"""

import os
import sys

# 在导入任何其他库之前，清除代理环境变量。
# 这是避免 httpx/openai 等库因系统代理设置导致
# "AsyncClient.init() got an unexpected keyword argument 'proxies'" 错误的最彻底方法。
_PROXY_KEYS = [
    "HTTP_PROXY", "HTTPS_PROXY",
    "http_proxy", "https_proxy",
    "ALL_PROXY", "all_proxy",
    "NO_PROXY", "no_proxy",
]
_removed_proxies = {}
for _k in _PROXY_KEYS:
    if _k in os.environ:
        _removed_proxies[_k] = os.environ.pop(_k)
if _removed_proxies:
    print(f"[startup] 已清除代理环境变量以避免 API 兼容问题: {list(_removed_proxies.keys())}")
else:
    print("[startup] 未检测到代理环境变量")

import uvicorn
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.core.database import init_db
from app.routers import auth, chat, study, vision
from app.routers import settings as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时初始化数据库"""
    await init_db()
    yield


app_settings = get_settings()

app = FastAPI(
    title=app_settings.APP_NAME,
    version=app_settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router, prefix="/api/auth", tags=["用户认证"])
app.include_router(chat.router, prefix="/api/chat", tags=["考研问答"])
app.include_router(study.router, prefix="/api/study", tags=["学习记录"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["运行时设置"])
app.include_router(vision.router, prefix="/api/vision", tags=["视觉检测"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": app_settings.APP_VERSION}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器：返回详细错误信息，方便排错"""
    error_info = {
        "error": type(exc).__name__,
        "message": str(exc),
        "path": request.url.path,
    }
    print(f"[全局异常] {type(exc).__name__}: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content=error_info,
    )


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
