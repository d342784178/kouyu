# 场景数据管理工具

## 文件结构

```
prepare/scene/
├── data/
│   ├── scenes_final.json            # 最终场景数据（已导入数据库）
│   └── audio/                       # 本地音频文件（已上传到COS，可删除）
│       ├── dialogues/               # 对话音频
│       ├── vocabulary/              # 词汇音频
│       └── dialogue_audio_map.json  # 音频映射文件
├── scripts/
│   ├── scene-manager.ts             # 场景管理脚本（主要）
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

### 3. 场景管理

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
          "standard_answer": {...},
          "alternative_answers": [...],
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
- `DATABASE_URL` - 数据库连接字符串（用于数据库操作）
