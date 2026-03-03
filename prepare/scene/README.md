# 场景数据管理工具

## 文件结构

```
prepare/scene/
├── data/
│   ├── scenes_final.json            # 最终场景数据（已导入数据库）
│   └── practice-questions/          # 子场景练习题数据
│       └── {scene_id}_sub_{n}_{type}.json
├── scripts/
│   ├── scene-manager.ts             # 场景管理脚本（主要）
│   ├── generate_scenes_110.js       # 生成110个场景数据
│   ├── generate-sub-scenes.js       # 生成子场景数据
│   ├── generate-practice-questions.js # 生成练习题数据
│   ├── import-sub-scenes.ts         # 导入子场景到数据库
│   └── import-practice-questions.js # 导入练习题到数据库
└── README.md
```

## 脚本说明

### 1. 场景生成脚本

#### generate_scenes_110.js

使用 NVIDIA GLM4.7 API 生成 110 个场景数据。

**使用方法**:
```bash
node prepare/scene/scripts/generate_scenes_110.js
```

**输出**: `data/scenes_generated.json`

**数据格式**: 符合 `scenes` 表 schema 结构

---

### 2. 场景管理脚本

#### scene-manager.ts

场景数据管理脚本，提供以下命令：

| 命令 | 说明 |
|------|------|
| `test` | 测试腾讯云COS音频URL是否可访问 |
| `update-audio` | 更新JSON文件中的音频URL |
| `reset` | 重置数据库场景数据（从JSON文件导入） |
| `update-db` | 更新数据库中的音频URL |
| `verify` | 验证数据库中的音频URL |

**使用方法**:
```bash
npx ts-node prepare/scene/scripts/scene-manager.ts test
npx ts-node prepare/scene/scripts/scene-manager.ts reset
```

---

### 3. 子场景生成脚本

#### generate-sub-scenes.js

从 `scenes_final.json` 读取场景列表，调用 NVIDIA Qwen3 API 生成子场景和问答对数据。

**使用方法**:
```bash
# 生成所有场景（断点续传）
node prepare/scene/scripts/generate-sub-scenes.js

# 强制重新生成
node prepare/scene/scripts/generate-sub-scenes.js --force

# 只生成指定场景
node prepare/scene/scripts/generate-sub-scenes.js --scene daily_001

# 预览生成结果
node prepare/scene/scripts/generate-sub-scenes.js --dry-run
```

**输出**: `data/sub-scenes/{scene_id}.json`

---

### 4. 练习题生成脚本

#### generate-practice-questions.js

为子场景生成练习题（选择题、填空题、口语题）。

**使用方法**:
```bash
node prepare/scene/scripts/generate-practice-questions.js
```

**输出**: `data/practice-questions/{sub_scene_id}_{type}.json`

---

### 5. 数据导入脚本

#### import-sub-scenes.ts

将子场景数据导入数据库（sub_scenes 和 qa_pairs 表）。

```bash
npx ts-node prepare/scene/scripts/import-sub-scenes.ts
```

#### import-practice-questions.js

将练习题数据导入数据库（sub_scene_practice_questions 表）。

```bash
node prepare/scene/scripts/import-practice-questions.js
```

---

## 数据格式

### 场景结构 (scenes 表)

```json
{
  "id": "daily_001",
  "name": "餐厅点餐",
  "category": "日常",
  "description": "场景描述...",
  "difficulty": "初级",
  "duration": 10,
  "tags": ["点餐", "餐厅服务"],
  "createdAt": "2026-03-03T...",
  "updatedAt": "2026-03-03T..."
}
```

### 子场景结构 (sub_scenes 表)

```json
{
  "id": "daily_001_sub_1",
  "sceneId": "daily_001",
  "name": "入座点餐",
  "description": "进入餐厅后与服务员的初始交流",
  "order": 1,
  "estimatedMinutes": 5
}
```

### 问答对结构 (qa_pairs 表)

```json
{
  "id": "daily_001_sub_1_qa_1",
  "subSceneId": "daily_001_sub_1",
  "speakerText": "Hi there! Table for one?",
  "speakerTextCn": "您好！一位吗？",
  "responses": [
    { "text": "Yeah, just me, thanks.", "text_cn": "对，就我一个，谢谢。" }
  ],
  "usageNote": "服务员问候时的回应",
  "qaType": "must_speak",
  "order": 1
}
```

### 练习题结构 (sub_scene_practice_questions 表)

**选择题 (choice)**:
```json
{
  "id": "daily_001_sub_1_pq_1",
  "subSceneId": "daily_001_sub_1",
  "type": "choice",
  "order": 1,
  "content": {
    "question": "问题",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "correctAnswer": 0
  }
}
```

**填空题 (fill_blank)**:
```json
{
  "id": "daily_001_sub_1_pq_2",
  "subSceneId": "daily_001_sub_1",
  "type": "fill_blank",
  "order": 2,
  "content": {
    "sentence": "Please fill in the ____.",
    "answer": "blank",
    "hints": ["提示"]
  }
}
```

**口语题 (speaking)**:
```json
{
  "id": "daily_001_sub_1_pq_3",
  "subSceneId": "daily_001_sub_1",
  "type": "speaking",
  "order": 3,
  "content": {
    "prompt": "请用英语回答以下问题",
    "referenceAnswer": "参考答案"
  }
}
```

---

## 数据库表结构

### scenes 表
```sql
CREATE TABLE scenes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  duration INTEGER DEFAULT 10,
  tags JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### sub_scenes 表
```sql
CREATE TABLE sub_scenes (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL REFERENCES scenes(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  order INTEGER NOT NULL,
  estimated_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### qa_pairs 表
```sql
CREATE TABLE qa_pairs (
  id TEXT PRIMARY KEY,
  sub_scene_id TEXT NOT NULL REFERENCES sub_scenes(id),
  speaker_text TEXT NOT NULL,
  speaker_text_cn TEXT NOT NULL,
  responses JSONB NOT NULL,
  usage_note TEXT,
  audio_url TEXT,
  qa_type TEXT NOT NULL,
  order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### sub_scene_practice_questions 表
```sql
CREATE TABLE sub_scene_practice_questions (
  id TEXT PRIMARY KEY,
  sub_scene_id TEXT NOT NULL REFERENCES sub_scenes(id),
  type TEXT NOT NULL,
  order INTEGER NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 场景分类统计

| 分类 | ID前缀 | 数量 |
|------|--------|------|
| 日常 | `daily_` | 28 |
| 职场 | `workplace_` | 25 |
| 留学 | `study_abroad_` | 15 |
| 旅行 | `travel_` | 20 |
| 社交 | `social_` | 19 |
| **总计** | - | **107** |

---

## 用户角色定位规则

生成数据时遵循以下角色定位原则：

| 原则 | 说明 |
|------|------|
| **用户角色** | 用户（学习者）应扮演"消费者"、"使用者"、"顾客"、"求职者"、"学生"等角色 |
| **用户定位** | 用户应该是"接受服务"或"提出需求"的一方 |
| **speakerText** | 应该是服务提供者说的话（如服务员、店员、医生、面试官等） |
| **responses** | 应该是用户作为消费者/使用者的回应 |

---

## 环境变量

需要在 `.env.local` 中配置：

| 变量名 | 说明 |
|--------|------|
| `NVIDIA_API_KEY` | NVIDIA API密钥（用于生成数据） |
| `DATABASE_URL` | 数据库连接字符串（用于导入数据） |

---

## 音频URL格式

音频URL使用 `COS:/` 协议前缀，由 `buildAudioUrl` 函数解析为完整URL：

- 对话音频: `COS:/scene/dialogues/{scene_id}_round{n}_{speaker}.mp3`

完整URL示例:
```
https://kouyu-scene-1300762139.cos.ap-guangzhou.myqcloud.com/scene/dialogues/daily_001_round1_speaker1.mp3
```

---

## 注意事项

1. **API Key**: 确保设置了 `NVIDIA_API_KEY` 环境变量
2. **并发控制**: 默认30个并发，可根据API限制调整
3. **断点续传**: 生成过程中断可重新运行，会自动跳过已完成的场景
4. **数据格式**: 所有生成的数据需符合 `src/lib/db/schema.ts` 中定义的表结构
