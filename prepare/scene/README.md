# 场景数据管理工具

## 文件结构

```
prepare/scene/
├── data/
│   ├── scenes_final.json            # 最终场景数据（已导入数据库）
│   ├── sub-scenes/                  # 子场景数据（含问答对）
│   │   └── {scene_id}.json
│   └── practice-questions/          # 子场景练习题数据
│       └── {sub_scene_id}_{type}.json
├── scripts/
│   ├── regenerate-all-v9.ts         # 生成子场景和问答对数据
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
- 包含 5 种常见错误避免规则
- 支持断点续传

**使用方法**:
```bash
# 生成所有场景（断点续传）
npx tsx prepare/scene/scripts/regenerate-all-v9.ts

# 强制重新生成
npx tsx prepare/scene/scripts/regenerate-all-v9.ts --force

# 预览生成结果
npx tsx prepare/scene/scripts/regenerate-all-v9.ts --dry-run
```

**输出**: `data/sub-scenes/{scene_id}.json`

**数据质量**:
- 场景平均分: 8.9
- 问答对平均分: 9.0
- 模式错误: 0

---

### 2. 数据导入脚本

#### import-sub-scenes.ts

将子场景数据导入数据库（sub_scenes 和 qa_pairs 表）。

```bash
# 导入所有数据
npx tsx prepare/scene/scripts/import-sub-scenes.ts

# 只导入指定场景
npx tsx prepare/scene/scripts/import-sub-scenes.ts --scene daily_001

# 预览导入操作
npx tsx prepare/scene/scripts/import-sub-scenes.ts --dry-run

# 设置并发数
npx tsx prepare/scene/scripts/import-sub-scenes.ts --concurrency 5
```

#### import-practice-questions.js

将练习题数据导入数据库（sub_scene_practice_questions 表），使用批量插入方式。

```bash
# 导入所有数据
node prepare/scene/scripts/import-practice-questions.js

# 只导入指定题型
node prepare/scene/scripts/import-practice-questions.js --type fill_blank

# 只导入指定对话模式
node prepare/scene/scripts/import-practice-questions.js --dialogueMode user_asks

# 只导入指定子场景
node prepare/scene/scripts/import-practice-questions.js --subScene daily_001_sub_1

# 强制覆盖已有数据
node prepare/scene/scripts/import-practice-questions.js --force
```

**参数说明**:

| 参数 | 说明 |
|------|------|
| `--subScene <id>` | 只导入指定子场景 |
| `--type <type>` | 只导入指定题型：choice, fill_blank, speaking |
| `--dialogueMode <mode>` | 只导入指定对话模式：user_responds, user_asks |
| `--force` | 强制覆盖已有数据（先删除后导入） |

---

### 3. 数据导出脚本

#### export-database.ts

从数据库导出数据到本地 JSON 文件。

```bash
npx tsx prepare/scene/scripts/export-database.ts
```

**输出**:
- `data/scenes_final.json` - 场景数据
- `data/sub-scenes/{scene_id}.json` - 子场景数据（含问答对）
- `data/practice-questions/{sub_scene_id}_{type}.json` - 练习题数据

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
  "dialogueMode": "user_responds",
  "triggerText": "Hi there! Table for one?",
  "triggerTextCn": "您好！一位吗？",
  "triggerSpeakerRole": "staff",
  "scenarioHint": "The waiter is greeting you at the restaurant entrance.",
  "scenarioHintCn": "服务员在餐厅门口迎接你。",
  "followUps": [
    { "text": "Yeah, just me, thanks.", "text_cn": "对，就我一个，谢谢。" }
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

**学习要求说明**:
- `speak_trigger`: 需要练习触发文本
- `speak_followup`: 需要练习后续回应
- `listen_only`: 只需听懂即可

### 练习题结构 (sub_scene_practice_questions 表)

**选择题 (choice)**:
```json
{
  "id": "daily_001_sub_1_pq_1",
  "subSceneId": "daily_001_sub_1",
  "type": "choice",
  "order": 1,
  "content": {
    "type": "choice",
    "dialogueMode": "user_asks",
    "scenarioHint": "场景提示（中文）",
    "options": [
      { "id": "opt_1", "text": "选项文本（英文）", "isCorrect": true },
      { "id": "opt_2", "text": "选项文本（英文）", "isCorrect": false }
    ],
    "explanation": "答案解析"
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
    "type": "fill_blank",
    "dialogueMode": "user_asks",
    "scenarioHint": "场景提示（中文）",
    "responseTemplate": "用户回答模板，用___表示空格",
    "blanks": [
      {
        "index": 0,
        "answer": "正确答案（英文）",
        "options": ["选项1（英文）", "选项2（英文）", "选项3（英文）", "选项4（英文）"]
      }
    ],
    "hint": "填空提示",
    "knowledgePoint": "考察的知识点类型"
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
    "type": "speaking",
    "dialogueMode": "user_asks",
    "scenarioHint": "场景提示（中文）",
    "expectedAnswers": ["参考答案1", "参考答案2", "参考答案3"],
    "evaluationCriteria": ["评分标准1", "评分标准2", "评分标准3"]
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
  dialogue_mode TEXT NOT NULL DEFAULT 'user_responds',
  trigger_text TEXT NOT NULL,
  trigger_text_cn TEXT NOT NULL,
  trigger_speaker_role TEXT,
  scenario_hint TEXT,
  scenario_hint_cn TEXT,
  follow_ups JSONB NOT NULL,
  usage_note TEXT,
  audio_url TEXT,
  learn_requirement TEXT NOT NULL,
  "order" INTEGER NOT NULL,
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
| 社交 | `social_` | 14 |
| 旅行 | `travel_` | 8 |
| **总计** | - | **50** |

---

## 对话模式与角色定位规则

### 对话模式

| 模式 | 说明 | triggerSpeakerRole |
|------|------|-------------------|
| `user_responds` | 对方先说话，用户学习如何回应 | `staff`（服务场景）或 `peer`（社交场景） |
| `user_asks` | 用户主动提问，对方回应 | `customer` |

### 角色定位原则

| 角色 | 说明 |
|------|------|
| **customer** | 用户（学习者）作为顾客/消费者 |
| **staff** | 服务场景中的服务员/工作人员 |
| **peer** | 社交场景中的朋友/同事 |

### 关键规则

1. `user_asks` 模式的 `triggerSpeakerRole` 永远是 `customer`
2. `user_responds` 模式的 `triggerSpeakerRole` 根据场景类型确定：
   - 服务场景 → `staff`
   - 社交场景 → `peer`

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

- 对话音频: `COS:/qa/questions/{qa_id}.mp3`
- 回应音频: `COS:/qa/responses/{qa_id}_response{n}.mp3`

完整URL示例:
```
https://kouyu-scene-1300762139.cos.ap-guangzhou.myqcloud.com/qa/questions/daily_001_sub_1_qa_1.mp3
```

---

## 常见工作流程

### 1. 完整数据生成流程

```bash
# 1. 生成子场景数据
npx tsx prepare/scene/scripts/regenerate-all-v9.ts

# 2. 导入子场景到数据库
npx tsx prepare/scene/scripts/import-sub-scenes.ts
```

### 2. 从数据库导出数据到本地

```bash
npx tsx prepare/scene/scripts/export-database.ts
```

---

## 注意事项

1. **API Key**: 确保设置了 `NVIDIA_API_KEY` 环境变量
2. **并发控制**: 默认10个并发，可根据API限制调整
3. **断点续传**: 生成过程中断可重新运行，会自动跳过已完成的场景
4. **数据格式**: 所有生成的数据需符合 `src/lib/db/schema.ts` 中定义的表结构
5. **数据质量**: 使用 Prompt V9 生成，确保模式正确、内容高质量
