# new_scene - 子场景数据生成与导入

为现有场景生成子场景（sub_scenes）和问答对（qa_pairs）数据，并导入数据库。

## 目录结构

```
new_scene/
├── data/
│   └── sub-scenes/          # 生成的子场景 JSON 文件（每个场景一个文件）
└── scripts/
    ├── generate-sub-scenes.js       # 生成脚本（NVIDIA Qwen3）
    ├── import-sub-scenes-simple.js  # 导入脚本（直接 SQL，推荐）
    └── import-sub-scenes.ts         # 导入脚本（TypeScript + Drizzle ORM）
```

## 前置条件

`.env.local` 中需配置：

```
NVIDIA_API_KEY=your_nvidia_api_key   # 生成脚本需要
DATABASE_URL=your_database_url       # 导入脚本需要
```

## 使用流程

### 第一步：生成子场景数据

从 `prepare/scene/data/scenes_final.json` 读取场景列表，调用 NVIDIA Qwen3 API 生成数据，输出到 `data/sub-scenes/`。

```bash
# 生成所有场景（断点续传，已有文件跳过）
node prepare/new_scene/scripts/generate-sub-scenes.js

# 强制重新生成所有场景
node prepare/new_scene/scripts/generate-sub-scenes.js --force

# 只生成指定场景
node prepare/new_scene/scripts/generate-sub-scenes.js --scene daily_001

# 预览生成结果（不写文件）
node prepare/new_scene/scripts/generate-sub-scenes.js --dry-run
```

### 第二步：导入数据库

```bash
# 推荐：直接 SQL 版本
node prepare/new_scene/scripts/import-sub-scenes-simple.js

# 或 TypeScript 版本（需要 ts-node）
npx ts-node prepare/new_scene/scripts/import-sub-scenes.ts

# 只导入指定场景
node prepare/new_scene/scripts/import-sub-scenes-simple.js --scene daily_001

# 预览导入操作（不写数据库）
node prepare/new_scene/scripts/import-sub-scenes-simple.js --dry-run
```

## 数据格式

每个 JSON 文件对应一个场景，结构如下：

```json
{
  "sceneId": "daily_001",
  "sceneName": "日常问候",
  "generatedAt": "2026-03-01T00:00:00.000Z",
  "model": "qwen/qwen3-next-80b-a3b-instruct",
  "subScenes": [
    {
      "id": "daily_001_sub_1",
      "sceneId": "daily_001",
      "name": "初次见面",
      "description": "与陌生人初次见面的问候场景",
      "order": 1,
      "estimatedMinutes": 5,
      "qaPairs": [
        {
          "id": "daily_001_sub_1_qa_1",
          "subSceneId": "daily_001_sub_1",
          "speakerText": "Hi, nice to meet you!",
          "speakerTextCn": "你好，很高兴认识你！",
          "responses": [
            { "text": "Nice to meet you too!", "text_cn": "我也很高兴认识你！", "audio_url": "" }
          ],
          "usageNote": "正式场合常用",
          "qaType": "must_speak",
          "order": 1
        }
      ]
    }
  ]
}
```

## 数据库表

导入目标表：`sub_scenes` 和 `qa_pairs`，均使用 upsert（冲突时更新）。
