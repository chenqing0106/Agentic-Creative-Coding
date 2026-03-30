#!/bin/bash
# 一键部署脚本 — 本地执行
# 用法: ./deploy.sh
# 首次部署会自动安装所有依赖；后续部署只同步代码并重启服务

set -e

SERVER="root@47.243.32.207"
REMOTE_DIR="/app/agentic-creative-coding"

echo "=== [1/3] 同步代码到服务器 ==="
rsync -avz --progress \
  --exclude='.venv' \
  --exclude='node_modules' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.env' \
  --exclude='data/chroma' \
  --exclude='.DS_Store' \
  --exclude='.git' \
  --exclude='.vscode' \
  --exclude='.claude' \
  /Users/qingchen/Code/agentic-creative-coding/ \
  "$SERVER:$REMOTE_DIR/"

echo ""
echo "=== [2/3] 上传服务器安装脚本 ==="
scp setup.sh "$SERVER:/tmp/setup.sh"

echo ""
echo "=== [3/3] 远程执行安装/重启 ==="
ssh "$SERVER" "bash /tmp/setup.sh $REMOTE_DIR"

echo ""
echo "✅ 部署完成！访问 http://47.243.32.207"
