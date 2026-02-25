# 脚本使用说明

本目录包含用于生成音频、上传到 Vercel Blob 和管理数据库的脚本。

---

## 📜 脚本列表

| 脚本 | 用途 | 命令 |
|------|------|------|
| `generate_audio_edge_tts.py` | 使用 edge-tts 生成音频 | `python prepare/scripts/generate_audio_edge_tts.py` |
| `upload_audio_and_update_json.ts` | 上传音频到 Vercel Blob 并更新 JSON | `npx ts-node prepare/scripts/upload_audio_and_update_json.ts` |
| `generate_and_upload_all.py` | 一键生成并上传 | `python prepare/scripts/generate_and_upload_all.py` |
| `reinit_database.ts` | 重新初始化数据库 | `npx ts-node prepare/scripts/reinit_database.ts` |
| `verify_database.ts` | 验证数据库数据 | `npx ts-node prepare/scripts/verify_database.ts` |

---

## 🚀 快速开始

### 完整流程（首次使用）

```bash
# 1. 生成音频 + 上传到 Vercel Blob + 更新 JSON
python prepare/scripts/generate_and_upload_all.py

# 2. 重新初始化数据库
npx ts-node prepare/scripts/reinit_database.ts

# 3. 验证数据
npx ts-node prepare/scripts/verify_database.ts
```

---

## 📖 详细说明

### 1. generate_audio_edge_tts.py

使用 edge-tts (Microsoft Azure TTS) 生成所有音频文件。

**功能:**
- 生成 100 个短语音频
- 生成 200 个示例音频
- 保存到 `prepare/data/audio/`

**配置:**
- 语音: `en-US-AriaNeural` (美式英语女声)
- 格式: MP3

**运行:**
```bash
python prepare/scripts/generate_audio_edge_tts.py
```

---

### 2. upload_audio_and_update_json.ts

上传生成的 MP3 文件到 Vercel Blob，并更新 JSON 文件中的 `audioUrl`。

**功能:**
- 上传所有 MP3 文件到 Vercel Blob
- 自动更新 `phrases_100_quality.json` 中的 `audioUrl` 为 Blob URL
- 自动备份原 JSON 文件

**环境变量:**
- `BLOB_READ_WRITE_TOKEN` (必需)

**运行:**
```bash
npx ts-node prepare/scripts/upload_audio_and_update_json.ts
```

---

### 3. generate_and_upload_all.py

一键执行音频生成和上传。

**功能:**
- 调用 `generate_audio_edge_tts.py` 生成音频
- 调用 `upload_audio_and_update_json.ts` 上传音频并更新 JSON

**运行:**
```bash
python prepare/scripts/generate_and_upload_all.py
```

---

### 4. reinit_database.ts

重新初始化数据库，使用 JSON 文件中的最新数据。

**功能:**
- 清空现有数据
- 插入所有短语（使用 Vercel Blob URL）
- 插入所有示例（使用 Vercel Blob URL）

**⚠️ 警告:** 这会清空现有数据！

**环境变量:**
- `DATABASE_URL` (必需)

**运行:**
```bash
npx ts-node prepare/scripts/reinit_database.ts
```

---

### 5. verify_database.ts

验证数据库数据是否正确。

**功能:**
- 检查短语和示例数量
- 验证 `audio_url` 是否为 Vercel Blob URL
- 显示统计数据

**环境变量:**
- `DATABASE_URL` (必需)

**运行:**
```bash
npx ts-node prepare/scripts/verify_database.ts
```

---

## 🔧 环境准备

### 1. 安装 Python 依赖

```bash
pip install edge-tts
```

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
DATABASE_URL=your_postgresql_url
```

---

## 📁 文件结构

```
scripts/
├── README.md                          # 本文件
├── generate_audio_edge_tts.py         # 生成音频
├── upload_audio_and_update_json.ts    # 上传音频
├── generate_and_upload_all.py         # 一键执行
├── reinit_database.ts                 # 初始化数据库
└── verify_database.ts                 # 验证数据
```

---

## 💡 使用场景

### 场景 1: 首次部署

```bash
# 生成音频、上传、更新 JSON
python prepare/scripts/generate_and_upload_all.py

# 初始化数据库
npx ts-node prepare/scripts/reinit_database.ts
```

### 场景 2: 仅重新生成音频

```bash
# 删除旧的 MP3 文件，然后重新生成
rm prepare/data/audio/**/*.mp3

# 重新生成
python prepare/scripts/generate_audio_edge_tts.py

# 上传（会自动跳过已存在的）
npx ts-node prepare/scripts/upload_audio_and_update_json.ts
```

### 场景 3: 仅更新数据库

```bash
# 如果 JSON 已更新，只需重新初始化数据库
npx ts-node prepare/scripts/reinit_database.ts
```

### 场景 4: 验证数据

```bash
# 检查数据库数据是否正确
npx ts-node prepare/scripts/verify_database.ts
```
