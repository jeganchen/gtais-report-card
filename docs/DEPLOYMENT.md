# GTAIS Report Card - PM2 生产环境部署指南

## 目录
1. [服务器要求](#服务器要求)
2. [环境准备](#环境准备)
3. [项目部署](#项目部署)
4. [PM2 管理命令](#pm2-管理命令)
5. [Nginx 反向代理配置](#nginx-反向代理配置)
6. [常见问题](#常见问题)

---

## 服务器要求

- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **Node.js**: v18.x 或更高版本
- **内存**: 最少 2GB RAM
- **磁盘**: 最少 10GB 可用空间
- **数据库**: MySQL 8.0+

---

## 环境准备

### 1. 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node -v   # 应显示 v18.x.x
npm -v    # 应显示 9.x.x 或更高
```

### 2. 安装 PM2

```bash
sudo npm install -g pm2

# 验证安装
pm2 -v
```

### 3. 安装 MySQL

```bash
# Ubuntu/Debian
sudo apt-get install mysql-server

# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置
sudo mysql_secure_installation
```

### 4. 创建数据库

```bash
# 登录 MySQL
sudo mysql -u root -p

# 创建数据库和用户
CREATE DATABASE gtais_report_card CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gtais'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON gtais_report_card.* TO 'gtais'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 项目部署

### 方式一：使用部署脚本（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/jeganchen/gtais-report-card.git
cd gtais-report-card

# 2. 创建环境变量文件
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=3000

# Next.js 配置
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret-key-at-least-32-characters-long

# 数据库配置
DATABASE_URL="mysql://gtais:your_secure_password@localhost:3306/gtais_report_card"
EOF

# 3. 运行部署脚本
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 方式二：手动部署

```bash
# 1. 克隆项目
git clone https://github.com/jeganchen/gtais-report-card.git
cd gtais-report-card

# 2. 创建环境变量文件（同上）

# 3. 安装依赖
npm ci

# 4. 生成 Prisma Client
npx prisma generate

# 5. 运行数据库迁移
npx prisma migrate deploy

# 6. 构建项目
npm run build

# 7. 创建日志目录
mkdir -p logs

# 8. 使用 PM2 启动
pm2 start ecosystem.config.js --env production

# 9. 保存 PM2 进程列表
pm2 save

# 10. 配置开机自启
pm2 startup
```

### 初始化管理员账户

部署完成后，运行 seed 脚本创建初始管理员：

```bash
npm run db:seed
```

默认管理员账户：
- **邮箱**: `infocare@gtais.org`
- **密码**: `admin123`

> ⚠️ **重要**: 首次登录后请立即修改密码！

---

## PM2 管理命令

### 基本操作

```bash
# 查看所有进程
pm2 list

# 查看详细状态
pm2 show gtais-report-card

# 查看实时日志
pm2 logs gtais-report-card

# 查看最近 200 行日志
pm2 logs gtais-report-card --lines 200

# 实时监控
pm2 monit
```

### 进程控制

```bash
# 重启应用
pm2 restart gtais-report-card

# 重载应用（零停机）
pm2 reload gtais-report-card

# 停止应用
pm2 stop gtais-report-card

# 删除应用
pm2 delete gtais-report-card
```

### 更新部署

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
npm ci

# 重新构建
npm run build

# 运行迁移（如有）
npx prisma migrate deploy

# 重载应用
pm2 reload gtais-report-card
```

### 集群管理

```bash
# 扩展到 4 个实例
pm2 scale gtais-report-card 4

# 查看集群状态
pm2 list
```

---

## Nginx 反向代理配置

### 安装 Nginx

```bash
sudo apt-get install nginx
```

### 配置文件

创建 `/etc/nginx/sites-available/gtais-report-card`：

```nginx
upstream gtais_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日志
    access_log /var/log/nginx/gtais-report-card.access.log;
    error_log /var/log/nginx/gtais-report-card.error.log;

    # 最大上传大小
    client_max_body_size 50M;

    # 代理到 Next.js
    location / {
        proxy_pass http://gtais_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # 静态文件缓存
    location /_next/static {
        proxy_pass http://gtais_backend;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /static {
        proxy_pass http://gtais_backend;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/gtais-report-card /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 配置 SSL（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期（已自动配置）
sudo certbot renew --dry-run
```

---

## 常见问题

### 1. 端口被占用

```bash
# 查看端口占用
sudo lsof -i :3000

# 杀掉占用进程
sudo kill -9 <PID>
```

### 2. 内存不足

```bash
# 查看内存使用
free -m

# 调整 PM2 内存限制（ecosystem.config.js）
max_memory_restart: '500M'

# 或减少实例数量
pm2 scale gtais-report-card 1
```

### 3. 数据库连接失败

```bash
# 检查 MySQL 状态
sudo systemctl status mysql

# 检查连接
mysql -u gtais -p -h localhost gtais_report_card

# 检查 DATABASE_URL 格式
# mysql://用户名:密码@主机:端口/数据库名
```

### 4. 应用无法启动

```bash
# 查看错误日志
pm2 logs gtais-report-card --err --lines 100

# 手动测试启动
NODE_ENV=production npm start
```

### 5. 更新后白屏

```bash
# 清除 .next 缓存
rm -rf .next

# 重新构建
npm run build

# 重启应用
pm2 restart gtais-report-card
```

---

## 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NODE_ENV` | 是 | 设置为 `production` |
| `PORT` | 否 | 应用端口，默认 3000 |
| `NEXTAUTH_URL` | 是 | 应用完整 URL |
| `NEXTAUTH_SECRET` | 是 | 至少 32 位的随机字符串 |
| `DATABASE_URL` | 是 | MySQL 连接字符串 |

### 生成 NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

---

## 备份与恢复

### 数据库备份

```bash
# 备份
mysqldump -u gtais -p gtais_report_card > backup_$(date +%Y%m%d).sql

# 恢复
mysql -u gtais -p gtais_report_card < backup_20240117.sql
```

### 自动备份脚本

```bash
#!/bin/bash
# /opt/scripts/backup-db.sh

BACKUP_DIR="/opt/backups/gtais"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mysqldump -u gtais -p'password' gtais_report_card | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# 保留最近 7 天的备份
find $BACKUP_DIR -type f -mtime +7 -delete
```

添加到 crontab（每天凌晨 2 点执行）：

```bash
0 2 * * * /opt/scripts/backup-db.sh
```

---

## 联系支持

如有问题，请联系系统管理员或提交 GitHub Issue。
