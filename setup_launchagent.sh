#!/usr/bin/env zsh

set -e

# === 可按需修改的参数 ===
# PROJECT_DIR：项目目录
PROJECT_DIR="/Users/wuzhe/GitHub/SurgeConfig"
# HOSTNAME_IP：服务监听地址
# - 如果希望局域网其它设备可访问，这里必须为 0.0.0.0
# - 订阅时请使用这台 Mac 的实际 IP（例如 192.168.x.x），而不是 0.0.0.0
HOSTNAME_IP="0.0.0.0"
# PORT：服务端口
PORT="3000"
LABEL="com.surgeconfig.server"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"

# 自动探测 bun 路径（找不到就回退到常见路径）
BUN_BIN="$(command -v bun || echo "/opt/homebrew/bin/bun")"

echo "═══════════════════════════════════════════════════════════"
echo "🚀 Surge 配置生成服务 - LaunchAgent 安装脚本"
echo "═══════════════════════════════════════════════════════════"
echo
echo "📋 配置信息:"
echo "   - Bun 路径: $BUN_BIN"
echo "   - 项目目录: $PROJECT_DIR"
echo "   - 监听地址: $HOSTNAME_IP"
echo "   - 服务端口: $PORT"
echo "   - LaunchAgent: $PLIST_PATH"
echo

mkdir -p "$(dirname "$PLIST_PATH")"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${LABEL}</string>

    <key>ProgramArguments</key>
    <array>
      <string>${BUN_BIN}</string>
      <string>run</string>
      <string>start</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>

    <key>EnvironmentVariables</key>
    <dict>
      <key>HOSTNAME</key>
      <string>${HOSTNAME_IP}</string>
      <key>PORT</key>
      <string>${PORT}</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>
  </dict>
</plist>
EOF

echo "📝 正在生成 LaunchAgent 配置文件..."
echo "   ✅ 已生成: $PLIST_PATH"
echo

# 先卸载旧的，再加载新的
echo "🔄 正在加载服务..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo "   ✅ 服务已启动"
echo

echo "═══════════════════════════════════════════════════════════"
echo "📡 服务访问地址"
echo "═══════════════════════════════════════════════════════════"
echo
echo "📱 解析节点模式（从订阅下载并解析节点）:"
echo "   本机访问:"
echo "     - http://127.0.0.1:${PORT}/surge.conf (Mac - Surge 6)"
echo "     - http://127.0.0.1:${PORT}/surge_ios.conf (iOS - Surge 5)"
echo
if [ "$HOSTNAME_IP" = "0.0.0.0" ]; then
  echo "   局域网访问（请将 <你的Mac局域网IP> 换成实际 IP）:"
  echo "     - http://<你的Mac局域网IP>:${PORT}/surge.conf (Mac - Surge 6)"
  echo "     - http://<你的Mac局域网IP>:${PORT}/surge_ios.conf (iOS - Surge 5)"
  echo
fi
echo "⚡ 外部节点模式（smart 策略组，支持自动更新）:"
echo "   本机访问:"
echo "     - http://127.0.0.1:${PORT}/surge_both.conf (Mac - Surge 6)"
echo "     - http://127.0.0.1:${PORT}/surge_ios_both.conf (iOS - Surge 5)"
echo
if [ "$HOSTNAME_IP" = "0.0.0.0" ]; then
  echo "   局域网访问（请将 <你的Mac局域网IP> 换成实际 IP）:"
  echo "     - http://<你的Mac局域网IP>:${PORT}/surge_both.conf (Mac - Surge 6)"
  echo "     - http://<你的Mac局域网IP>:${PORT}/surge_ios_both.conf (iOS - Surge 5)"
  echo
fi
echo "💡 提示:"
echo "   - 所有模式统一使用 src/config.ts 中的 kSurgeConfig 配置"
echo "   - 解析节点模式使用所有配置，外部节点模式使用第一个配置"
echo "   - 配置后即可使用所有端点"
echo
echo "═══════════════════════════════════════════════════════════"
echo "✅ 安装完成！服务已设置为开机自启"
echo "═══════════════════════════════════════════════════════════"


