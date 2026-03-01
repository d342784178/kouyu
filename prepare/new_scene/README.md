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
# 推荐：直接 SQL 版本（简单可靠）
node prepare/new_scene/scripts/import-sub-scenes-simple.js

# 或 TypeScript 版本（需要 ts-node）
npx ts-node prepare/new_scene/scripts/import-sub-scenes.ts

# 只导入指定场景
node prepare/new_scene/scripts/import-sub-scenes-simple.js --scene daily_001
```

### 第三步：生成音频

```bash
# 生成所有问答对的音频文件
python prepare/qa_audio/1_generate_audio.py
```

### 第四步：上传音频到 COS

```bash
# 上传音频到腾讯云 COS 并更新数据库
python prepare/qa_audio/2_upload_to_cos.py
```

## 用户角色定位规则

生成数据时遵循以下角色定位原则：

| 原则 | 说明 |
|------|------|
| **用户角色** | 用户（学习者）应扮演"消费者"、"使用者"、"顾客"、"求职者"、"学生"等角色 |
| **用户定位** | 用户应该是"接受服务"或"提出需求"的一方 |
| **speakerText** | 应该是服务提供者说的话（如服务员、店员、医生、面试官等） |
| **responses** | 应该是用户作为消费者/使用者的回应 |

**正确示例**：
- 场景：餐厅点餐
- speakerText: "Hi there! Table for one?"（服务员问候）
- responses: "Yeah, just me, thanks."（顾客回应）

**错误示例**：
- 场景：叫出租车
- speakerText: "I'd like to book a taxi."（乘客叫车）
- responses: "Sure! Where to?"（调度员回应）❌ 用户扮演了服务提供者

## 数据格式

每个 JSON 文件对应一个场景，结构如下：

```json
{
  "sceneId": "daily_001",
  "sceneName": "餐厅点餐",
  "generatedAt": "2026-03-01T00:00:00.000Z",
  "model": "qwen/qwen3-next-80b-a3b-instruct",
  "subScenes": [
    {
      "id": "daily_001_sub_1",
      "sceneId": "daily_001",
      "name": "入座点餐",
      "description": "进入餐厅后与服务员的初始交流",
      "order": 1,
      "estimatedMinutes": 5,
      "qaPairs": [
        {
          "id": "daily_001_sub_1_qa_1",
          "subSceneId": "daily_001_sub_1",
          "speakerText": "Hi there! Table for one?",
          "speakerTextCn": "您好！一位吗？",
          "responses": [
            { "text": "Yeah, just me, thanks.", "text_cn": "对，就我一个，谢谢。", "audio_url": "" },
            { "text": "That's right, just one.", "text_cn": "是的，就一位。", "audio_url": "" }
          ],
          "usageNote": "服务员问候时的回应",
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

## 相关文档

- 音频生成脚本：`prepare/qa_audio/1_generate_audio.py`
- 音频上传脚本：`prepare/qa_audio/2_upload_to_cos.py`
