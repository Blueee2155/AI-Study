# 运行时配置（可热更新，覆盖 .env）
runtime_settings = {
    "DEEPSEEK_API_KEY": "",
    "OPENAI_API_KEY": "",
}

def set_api_key(key: str, value: str):
    runtime_settings[key] = value

def get_api_key(key: str) -> str:
    return runtime_settings.get(key, "")

def clear_api_keys():
    runtime_settings["DEEPSEEK_API_KEY"] = ""
    runtime_settings["OPENAI_API_KEY"] = ""
