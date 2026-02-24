# 语习集 - 编码规范

> 版本: v1.0  
> 最后更新: 2026-02-24  
> 优先级: P1  
> 阅读时间: 15分钟

---

## 文档简介

本文档定义语习集项目的代码风格、命名规范、文件组织方式及开发最佳实践。

---

## 目录

- [命名规范](#命名规范)
- [文件组织](#文件组织)
- [组件规范](#组件规范)
- [TypeScript规范](#typescript规范)
- [导入顺序](#导入顺序)

---

## 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| React组件 | PascalCase | `SceneDetailClient.tsx` |
| Hooks | camelCase + use | `useAudio.ts` |
| 工具函数 | camelCase | `buildAudioUrl.ts` |
| 类型/接口 | PascalCase | `DialogueContent` |
| 数据库字段 | snake_case | `created_at` |
| API路由 | kebab-case | `open-test/` |
| 常量 | UPPER_SNAKE_CASE | `USE_PROXY_MODE` |

---

## 文件组织

### 组件文件

```
ComponentName/
├── ComponentName.tsx  # 组件主体
├── types.ts           # 类型定义
└── styles.module.css  # 样式
```

### 页面文件

```
page-name/
├── page.tsx           # 页面组件
├── layout.tsx         # 布局
├── error.tsx          # 错误页面
├── loading.tsx        # 加载状态
└── components/        # 页面专属组件
```

---

## 组件规范

### Server Component

```typescript
// 默认即为Server Component
import { getSceneById } from '@/lib/db/scenes'

export default async function SceneDetailPage({ params }: { params: { id: string } }) {
  const scene = await getSceneById(params.id)
  return <div>{scene.name}</div>
}
```

### Client Component

```typescript
'use client'

import { useState } from 'react'

export default function SceneDetailClient({ scene }: { scene: Scene }) {
  const [isPlaying, setIsPlaying] = useState(false)
  return <button onClick={() => setIsPlaying(true)}>播放</button>
}
```

### 选择指南

| 场景 | 推荐类型 |
|------|----------|
| 数据获取 | Server Component |
| 表单交互 | Client Component |
| 音频播放 | Client Component |
| SEO页面 | Server Component |

---

## TypeScript规范

```typescript
// 优先使用interface
interface Scene {
  id: string
  name: string
}

// 联合类型使用type
type Difficulty = 'easy' | 'medium' | 'hard'

// 函数返回值明确标注
async function getSceneById(id: string): Promise<Scene | null> {
  // ...
}
```

---

## 导入顺序

```typescript
// 1. React/Next.js
import { useState } from 'react'

// 2. 第三方库
import { motion } from 'framer-motion'

// 3. 项目内部
import { db } from '@/lib/db'

// 4. 相对路径
import { utils } from './utils'
```

---

## 相关文档

- [API接口文档](../03-api/api-endpoints-v1.0.md)
- [项目结构文档](../01-architecture/arch-project-structure-v1.0.md)

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-24 | 初始版本 | - |
