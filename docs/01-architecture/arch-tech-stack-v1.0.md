# 语习集 - 技术栈详解

> 版本: v1.0  
> 最后更新: 2026-02-24  
> 优先级: P1  
> 阅读时间: 15分钟

---

## 文档简介

本文档详细介绍语习集项目的技术栈选型、依赖版本及环境配置，帮助开发者理解技术决策背后的原因。

---

## 目录

- [技术栈概览](#技术栈概览)
- [前端技术](#前端技术)
- [后端技术](#后端技术)
- [数据存储](#数据存储)
- [AI与语音](#ai与语音)
- [开发工具](#开发工具)
- [选型理由](#选型理由)

---

## 技术栈概览

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层                                │
│  Next.js 14 + React 18 + TypeScript + Tailwind CSS         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        API层                                 │
│  Next.js API Routes + Drizzle ORM                          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        数据层                                │
│  PostgreSQL (Neon) + 腾讯云 COS                            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        AI服务层                              │
│  GLM-4-Flash (智谱AI) + Azure Speech SDK                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 前端技术

### 核心框架

| 技术 | 版本 | 用途 | 文档 |
|------|------|------|------|
| Next.js | 14.2.15 | React框架，App Router模式 | [官方文档](https://nextjs.org/docs) |
| React | ^18 | UI库 | [官方文档](https://react.dev) |
| TypeScript | ^5 | 类型安全 | [官方文档](https://www.typescriptlang.org) |

### UI与样式

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Tailwind CSS | 3.4.14 | 原子化CSS框架 | 快速构建响应式界面 |
| Framer Motion | 12.34.0 | 动画库 | 流畅的交互动画 |
| Lucide React | ^0.575.0 | 图标库 | 统一的图标系统 |

### 关键依赖

```json
{
  "next": "14.2.15",
  "react": "^18",
  "react-dom": "^18",
  "typescript": "^5",
  "tailwindcss": "^3.4.14",
  "framer-motion": "^12.34.0",
  "lucide-react": "^0.575.0"
}
```

---

## 后端技术

### 核心框架

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| Next.js API Routes | 14.2.15 | API服务 | 内置API路由，无需单独后端 |
| Drizzle ORM | ^0.45.1 | 数据库ORM | 类型安全，轻量级 |

### 数据库

| 技术 | 版本 | 用途 | 说明 |
|------|------|------|------|
| PostgreSQL | - | 关系型数据库 | Neon Serverless |
| @neondatabase/serverless | ^1.0.2 | 数据库连接 | Serverless优化 |

### 关键依赖

```json
{
  "drizzle-orm": "^0.45.1",
  "@neondatabase/serverless": "^1.0.2"
}
```

---

## 数据存储

### 数据库存储

| 服务 | 用途 | 特点 |
|------|------|------|
| Neon PostgreSQL | 结构化数据 | Serverless，自动扩缩容 |

**表结构**:
- `scenes` - 场景数据
- `phrases` - 短语数据
- `phrase_examples` - 短语示例
- `scene_tests` - 场景测试

### 文件存储

| 服务 | 用途 | 特点 |
|------|------|------|
| 腾讯云 COS | 音频文件 | CDN加速，高可用 |

**存储路径格式**:
```
COS:/scene/dialogues/{scene_id}_round{n}_{speaker}.mp3
COS:/scene/vocabulary/{scene_id}_vocab{n}_word.mp3
COS:/phrases/{phrase_id}.mp3
```

---

## AI与语音

### AI服务

| 服务 | 用途 | 特点 |
|------|------|------|
| GLM-4-Flash | 对话生成、题目分析 | 智谱AI，免费额度充足 |

**API端点**: `https://open.bigmodel.cn/api/paas/v4/chat/completions`

### 语音服务

| 服务 | 用途 | 特点 |
|------|------|------|
| Azure Speech SDK | 语音合成(TTS) | 高质量，多音色 |

**配置参数**:
- 默认音色: `en-US-AriaNeural`
- 语速: 1.2倍速
- 输出格式: MP3, 16Khz, 32Kbps

### 关键依赖

```json
{
  "microsoft-cognitiveservices-speech-sdk": "^1.48.0"
}
```

---

## 开发工具

### 代码质量

| 工具 | 版本 | 用途 |
|------|------|------|
| ESLint | ^8 | 代码检查 |
| eslint-config-next | 14.2.15 | Next.js规则 |
| TypeScript | ^5 | 类型检查 |

### 测试工具

| 工具 | 版本 | 用途 |
|------|------|------|
| Playwright | ^1.58.2 | E2E测试 |

### 构建工具

| 工具 | 版本 | 用途 |
|------|------|------|
| pnpm | >=8.0 | 包管理 |
| PostCSS | ^8.4.47 | CSS处理 |
| Autoprefixer | ^10.4.20 | CSS前缀 |

---

## 选型理由

### 为什么选择Next.js？

1. **全栈能力**: 前后端一体化，减少技术栈复杂度
2. **App Router**: 最新的路由模式，支持Server Components
3. **性能优化**: 内置图片优化、代码分割、预渲染
4. **部署便利**: 与Vercel深度集成，一键部署

### 为什么选择Drizzle ORM？

1. **类型安全**: 完整的TypeScript支持
2. **轻量级**: 体积小，性能好
3. **SQL-like API**: 接近原生SQL的查询语法
4. **迁移支持**: 完善的数据库迁移工具

### 为什么选择Neon？

1. **Serverless**: 按需付费，自动扩缩容
2. **分支功能**: 支持数据库分支，方便开发测试
3. **连接池**: 内置连接池管理
4. **Vercel集成**: 与Vercel深度集成

### 为什么选择GLM-4-Flash？

1. **免费额度**: 充足的免费调用额度
2. **中文优化**: 对中文场景优化良好
3. **响应速度**: 响应速度快，适合实时对话
4. **API稳定**: 智谱AI服务稳定可靠

### 为什么选择Azure Speech？

1. **音质优秀**: 神经网络语音，音质自然
2. **多语言**: 支持多种语言和口音
3. **SSML支持**: 支持语音标记语言，精细控制
4. **稳定性**: 微软服务稳定可靠

---

## 环境变量

### 必需配置

```env
# 数据库
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# AI服务
GLM_API_KEY=your_glm_api_key
GLM_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
GLM_MODEL=glm-4-flash

# 音频存储
NEXT_PUBLIC_COS_BASE_URL=https://your-bucket.cos.ap-region.myqcloud.com

# Azure语音
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_region
```

### 获取配置

| 配置项 | 获取地址 |
|--------|----------|
| DATABASE_URL | [Neon控制台](https://console.neon.tech) |
| GLM_API_KEY | [智谱AI开放平台](https://open.bigmodel.cn) |
| COS_BASE_URL | [腾讯云COS控制台](https://console.cloud.tencent.com/cos) |
| AZURE_SPEECH_KEY | [Azure门户](https://portal.azure.com) |

---

## 浏览器支持

- **推荐**: Microsoft Edge, Chrome 90+
- **支持**: Firefox 88+, Safari 14+
- **移动端**: iOS Safari, Chrome Android

---

## 相关文档

- [项目概述](../00-core/core-project-overview-v1.0.md) - 项目背景和目标
- [项目结构](./arch-project-structure-v1.0.md) - 代码组织方式
- [数据库设计](./arch-database-schema-v1.0.md) - 数据模型说明

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-24 | 初始版本 | - |
