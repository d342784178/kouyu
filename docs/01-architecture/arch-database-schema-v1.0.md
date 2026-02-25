# 语习集 - 数据库设计

> 版本: v1.1
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
- [索引设计](#索引设计)

---

## 表结构概览

| 表名 | 说明 | 主要字段 | 数据量 |
|------|------|----------|--------|
| `scenes` | 场景表 | 对话内容、词汇、分类、难度 | 111条 |
| `phrases` | 短语表 | 英文短语、中文翻译、音频URL | 约200条 |
| `phrase_examples` | 短语示例表 | 示例句子、用法说明 | 约400条 |
| `scene_tests` | 场景测试表 | 测试题目、类型、内容 | 约300条 |

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
| `id` | text | ✅ | 主键，格式：`{category_prefix}_{number}`，如 `daily_001` |
| `name` | text | ✅ | 场景名称，如"餐厅点餐" |
| `category` | text | ✅ | 分类：`日常`/`职场`/`留学`/`旅行`/`社交` |
| `description` | text | ✅ | 场景描述，简要说明场景内容 |
| `difficulty` | text | ✅ | 难度：`初级`/`中级`/`高级` |
| `duration` | integer | - | 学习时长（分钟），默认10分钟 |
| `tags` | jsonb | - | 关键词标签数组，如 `["餐厅", "点餐", "食物"]` |
| `dialogue` | jsonb | - | 对话内容（扁平数组格式） |
| `vocabulary` | jsonb | - | 高频词汇数组 |
| `created_at` | text | - | 创建时间 |
| `updated_at` | text | - | 更新时间 |

### dialogue 字段格式

```typescript
interface DialogueContent {
  index: number;           // 对话项索引，从1开始
  round_number: number;    // 轮次编号
  speaker: string;         // 说话人标识，如 "waiter", "customer"
  speaker_name: string;    // 说话人名称，如 "服务员", "顾客"
  text: string;           // 英文内容
  translation: string;    // 中文翻译
  audio_url: string;      // 音频URL
  is_key_qa: boolean;     // 是否是关键问答（学习重点）
}
```

**示例:**

```json
{
  "index": 1,
  "round_number": 1,
  "speaker": "waiter",
  "speaker_name": "服务员",
  "text": "Welcome to our restaurant! Do you have a reservation?",
  "translation": "欢迎光临！您有预约吗？",
  "audio_url": "https://xxx.cos.ap-beijing.myqcloud.com/scene/daily_001/dialogues/daily_001_round1_waiter.mp3",
  "is_key_qa": true
}
```

### vocabulary 字段格式

```typescript
interface VocabularyItem {
  vocab_id: string;              // 词汇唯一标识
  type: 'word' | 'phrase';       // 类型：单词或短语
  content: string;              // 英文内容
  phonetic: string;             // 音标
  translation: string;          // 中文翻译
  round_number: number;         // 所属对话轮次
  audio_url: string;            // 词汇音频URL
  example: string;              // 例句
  example_translation: string;  // 例句翻译
  example_audio_url: string;    // 例句音频URL
  difficulty: 'easy' | 'medium' | 'hard';  // 难度
}
```

**示例:**

```json
{
  "vocab_id": "vocab_001",
  "type": "phrase",
  "content": "make a reservation",
  "phonetic": "/meɪk ə ˌrezərˈveɪʃn/",
  "translation": "预约",
  "round_number": 1,
  "audio_url": "https://xxx.cos.ap-beijing.myqcloud.com/scene/daily_001/vocabulary/daily_001_vocab1_phrase.mp3",
  "example": "I'd like to make a reservation for two.",
  "example_translation": "我想预约两个人的位置。",
  "example_audio_url": "https://xxx.cos.ap-beijing.myqcloud.com/scene/daily_001/vocabulary/daily_001_vocab1_example.mp3",
  "difficulty": "easy"
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
| `id` | text | ✅ | 主键，格式：`phrase_{number}` |
| `english` | text | ✅ | 英文短语 |
| `chinese` | text | ✅ | 中文翻译 |
| `part_of_speech` | text | ✅ | 词性，如 `phrase`, `verb`, `noun` |
| `scene` | text | ✅ | 适用场景名称，如"餐厅" |
| `difficulty` | text | ✅ | 难度：`初级`/`中级`/`高级` |
| `pronunciation_tips` | text | ✅ | 发音提示和技巧 |
| `audio_url` | text | - | 音频文件URL |
| `created_at` | text | - | 创建时间 |
| `updated_at` | text | - | 更新时间 |

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

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | serial | ✅ | 自增主键 |
| `phrase_id` | text | ✅ | 关联的短语ID，外键 |
| `title` | text | ✅ | 示例标题，如"餐厅预约" |
| `desc` | text | ✅ | 示例描述，说明使用场景 |
| `english` | text | ✅ | 英文例句 |
| `chinese` | text | ✅ | 中文翻译 |
| `usage` | text | ✅ | 用法说明 |
| `audio_url` | text | - | 例句音频URL |
| `created_at` | text | - | 创建时间 |
| `updated_at` | text | - | 更新时间 |

### 关联关系

- 一个短语（`phrases`）可以有多个示例（`phrase_examples`）
- 通过 `phrase_id` 建立一对多关系

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

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | text | ✅ | 主键，格式：`test_{scene_id}_{number}` |
| `scene_id` | text | ✅ | 关联的场景ID，外键 |
| `type` | text | ✅ | 测试类型：`choice`/`qa`/`open_dialogue` |
| `order` | integer | ✅ | 题目顺序，从1开始 |
| `content` | jsonb | ✅ | 题目内容（JSON格式，根据类型不同结构不同） |
| `created_at` | text | - | 创建时间 |
| `updated_at` | text | - | 更新时间 |

### content 字段格式

根据 `type` 不同，`content` 有不同的结构：

#### 1. choice（选择题）

```typescript
interface ChoiceContent {
  question: string;        // 问题
  options: string[];       // 选项数组
  correctAnswer: number;   // 正确答案索引（从0开始）
}
```

**示例:**

```json
{
  "question": "What does 'make a reservation' mean?",
  "options": ["预约", "点餐", "付款", "离开"],
  "correctAnswer": 0
}
```

#### 2. qa（问答题）

```typescript
interface QAContent {
  question: string;        // 问题
  suggestedAnswer: string; // 参考答案
  keywords: string[];      // 评分关键词
}
```

**示例:**

```json
{
  "question": "How would you ask for the bill in a restaurant?",
  "suggestedAnswer": "Could I have the bill, please?",
  "keywords": ["bill", "check", "pay"]
}
```

#### 3. open_dialogue（开放式对话）

```typescript
interface OpenDialogueContent {
  topic: string;           // 对话主题
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  maxRounds?: number;      // 最大对话轮数，默认5-8轮
  scene?: string;          // 场景名称（缓存用）
  aiRole?: string;         // AI角色（缓存用）
  userRole?: string;       // 用户角色（缓存用）
  dialogueGoal?: string;   // 对话目标（缓存用）
  questionAnalysis?: {     // 题目分析结果（缓存用）
    scene: string;
    roles: string[];
    dialogueGoal: string;
  };
}
```

**示例:**

```json
{
  "topic": "在餐厅点餐",
  "difficulty": "intermediate",
  "maxRounds": 6,
  "questionAnalysis": {
    "scene": "餐厅",
    "roles": ["顾客", "服务员"],
    "dialogueGoal": "顾客向服务员点餐"
  }
}
```

---

## 场景分类

| 分类 | ID前缀 | 数量 | 说明 |
|------|--------|------|------|
| 日常 | `daily_` | 31 | 餐厅、购物、银行等日常场景 |
| 职场 | `workplace_` | 25 | 会议、面试、邮件等职场场景 |
| 留学 | `study_abroad_` | 15 | 选课、宿舍、论文等留学场景 |
| 旅行 | `travel_` | 20 | 机场、酒店、景点等旅行场景 |
| 社交 | `social_` | 20 | 聚会、约会、介绍等社交场景 |
| **总计** | - | **111** | - |

---

## 数据查询示例

### 获取场景详情

```typescript
// 使用 Drizzle ORM
const scene = await db.query.scenes.findFirst({
  where: eq(scenes.id, 'daily_001')
})

// 使用原始 SQL (Neon)
const neonSql = neon(process.env.DATABASE_URL || '')
const result = await neonSql`SELECT * FROM scenes WHERE id = ${'daily_001'}`
```

### 获取场景列表（带分页和筛选）

```typescript
// 分页查询
const scenes = await db.query.scenes.findMany({
  where: eq(scenes.category, '日常'),
  limit: 10,
  offset: 0
})

// 搜索查询
const searchPattern = '%餐厅%'
const result = await neonSql`
  SELECT * FROM scenes 
  WHERE name ILIKE ${searchPattern} 
     OR description ILIKE ${searchPattern}
     OR tags::text ILIKE ${searchPattern}
  ORDER BY category, name 
  LIMIT 10 OFFSET 0
`
```

### 获取场景的测试题目

```typescript
const tests = await db.query.sceneTests.findMany({
  where: eq(sceneTests.sceneId, 'daily_001'),
  orderBy: asc(sceneTests.order)
})
```

### 获取短语及其示例

```typescript
// 获取短语
const phrase = await db.query.phrases.findFirst({
  where: eq(phrases.id, 'phrase_001')
})

// 获取该短语的所有示例
const examples = await db.query.phraseExamples.findMany({
  where: eq(phraseExamples.phraseId, 'phrase_001')
})
```

---

## 数据格式规范

### 字段值规范

| 字段 | 允许值 | 说明 |
|------|--------|------|
| `category` | `日常`, `职场`, `留学`, `旅行`, `社交` | 使用中文 |
| `difficulty` | `初级`, `中级`, `高级` | 使用中文 |
| `type` (scene_tests) | `choice`, `qa`, `open_dialogue` | 使用英文小写 |
| `type` (vocabulary) | `word`, `phrase` | 使用英文小写 |

### ID生成规则

| 表 | ID格式 | 示例 |
|----|--------|------|
| scenes | `{prefix}_{number}` | `daily_001`, `workplace_025` |
| phrases | `phrase_{number}` | `phrase_001` |
| scene_tests | `test_{scene_id}_{number}` | `test_daily_001_01` |
| phrase_examples | 自增整数 | `1`, `2`, `3` |

### 音频URL规范

| 类型 | URL格式 |
|------|---------|
| 场景对话 | `{cosBaseUrl}/scene/dialogues/{scene_id}_round{n}_{speaker}.mp3` |
| 场景词汇 | `{cosBaseUrl}/scene/vocabulary/{scene_id}_vocab{n}_{type}.mp3` |
| 短语 | `{cosBaseUrl}/phrases/{phrase_id}.mp3` |
| 短语示例 | `{cosBaseUrl}/phrases/examples/ex_{id}.mp3` |

---

## 索引设计

### 现有索引

PostgreSQL 会自动为主键和外键创建索引。

### 推荐索引

为提高查询性能，建议创建以下索引：

```sql
-- 场景分类查询索引
CREATE INDEX idx_scenes_category ON scenes(category);

-- 场景名称搜索索引
CREATE INDEX idx_scenes_name ON scenes(name);

-- 测试题目场景关联索引
CREATE INDEX idx_scene_tests_scene_id ON scene_tests(scene_id);

-- 短语示例关联索引
CREATE INDEX idx_phrase_examples_phrase_id ON phrase_examples(phrase_id);

-- 场景搜索索引（用于全文搜索）
CREATE INDEX idx_scenes_search ON scenes USING gin(to_tsvector('chinese', name || ' ' || description));
```

---

## 相关文档

- [技术栈详解](./arch-tech-stack-v1.0.md)
- [项目结构](./arch-project-structure-v1.0.md)
- [API接口文档](../03-api/api-endpoints-v1.0.md)

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.1 | 2026-02-24 | 补充scene_tests.content字段详细格式、phrase_examples字段说明、索引设计建议 | AI |
| v1.0 | 2026-02-24 | 初始版本 | - |
