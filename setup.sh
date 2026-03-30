#!/bin/bash
# 服务器端安装脚本 — 由 deploy.sh 自动上传并执行，也可手动运行
# 用法: bash setup.sh [项目目录]
# 首次运行安装依赖；已安装则跳过，只重启服务

set -e

APP_DIR="${1:-/app/agentic-creative-coding}"
SERVICE_NAME="creative-coding"

echo "--- 项目目录: $APP_DIR ---"

# ── 1. 安装系统依赖（只在首次运行时执行）──────────────────────────────────────
if ! command -v python3.12 &> /dev/null; then
  echo "[系统] 安装 Python 3.12..."
  apt-get update -qq
  apt-get install -y python3.12 python3.12-venv python3-pip
else
  echo "[系统] Python 3.12 已安装，跳过"
fi

if ! command -v nginx &> /dev/null; then
  echo "[系统] 安装 nginx..."
  apt-get install -y nginx
else
  echo "[系统] nginx 已安装，跳过"
fi

# ── 2. 创建目录 ────────────────────────────────────────────────────────────────
mkdir -p "$APP_DIR/data"

# ── 3. Python 虚拟环境 ─────────────────────────────────────────────────────────
if [ ! -d "$APP_DIR/.venv" ]; then
  echo "[Python] 创建虚拟环境..."
  python3.12 -m venv "$APP_DIR/.venv"
fi

echo "[Python] 安装/更新依赖..."
"$APP_DIR/.venv/bin/pip" install -q --upgrade pip
"$APP_DIR/.venv/bin/pip" install -q -r "$APP_DIR/requirements.txt"

# ── 4. 配置 .env（首次才创建，避免覆盖已填写的 key）─────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  echo "[配置] 创建 .env 文件..."
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo ""
  echo "⚠️  请编辑 $APP_DIR/.env，填入 API key 后重新运行本脚本或手动启动服务："
  echo "    nano $APP_DIR/.env"
  echo "    systemctl restart $SERVICE_NAME"
  echo ""
else
  echo "[配置] .env 已存在，跳过（如需修改: nano $APP_DIR/.env）"
fi

# ── 5. systemd 服务 ────────────────────────────────────────────────────────────
echo "[systemd] 配置服务..."
cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=Agentic Creative Coding
After=network.target

[Service]
User=root
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=$APP_DIR/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 3000 --workers 1
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME" --quiet

# ── 6. nginx 配置 ──────────────────────────────────────────────────────────────
echo "[nginx] 配置反向代理..."
cat > "/etc/nginx/sites-available/$SERVICE_NAME" << 'EOF'
server {
    listen 80;
    server_name _;

    # LLM 调用超时设长一些
    proxy_read_timeout    120s;
    proxy_connect_timeout  10s;
    proxy_send_timeout     30s;

    # 上传 sketch 文件大小限制
    client_max_body_size 10m;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    }
}
EOF

# 移除默认站点，启用本项目
rm -f /etc/nginx/sites-enabled/default
ln -sf "/etc/nginx/sites-available/$SERVICE_NAME" "/etc/nginx/sites-enabled/$SERVICE_NAME"

nginx -t
systemctl enable nginx --quiet
systemctl reload nginx

# ── 7. 启动/重启应用服务 ───────────────────────────────────────────────────────
if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "[服务] 重启 $SERVICE_NAME..."
  systemctl restart "$SERVICE_NAME"
else
  echo "[服务] 首次启动 $SERVICE_NAME..."
  systemctl start "$SERVICE_NAME"
fi

sleep 2

# ── 8. 状态检查 ────────────────────────────────────────────────────────────────
echo ""
echo "=== 服务状态 ==="
systemctl status "$SERVICE_NAME" --no-pager -l | head -20

echo ""
echo "=== nginx 状态 ==="
systemctl status nginx --no-pager | head -5

echo ""
# 检查服务是否响应
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/config | grep -q "200"; then
  echo "✅ 服务正常响应"
else
  echo "⚠️  服务未响应，查看日志: journalctl -u $SERVICE_NAME -n 50"
fi
