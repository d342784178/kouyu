# 场景数据生成工具

## 文件说明

### 核心脚本

| 文件 | 说明 |
|------|------|
| `generate_scenes_100.js` | **主生成脚本** - 生成100个高频场景，8并发 |
| `test_generate.js` | 测试脚本 - 生成单个场景验证格式 |

### 数据文件

| 文件 | 说明 |
|------|------|
| `scenes_100.json` | **最终数据文件** - 100个高质量场景（完整版） |

### 旧数据备份
- `final_100_scenes.json` - 原始88个场景数据（旧版）

## 使用方法

### 生成100个场景

```bash
cd /Users/mac/Documents/dlj/project/kouyu
node prepare/scene/scripts/generate_scenes_100.js
```

### 测试单个场景

```bash
node prepare/scene/scripts/test_generate.js
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
            "is_key_qa": true
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
      "round_number": 1
    }
  ]
}
```

## 场景分类（100个）

- **daily** (日常) - 30个场景
- **workplace** (职场) - 25个场景
- **study_abroad** (留学) - 20个场景
- **travel** (旅行) - 15个场景
- **social** (社交) - 10个场景

## 难度分布

- **beginner** - 30个场景（3轮对话）
- **intermediate** - 35个场景（4轮对话）
- **advanced** - 35个场景（5轮对话）

## 数据质量

- ✅ 100个完整场景
- ✅ 所有词汇都有 difficulty 字段
- ✅ 所有词汇都有 vocab_id
- ✅ 音标使用标准 IPA 格式
- ✅ analysis 包含完整字段

## 注意事项

1. 需要设置 `GLM_API_KEY` 环境变量（在 `.env.local` 中）
2. 生成100个场景约需10-12分钟
3. 脚本支持断点续传，会从中断处继续生成
4. 最终数据文件：`prepare/scene/data/scenes_100.json`
