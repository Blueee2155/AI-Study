from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user
from app.core.runtime_config import set_api_key, get_api_key
from app.config import get_settings

router = APIRouter()


class APIKeyRequest(BaseModel):
    key: str  # "DEEPSEEK_API_KEY" or "OPENAI_API_KEY"
    value: str


class APIKeyResponse(BaseModel):
    key: str
    configured: bool


@router.post("/apikey", status_code=200)
async def set_apikey(
    data: APIKeyRequest,
    current_user: dict = Depends(get_current_user),
):
    """设置 API Key（运行时，不写入 .env 文件）"""
    valid_keys = ["DEEPSEEK_API_KEY", "OPENAI_API_KEY"]
    if data.key not in valid_keys:
        raise HTTPException(status_code=400, detail="不支持的 API Key 类型")
    if data.key == "DEEPSEEK_API_KEY" and not data.value.startswith("sk-"):
        raise HTTPException(status_code=400, detail="DeepSeek API Key 应以 sk- 开头")
    set_api_key(data.key, data.value.strip())
    return {"status": "ok", "key": data.key, "configured": True}


@router.get("/apikey/{key_name}", response_model=APIKeyResponse)
async def get_apikey_status(
    key_name: str,
    current_user: dict = Depends(get_current_user),
):
    """查询某个 API Key 是否已配置"""
    valid_keys = ["DEEPSEEK_API_KEY", "OPENAI_API_KEY"]
    if key_name not in valid_keys:
        raise HTTPException(status_code=400, detail="不支持的 API Key 类型")
    val = get_api_key(key_name)
    if not val:
        settings = get_settings()
        val = getattr(settings, key_name, "")
    return APIKeyResponse(key=key_name, configured=bool(val))
