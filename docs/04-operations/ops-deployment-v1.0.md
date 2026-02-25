# 语习集 - 部署流程文档

> 版本: v1.0
> 最后更新: 2026-02-24
> 优先级: P1
> 阅读时间: 15分钟

---

## 文档简介

本文档详细说明语习集项目的部署流程，包括开发环境、测试环境和生产环境的部署步骤及配置说明。

---

## 目录

- [部署架构](#部署架构)
- [环境配置](#环境配置)
- [开发环境部署](#开发环境部署)
- [生产环境部署](#生产环境部署)
- [数据库迁移](#数据库迁移)
- [域名与SSL](#域名与ssl)
- [监控与日志](#监控与日志)
- [回滚策略](#回滚策略)

---

## 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户层                                │
│  浏览器 / 移动端 WebView                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CDN 层 (Vercel Edge)                   │
│  静态资源缓存 / 边缘计算                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      应用层 (Vercel)                        │
│  Next.js 应用 / API Routes / Serverless Functions          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据层                                  │
│  Neon PostgreSQL (数据库)                                   │
│  腾讯云 COS (静态音频)                                       │
│  Vercel Blob (动态音频)                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI服务层                                │
│  GLM-4-Flash (智谱AI)                                       │
│  Azure Speech (语音合成)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 环境配置

### 环境变量清单

| 变量名 | 开发环境 | 测试环境 | 生产环境 | 说明 |
|--------|----------|----------|----------|------|
| `NODE_ENV` | development | staging | production | 运行环境 |
| `DATABASE_URL` | Neon Dev | Neon Staging | Neon Prod | 数据库连接 |
| `GLM_API_KEY` | 开发密钥 | 测试密钥 | 生产密钥 | AI服务 |
| `AZURE_SPEECH_KEY` | 开发密钥 | 测试密钥 | 生产密钥 | 语音服务 |
| `NEXT_PUBLIC_COS_BASE_URL` | 开发Bucket | 测试Bucket | 生产Bucket | 静态音频 |
| `BLOB_READ_WRITE_TOKEN` | 开发Token | 测试Token | 生产Token | 动态音频 |

---

## 开发环境部署

### 前置要求

- Node.js >= 18.0
- pnpm >= 8.0
- Git

### 部署步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd kouyu

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入开发环境配置

# 4. 启动开发服务器
pnpm dev
```

### 验证部署

- 访问 http://localhost:3000 查看首页
- 访问 http://localhost:3000/api/scenes 测试API

---

## 生产环境部署

### Vercel 部署

#### 方式一：Git集成部署（推荐）

```bash
# 1. 在 Vercel 控制台导入 Git 仓库
# 访问 https://vercel.com/new

# 2. 配置环境变量
# 在 Vercel 控制台 → Project Settings → Environment Variables 中添加：
# - DATABASE_URL
# - GLM_API_KEY
# - AZURE_SPEECH_KEY
# - NEXT_PUBLIC_COS_BASE_URL
# - BLOB_READ_WRITE_TOKEN

# 3. 配置构建命令
# Build Command: pnpm build
# Output Directory: .next
# Install Command: pnpm install
```

#### 方式二：Vercel CLI 部署

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署到预览环境
vercel

# 4. 部署到生产环境
vercel --prod
```

### 部署配置 (vercel.json)

```json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["hkg1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, no-cache, must-revalidate"
        }
      ]
    }
  ]
}
```

---

## 数据库迁移

### Drizzle ORM 迁移

```bash
# 1. 生成迁移文件
npx drizzle-kit generate

# 2. 执行迁移
npx drizzle-kit migrate

# 3. 推送 schema 到数据库（开发环境）
npx drizzle-kit push
```

### 数据库备份

```bash
# 使用 pg_dump 备份
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 使用 Neon 控制台备份
# 访问 https://console.neon.tech 创建快照
```

---

## 域名与SSL

### 自定义域名配置

1. **在 Vercel 添加域名**
   - 进入 Project Settings → Domains
   - 添加域名：例如 `yuxiji.com`

2. **配置 DNS 记录**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **SSL 证书**
   - Vercel 自动提供 SSL 证书
   - 支持自动续期

### 域名重定向

```javascript
// next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: '/old-path',
        destination: '/new-path',
        permanent: true,
      },
    ]
  },
}
```

---

## 监控与日志

### Vercel Analytics

```bash
# 启用 Web Analytics
# 在 Vercel 控制台 → Analytics 中启用

# 启用 Speed Insights
# 在 Vercel 控制台 → Speed Insights 中启用
```

### 日志查看

```bash
# 使用 Vercel CLI 查看日志
vercel logs <project-name>

# 查看实时日志
vercel logs <project-name> --follow
```

### 错误监控

建议集成 Sentry 进行错误监控：

```bash
# 安装 Sentry
pnpm add @sentry/nextjs

# 配置 Sentry
# 参考 https://docs.sentry.io/platforms/javascript/guides/nextjs/
```

---

## 回滚策略

### 自动回滚

Vercel 自动保留最近 10 个部署版本，可快速回滚：

```bash
# 通过 CLI 回滚到上一个版本
vercel rollback

# 回滚到指定版本
vercel rollback <deployment-id>
```

### 手动回滚

1. 在 Vercel 控制台进入 Deployments
2. 找到要回滚的版本
3. 点击 "..." → "Promote to Production"

### 数据库回滚

```bash
# 使用备份恢复
psql $DATABASE_URL < backup_20260115.sql
```

---

## 性能优化

### 构建优化

```javascript
// next.config.js
module.exports = {
  // 启用压缩
  compress: true,
  
  // 图片优化
  images: {
    domains: ['your-bucket.cos.ap-beijing.myqcloud.com'],
    formats: ['image/webp'],
  },
  
  // 代码分割
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}
```

### 缓存策略

```typescript
// API 路由缓存控制
export async function GET() {
  const data = await fetchData()
  
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
```

---

## 相关文档

- [快速开始](../00-core/core-quickstart-v1.0.md) - 环境搭建
- [技术栈详解](../01-architecture/arch-tech-stack-v1.0.md) - 技术选型
- [API接口文档](../03-api/api-endpoints-v1.0.md) - 接口定义

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-24 | 初始版本 | AI |
