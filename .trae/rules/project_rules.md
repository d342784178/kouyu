# 项目规则

## 1. 文档目录结构

需求、交互、设计文档都放在 `demands` 目录下，项目结构如下：

```
├── demands/                      # 需求文档
│   ├── v1/                       # v1版本 （迭代名称，取git迭代分支名）
│   └── v2/                       # v2版本 （迭代名称，取git迭代分支名）
│       ├── 设计文档/              # 当前迭代增量技术设计文档
│       ├── 需求文档.md            # 当前迭代增量需求文档
│   └── 原型图/                    # 全量原型图
│   └── 需求文档.md                # 全量需求文档
│   └── 交互风格说明文档.md         # 交互风格说明文档
```

## 2. 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **数据库**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui
- **AI**: GLM-4-Flash (智谱AI)
- **音频存储**: 腾讯云 COS
- **包管理器**: pnpm
- **浏览器**: Edge

## 3. 项目结构

```
kouyu/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API 路由
│   │   │   ├── scenes/           # 场景相关API
│   │   │   ├── phrases/          # 短语相关API
│   │   │   ├── open-test/        # 开放式测试API
│   │   │   └── fill-blank/       # 填空测试API
│   │   ├── scene-list/           # 场景列表页
│   │   ├── scene-detail/         # 场景详情页
│   │   ├── scene-test/           # 场景测试页
│   │   ├── phrase-library/       # 短语库页
│   │   └── phrase-detail/        # 短语详情页
│   ├── components/               # 公共组件
│   ├── lib/                      # 工具库
│   │   ├── db/                   # 数据库配置和schema
│   │   ├── audioUrl.ts           # 音频URL构建工具
│   │   └── llm.ts                # LLM调用封装
│   └── types.ts                  # 类型定义
├── prepare/                      # 数据准备脚本
│   ├── scene/                    # 场景数据
│   └── phrases/                  # 短语数据
├── demands/                      # 需求文档
└── .trae/                        # Trae配置
```

## 4. 数据库表结构

### scenes 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| name | text | 场景名称 |
| category | text | 分类(中文: 日常/职场/留学/旅行/社交) |
| description | text | 场景描述 |
| difficulty | text | 难度(中文: 初级/中级/高级) |
| duration | integer | 学习时长(分钟)，根据内容动态计算 |
| tags | jsonb | 关键词标签 |
| dialogue | jsonb | 对话内容(扁平数组格式) |
| vocabulary | jsonb | 高频词汇(含音频URL) |

### dialogue 字段格式（嵌套结构）
```json
{
  "rounds": [
    {
      "round_number": 1,
      "content": [
        {
          "index": 1,
          "speaker": "speaker1",
          "speaker_name": "Customer",
          "text": "Excuse me, where can I find the apples?",
          "translation": "打扰一下，苹果在哪里？",
          "audio_url": "COS:/scene/dialogues/daily_003_round1_speaker1.mp3",
          "is_key_qa": true
        }
      ],
      "analysis": {
        "analysis_detail": "分析详情",
        "standard_answer": {
          "text": "标准回答",
          "translation": "翻译",
          "scenario": "适用场景",
          "formality": "neutral"
        },
        "alternative_answers": [...],
        "usage_notes": "使用说明"
      }
    }
  ]
}
```

### vocabulary 字段格式
```json
[
  {
    "vocab_id": "daily_003_vocab_01",
    "type": "word",
    "content": "Excuse me",
    "phonetic": "/ɪɡˈzɛs ˈmiːm/",
    "translation": "打扰一下",
    "audio_url": "COS:/scene/vocabulary/daily_003_vocab1_word.mp3",
    "example": "Excuse me, where is the bathroom?",
    "example_translation": "打扰一下，洗手间在哪里？",
    "example_audio_url": "COS:/scene/vocabulary/daily_003_vocab1_example.mp3",
    "round_number": 1,
    "difficulty": "easy"
  }
]
```

### phrases 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| english | text | 英文短语 |
| chinese | text | 中文翻译 |
| partOfSpeech | text | 词性 |
| scene | text | 适用场景 |
| difficulty | text | 难度 |
| pronunciationTips | text | 发音提示 |
| audioUrl | text | 音频URL |

### scene_tests 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| sceneId | text | 关联场景ID |
| type | text | 测试类型(choice/qa/open_dialogue) |
| order | integer | 题目顺序 |
| content | jsonb | 题目内容 |

## 5. 音频URL格式

### 5.1 自定义协议格式

音频使用自定义协议前缀，格式为 `PROTOCOL:/path`，由 `buildAudioUrl` 函数解析：

```
COS:/scene/dialogues/{scene_id}_round{n}_speaker{x}.mp3
COS:/scene/vocabulary/{scene_id}_vocab{n}_word.mp3
COS:/scene/vocabulary/{scene_id}_vocab{n}_example.mp3
COS:/phrases/{phrase_id}.mp3
```

### 5.2 支持的存储协议

| 协议 | 说明 | 环境变量配置 |
|------|------|-------------|
| `COS:/` | 腾讯云 COS | `NEXT_PUBLIC_COS_BASE_URL` |
| `BLOB:/` | Vercel Blob | `NEXT_PUBLIC_BLOB_BASE_URL` |


### 5.3 URL构建规则

1. **协议解析**：提取 `PROTOCOL:/` 部分，匹配对应的存储配置
2. **路径拼接**：将协议后的路径拼接到 baseUrl 后
3. **完整URL**：`{baseUrl}/{path}`

### 5.4 使用示例

```typescript
import { buildAudioUrl } from '@/lib/audioUrl';

// 腾讯云 COS
buildAudioUrl('COS:/scene/dialogues/daily_001_round1_speaker1.mp3')
// -> 'https://kouyu-scene-1300762139.cos.ap-guangzhou.myqcloud.com/scene/dialogues/daily_001_round1_speaker1.mp3'

// 已经是完整URL时直接返回
buildAudioUrl('https://example.com/audio.mp3')
// -> 'https://example.com/audio.mp3'

// 空值处理
buildAudioUrl(null) // -> ''
buildAudioUrl(undefined) // -> ''
```

### 5.5 路径格式规范

| 类型 | 路径格式 | 示例 |
|------|---------|------|
| 场景对话 | `COS:/scene/dialogues/{scene_id}_round{n}_{speaker}.mp3` | `COS:/scene/dialogues/daily_001_round1_speaker1.mp3` |
| 词汇单词 | `COS:/scene/vocabulary/{scene_id}_vocab{n}_word.mp3` | `COS:/scene/vocabulary/daily_001_vocab1_word.mp3` |
| 词汇例句 | `COS:/scene/vocabulary/{scene_id}_vocab{n}_example.mp3` | `COS:/scene/vocabulary/daily_001_vocab1_example.mp3` |
| 短语音频 | `COS:/phrases/{phrase_id}.mp3` | `COS:/phrases/phrase_001.mp3` |

## 6. 场景分类

| 类别 | ID前缀 | 数量 | 说明 |
|------|--------|------|------|
| 日常 | daily_ | 31 | 日常场景 (daily_001 ~ daily_030 + daily_100) |
| 职场 | workplace_ | 25 | 职场场景 |
| 留学 | study_abroad_ | 15 | 留学场景 |
| 旅行 | travel_ | 20 | 旅行场景 |
| 社交 | social_ | 20 | 社交场景 |
| **总计** | - | **110** | - |

## 7. 常用命令

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 数据库操作
npx ts-node prepare/scene/scripts/scene-manager.ts <command>
# command: test | update-audio | reset | update-db | verify

# 短语数据操作
npx ts-node prepare/phrases/scripts/reinit_database.ts
```

## 8. 环境变量

需要在 `.env.local` 中配置：

```env
DATABASE_URL=postgresql://...
GLM_API_KEY=xxx
NEXT_PUBLIC_COS_BASE_URL=https://kouyu-scene-1300762139.cos.ap-guangzhou.myqcloud.com
```

## 9. 开发规范

1. **依赖变更**: 涉及依赖变更需要重启服务器
2. **代码变更**: 每次代码变更后，都需要进行测试
3. **临时文件**: 生成的临时文件放到 `.trae/temp/{sessionId}` 中
4. **语言**: 对话使用中文，代码注释使用中文

## 10. API 路由

### 场景相关
- `GET /api/scenes` - 获取场景列表
- `GET /api/scenes/[id]` - 获取场景详情
- `GET /api/scenes/[id]/tests` - 获取场景测试题

### 短语相关
- `GET /api/phrases` - 获取短语列表
- `GET /api/phrases/[id]` - 获取短语详情

### 开放式测试
- `POST /api/open-test/initiate` - 初始化测试
- `POST /api/open-test/chat` - 对话交互
- `POST /api/open-test/analyze` - 分析结果
- `GET /api/open-test/audio/[id]` - 获取音频

### 填空测试
- `POST /api/fill-blank/evaluate` - 评估答案

## 11. 数据格式规范

### 11.1 category/difficulty 字段
- **category** 使用中文：`日常`、`职场`、`留学`、`旅行`、`社交`
- **difficulty** 使用中文：`初级`、`中级`、`高级`
- 前端无需做映射，直接使用数据库中的中文值

### 11.2 音频字段名统一
- 单词/短语音频统一使用 `audio_url`
- 例句音频使用 `example_audio_url`
- 不再使用 `word_audio_url` 等旧字段名

### 11.3 dialogue 格式
- 使用扁平数组格式，不再嵌套 rounds/content
- 每条对话包含完整的 `round_number`、`speaker`、`text`、`translation`、`audio_url` 等字段

### 11.4 duration 学习时长
- 根据对话轮数和词汇数量动态计算
- 计算公式：`Math.max(5, Math.min(20, roundCount * 2 + Math.ceil(vocabCount / 2)))`
- 范围：5-20 分钟



## 注意事项

1. 对于本地脚本调用nvidia大模型时, 可以配置10个并发, 当出现限速报错时, 可以等待10s后在重试