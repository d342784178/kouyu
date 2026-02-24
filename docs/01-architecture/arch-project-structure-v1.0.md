# 语习集 - 项目结构

> 版本: v1.0  
> 最后更新: 2026-02-24  
> 优先级: P1  
> 阅读时间: 10分钟

---

## 文档简介

本文档详细说明语习集项目的目录结构、文件组织规范及关键文件说明，帮助开发者快速定位代码和理解项目组织方式。

---

## 目录

- [目录结构总览](#目录结构总览)
- [详细目录说明](#详细目录说明)
- [文件命名规范](#文件命名规范)
- [组件类型规范](#组件类型规范)
- [关键文件索引](#关键文件索引)

---

## 目录结构总览

```
kouyu/
├── src/                          # 源代码目录
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API 路由
│   │   ├── scene-list/           # 场景列表页
│   │   ├── scene-detail/[id]/    # 场景详情页
│   │   ├── scene-test/[id]/      # 场景测试页
│   │   ├── phrase-library/       # 短语库页
│   │   ├── phrase-detail/[id]/   # 短语详情页
│   │   ├── profile/              # 个人中心
│   │   ├── layout.tsx            # 根布局
│   │   ├── page.tsx              # 首页
│   │   ├── SceneCard.tsx         # 场景卡片组件
│   │   └── PhraseCard.tsx        # 短语卡片组件
│   ├── components/               # 公共组件
│   ├── hooks/                    # 自定义 Hooks
│   ├── lib/                      # 工具库
│   ├── types.ts                  # 全局类型定义
│   └── styles/                   # 全局样式
├── prepare/                      # 数据准备脚本
├── demands/                      # 需求文档
├── tests/                        # 测试文件
├── .trae/                        # Trae 配置
└── package.json
```

---

## 详细目录说明

### src/app/ - 应用路由

#### API 路由 (`src/app/api/`)

| 路径 | 说明 | 关键文件 |
|------|------|----------|
| `api/scenes/` | 场景相关 API | `route.ts`, `categories/route.ts`, `[id]/route.ts`, `[id]/tests/route.ts` |
| `api/phrases/` | 短语相关 API | `route.ts`, `[id]/route.ts` |
| `api/open-test/` | 开放式测试 API | `initiate/`, `chat/`, `analyze/`, `audio/[id]/` |
| `api/fill-blank/` | 填空测试 API | `evaluate/route.ts` |
| `api/audio/` | 音频代理 | `proxy/route.ts` |

#### 页面路由

| 路径 | 说明 | 组件类型 |
|------|------|----------|
| `/` | 首页 | Client Component |
| `/scene-list` | 场景列表 | Client Component |
| `/scene-detail/[id]` | 场景详情 | Server + Client Component |
| `/scene-test/[id]` | 场景测试列表 | Server Component |
| `/scene-test/[id]/[testId]` | 具体测试 | Client Component |
| `/phrase-library` | 短语库 | Server + Client Component |
| `/phrase-detail/[id]` | 短语详情 | Server + Client Component |
| `/profile` | 个人中心 | Client Component |

### src/components/ - 公共组件

| 组件 | 说明 | 文件 |
|------|------|------|
| BottomNav | 底部导航栏 | `BottomNav.tsx` |
| CircularProgress | 圆形进度条 | `CircularProgress.tsx` |
| OpenTestDialog | 开放式测试弹窗 | `OpenTestDialog.tsx` |

### src/hooks/ - 自定义 Hooks

| Hook | 说明 | 文件 |
|------|------|------|
| useAudio | 音频播放管理 | `useAudio.ts` |

### src/lib/ - 工具库

| 模块 | 说明 | 文件 |
|------|------|------|
| db/index.ts | 数据库连接 | `db/index.ts` |
| db/schema.ts | 数据库表结构 | `db/schema.ts` |
| db/scenes.ts | 场景数据获取 | `db/scenes.ts` |
| llm.ts | LLM 调用封装 | `llm.ts` |
| audioUrl.ts | 音频 URL 构建 | `audioUrl.ts` |

---

## 文件命名规范

### 组件文件

- **React 组件**: PascalCase，如 `SceneDetailClient.tsx`
- **页面组件**: 使用 `page.tsx`（Next.js 约定）
- **布局组件**: 使用 `layout.tsx`（Next.js 约定）
- **错误页面**: 使用 `error.tsx`, `not-found.tsx`, `loading.tsx`

### 工具文件

- **Hooks**: camelCase，以 `use` 开头，如 `useAudio.ts`
- **工具函数**: camelCase，如 `audioUrl.ts`
- **类型定义**: camelCase，如 `types.ts`

### API 路由

- 使用 kebab-case 命名文件夹，如 `open-test/`, `fill-blank/`
- 每个端点必须包含 `route.ts` 文件

---

## 组件类型规范

### Server Component（服务端组件）

```typescript
// 默认即为 Server Component
// 用于数据获取、SEO、首屏渲染

import { getSceneById } from '@/lib/db/scenes'

export default async function SceneDetailPage({ params }: { params: { id: string } }) {
  const scene = await getSceneById(params.id)
  return <div>{scene.name}</div>
}
```

### Client Component（客户端组件）

```typescript
'use client'

// 用于交互逻辑、浏览器 API、状态管理

import { useState } from 'react'

export default function SceneDetailClient({ scene }: { scene: Scene }) {
  const [isPlaying, setIsPlaying] = useState(false)
  // ...
}
```

### 选择指南

| 场景 | 推荐类型 | 原因 |
|------|----------|------|
| 数据获取 | Server | 减少客户端 JS，SEO 友好 |
| 表单交互 | Client | 需要状态管理 |
| 音频播放 | Client | 需要浏览器 API |
| 动画效果 | Client | 需要 DOM 操作 |
| SEO 页面 | Server | 搜索引擎可索引 |

---

## 关键文件索引

### 配置文件

| 文件 | 说明 |
|------|------|
| `package.json` | 依赖管理、脚本定义 |
| `tsconfig.json` | TypeScript 配置 |
| `tailwind.config.ts` | Tailwind CSS 配置 |
| `next.config.js` | Next.js 配置 |
| `.env.local` | 环境变量（不提交） |

### 核心类型

| 文件 | 说明 |
|------|------|
| `src/types.ts` | 全局类型定义（Scene, Phrase, Message 等） |
| `src/lib/db/schema.ts` | 数据库表结构定义 |

### 核心工具

| 文件 | 说明 |
|------|------|
| `src/lib/llm.ts` | GLM-4 API 调用封装 |
| `src/lib/audioUrl.ts` | 音频 URL 构建工具 |
| `src/hooks/useAudio.ts` | 音频播放 Hook |

---

## 相关文档

- [技术栈详解](./arch-tech-stack-v1.0.md) - 技术选型说明
- [数据库设计](./arch-database-schema-v1.0.md) - 数据模型说明
- [编码规范](../02-development/dev-coding-standards-v1.0.md) - 代码规范

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-24 | 初始版本 | - |
