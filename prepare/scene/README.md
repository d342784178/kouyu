# 场景数据管理工具

## 文件结构

```
prepare/scene/
├── data/
│   ├── scenes_final.json            # 最终场景数据（已导入数据库）
│   ├── scenes_100_with_audio.json   # 带音频URL的场景数据
│   ├── scene_tests.json             # 生成的测试题数据
│   ├── scene_tests_progress.json    # 生成进度跟踪（断点续传）
│   ├── scene_tests_failed.json      # 失败记录
│   └── audio/                       # 本地音频文件（已上传到COS，可删除）
│       ├── dialogues/               # 对话音频
│       ├── vocabulary/              # 词汇音频
│       └── dialogue_audio_map.json  # 音频映射文件
├── scripts/
│   ├── scene-manager.ts             # 场景管理脚本（主要）
│   ├── generate-scene-tests.ts      # 测试数据生成脚本
│   ├── generate_scenes_100.js       # 生成100个场景数据
│   └── generate_scene_audio.py      # 生成音频文件
└── README.md
```

## 脚本说明

### scene-manager.ts（主要脚本）

场景数据管理脚本，提供以下命令：

| 命令 | 说明 |
|------|------|
| `test` | 测试腾讯云COS音频URL是否可访问 |
| `update-audio` | 更新JSON文件中的音频URL |
| `reset` | 重置数据库场景数据（从JSON文件导入） |
| `update-db` | 更新数据库中的音频URL |
| `verify` | 验证数据库中的音频URL |

### generate-scene-tests.ts（测试数据生成）

自动生成场景测试数据，支持三种题型：

| 题型 | 数量 | 说明 |
|------|------|------|
| 选择题 (choice) | 3道 | 考察"如何回答"的理解 |
| 问答题 (qa) | 2道 | 考察多种回答方式 |
| 开放式对话 (open_dialogue) | 1道 | 角色扮演练习 |

**使用方法**:
```bash
# 生成测试数据
npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate

# 导入数据库
npx ts-node prepare/scene/scripts/generate-scene-tests.ts import

# 生成并导入
npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate-and-import
```

**特性**:
- 支持断点续传（通过 `scene_tests_progress.json` 跟踪进度）
- 实时写入文件（避免内存溢出）
- 并发控制（默认10个并发）
- 失败记录保存到 `scene_tests_failed.json`

**配置参数**:
```typescript
const CONFIG = {
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY || '',
  NVIDIA_API_URL: 'https://integrate.api.nvidia.com/v1/chat/completions',
  NVIDIA_MODEL: 'z-ai/glm4.7',
  CONCURRENCY: 10,           // 并发数
  MAX_TOKENS: 100000,        // 最大token数
  TEMPERATURE: 0.7,          // 温度参数
  DATA_DIR: path.resolve(process.cwd(), 'prepare/scene/data'),
  OUTPUT_FILE: path.resolve(process.cwd(), 'prepare/scene/data/scene_tests.json'),
};
```

### 其他脚本

| 文件 | 说明 |
|------|------|
| `generate_scenes_100.js` | 使用GLM API生成100个场景数据 |
| `generate_scene_audio.py` | 使用edge-tts生成音频文件 |
| `backup_audio.py` | 备份历史音频文件 |

## 使用方法

### 1. 生成场景数据

```bash
node prepare/scene/scripts/generate_scenes_100.js
```

### 2. 生成音频文件

```bash
python prepare/scene/scripts/generate_scene_audio.py
```

### 3. 生成测试数据

```bash
# 生成测试数据
npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate

# 导入数据库
npx ts-node prepare/scene/scripts/generate-scene-tests.ts import

# 或一步完成
npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate-and-import
```

### 4. 场景管理

```bash
# 测试音频URL
npx ts-node prepare/scene/scripts/scene-manager.ts test

# 更新JSON文件中的音频URL
npx ts-node prepare/scene/scripts/scene-manager.ts update-audio

# 重置数据库场景数据
npx ts-node prepare/scene/scripts/scene-manager.ts reset

# 更新数据库中的音频URL
npx ts-node prepare/scene/scripts/scene-manager.ts update-db

# 验证数据库中的音频URL
npx ts-node prepare/scene/scripts/scene-manager.ts verify
```

## 音频URL格式

音频URL使用 `COS:/` 协议前缀，由 `buildAudioUrl` 函数解析为完整URL：

- 对话音频: `COS:/scene/dialogues/{scene_id}_round{n}_speaker{x}.mp3`
- 词汇音频: `COS:/scene/vocabulary/{scene_id}_vocab{n}_word.mp3`
- 词汇例句: `COS:/scene/vocabulary/{scene_id}_vocab{n}_example.mp3`

完整URL示例:
```
https://kouyu-scene-1300762139.cos.ap-guangzhou.myqcloud.com/scene/dialogues/daily_001_round1_speaker1.mp3
```

## 数据格式

### 场景结构

```json
{
  "scene_id": "daily_001",
  "scene_name": "餐厅点餐",
  "category": "daily",
  "difficulty": "beginner",
  "description": "学习在餐厅点餐的基本用语",
  "tags": ["restaurant", "ordering", "food"],
  "dialogue": {
    "rounds": [
      {
        "round_number": 1,
        "content": [
          {
            "index": 1,
            "speaker": "speaker1",
            "speaker_name": "Customer",
            "text": "英文对话",
            "translation": "中文翻译",
            "is_key_qa": true,
            "audio_url": "COS:/scene/dialogues/daily_001_round1_speaker1.mp3"
          }
        ],
        "analysis": {
          "analysis_detail": "分析详情",
          "standard_answer": {
            "text": "标准回答",
            "translation": "翻译",
            "scenario": "使用场景",
            "formality": "neutral"
          },
          "alternative_answers": [
            {
              "text": "备选回答",
              "translation": "翻译",
              "scenario": "使用场景",
              "formality": "casual"
            }
          ],
          "usage_notes": "使用说明"
        }
      }
    ]
  },
  "vocabulary": [
    {
      "vocab_id": "daily_001_vocab_01",
      "type": "word",
      "content": "单词",
      "phonetic": "/音标/",
      "translation": "翻译",
      "example_sentence": "例句",
      "example_translation": "例句翻译",
      "difficulty": "easy",
      "round_number": 1,
      "word_audio_url": "COS:/scene/vocabulary/daily_001_vocab1_word.mp3",
      "example_audio_url": "COS:/scene/vocabulary/daily_001_vocab1_example.mp3"
    }
  ]
}
```

### 测试题结构

**选择题 (choice)**:
```json
{
  "id": "daily_001_choice_01",
  "sceneId": "daily_001",
  "type": "choice",
  "order": 1,
  "content": {
    "question": "场景描述和问题（中文）",
    "options": ["选项A英文", "选项B英文", "选项C英文", "选项D英文"],
    "correct_answer": 0,
    "analysis": "解析说明（中文）"
  }
}
```

**问答题 (qa)**:
```json
{
  "id": "daily_001_qa_01",
  "sceneId": "daily_001",
  "type": "qa",
  "order": 4,
  "content": {
    "question": "场景描述和需要回答的问题（中文）",
    "reference_answers": [
      {
        "text": "参考答案英文",
        "style": "neutral",
        "description": "说明（中文）"
      }
    ],
    "analysis": "解析说明（中文）"
  }
}
```

**开放式对话 (open_dialogue)**:
```json
{
  "id": "daily_001_open_01",
  "sceneId": "daily_001",
  "type": "open_dialogue",
  "order": 6,
  "content": {
    "topic": "对话主题",
    "description": "对话描述",
    "roles": [
      {
        "name": "角色名",
        "description": "角色描述",
        "is_user": true
      }
    ],
    "scenario_context": "对话背景（中文）",
    "suggested_opening": "开场白（英文）",
    "analysis": "要点分析（中文）"
  }
}
```

## 数据库表结构

### scenes 表
```sql
CREATE TABLE scenes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  difficulty TEXT,
  tags JSONB,
  dialogue JSONB,
  vocabulary JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### scene_tests 表
```sql
CREATE TABLE scene_tests (
  id TEXT PRIMARY KEY,
  scene_id TEXT REFERENCES scenes(id),
  type TEXT NOT NULL,
  "order" INTEGER,
  content JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 场景分类（100个）

| 类别 | 数量 | 说明 |
|------|------|------|
| daily | 30 | 日常场景 |
| workplace | 25 | 职场场景 |
| study_abroad | 20 | 留学场景 |
| travel | 15 | 旅行场景 |
| social | 10 | 社交场景 |

## 难度分布

| 难度 | 数量 | 对话轮数 |
|------|------|----------|
| beginner | 30 | 3轮 |
| intermediate | 35 | 4轮 |
| advanced | 35 | 5轮 |

## 环境变量

需要在 `.env.local` 中配置：

- `GLM_API_KEY` - GLM API密钥（用于生成场景数据）
- `NVIDIA_API_KEY` - NVIDIA API密钥（用于生成测试数据）
- `DATABASE_URL` - 数据库连接字符串（用于数据库操作）

## 注意事项

1. **API Key**: 确保设置了 `GLM_API_KEY` 和 `NVIDIA_API_KEY` 环境变量
2. **并发控制**: 默认10个并发，可根据API限制调整
3. **断点续传**: 生成过程中断可重新运行，会自动跳过已完成的场景
4. **失败处理**: 失败的场景会记录到 `scene_tests_failed.json`
5. **音频URL**: 使用 `COS:/` 前缀表示腾讯云COS存储
