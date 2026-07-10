## Hard Constraints
- DeepSeek API key must be set to sk-29f42aff0e79438c852b6f5ab899013a
- Streamed responses require try/except error handling to prevent crashes
- Python environment must have langchain-core, pydantic, and openai installed

## Engineering Conventions
- Code structure must include实战编号comments for each practice case
- API client configuration stored in DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, and DEEPSEEK_MODEL constants
- Typing effect implemented with typewriter_stream function using 0.005s character delay

## Lessons Learned
- koa-connect wrapper caused ctx leaks in previous middleware refactoring
- Spyder may use different Python environment than command line, requiring environment-specific dependency installation