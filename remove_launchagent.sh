#!/usr/bin/env zsh

set -e

LABEL="com.surgeconfig.server"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"

echo "═══════════════════════════════════════════════════════════"
echo "🛑 Surge 配置生成服务 - LaunchAgent 卸载脚本"
echo "═══════════════════════════════════════════════════════════"
echo
echo "📋 正在卸载: $PLIST_PATH"
echo

# 卸载 LaunchAgent（如果已加载）
launchctl unload "$PLIST_PATH" 2>/dev/null || true

if [ -f "$PLIST_PATH" ]; then
  echo "   🔄 正在停止服务..."
  echo "   🔄 正在删除配置文件..."
  rm "$PLIST_PATH"
  echo "   ✅ 服务已停止"
  echo "   ✅ LaunchAgent 配置已移除"
else
  echo "   ⚠️  未找到配置文件（可能之前未创建或已删除）"
fi

echo
echo "═══════════════════════════════════════════════════════════"
echo "✅ 卸载完成！"
echo "═══════════════════════════════════════════════════════════"


