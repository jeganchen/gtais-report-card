#!/bin/bash

# 数据库设置脚本
# 用于初始化MySQL数据库和运行Prisma迁移

echo "=== GTAIS Report Card Database Setup ==="
echo ""

# 检查MySQL是否运行
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL command not found. Please install MySQL first."
    exit 1
fi

# 数据库配置
DB_HOST="localhost"
DB_USER="root"
DB_PASS="Rainbow@123"
DB_NAME="grais_db"

echo "Creating database '$DB_NAME'..."

# 创建数据库
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Database '$DB_NAME' created or already exists."
else
    echo "❌ Failed to create database. Please check your MySQL credentials."
    exit 1
fi

# 检查.env.local文件
if [ ! -f ".env.local" ]; then
    echo ""
    echo "Creating .env.local file..."
    cat > .env.local << EOF
# 数据库配置
DATABASE_URL="mysql://$DB_USER:$DB_PASS@$DB_HOST:3306/$DB_NAME"

# 启用数据库模式
USE_DATABASE="true"

# NextAuth配置
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
EOF
    echo "✅ .env.local created."
fi

# 安装依赖
echo ""
echo "Installing dependencies..."
npm install

# 生成Prisma客户端
echo ""
echo "Generating Prisma client..."
npx prisma generate

# 运行数据库迁移
echo ""
echo "Pushing database schema..."
npx prisma db push

echo ""
echo "=== Setup Complete ==="
echo ""
echo "You can now run the application with:"
echo "  npm run dev"
echo ""
echo "To view the database, run:"
echo "  npm run db:studio"

