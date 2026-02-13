# 场景数据准备

本目录包含场景学习模块的数据准备文件，包括场景对话数据、词汇数据和对应的音频文件。

## 📊 数据统计

| 项目 | 数量 |
|------|------|
| 场景总数 | 88个 |
| 对话音频文件 | **352个** |
| 词汇音频文件 | **808个** |
| 音频文件总计 | **1,160个** |

### 分类分布
| 分类 | 数量 | 占比 |
|------|------|------|
| 日常场景 (daily) | 48条 | 54.5% |
| 职场场景 (workplace) | 23条 | 26.1% |
| 留学/考试 (study_abroad) | 17条 | 19.3% |

---

## 📁 目录结构

```
prepare/scene/
├── data/                          # 数据文件
│   ├── scenes.json               # 场景数据（使用统一脚本生成）
│   └── audio/                     # 音频文件
│       ├── dialogues/            # 对话音频
│       └── vocabulary/           # 词汇音频
├── scripts/                       # 处理脚本
│   ├── generate_scenes.js        # 统一场景生成脚本（GLM+TTS）
│   ├── generate_dialogue_audio.js    # 生成对话音频（旧）
│   ├── generate_vocabulary_audio.js  # 生成词汇音频（旧）
│   └── generate_all_batches.py       # GLM-4生成场景数据（旧）
└── README.md                      # 本文档
```

---

## 🚀 使用流程

### 统一脚本生成（推荐）

使用 `generate_scenes.js` 脚本一键生成场景数据和音频：

```bash
cd scripts

# 设置 GLM API Key
export GLM_API_KEY="your-api-key"

# 生成10个场景，并发数为5
node generate_scenes.js --count=10 --concurrency=5
```

**脚本功能：**
1. 调用 GLM-4-flash 大模型生成场景数据
2. scene_name、description、analysis_detail 等字段为中文
3. 使用 Edge-TTS 生成音频（speaker1女声，speaker2男声）
4. 音频路径使用相对路径格式：`COS:/scene/dialogues/{filename}.mp3`
5. 支持断点续传（中断后重新运行会继续未完成的部分）

**配置参数：**
- `--count`: 生成场景数量（默认10）
- `--concurrency`: 并发数（默认5）
- `GLM_API_KEY`: 环境变量，GLM API 密钥

---

## 📋 数据结构

### 场景数据格式

```json
{
  "scene_id": "daily_001",
  "category": "daily",
  "scene_name": "餐厅点餐",
  "difficulty": "beginner",
  "description": "学习在餐厅点餐的基本表达",
  "tags": ["餐厅", "点餐", "食物"],
  "dialogue": {
    "rounds": [
      {
        "round_number": 1,
        "content": [
          {
            "index": 1,
            "speaker": "speaker1",
            "speaker_name": "Customer",
            "text": "Are you ready to order?",
            "translation": "您准备好点餐了吗？",
            "audio_url": "COS:/scene/dialogues/daily_001_round1_speaker1.mp3",
            "is_key_qa": true
          },
          {
            "index": 2,
            "speaker": "speaker2",
            "speaker_name": "Waiter",
            "text": "Yes, I'd like a steak.",
            "translation": "是的，我想要一份牛排。",
            "audio_url": "COS:/scene/dialogues/daily_001_round1_speaker2.mp3",
            "is_key_qa": false
          }
        ],
        "analysis": {
          "analysis_detail": "点餐基础表达...",
          "standard_answer": {...},
          "alternative_answers": [...]
        }
      }
    ]
  },
  "vocabulary": [
    {
      "type": "word",
      "content": "order",
      "phonetic": "/ˈɔːrdər/",
      "translation": "点餐",
      "example_sentence": "Are you ready to order?",
      "audio_url": "COS:/scene/vocabulary/daily_001_vocab1_word.mp3",
      "example_audio_url": "COS:/scene/vocabulary/daily_001_vocab1_example.mp3"
    }
  ]
}
```

### 音频路径格式

数据库中使用**相对路径**存储，格式为: `COS:/path/to/file.mp3`

#### 对话音频
- **相对路径**: `COS:/scene/dialogues/{scene_id}_round{round}_speaker{index}.mp3`
- **示例**: `COS:/scene/dialogues/daily_001_round1_speaker1.mp3`

#### 词汇音频
- **单词**: `COS:/scene/vocabulary/{scene_id}_vocab{index}_word.mp3`
- **例句**: `COS:/scene/vocabulary/{scene_id}_vocab{index}_example.mp3`

---

## ⚙️ 环境变量

在项目根目录的 `.env.local` 文件中设置：

```env
# GLM API Key（用于生成场景数据）
GLM_API_KEY=your-glm-api-key

# 前端音频存储配置
NEXT_PUBLIC_COS_BASE_URL=https://kouyu-scene-1300762139.cos.ap-guangzhou.myqcloud.com
```

---

## 🔧 故障排除

### 场景生成失败
- 检查 `GLM_API_KEY` 是否设置正确
- 检查网络连接
- 降低并发数重试

### 音频生成失败
- 检查网络连接
- 确认代理服务器可访问（默认使用 localhost:7890）
- 检查 `msedge-tts` 依赖是否安装

---

## 📝 更新记录

### 2026-02-13
- 重构脚本结构，创建统一生成脚本 `generate_scenes.js`
- 移除无用脚本（上传脚本、数据库迁移脚本等）
- 支持断点续传功能
- scene_name、description、analysis 字段使用中文

---

**数据版本**: v2.0  
**状态**: ✅ 已重构  
**最后更新**: 2026-02-13
