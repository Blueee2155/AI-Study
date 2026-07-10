"""
AI 学习助手 - FastAPI 后端入口
"""

import os
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse

_proxy_vars = ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"]
for _var in _proxy_vars:
    os.environ.pop(_var, None)

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器，返回详细错误信息"""
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": exc.__class__.__name__,
            "traceback": traceback.format_exc(),
        },
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


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
