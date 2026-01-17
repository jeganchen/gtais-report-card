#!/bin/bash

# ===========================================
# GTAIS Report Card - 生产环境部署脚本
# ===========================================

set -e

echo "=========================================="
echo "GTAIS Report Card - Production Deployment"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印信息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# 检查必要的命令
check_requirements() {
    info "检查系统要求..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js 未安装，请先安装 Node.js v18+"
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm 未安装"
    fi
    
    if ! command -v pm2 &> /dev/null; then
        warn "PM2 未安装，正在安装..."
        npm install -g pm2
    fi
    
    info "Node.js 版本: $(node -v)"
    info "npm 版本: $(npm -v)"
    info "PM2 版本: $(pm2 -v)"
}

# 检查环境变量文件
check_env() {
    info "检查环境变量配置..."
    
    if [ ! -f ".env.production" ] && [ ! -f ".env" ]; then
        error "缺少环境变量文件！请创建 .env.production 或 .env 文件"
    fi
    
    info "环境变量文件存在 ✓"
}

# 创建日志目录
setup_logs() {
    info "创建日志目录..."
    mkdir -p logs
    info "日志目录已创建 ✓"
}

# 安装依赖
install_deps() {
    info "安装项目依赖..."
    npm ci --production=false
    info "依赖安装完成 ✓"
}

# 生成 Prisma Client
generate_prisma() {
    info "生成 Prisma Client..."
    npx prisma generate
    info "Prisma Client 生成完成 ✓"
}

# 运行数据库迁移
migrate_db() {
    info "运行数据库迁移..."
    npx prisma migrate deploy
    info "数据库迁移完成 ✓"
}

# 构建项目
build_project() {
    info "构建生产版本..."
    npm run build
    info "项目构建完成 ✓"
}

# 启动/重启 PM2
start_pm2() {
    info "启动 PM2 服务..."
    
    # 检查是否已有运行的实例
    if pm2 list | grep -q "gtais-report-card"; then
        info "检测到已有运行实例，正在重启..."
        pm2 reload ecosystem.config.js --env production
    else
        info "启动新实例..."
        pm2 start ecosystem.config.js --env production
    fi
    
    # 保存 PM2 进程列表
    pm2 save
    
    info "PM2 服务启动完成 ✓"
}

# 设置 PM2 开机自启
setup_startup() {
    info "配置 PM2 开机自启..."
    pm2 startup
    pm2 save
    info "开机自启配置完成 ✓"
}

# 显示状态
show_status() {
    echo ""
    echo "=========================================="
    echo "部署完成！"
    echo "=========================================="
    echo ""
    pm2 list
    echo ""
    info "查看日志: pm2 logs gtais-report-card"
    info "监控状态: pm2 monit"
    info "重启服务: pm2 restart gtais-report-card"
    info "停止服务: pm2 stop gtais-report-card"
}

# 主函数
main() {
    check_requirements
    check_env
    setup_logs
    install_deps
    generate_prisma
    migrate_db
    build_project
    start_pm2
    show_status
}

# 运行
main "$@"
