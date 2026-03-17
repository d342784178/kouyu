# 场景数据管理工具

## 文件结构

```
prepare/scene/
├── data/
│   ├── scenes_final.json            # 最终场景数据（已导入数据库）
│   ├── sub-scenes/                  # 子场景数据（含问答对）
│   │   └── {scene_id}.json
│   ├── audio/                       # 音频文件
│   │   ├── questions/               # 问题音频
│   │   └── responses/               # 回答音频
│   └── practice-questions/          # 子场景练习题数据
│       └── {sub_scene_id}_{type}.json
├── scripts/
│   ├── regenerate-all-v9.ts         # 生成子场景和问答对数据
│   ├── generate_qa_audio.py         # 生成问答对音频
│   ├── upload_audio_to_cos.py       # 上传音频到腾讯云COS
│   ├── import-sub-scenes.ts         # 导入子场景到数据库
│   ├── import-practice-questions.js # 导入练习题到数据库
│   └── export-database.ts           # 从数据库导出数据到本地
└── README.md
```

---

## 脚本说明

### 1. 数据生成脚本

#### regenerate-all-v9.ts

使用 NVIDIA Qwen-80b API 生成子场景和问答对数据。

**特点**:
- 使用优化后的 Prompt V9
- 限制每个子场景生成 3 个问答对
- 每个问答对包含 2-3 个不同情况的回答
- 包含 5 种常见错误避免规则
- 支持断点续传

**使用方法**:
```bash
# 生成所有场景（断点续传）
npx tsx prepare/scene/scripts/regenerate-all-v9.ts

# 强制重新生成
npx tsx prepare/scene/scripts/regenerate-all-v9.ts --force
```

**输出**: `data/sub-scenes/{scene_id}.json`

---

### 2. 音频生成脚本

#### generate_qa_audio.py

使用 edge-tts 为问答对数据生成音频文件。

**功能**:
- 为每个问答对的 triggerText 生成问题音频
- 为每个 followUp 生成回答音频
- 支持13个并发，自动跳过已存在的文件

**使用方法**:
```bash
# 安装依赖
pip install edge-tts

# 生成音频
python prepare/scene/scripts/generate_qa_audio.py
```

**输出**:
- `data/audio/questions/{qa_id}.mp3` - 问题音频
- `data/audio/responses/{qa_id}_response{n}.mp3` - 回答音频

---

### 3. 音频上传脚本

#### upload_audio_to_cos.py

清理腾讯云COS上的现有音频并上传新音频。

**功能**:
- 清理 qa/questions/ 和 qa/responses/ 目录
- 上传本地音频文件到腾讯云COS
- 支持10个并发上传

**使用方法**:
```bash
# 安装依赖
pip install cos-python-sdk-v5 python-dotenv

# 上传音频
python prepare/scene/scripts/upload_audio_to_cos.py
```

**环境变量**:
- `COS_SECRET_ID` - 腾讯云密钥ID
- `COS_SECRET_KEY` - 腾讯云密钥Key
- `COS_REGION` - 地域（默认 ap-guangzhou）
- `COS_BUCKET` - 存储桶名称

---

### 4. 数据导入脚本

#### import-sub-scenes.ts

将子场景数据导入数据库（sub_scenes 和 qa_pairs 表）。

```bash
# 导入所有数据
npx tsx prepare/scene/scripts/import-sub-scenes.ts

# 只导入指定场景
npx tsx prepare/scene/scripts/import-sub-scenes.ts --scene daily_001
```

#### import-practice-questions.js

将练习题数据导入数据库（sub_scene_practice_questions 表）。

```bash
# 导入所有数据
node prepare/scene/scripts/import-practice-questions.js

# 强制覆盖已有数据
node prepare/scene/scripts/import-practice-questions.js --force
```

---

### 5. 数据导出脚本

#### export-database.ts

从数据库导出数据到本地 JSON 文件。

```bash
npx tsx prepare/scene/scripts/export-database.ts
```

---

## 数据格式

### 问答对结构 (qa_pairs 表)

```json
{
  "id": "daily_001_sub_1_qa_1",
  "subSceneId": "daily_001_sub_1",
  "dialogueMode": "user_responds",
  "triggerText": "Hi there! Table for one?",
  "triggerTextCn": "您好！一位吗？",
  "triggerSpeakerRole": "staff",
  "scenarioHintCn": "服务员在餐厅门口迎接你。",
  "followUps": [
    { "text": "Yeah, just me, thanks.", "text_cn": "对，就我一个，谢谢。", "situation": "一位用餐" },
    { "text": "Two, actually. My friend is coming.", "text_cn": "两位，我朋友马上来。", "situation": "两位用餐" },
    { "text": "No, just me for now.", "text_cn": "不，就我一个。", "situation": "暂时一位" }
  ],
  "usageNote": "服务员问候时的回应",
  "learnRequirement": "speak_followup",
  "order": 1
}
```

**对话模式说明**:
- `user_responds`: 对方先说话，用户学习如何回应
- `user_asks`: 用户主动提问，对方回应

**角色说明**:
- `staff`: 服务场景中的服务员/工作人员
- `peer`: 社交场景中的朋友/同事
- `customer`: 用户（学习者）作为顾客

---

## 场景分类统计

| 分类 | ID前缀 | 数量 |
|------|--------|------|
| 日常 | `daily_` | 28 |
| 社交 | `social_` | 14 |
| 旅行 | `travel_` | 8 |
| **总计** | - | **50** |

---

## 音频URL格式

音频URL使用腾讯云COS：

- 问题音频: `https://kouyu-scene-1300762139.cos.ap-guangzhou.myqcloud.com/qa/questions/{qa_id}.mp3`
- 回答音频: `https://kouyu-scene-1300762139.cos.ap-guangzhou.myqcloud.com/qa/responses/{qa_id}_response{n}.mp3`

---

## 常见工作流程

### 1. 完整数据生成流程

```bash
# 1. 生成子场景数据
npx tsx prepare/scene/scripts/regenerate-all-v9.ts

# 2. 导入子场景到数据库
npx tsx prepare/scene/scripts/import-sub-scenes.ts

# 3. 生成音频文件
python prepare/scene/scripts/generate_qa_audio.py

# 4. 上传音频到腾讯云COS
python prepare/scene/scripts/upload_audio_to_cos.py
```

### 2. 仅更新音频

```bash
# 1. 清理旧音频
rm -rf prepare/scene/data/audio/questions/* prepare/scene/data/audio/responses/*

# 2. 重新生成音频
python prepare/scene/scripts/generate_qa_audio.py

# 3. 上传到腾讯云COS
python prepare/scene/scripts/upload_audio_to_cos.py
```

---

## 环境变量

需要在 `.env.local` 中配置：

| 变量名 | 说明 |
|--------|------|
| `NVIDIA_API_KEY` | NVIDIA API密钥（用于生成数据） |
| `DATABASE_URL` | 数据库连接字符串（用于导入数据） |
| `COS_SECRET_ID` | 腾讯云COS密钥ID |
| `COS_SECRET_KEY` | 腾讯云COS密钥Key |

---

## 注意事项

1. **API Key**: 确保设置了 `NVIDIA_API_KEY` 环境变量
2. **并发控制**: 音频生成使用13个并发，上传使用10个并发
3. **断点续传**: 生成过程中断可重新运行，会自动跳过已完成的场景
4. **数据质量**: 使用 Prompt V9 生成，确保模式正确、内容高质量
5. **音频命名**: 问题音频为 `{qa_id}.mp3`，回答音频为 `{qa_id}_response{n}.mp3`
