#!/bin/bash
# ============================================================
# Surge Config 服务管理脚本
# 
# 功能：
#   - 启动/停止服务
#   - 安装/卸载开机自启 (macOS LaunchAgent)
#
# 用法：
#   ./service.sh start      # 启动服务（后台）
#   ./service.sh start -f   # 启动服务（前台）
#   ./service.sh stop       # 停止服务
#   ./service.sh status     # 查看状态
#   ./service.sh install    # 安装开机自启
#   ./service.sh uninstall  # 卸载开机自启
# ============================================================

set -e

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 默认配置
DEFAULT_LISTEN_HOST="0.0.0.0"
DEFAULT_PORT="3000"

# 读取环境变量或使用默认值
LISTEN_HOST="${LISTEN_HOST:-$DEFAULT_LISTEN_HOST}"
PORT="${PORT:-$DEFAULT_PORT}"

# 显示地址：0.0.0.0 表示监听所有网卡，用户访问时应使用 127.0.0.1 或局域网 IP
LOCAL_HOST="127.0.0.1"
# 获取局域网 IP（macOS），跳过 APIPA 地址 (169.254.x.x)
get_lan_ip() {
    local ip
    ip=$(ipconfig getifaddr en0 2>/dev/null)
    if [ -z "$ip" ]; then
        ip=$(ipconfig getifaddr en1 2>/dev/null)
    fi
    # 跳过 APIPA 地址
    if [ -n "$ip" ] && ! echo "$ip" | grep -q "^169\.254\."; then
        echo "$ip"
    fi
}
LAN_IP=$(get_lan_ip)

# LaunchAgent 配置
LABEL="com.surgeconfig.server"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"
BUN_BIN="$(command -v bun 2>/dev/null || echo "/opt/homebrew/bin/bun")"

# 颜色输出（使用 printf 代替 echo -e 以确保兼容性）
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info()  { printf "${GREEN}[INFO]${NC} %s\n" "$1"; }
echo_warn()  { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }
echo_error() { printf "${RED}[ERROR]${NC} %s\n" "$1"; }
echo_title() { printf "${BLUE}%s${NC}\n" "$1"; }

# 检查是否已有服务在运行
check_running() {
    lsof -i ":$PORT" > /dev/null 2>&1
}

# 启动服务
cmd_start() {
    cd "$PROJECT_DIR" || exit 1
    
    if check_running; then
        echo_warn "服务已在端口 $PORT 上运行"
        echo_info "如需重启，请先运行: $0 stop"
        exit 1
    fi
    
    if [ "$1" = "-f" ] || [ "$1" = "--foreground" ]; then
        echo_info "前台启动 Surge Config 服务 (Ctrl+C 停止)..."
        echo_info "监听地址: $LISTEN_HOST:$PORT"
        HOSTNAME="$LISTEN_HOST" PORT="$PORT" bun run src/index.ts
    else
        echo_info "启动 Surge Config 服务..."
        echo_info "监听地址: $LISTEN_HOST:$PORT"
        
        HOSTNAME="$LISTEN_HOST" PORT="$PORT" nohup bun run src/index.ts > "$PROJECT_DIR/server.log" 2>&1 &
        sleep 2
        
        if check_running; then
            echo_info "服务启动成功！"
            echo ""
            echo_info "📋 可用端点 (本机访问):"
            echo "  http://$LOCAL_HOST:$PORT/profile/mac"
            echo "  http://$LOCAL_HOST:$PORT/profile/ios"
            echo "  http://$LOCAL_HOST:$PORT/provider/mac"
            echo "  http://$LOCAL_HOST:$PORT/provider/ios"
            if [ -n "$LAN_IP" ]; then
                echo ""
                echo_info "📋 可用端点 (局域网访问):"
                echo "  http://$LAN_IP:$PORT/profile/mac"
                echo "  http://$LAN_IP:$PORT/profile/ios"
                echo "  http://$LAN_IP:$PORT/provider/mac"
                echo "  http://$LAN_IP:$PORT/provider/ios"
            fi
            echo ""
            echo_info "日志文件: $PROJECT_DIR/server.log"
        else
            echo_error "服务启动失败，请检查日志: $PROJECT_DIR/server.log"
            exit 1
        fi
    fi
}

# 停止服务
cmd_stop() {
    PID=$(lsof -ti ":$PORT" 2>/dev/null || true)
    
    if [ -z "$PID" ]; then
        echo_warn "未找到运行在端口 $PORT 上的服务"
        return 0
    fi
    
    echo_info "正在停止服务 (PID: $PID)..."
    kill "$PID" 2>/dev/null || true
    sleep 1
    
    if check_running; then
        echo_warn "服务未响应，强制终止..."
        kill -9 "$PID" 2>/dev/null || true
        sleep 1
    fi
    
    if check_running; then
        echo_error "无法停止服务"
        exit 1
    else
        echo_info "服务已停止"
    fi
}

# 查看状态
cmd_status() {
    echo_title "========== Surge Config 服务状态 =========="
    echo ""
    
    PID=$(lsof -ti ":$PORT" 2>/dev/null || true)
    
    if [ -n "$PID" ]; then
        echo_info "服务状态: ${GREEN}运行中${NC}"
        echo_info "进程 PID: $PID"
        echo_info "监听端口: $PORT"
        
        echo ""
        if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/surge.conf" 2>/dev/null | grep -q "200"; then
            echo_info "HTTP 响应: ${GREEN}正常${NC}"
        else
            echo_warn "HTTP 响应: ${YELLOW}异常${NC}"
        fi
    else
        echo_warn "服务状态: ${RED}未运行${NC}"
    fi
    
    # LaunchAgent 状态
    echo ""
    if [ -f "$PLIST_PATH" ]; then
        echo_info "开机自启: ${GREEN}已安装${NC}"
    else
        echo_info "开机自启: ${YELLOW}未安装${NC}"
    fi
    
    echo ""
    echo_title "============================================="
}

# 安装开机自启
cmd_install() {
    echo_title "========== 安装开机自启服务 =========="
    echo ""
    
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
      <string>${LISTEN_HOST}</string>
      <key>PORT</key>
      <string>${PORT}</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>${PROJECT_DIR}/server.log</string>
    
    <key>StandardErrorPath</key>
    <string>${PROJECT_DIR}/server.log</string>
  </dict>
</plist>
EOF

    echo_info "配置文件已生成: $PLIST_PATH"
    
    launchctl unload "$PLIST_PATH" 2>/dev/null || true
    launchctl load "$PLIST_PATH"
    
    echo_info "服务已加载并设置为开机自启"
    echo ""
    echo_info "📋 可用端点 (本机访问):"
    echo "  http://$LOCAL_HOST:$PORT/provider/mac"
    echo "  http://$LOCAL_HOST:$PORT/provider/ios"
    if [ -n "$LAN_IP" ]; then
        echo ""
        echo_info "📋 可用端点 (局域网访问):"
        echo "  http://$LAN_IP:$PORT/provider/mac"
        echo "  http://$LAN_IP:$PORT/provider/ios"
    fi
    echo ""
    echo_title "========================================"
}

# 卸载开机自启
cmd_uninstall() {
    echo_title "========== 卸载开机自启服务 =========="
    echo ""
    
    if [ -f "$PLIST_PATH" ]; then
        launchctl unload "$PLIST_PATH" 2>/dev/null || true
        rm "$PLIST_PATH"
        echo_info "LaunchAgent 已卸载"
    else
        echo_warn "未找到 LaunchAgent 配置"
    fi
    
    echo ""
    echo_title "========================================"
}

# 显示帮助
cmd_help() {
    echo "Surge Config 服务管理脚本"
    echo ""
    echo "用法: $0 <命令> [选项]"
    echo ""
    echo "命令:"
    echo "  start [-f]    启动服务 (-f 前台模式)"
    echo "  stop          停止服务"
    echo "  status        查看服务状态"
    echo "  install       安装开机自启 (macOS LaunchAgent)"
    echo "  uninstall     卸载开机自启"
    echo "  help          显示此帮助信息"
    echo ""
    echo "环境变量:"
    echo "  LISTEN_HOST   监听地址 (默认: 0.0.0.0)"
    echo "  PORT          监听端口 (默认: 3000)"
}

# 主逻辑
case "${1:-help}" in
    start)     cmd_start "$2" ;;
    stop)      cmd_stop ;;
    status)    cmd_status ;;
    install)   cmd_install ;;
    uninstall) cmd_uninstall ;;
    help|*)    cmd_help ;;
esac
