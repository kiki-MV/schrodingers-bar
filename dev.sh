#!/bin/bash
# 薛定谔酒吧 - 开发环境启动
# http://localhost:3000
set -e
cd "$(dirname "$0")"

if [ ! -f .env.local ] || grep -q "your_anthropic_api_key_here" .env.local; then
  echo "⚠️  请先在 .env.local 中设置 ANTHROPIC_API_KEY"
  exit 1
fi

echo "🍸 薛定谔酒吧启动中..."
echo "   地址: http://localhost:3000"
echo "   按 Ctrl+C 停止"
npm run dev
