/**
 * PM2 Ecosystem Configuration
 * 生产环境部署配置文件
 */

module.exports = {
  apps: [
    {
      name: 'gtais-report-card',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './',
      instances: 'max', // 使用所有 CPU 核心，或设置具体数字如 2
      exec_mode: 'cluster', // 集群模式
      
      // 环境变量
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      merge_logs: true,
      
      // 进程管理
      max_memory_restart: '1G', // 内存超过 1G 自动重启
      watch: false, // 生产环境不监听文件变化
      
      // 自动重启配置
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,

      // 优雅关闭
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
