# 数据上传脚本

用于将短语数据和音频文件上传到数据库和Vercel Blob。

## 📁 脚本说明

### 🚀 初始化脚本（推荐）

| 脚本 | 功能 | 使用场景 |
|---------|------|---------|
| `init_database_and_audio.ts` | **完整初始化**：上传音频到Blob + 插入数据到数据库 | **首次部署** |
| `init_examples_only.ts` | 仅插入示例数据 | 补充示例数据 |
| `update_phrase_audio_urls.ts` | 更新短语音频URL为Blob地址 | 音频URL更新 |
| `verify_data.ts` | 验证数据完整性 | 数据检查 |

### 上传脚本（TypeScript）

| 脚本 | 功能 | 使用场景 |
|---------|------|---------|
| `upload_data.ts` | 完整上传：音频→Blob + 数据→数据库 | 首次部署或全量更新 |
| `upload_audio_only.ts` | 仅上传音频文件到Vercel Blob | 只更新音频 |
| `upload_database_only.ts` | 仅上传数据到数据库 | 只更新数据（不改音频） |

## 🔧 环境要求

### 安装依赖

```bash
npm install -D ts-node
npm install @neondatabase/serverless @vercel/blob dotenv
```

### 环境变量

确保 `.env.local` 包含：

```env
# 数据库连接（上传数据时需要）
DATABASE_URL=postgresql://...

# Vercel Blob Token（上传音频时需要）
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

## 🚀 使用方法

### 首次初始化（推荐）

一键完成所有初始化工作：

```bash
npx ts-node prepare/scripts/init_database_and_audio.ts
```

**功能说明：**
- 上传 300 个音频文件到 Vercel Blob
- 将 100 个短语插入数据库
- 自动更新音频 URL 为 Blob 地址

### 分步操作

#### 1. 仅上传音频

```bash
npx ts-node prepare/scripts/upload_audio_only.ts
```

#### 2. 仅插入示例数据

```bash
npx ts-node prepare/scripts/init_examples_only.ts
```

#### 3. 更新短语音频URL

```bash
npx ts-node prepare/scripts/update_phrase_audio_urls.ts
```

#### 4. 验证数据完整性

```bash
npx ts-node prepare/scripts/verify_data.ts
```

## 📊 数据流程

```
prepare/data/
├── phrases_100_quality.json    ──┐
└── audio/                        │
    ├── phrases/                  │
    └── examples/                 │
                                  ▼
                    ┌─────────────────────────┐
                    │ init_database_and_audio │
                    └─────────────────────────┘
                                  │
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
    ┌─────────────────┐                    ┌─────────────────┐
    │  Vercel Blob    │                    │   PostgreSQL    │
    │                 │                    │                 │
    │ audio/phrases/  │                    │  phrases 表     │
    │ audio/examples/ │                    │  phrase_examples│
    └─────────────────┘                    └─────────────────┘
```

## 🔗 音频路径映射

JSON 中的音频路径会自动映射为 Vercel Blob URL：

| JSON 中的路径 | 实际 Blob URL |
|--------------|--------------|
| `/data/audio/phrases/phrase_001.wav` | `https://xxx.public.blob.vercel-storage.com/audio/phrases/phrase_001.wav` |
| `/data/audio/examples/phrase_001_ex1.wav` | `https://xxx.public.blob.vercel-storage.com/audio/examples/phrase_001_ex1.wav` |

## ⚠️ 注意事项

1. **首次运行**：需要先安装 `ts-node`：`npm install -D ts-node`
2. **重复上传**：脚本会检查Blob中是否已存在相同文件，避免重复上传
3. **数据清空**：初始化脚本会清空现有数据，请谨慎操作
4. **批量处理**：音频上传采用批量处理，每批5个文件
5. **desc关键字**：phrase_examples表的desc字段是SQL关键字，插入时使用 `"desc"`

## 📝 数据库表结构

### phrases 表
- `id`: TEXT 主键
- `english`: TEXT 英文短语
- `chinese`: TEXT 中文翻译
- `part_of_speech`: TEXT 词性
- `scene`: TEXT 场景
- `difficulty`: TEXT 难度
- `pronunciation_tips`: TEXT 发音提示
- `audio_url`: TEXT 音频URL

### phrase_examples 表
- `id`: SERIAL 主键（自增）
- `phrase_id`: TEXT 外键
- `title`: TEXT 标题
- `desc`: TEXT 描述（SQL关键字，需加引号）
- `english`: TEXT 英文例句
- `chinese`: TEXT 中文翻译
- `usage`: TEXT 用法说明
- `audio_url`: TEXT 音频URL
