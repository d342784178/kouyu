# 语习集 - API接口文档

> 版本: v1.6
> 最后更新: 2026-03-01
> 优先级: P1
> 阅读时间: 30分钟

---

## 文档简介

本文档详细定义语习集项目的所有API接口，包括请求/响应格式、错误码说明及使用示例。

---

## 目录

- [接口概览](#接口概览)
- [通用规范](#通用规范)
- [场景API](#场景api)
- [短语API](#短语api)
- [开放式测试API](#开放式测试api)
- [音频API](#音频api)
- [跟读评测API](#跟读评测api)
- [填空测试API](#填空测试api)
- [情景再现评测API](#情景再现评测api)
- [错误码](#错误码)

---

## 接口概览

| 模块 | 基础路径 | 说明 |
|------|----------|------|
| 场景 | `/api/scenes` | 场景列表、详情、测试题 |
| 短语 | `/api/phrases` | 短语列表、详情 |
| 开放式测试 | `/api/open-test` | 对话初始化、交互、分析 |
| 音频 | `/api/audio` | 音频代理、语音生成 |
| 跟读评测 | `/api/shadowing` | 发音评测（Microsoft Speech SDK） |
| 填空测试 | `/api/fill-blank` | 填空题评估 |
| 情景再现评测 | `/api/guided-roleplay` | 情景再现题评测（GLM-4-Flash） |
| 子场景 | `/api/sub-scenes` | 子场景详情、练习题、AI对话、对话后处理 |

---

## 通用规范

### 请求格式

- 所有请求和响应均使用 JSON 格式
- 字符编码：UTF-8
- 时间格式：ISO 8601

### 响应结构

```typescript
interface ApiResponse<T> {
  data?: T           // 响应数据
  error?: string     // 错误信息
  details?: string   // 详细错误说明
}
```

### 分页参数

列表接口支持以下分页参数：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码，从1开始 |
| pageSize | number | 否 | 10 | 每页数量，最大100 |

分页响应结构：

```typescript
interface Pagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasMore: boolean
}
```

---

## 场景API

### GET /api/scenes

获取场景列表。

#### 请求参数

**Query参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |
| category | string | 否 | 分类筛选：`日常`/`职场`/`留学`/`旅行`/`社交`/`全部` |
| search | string | 否 | 搜索关键词，匹配名称、描述、标签 |

#### 响应示例

```json
{
  "data": [
    {
      "id": "daily_001",
      "name": "餐厅点餐",
      "category": "日常",
      "description": "在餐厅点餐的常用对话",
      "difficulty": "初级",
      "duration": 10,
      "tags": ["餐厅", "点餐", "食物"],
      "dialogue": [...],
      "vocabulary": [...],
      "createdAt": "2026-01-15T08:30:00Z",
      "updatedAt": "2026-01-15T08:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalCount": 111,
    "totalPages": 12,
    "hasMore": true
  }
}
```

---

### GET /api/scenes/categories

获取所有场景分类。

#### 响应示例

```json
{
  "data": ["日常", "职场", "留学", "旅行", "社交"]
}
```

---

### GET /api/scenes/[id]

获取场景详情。

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 场景ID，如 `daily_001` |

#### 响应示例

```json
{
  "id": "daily_001",
  "name": "餐厅点餐",
  "category": "日常",
  "description": "在餐厅点餐的常用对话",
  "difficulty": "初级",
  "duration": 10,
  "tags": ["餐厅", "点餐", "食物"],
  "dialogue": [
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
  ],
  "vocabulary": [
    {
      "vocab_id": "vocab_001",
      "type": "phrase",
      "content": "make a reservation",
      "phonetic": "/meɪk ə ˌrezərˈveɪʃn/",
      "translation": "预约",
      "audio_url": "https://xxx.cos.ap-beijing.myqcloud.com/scene/daily_001/vocabulary/daily_001_vocab1_phrase.mp3",
      "example": "I'd like to make a reservation for two.",
      "example_translation": "我想预约两个人的位置。",
      "example_audio_url": "https://xxx.cos.ap-beijing.myqcloud.com/scene/daily_001/vocabulary/daily_001_vocab1_example.mp3",
      "round_number": 1,
      "difficulty": "easy"
    }
  ],
  "createdAt": "2026-01-15T08:30:00Z",
  "updatedAt": "2026-01-15T08:30:00Z"
}
```

---

### GET /api/scenes/[id]/tests

获取场景的测试题目。

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 场景ID |

#### 响应示例

```json
[
  {
    "id": "test_daily_001_01",
    "sceneId": "daily_001",
    "type": "choice",
    "order": 1,
    "content": {
      "question": "What does 'make a reservation' mean?",
      "options": ["预约", "点餐", "付款", "离开"],
      "correctAnswer": 0
    },
    "createdAt": "2026-01-15T08:30:00Z",
    "updatedAt": "2026-01-15T08:30:00Z"
  },
  {
    "id": "test_daily_001_02",
    "sceneId": "daily_001",
    "type": "open_dialogue",
    "order": 2,
    "content": {
      "topic": "在餐厅点餐",
      "difficulty": "intermediate"
    },
    "createdAt": "2026-01-15T08:30:00Z",
    "updatedAt": "2026-01-15T08:30:00Z"
  }
]
```

**测试类型说明:**

| 类型 | 说明 |
|------|------|
| `choice` | 选择题 |
| `qa` | 问答题 |
| `open_dialogue` | 开放式对话测试 |
| `fill_blank` | 填空题（Pattern Drill） |
| `guided_roleplay` | 情景再现题 |
| `vocab_activation` | 词汇激活题 |

---

## 短语API

### GET /api/phrases

获取所有短语列表。

#### 响应示例

```json
[
  {
    "id": "phrase_001",
    "english": "make a reservation",
    "chinese": "预约",
    "partOfSpeech": "phrase",
    "scene": "餐厅",
    "difficulty": "初级",
    "pronunciationTips": "注意 reservation 的重音在第三音节",
    "audioUrl": "https://xxx.cos.ap-beijing.myqcloud.com/phrases/phrase_001.mp3",
    "createdAt": "2026-01-15T08:30:00Z",
    "updatedAt": "2026-01-15T08:30:00Z"
  }
]
```

---

### GET /api/phrases/[id]

获取短语详情（包含示例）。

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 短语ID |

#### 响应示例

```json
{
  "phrase": {
    "id": "phrase_001",
    "english": "make a reservation",
    "chinese": "预约",
    "partOfSpeech": "phrase",
    "scene": "餐厅",
    "difficulty": "初级",
    "pronunciationTips": "注意 reservation 的重音在第三音节",
    "audioUrl": "https://xxx.cos.ap-beijing.myqcloud.com/phrases/phrase_001.mp3",
    "createdAt": "2026-01-15T08:30:00Z",
    "updatedAt": "2026-01-15T08:30:00Z"
  },
  "examples": [
    {
      "id": 1,
      "phraseId": "phrase_001",
      "title": "餐厅预约",
      "desc": "在餐厅预约座位的常用表达",
      "english": "I'd like to make a reservation for two at 7 PM.",
      "chinese": "我想预约晚上7点两个人的位置。",
      "usage": "用于电话或现场预约餐厅",
      "audioUrl": "https://xxx.cos.ap-beijing.myqcloud.com/phrases/examples/ex_001.mp3",
      "createdAt": "2026-01-15T08:30:00Z",
      "updatedAt": "2026-01-15T08:30:00Z"
    }
  ]
}
```

---

## 开放式测试API

### POST /api/open-test/initiate

初始化开放式对话测试。

#### 请求体

```typescript
interface InitiateRequest {
  sceneId?: string        // 场景ID（可选）
  testId?: string         // 测试ID（可选）
  scene: string          // 场景名称，如"餐厅"
  aiRole: string         // AI角色，如"服务员"
  userRole: string       // 用户角色，如"顾客"
  dialogueGoal: string   // 对话目标，如"点餐"
  difficultyLevel: 'Beginner' | 'Intermediate' | 'Advanced'
}
```

#### 响应示例

```json
{
  "message": "Welcome to our restaurant! What can I get for you today?",
  "audioUrl": "https://xxx.vercel.blob/audio_xxx.mp3",
  "isEnd": false,
  "round": 1
}
```

---

### POST /api/open-test/chat

继续对话交互。

#### 请求体

```typescript
interface ChatRequest {
  sceneId?: string
  testId?: string
  scene: string
  aiRole: string
  userRole: string
  dialogueGoal: string
  difficultyLevel: 'Beginner' | 'Intermediate' | 'Advanced'
  conversation: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  round: number        // 当前轮数
  maxRounds: number    // 最大轮数
}
```

#### 响应示例

```json
{
  "message": "Sure! Would you like any drinks with that?",
  "audioUrl": "https://xxx.vercel.blob/audio_xxx.mp3",
  "isEnd": false,
  "round": 2
}
```

---

### POST /api/open-test/analyze

分析测试题目，提取场景、角色和对话目标。

#### 请求体

```typescript
interface AnalyzeRequest {
  topic: string         // 测试题目内容
  testId?: string       // 测试ID（用于缓存）
  sceneId?: string      // 场景ID
  sceneName?: string    // 场景名称
}
```

#### 响应示例

```json
{
  "scene": "餐厅",
  "roles": ["顾客", "服务员"],
  "dialogueGoal": "顾客向服务员点餐"
}
```

---

### POST /api/open-test/conversation-analysis

分析对话表现。

#### 请求体

```typescript
interface ConversationAnalysisRequest {
  conversation: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  scene: string
  aiRole: string
  userRole: string
  dialogueGoal: string
}
```

#### 响应示例

```json
{
  "score": 85,
  "fluency": 80,
  "vocabulary": 85,
  "accuracy": 90,
  "summary": "整体表现良好，能够完成点餐对话",
  "strengths": ["用词准确", "表达清晰"],
  "suggestions": ["可以尝试使用更多礼貌用语", "注意语速控制"]
}
```

---

### GET /api/open-test/audio/[id]

获取对话音频。

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 音频ID |

---

### POST /api/open-test/speech

语音合成（TTS）。

#### 请求体

```typescript
interface SpeechRequest {
  text: string
  voice?: string        // 默认: "en-US-AriaNeural"
  rate?: number         // 语速，默认: 1.2
}
```

#### 响应示例

```json
{
  "audioUrl": "https://xxx.vercel.blob/audio_xxx.mp3",
  "duration": 3.5
}
```

---

## 音频API

### GET /api/audio/proxy

音频代理服务，用于解决跨域问题。

#### Query参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 是 | 原始音频URL |

---

### GET /api/audio

获取音频配置信息。

#### 响应示例

```json
{
  "cosBaseUrl": "https://your-bucket.cos.ap-beijing.myqcloud.com",
  "useProxy": true
}
```

---

## 跟读评测API

### POST /api/shadowing/evaluate

对用户跟读录音进行发音评测，调用 Microsoft Cognitive Services Speech SDK 返回逐词评分。

#### 请求体

`Content-Type: multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| audio | File (Blob) | 是 | 用户录音文件，格式为原始 PCM（16kHz 单声道 16bit） |
| text | string | 是 | 目标文本（用于发音对比评测） |
| sampleRate | string | 否 | 采样率，默认 `16000` |
| channels | string | 否 | 声道数，默认 `1` |

#### 响应示例（成功）

```json
{
  "score": 82,
  "accuracyScore": 85,
  "intonationScore": 78,
  "wordFeedback": [
    { "word": "Welcome", "isCorrect": true, "score": 90 },
    { "word": "to", "isCorrect": true, "score": 95 },
    { "word": "our", "isCorrect": false, "score": 45 },
    { "word": "restaurant", "isCorrect": true, "score": 88 }
  ]
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| score | number | 综合得分（0-100） |
| accuracyScore | number | 发音准确度（0-100） |
| intonationScore | number | 语调评分（0-100） |
| wordFeedback | array | 逐词反馈列表 |
| wordFeedback[].word | string | 单词文本 |
| wordFeedback[].isCorrect | boolean | 是否发音正确（准确度 ≥ 60 为正确） |
| wordFeedback[].score | number | 该词得分（0-100） |

#### 错误响应

```json
{ "error": "缺少音频文件" }           // 400 - 缺少 audio 字段
{ "error": "缺少目标文本" }           // 400 - 缺少 text 字段
{ "error": "语音识别失败: ..." }      // 422 - SDK 识别失败
{ "error": "Azure Speech SDK 配置缺失..." } // 500 - 环境变量未配置
```

#### 依赖环境变量

| 变量名 | 说明 |
|--------|------|
| `AZURE_SPEECH_KEY` | Microsoft Azure 语音服务订阅密钥 |
| `AZURE_SPEECH_REGION` | Azure 服务区域，如 `eastasia` |

---

## 填空测试API

### POST /api/fill-blank/evaluate

评估问答题答案（语义匹配）。

#### 请求体

```typescript
interface FillBlankEvaluateRequest {
  question: string              // 题目文本
  userAnswer: string            // 用户答案
  referenceAnswers?: Array<{    // 参考答案列表（可选）
    text: string
    description?: string
  }>
}
```

#### 响应示例

```json
{
  "isCorrect": true,
  "analysis": "回答准确，表达自然。",
  "suggestions": ["继续保持良好的学习习惯"]
}
```

---

### POST /api/fill-blank/evaluate-pattern

填空题（Pattern Drill）语义评测，调用 GLM-4-Flash 判断用户填写内容是否符合场景语境。

#### 请求体

```typescript
interface EvaluatePatternRequest {
  template: string        // 句型模板，含 ___ 占位符，必填
  userAnswers: string[]   // 用户填写的答案数组，每个占位符对应一项，必填
  referenceAnswer?: string  // 参考答案（可选）
  keywords?: string[]     // 关键词列表（可选）
  scenarioHint?: string   // 场景提示（可选）
}
```

#### 响应示例

```json
{
  "isCorrect": true,
  "referenceAnswer": "make a reservation",
  "semanticAnalysis": "用户填写的 'book a table' 与场景语境完全吻合，表达地道自然。",
  "feedback": "非常好！'book a table' 是餐厅预订场景中最常用的表达之一。"
}
```

#### 错误响应

```json
{
  "error": "缺少必要的参数",
  "details": "请提供句型模板(template)和用户答案(userAnswers)"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 评测成功 |
| 400 | 缺少 template 或 userAnswers |
| 500 | LLM 调用失败 |

---

## 情景再现评测API

### POST /api/guided-roleplay/evaluate

情景再现题（Guided Role-play）评测，调用 GLM-4-Flash 从意图达成度、语言自然度、词汇使用等维度评估用户回答。

#### 请求体

```typescript
interface GuidedRoleplayEvaluateRequest {
  dialogueGoal: string          // 对话目标，必填
  userAnswer: string            // 用户回答，必填
  keywords?: string[]           // 关键词提示列表（可选）
  evaluationDimensions?: string[] // 评测维度列表（可选，默认：意图达成度、语言自然度、词汇使用）
}
```

#### 响应示例

```json
{
  "intentScore": 85,
  "naturalness": "表达自然流畅，符合日常口语习惯。",
  "vocabularyFeedback": "词汇使用准确，场景相关词汇运用得当。",
  "suggestions": [
    "可以尝试使用更多礼貌用语",
    "注意语速控制",
    "可以补充更多细节信息"
  ],
  "referenceExpression": "I'd like to check in two bags, please."
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| intentScore | number | 意图达成度评分（0-100） |
| naturalness | string | 语言自然度评价（中文） |
| vocabularyFeedback | string | 词汇使用评价（中文） |
| suggestions | string[] | 改进建议列表（中文） |
| referenceExpression | string | 参考英文表达 |

#### 错误响应

```json
{
  "error": "缺少必要的参数",
  "details": "请提供对话目标(dialogueGoal)和用户答案(userAnswer)"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 评测成功 |
| 400 | 缺少 dialogueGoal 或 userAnswer |
| 500 | LLM 调用失败 |

---

## 错误码

### HTTP状态码

| 状态码 | 说明 | 场景 |
|--------|------|------|
| 200 | 成功 | 请求处理成功 |
| 400 | 参数错误 | 缺少必要参数或参数格式错误 |
| 404 | 资源不存在 | 请求的场景/短语/测试不存在 |
| 500 | 服务器错误 | 数据库连接失败、AI服务异常等 |

### 错误响应格式

```json
{
  "error": "错误简要说明",
  "details": "详细错误信息（可选）"
}
```

### 常见错误

| 错误信息 | 说明 | 解决方案 |
|----------|------|----------|
| `Scene not found` | 场景不存在 | 检查场景ID是否正确 |
| `缺少必要的参数` | 请求参数不完整 | 检查请求体是否包含所有必填字段 |
| `GLM API调用失败` | AI服务异常 | 检查API密钥和网络连接 |
| `Failed to fetch scenes` | 数据库查询失败 | 检查数据库连接配置 |

---

## 相关文档

- [项目概述](../00-core/core-project-overview-v1.0.md)
- [技术栈详解](../01-architecture/arch-tech-stack-v1.0.md)
- [编码规范](../02-development/dev-coding-standards-v1.0.md)

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.6 | 2026-03-01 | 新增 /api/guided-roleplay/evaluate 接口；修正 /api/shadowing/evaluate 请求格式（PCM 原始数据）；补充场景测试新题型说明；更新接口概览表 | AI |
| v1.5 | 2026-07-11 | 更新 /api/scenes/[id]/sub-scenes 响应格式，新增 scene 字段（含 name/description/category/difficulty），场景不存在时返回 404 | AI |
| v1.4 | 2026-07-10 | 新增子场景API文档（/api/scenes/[id]/sub-scenes、/api/sub-scenes/[subSceneId] 及其子路由） | AI |
| v1.3 | 2026-07-01 | 新增 /api/fill-blank/evaluate-pattern 接口文档；修正 /api/fill-blank/evaluate 请求体格式 | AI |
| v1.2 | 2026-06-20 | 新增跟读评测API（/api/shadowing/evaluate）文档 | AI |
| v1.1 | 2026-02-24 | 补充完整的API接口定义、请求/响应格式、错误码说明 | AI |
| v1.0 | 2026-02-24 | 初始版本 | - |

---

## 子场景API

### GET /api/scenes/[id]/sub-scenes

获取指定场景下的所有子场景列表，同时返回场景基本信息（供 SceneOverviewPage 使用）。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 场景ID |

#### 响应示例

```json
{
  "scene": {
    "id": "daily_001",
    "name": "机场值机",
    "description": "在机场办理值机手续的常用英语表达",
    "category": "旅行出行",
    "difficulty": "初级"
  },
  "subScenes": [
    {
      "id": "sub_001",
      "sceneId": "daily_001",
      "name": "托运行李",
      "description": "在机场办理行李托运",
      "order": 1,
      "estimatedMinutes": 5
    }
  ]
}
```

> 若场景不存在，返回 404。若场景无子场景，`subScenes` 为空数组。

---

### GET /api/sub-scenes/[subSceneId]

获取子场景详情，包含 QA_Pairs 列表和位置信息。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| subSceneId | string | 子场景ID |

#### 响应示例

```json
{
  "subScene": { "id": "sub_001", "name": "托运行李", ... },
  "qaPairs": [
    {
      "id": "qa_001",
      "subSceneId": "sub_001",
      "speakerText": "How many bags are you checking?",
      "speakerTextCn": "您要托运几件行李？",
      "responses": [
        { "text": "Just one.", "text_cn": "只有一件。", "audio_url": "COS:/..." }
      ],
      "qaType": "must_speak",
      "order": 1
    }
  ],
  "totalSubScenes": 3,
  "currentIndex": 1
}
```

#### 错误码

| 状态码 | 说明 |
|--------|------|
| 404 | 子场景不存在 |
| 500 | 服务器内部错误 |

---

### GET /api/sub-scenes/[subSceneId]/practice

动态生成子场景练习题（选择题 → 填空题 → 问答题）。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| subSceneId | string | 子场景ID |

#### 响应示例

```json
{
  "questions": [
    {
      "type": "choice",
      "qaId": "qa_001",
      "audioUrl": "COS:/...",
      "options": [
        { "id": "opt_1", "text": "Just one.", "isCorrect": true },
        { "id": "opt_2", "text": "Window seat.", "isCorrect": false }
      ]
    },
    {
      "type": "fill_blank",
      "qaId": "qa_002",
      "template": "I'd like to ___ my bag.",
      "blanks": [{ "index": 0, "answer": "check" }]
    },
    {
      "type": "speaking",
      "qaId": "qa_003",
      "speakerText": "Do you have any fragile items?",
      "speakerTextCn": "您有易碎物品吗？"
    }
  ]
}
```

---

### POST /api/sub-scenes/[subSceneId]/ai-dialogue

调用 GLM-4-Flash 判断用户回应是否语义匹配当前 QA_Pair，并推进对话。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| subSceneId | string | 子场景ID |

#### 请求体

```json
{
  "userMessage": "Just one bag.",
  "currentQaIndex": 0,
  "conversationHistory": [
    { "role": "ai", "text": "How many bags are you checking?" },
    { "role": "user", "text": "Just one bag." }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userMessage | string | 是 | 用户本轮输入文字 |
| currentQaIndex | number | 是 | 当前 QA_Pair 索引（0-based） |
| conversationHistory | array | 是 | 本轮对话历史 |

#### 响应示例

```json
{
  "pass": true,
  "nextQaIndex": 1,
  "aiMessage": "Are they over 23kg?",
  "isComplete": false
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| pass | boolean | 用户回应是否通过语义匹配 |
| nextQaIndex | number | 下一个待处理的 QA_Pair 索引 |
| aiMessage | string? | 下一条 speaker_text 或完成提示 |
| isComplete | boolean | 是否所有 QA_Pair 已完成 |

#### 错误码

| 状态码 | 说明 |
|--------|------|
| 400 | currentQaIndex 超出范围 |
| 404 | 子场景不存在或无 QA_Pairs |
| 500 | 服务器内部错误 |

---

### POST /api/sub-scenes/[subSceneId]/review

对 passed=false 的对话条目调用 GLM-4-Flash 生成更地道的表达建议。LLM 调用失败时降级返回空 highlights 数组。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| subSceneId | string | 子场景ID |

#### 请求体

```json
{
  "fluencyScore": 60,
  "dialogueHistory": [
    { "qaId": "qa_001", "userText": "I have one bag.", "passed": true },
    { "qaId": "qa_002", "userText": "No fragile.", "passed": false }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| fluencyScore | number | 是 | 流畅度得分（0-100） |
| dialogueHistory | array | 是 | 完整对话历史，含 passed 状态 |

#### 响应示例

```json
{
  "highlights": [
    {
      "qaId": "qa_002",
      "userText": "No fragile.",
      "issue": "表达不完整，缺少主语",
      "betterExpression": "No, I don't have any fragile items."
    }
  ]
}
```

> LLM 调用失败时返回 `{ "highlights": [] }`，HTTP 状态码仍为 200，不影响前端流程。

#### 错误码

| 状态码 | 说明 |
|--------|------|
| 404 | 子场景不存在 |

