# 语习集 - 数据库设计

> 版本: v1.0  
> 最后更新: 2026-02-24  
> 优先级: P1  
> 阅读时间: 20分钟

---

## 文档简介

本文档详细说明语习集项目的数据库表结构、字段定义、数据格式规范及使用示例。

---

## 目录

- [表结构概览](#表结构概览)
- [scenes 表](#scenes-表)
- [phrases 表](#phrases-表)
- [phrase_examples 表](#phrase_examples-表)
- [scene_tests 表](#scene_tests-表)
- [场景分类](#场景分类)
- [数据查询示例](#数据查询示例)
- [数据格式规范](#数据格式规范)

---

## 表结构概览

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `scenes` | 场景表 | 对话内容、词汇、分类、难度 |
| `phrases` | 短语表 | 英文短语、中文翻译、音频URL |
| `phrase_examples` | 短语示例表 | 示例句子、用法说明 |
| `scene_tests` | 场景测试表 | 测试题目、类型、内容 |

---

## scenes 表

### 表定义

```typescript
// src/lib/db/schema.ts
export const scenes = pgTable('scenes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  difficulty: text('difficulty').notNull(),
  duration: integer('duration').default(10),
  tags: jsonb('tags'),
  dialogue: jsonb('dialogue'),
  vocabulary: jsonb('vocabulary'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
})
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | text | ✅ | 主键，格式：`daily_001` |
| `name` | text | ✅ | 场景名称 |
| `category` | text | ✅ | 分类：`日常`/`职场`/`留学`/`旅行`/`社交` |
| `description` | text | ✅ | 场景描述 |
| `difficulty` | text | ✅ | 难度：`初级`/`中级`/`高级` |
| `duration` | integer | - | 学习时长（分钟） |
| `tags` | jsonb | - | 关键词标签数组 |
| `dialogue` | jsonb | - | 对话内容（扁平数组） |
| `vocabulary` | jsonb | - | 高频词汇数组 |

### dialogue 字段格式

```typescript
interface DialogueContent {
  index: number;
  round_number: number;
  speaker: string;
  speaker_name: string;
  text: string;
  translation: string;
  audio_url: string;
  is_key_qa: boolean;
}
```

### vocabulary 字段格式

```typescript
interface VocabularyItem {
  vocab_id: string;
  type: 'word' | 'phrase';
  content: string;
  phonetic: string;
  translation: string;
  audio_url: string;
  example: string;
  example_translation: string;
  example_audio_url: string;
  round_number: number;
  difficulty: 'easy' | 'medium' | 'hard';
}
```

---

## phrases 表

### 表定义

```typescript
export const phrases = pgTable('phrases', {
  id: text('id').primaryKey(),
  english: text('english').notNull(),
  chinese: text('chinese').notNull(),
  partOfSpeech: text('part_of_speech').notNull(),
  scene: text('scene').notNull(),
  difficulty: text('difficulty').notNull(),
  pronunciationTips: text('pronunciation_tips').notNull(),
  audioUrl: text('audio_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
})
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | text | ✅ | 主键 |
| `english` | text | ✅ | 英文短语 |
| `chinese` | text | ✅ | 中文翻译 |
| `partOfSpeech` | text | ✅ | 词性 |
| `scene` | text | ✅ | 适用场景 |
| `difficulty` | text | ✅ | 难度 |
| `pronunciationTips` | text | ✅ | 发音提示 |
| `audioUrl` | text | - | 音频URL |

---

## phrase_examples 表

### 表定义

```typescript
export const phraseExamples = pgTable('phrase_examples', {
  id: serial('id').primaryKey(),
  phraseId: text('phrase_id').notNull().references(() => phrases.id),
  title: text('title').notNull(),
  desc: text('desc').notNull(),
  english: text('english').notNull(),
  chinese: text('chinese').notNull(),
  usage: text('usage').notNull(),
  audioUrl: text('audio_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
})
```

---

## scene_tests 表

### 表定义

```typescript
export const sceneTests = pgTable('scene_tests', {
  id: text('id').primaryKey(),
  sceneId: text('scene_id').notNull().references(() => scenes.id),
  type: text('type').notNull(),
  order: integer('order').notNull(),
  content: jsonb('content').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
})
```

---

## 场景分类

| 分类 | ID前缀 | 数量 |
|------|--------|------|
| 日常 | `daily_` | 31 |
| 职场 | `workplace_` | 25 |
| 留学 | `study_abroad_` | 15 |
| 旅行 | `travel_` | 20 |
| 社交 | `social_` | 20 |
| **总计** | - | **111** |

---

## 数据查询示例

```typescript
// 获取场景详情
const scene = await db.query.scenes.findFirst({
  where: eq(scenes.id, 'daily_001')
})

// 获取场景列表
const scenes = await db.query.scenes.findMany({
  where: eq(scenes.category, '日常'),
  limit: 10
})
```

---

## 数据格式规范

- **category**: 使用中文（`日常`、`职场`、`留学`、`旅行`、`社交`）
- **difficulty**: 使用中文（`初级`、`中级`、`高级`）
- **音频字段**: 统一使用 `audio_url`
- **dialogue格式**: 使用扁平数组格式

---

## 相关文档

- [技术栈详解](./arch-tech-stack-v1.0.md)
- [项目结构](./arch-project-structure-v1.0.md)

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-24 | 初始版本 | - |
