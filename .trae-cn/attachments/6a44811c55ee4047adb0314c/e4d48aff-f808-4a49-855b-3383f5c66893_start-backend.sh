#!/usr/bin/env bash
# OwlStudy Backend 启动脚本 (Mac/Linux)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/ai-tutor-backend"

echo ""
echo "  🦉 OwlStudy 后端启动脚本"
echo "  ================================"
echo ""

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "  ❌ 未检测到 Python3，请先安装 Python 3.10+"
    exit 1
fi

PYVER=$(python3 --version 2>&1 | awk '{print $2}')
echo "  ✓ Python 版本: $PYVER"

# Create venv if needed
if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo "  📦 正在创建虚拟环境..."
    python3 -m venv "$BACKEND_DIR/.venv"
    echo "  ✓ 虚拟环境已创建"
fi

# Activate and install
echo "  📥 正在检查依赖..."
source "$BACKEND_DIR/.venv/bin/activate"

pip install -r "$BACKEND_DIR/requirements.txt" -q
echo "  ✓ 依赖就绪"

# Check API key
if [ -z "$ANTHROPIC_API_KEY" ] && [ ! -f "$BACKEND_DIR/.env" ]; then
    echo ""
    echo "  ⚠️  未设置 ANTHROPIC_API_KEY"
    echo "     AI 对话功能将不可用（注册登录等功能正常）"
    echo ""
fi

echo ""
echo "  🚀 启动后端服务..."
echo "  地址: http://localhost:8000"
echo "  文档: http://localhost:8000/docs"
echo ""
echo "  按 Ctrl+C 停止服务"
echo "  ================================"
echo ""

cd "$BACKEND_DIR"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
