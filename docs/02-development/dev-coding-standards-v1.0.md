# 语习集 - 编码规范

> 版本: v1.1
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
- [类型定义规范](#类型定义规范)
- [导入顺序](#导入顺序)
- [错误处理](#错误处理)
- [注释规范](#注释规范)

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
| 枚举值 | PascalCase | `DifficultyLevel` |

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

### API路由文件

```
api/
├── route-name/
│   ├── route.ts       # API端点
│   └── utils.ts       # 辅助函数
```

---

## 组件规范

### Server Component

```typescript
// 默认即为Server Component
// 用于数据获取、SEO、首屏渲染

import { getSceneById } from '@/lib/db/scenes'

export default async function SceneDetailPage({ params }: { params: { id: string } }) {
  const scene = await getSceneById(params.id)
  return <div>{scene.name}</div>
}
```

### Client Component

```typescript
'use client'

// 用于交互逻辑、浏览器 API、状态管理

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
| 使用浏览器API | Client Component |
| 使用React Hooks | Client Component |

---

## TypeScript规范

### 接口定义

```typescript
// 优先使用interface定义对象类型
interface Scene {
  id: string
  name: string
  description: string
}

// 使用泛型
interface ApiResponse<T> {
  data: T
  error?: string
}
```

### 类型别名

```typescript
// 联合类型使用type
type Difficulty = 'easy' | 'medium' | 'hard'
type Category = '日常' | '职场' | '留学' | '旅行' | '社交'

// 函数类型
type Fetcher<T> = (url: string) => Promise<T>
```

### 函数定义

```typescript
// 函数返回值明确标注
async function getSceneById(id: string): Promise<Scene | null> {
  // ...
}

// 使用箭头函数
const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
  // ...
}
```

### 枚举使用

```typescript
// 优先使用联合类型替代枚举
type TestType = 'choice' | 'qa' | 'open_dialogue'

// 如需使用枚举，使用const enum
const enum HttpStatus {
  OK = 200,
  BadRequest = 400,
  NotFound = 404,
  ServerError = 500
}
```

---

## 类型定义规范

### 全局类型 (src/types.ts)

```typescript
// Scene types
export interface Scene {
  id: string
  name: string
  description: string
  category: string
  difficulty: string
  duration: number
  tags: string[]
  dialogue: DialogueRound[]
  vocabulary: VocabularyItem[]
  createdAt?: string
  updatedAt?: string
}

// 对话内容项
export interface DialogueContent {
  index: number
  speaker: string
  speaker_name: string
  text: string
  translation: string
  audio_url: string
  is_key_qa: boolean
}

// 对话轮次
export interface DialogueRound {
  round_number: number
  content: DialogueContent[]
  analysis?: DialogueAnalysis
}

// 词汇项
export interface VocabularyItem {
  vocab_id: string
  type: string
  content: string
  phonetic: string
  translation: string
  round_number: number
  audio_url: string
  example: string
  example_translation: string
  example_audio_url: string
  difficulty?: string
}

// 测试相关
export interface TestResult {
  isCorrect: boolean
  score: number
  analysis: string
  suggestion: string
  userAnswer?: string
  correctAnswer?: string
}

// 开放式测试
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Role {
  id: string
  name: string
  description: string
  emoji: string
}

export interface Message {
  id: string
  role: 'assistant' | 'user'
  text: string
  timestamp: number
}

export interface PerformanceAnalysis {
  score: number
  fluency: number
  vocabulary: number
  accuracy: number
  summary: string
  strengths: string[]
  suggestions: string[]
}
```

### 数据库类型 (src/lib/db/schema.ts)

```typescript
// 使用Drizzle ORM的类型推断
export type Phrase = typeof phrases.$inferSelect
export type NewPhrase = typeof phrases.$inferInsert
export type PhraseExample = typeof phraseExamples.$inferSelect
export type NewPhraseExample = typeof phraseExamples.$inferInsert
export type Scene = typeof scenes.$inferSelect
export type NewScene = typeof scenes.$inferInsert
export type SceneTest = typeof sceneTests.$inferSelect
export type NewSceneTest = typeof sceneTests.$inferInsert
```

### API类型定义

```typescript
// API请求/响应类型应定义在API路由附近
// 或使用共享类型文件

interface ChatRequest {
  sceneId?: string
  conversation: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  round: number
  maxRounds: number
}

interface ChatResponse {
  message: string
  audioUrl?: string
  isEnd: boolean
  round: number
}
```

---

## 导入顺序

```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react'
import { NextRequest, NextResponse } from 'next/server'

// 2. 第三方库
import { motion } from 'framer-motion'
import { eq } from 'drizzle-orm'

// 3. 项目内部 - 绝对路径
import { db } from '@/lib/db'
import { Scene } from '@/types'
import { Button } from '@/components/Button'

// 4. 相对路径
import { utils } from './utils'
import styles from './styles.module.css'
```

---

## 错误处理

### API错误处理

```typescript
export async function GET(request: Request) {
  try {
    const data = await fetchData()
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching data:', error)
    
    // 返回结构化错误信息
    return NextResponse.json(
      { 
        error: 'Failed to fetch data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
```

### 客户端错误处理

```typescript
'use client'

import { useState } from 'react'

export function DataFetcher() {
  const [error, setError] = useState<string | null>(null)
  
  const fetchData = async () => {
    try {
      const response = await fetch('/api/data')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }
  
  // ...
}
```

---

## 注释规范

### 文件头注释

```typescript
/**
 * 大语言模型调用模块
 * 统一封装GLM-4 API调用
 */
```

### 函数注释

```typescript
/**
 * 调用GLM-4模型
 * @param messages 消息列表
 * @param temperature 温度参数
 * @param maxTokens 最大token数
 * @returns 模型响应
 */
export async function callLLM(
  messages: Message[],
  temperature: number = 0.7,
  maxTokens: number = 1000
): Promise<LLMResponse> {
  // ...
}
```

### 行内注释

```typescript
// 验证必要的参数
if (!scene || !aiRole) {
  return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
}

// 生成语音（异步，失败不影响主流程）
let audioUrl: string | undefined
try {
  audioUrl = await generateSpeech(text)
} catch (error) {
  console.error('语音生成失败:', error)
}
```

---

## 相关文档

- [API接口文档](../03-api/api-endpoints-v1.0.md)
- [项目结构文档](../01-architecture/arch-project-structure-v1.0.md)
- [数据库设计文档](../01-architecture/arch-database-schema-v1.0.md)

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.1 | 2026-02-24 | 补充类型定义规范、错误处理规范、注释规范 | AI |
| v1.0 | 2026-02-24 | 初始版本 | - |
