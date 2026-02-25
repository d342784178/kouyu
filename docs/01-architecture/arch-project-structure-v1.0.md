# 语习集 - 项目结构

> 版本: v1.2  
> 最后更新: 2026-02-25  
> 优先级: P1  
> 阅读时间: 15分钟

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
├── prepare/                      # 数据准备脚本（详见下方说明）
├── demands/                      # 需求文档（详见下方说明）
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

## 数据准备目录 (prepare/)

`prepare/` 文件夹包含项目的数据准备脚本、原始数据和音频资源，用于初始化和管理场景数据、短语数据及其相关音频文件。该目录是项目数据资产的核心存储区域。

### 目录结构

```
prepare/
├── phrases/                      # 短语数据准备
│   ├── data/                     # 短语数据和音频
│   │   ├── phrases_100_quality.json    # 100个高质量短语JSON
│   │   ├── phrases_100_quality.sql     # PostgreSQL插入脚本
│   │   └── audio/                # 音频文件（300个MP3）
│   │       ├── phrases/          # 100个短语音频
│   │       └── examples/         # 200个示例音频
│   ├── scripts/                  # 数据处理脚本
│   │   ├── generate_audio_edge_tts.py       # 生成音频(edge-tts)
│   │   ├── upload_audio_and_update_json.ts  # 上传音频到Vercel Blob
│   │   ├── generate_and_upload_all.py       # 一键生成并上传
│   │   ├── reinit_database.ts               # 重新初始化数据库
│   │   └── verify_database.ts               # 验证数据库数据
│   ├── docs/                     # 交付文档
│   ├── requirements.txt          # Python依赖
│   └── README.md                 # 短语数据说明
│
└── scene/                        # 场景数据准备
    ├── data/                     # 场景数据和音频
    │   ├── scenes_final.json           # 最终场景数据
    │   ├── scene_tests.json            # 测试题数据
    │   └── audio/                # 场景音频文件
    │       └── dialogues/        # 对话音频
    ├── scripts/                  # 数据处理脚本
    │   ├── scene-manager.ts             # 场景管理主脚本
    │   ├── generate-scene-tests.ts      # 生成测试数据
    │   ├── generate_scenes_100.js       # 生成100个场景
    │   └── generate_scene_audio.py      # 生成音频文件
    └── README.md                 # 场景数据说明
```

### 短语数据 (prepare/phrases/)

包含 **100个高质量英语连读短语** 的完整数据包，每个短语配有2个真实场景示例句和对应的音频文件。

| 资源类型 | 数量 | 说明 |
|----------|------|------|
| 短语 | 100个 | 含连读说明、音标、场景分类 |
| 示例句 | 200个 | 真实场景对话，无模板化内容 |
| 音频文件 | 300个 | 短语音频100个 + 示例音频200个 |

**核心脚本说明**:

| 脚本 | 功能 | 使用场景 |
|------|------|----------|
| `generate_audio_edge_tts.py` | 使用 edge-tts 生成音频 | 首次生成或更新音频 |
| `upload_audio_and_update_json.ts` | 上传音频到 Vercel Blob | 音频生成后上传 |
| `reinit_database.ts` | 重新初始化数据库 | 数据更新后重置数据库 |
| `verify_database.ts` | 验证数据库数据完整性 | 数据导入后检查 |

**快速使用**:
```bash
# 一键生成音频并上传
python prepare/phrases/scripts/generate_and_upload_all.py

# 重新初始化数据库
npx ts-node prepare/phrases/scripts/reinit_database.ts
```

### 场景数据 (prepare/scene/)

包含 **111个英语口语场景** 的完整数据包（日常30个、职场25个、留学20个、旅行15个、社交20个），每个场景包含多轮对话、词汇学习和测试题目。

| 资源类型 | 数量 | 说明 |
|----------|------|------|
| 场景 | 111个 | 含对话、词汇、解析 |
| 测试题 | 约666道 | 选择题、问答题、开放式对话 |
| 音频文件 | 1000+ | 对话音频，存储于腾讯云COS |

**核心脚本说明**:

| 脚本 | 功能 | 使用场景 |
|------|------|----------|
| `scene-manager.ts` | 场景数据管理（测试/更新/重置/验证） | 日常数据维护 |
| `generate-scene-tests.ts` | 自动生成场景测试题 | 新增场景后生成测试 |
| `generate_scenes_100.js` | 使用GLM API生成场景数据 | 批量生成新场景 |
| `generate_scene_audio.py` | 使用edge-tts生成音频 | 生成场景对话音频 |

**快速使用**:
```bash
# 生成测试数据并导入
npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate-and-import

# 重置数据库场景数据
npx ts-node prepare/scene/scripts/scene-manager.ts reset

# 验证音频URL
npx ts-node prepare/scene/scripts/scene-manager.ts verify
```

### 音频存储说明

| 数据类型 | 存储平台 | URL协议 | 说明 |
|----------|----------|---------|------|
| 短语音频 | Vercel Blob | `https://` | 全球CDN分发 |
| 场景音频 | 腾讯云COS | `COS:/` | 国内访问优化 |

**COS:/ 协议解析**: 场景音频URL使用 `COS:/` 前缀，由 `buildAudioUrl` 函数解析为完整URL：
- 格式: `COS:/scene/dialogues/{scene_id}_round{n}_speaker{x}.mp3`
- 示例: `COS:/scene/dialogues/daily_001_round1_speaker1.mp3`

---

## 需求文档目录 (demands/)

`demands/` 文件夹包含产品需求文档、技术设计文档和交互原型，是了解产品功能和设计规范的重要入口。

### 文档清单

| 文档路径 | 内容说明 | 适用读者 |
|----------|----------|----------|
| `demands/需求文档.md` | v1 全量需求文档 | 产品经理、开发 |
| `demands/v2/需求文档.md` | v2 增量需求（场景学习、AI对话） | 产品经理、开发 |
| `demands/设计文档.md` | v1 技术设计 | 开发 |
| `demands/v2/设计文档/技术设计文档.md` | 增量技术架构设计 | 开发 |
| `demands/v2/设计文档/英语口语场景数据模型设计.md` | 场景数据模型详细设计 | 后端开发 |
| `demands/交互风格说明文档.md` | 项目UI/UX 设计规范 | 设计师、前端开发 |
| `demands/原型图/yuxiji/` | 高保真交互原型（React+Vite项目） | 设计师、开发 |

### 快速导航

- **产品经理** → 阅读 `需求文档.md` 和 `v2/需求文档.md`
- **UI/UX设计师** → 阅读 `交互风格说明文档.md` 和查看原型图
- **前端开发** → 阅读 `v2/设计文档/技术设计文档.md` 的组件设计章节
- **后端开发** → 阅读 `v2/设计文档/技术设计文档.md` 的数据模型和API章节

---

## 相关文档

- [技术栈详解](./arch-tech-stack-v1.0.md) - 技术选型说明
- [数据库设计](./arch-database-schema-v1.0.md) - 数据模型说明
- [编码规范](../02-development/dev-coding-standards-v1.0.md) - 代码规范

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.2 | 2026-02-25 | 新增 prepare/ 目录详细说明 | AI |
| v1.1 | 2026-02-24 | 新增 demands/ 目录详细说明 | AI |
| v1.0 | 2026-02-24 | 初始版本 | - |
