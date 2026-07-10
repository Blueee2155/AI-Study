## Hard Constraints
- Must use YOLOv8 model for face detection
- Training epochs for models must be set to 500
- All AI functionality must use DeepSeek API exclusively; OpenAI library dependency removed

## Engineering Conventions
- HTTPX client used directly for DeepSeek API calls with trust_env=False to ignore system proxy variables

## Lessons Learned
- Higher YOLO detection resolution (416 vs 320) improves accuracy for face and eye detection
- OpenAI library causes 'proxies' parameter errors when system proxy environment variables exist; direct HTTPX calls required
- Async generator functions in chat.py must not be called with await; use async for directly to avoid TypeError
- Restarting the backend with old code versions causes service failures; verify code version via /api/chat/debug/info endpoint before use