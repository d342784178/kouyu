# 语习集 - 英语口语学习APP

一个专注于场景化英语口语学习的AI驱动型Web应用，帮助用户在真实对话场景中掌握实用口语表达。

## 📱 项目概述

语习集是一款基于Next.js开发的英语口语学习应用，采用场景化学习方式，结合AI技术提供个性化对话练习和精准发音反馈。应用包含丰富的日常场景对话、高频短语库和智能测试系统。

### 核心功能

- **场景学习**: 4大类场景（日常问候、购物消费、餐饮服务、旅行出行），每个场景包含完整对话、解析和高频单词
- **短语库**: 100+高频英语短语，覆盖日常高频场景，支持按场景筛选
- **AI对话练习**: 与AI进行开放式对话练习，支持多轮对话和实时评测
- **智能测试**: 支持选择题、填空题、问答题、开放式对话等多种题型
- **发音训练**: 支持语音输入，AI自动评测发音质量
- **音频播放**: 每个短语和对话都配有标准发音音频

## 🛠️ 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **动画**: Framer Motion
- **数据库**: PostgreSQL (Neon) + Drizzle ORM
- **存储**: Vercel Blob (音频文件)
- **AI能力**: 大语言模型API（对话生成、发音评估）
- **部署**: Vercel

## 📁 项目结构

```
kouyu/
├── src/                          # 源代码
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API路由
│   │   │   ├── audio/            # 音频播放API
│   │   │   ├── fill-blank/       # 填空题评测API
│   │   │   │   └── evaluate/     # 评测接口
│   │   │   ├── open-test/        # 开放式测试API
│   │   │   │   ├── analyze/      # 测试分析
│   │   │   │   ├── audio/        # 音频生成
│   │   │   │   ├── chat/         # 对话接口
│   │   │   │   ├── continue/     # 继续对话
│   │   │   │   ├── initiate/     # 初始化对话
│   │   │   │   ├── speech/       # 语音合成
│   │   │   │   └── utils/        # 工具函数
│   │   │   ├── phrases/          # 短语数据API
│   │   │   └── scenes/           # 场景相关API
│   │   │       └── [id]/         # 场景详情API
│   │   │           ├── tests/    # 场景测试API
│   │   │           └── route.ts  # 场景数据
│   │   ├── phrase-detail/        # 短语详情页
│   │   ├── phrase-library/       # 短语库页面
│   │   ├── scene-detail/         # 场景详情页
│   │   │   └── [id]/             # 动态路由
│   │   │       ├── components/   # 场景详情组件
│   │   │       │   ├── DialogueContent.tsx    # 对话内容
│   │   │       │   ├── PlayAllButton.tsx      # 播放全部按钮
│   │   │       │   └── VocabularyContent.tsx  # 词汇内容
│   │   │       └── page.tsx      # 场景详情页面
│   │   ├── scene-list/           # 场景列表页
│   │   ├── scene-test/           # 场景测试页
│   │   │   └── [id]/             # 动态路由
│   │   │       ├── [testId]/     # 测试题目ID
│   │   │       │   ├── components/           # 测试组件
│   │   │       │   │   ├── LoadingSpinner.tsx # 加载动画
│   │   │       │   │   ├── ProgressBar.tsx    # 进度条
│   │   │       │   │   └── QuestionTypeCard.tsx # 题型卡片
│   │   │       │   ├── OpenTestDialog.tsx     # 开放式测试弹窗
│   │   │       │   ├── TestAnalysis.tsx       # 测试分析
│   │   │       │   └── page.tsx               # 测试页面
│   │   │       └── page.tsx      # 测试入口页
│   │   ├── test/                 # 短语测试页面
│   │   ├── PhraseCard.tsx        # 短语卡片组件
│   │   ├── SceneCard.tsx         # 场景卡片组件
│   │   ├── layout.tsx            # 根布局
│   │   └── page.tsx              # 首页
│   ├── components/               # 公共组件
│   │   └── BottomNav.tsx         # 底部导航
│   ├── hooks/                    # 自定义Hooks
│   │   └── useAudio.ts           # 音频播放Hook
│   ├── lib/                      # 工具库
│   │   ├── db/                   # 数据库相关
│   │   │   ├── index.ts          # 数据库连接
│   │   │   └── schema.ts         # 数据库表结构
│   │   └── llm.ts                # AI服务封装
│   └── styles/                   # 样式文件
│       └── globals.css           # 全局样式
├── design/                       # 设计文档
│   └── 交互风格说明文档.md        # 交互设计规范
├── demands/                      # 需求文档
│   ├── v1/                       # v1版本
│   └── v2/                       # v2版本（当前）
│       ├── 设计文档/              # 技术设计文档
│       ├── 需求文档.md            # 增量需求文档
│   └── 原型图/                    # 全量原型图
│   └── 需求文档.md                # 全量需求文档
├── prepare/                      # 数据准备（可选）
│   ├── data/                     # 数据文件
│   └── scripts/                  # 上传脚本
├── package.json                  # 项目依赖
└── ...                           # 配置文件
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
# 数据库连接
DATABASE_URL=postgresql://...

# Vercel Blob Token
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# AI API Key（用于对话生成和评测）
AI_API_KEY=...
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 📊 数据说明

### 场景数据

- **场景分类**: 4大类（日常问候、购物消费、餐饮服务、旅行出行）
- **场景数量**: 每个分类包含多个具体场景
- **对话内容**: 每个场景包含5-10轮对话
- **高频单词**: 每个场景提取核心单词和短语

### 短语数据

- **总数**: 100+个高质量短语
- **分类**: 按场景分类（日常问候、购物消费、餐饮服务、旅行出行）
- **难度**: 入门/进阶/中级
- **音频**: 每个短语配有标准发音

### 数据库表结构

**scenes** - 场景表
- id, name, category, description, difficulty, cover_image

**scene_dialogues** - 场景对话表
- id, scene_id, full_audio_url, duration, rounds

**scene_vocabulary** - 场景高频单词表
- id, scene_id, content, phonetic, translation, example_sentence

**open_tests** - 开放式测试表
- id, scene_id, test_type, title, description, difficulty

**scene_test_questions** - 场景测试题表
- id, scene_id, test_id, question_type, question_content, options, correct_answer

**phrases** - 短语表
- id, english, chinese, part_of_speech, scene, difficulty, audio_url

## 📝 主要页面

| 页面 | 路径 | 说明 |
|-----|------|------|
| 首页 | `/` | 学习进度、推荐场景、场景分类入口 |
| 场景列表 | `/scene-list` | 浏览所有场景分类和场景 |
| 场景详情 | `/scene-detail/[id]` | 场景对话学习、解析、高频单词 |
| 场景测试 | `/scene-test/[id]` | 场景测试选择 |
| 场景测试题 | `/scene-test/[id]/[testId]` | 具体测试题目 |
| 短语库 | `/phrase-library` | 浏览所有短语 |
| 短语详情 | `/phrase-detail` | 查看短语详情 |
| 测试 | `/test` | 短语测试页面 |

## 🎨 设计规范

- **交互风格说明文档**: `/design/交互风格说明文档.md`
- **圆角规范**: `rounded-card` (16px)
- **阴影规范**: `shadow-card`
- **主色调**: `#2563eb` (蓝色)
- **功能色**: success `#10b981`, danger `#ef4444`, info `#3b82f6`

## 🛠️ 开发指南

### 添加新场景

1. 在数据库中添加场景数据
2. 准备场景对话内容
3. 上传音频文件到Vercel Blob
4. 更新场景测试题目

### 添加新短语

1. 在 `src/lib/db/schema.ts` 中添加数据
2. 生成音频文件
3. 上传到Vercel Blob

## 📦 部署

项目已配置Vercel部署，推送代码到GitHub后自动部署：

```bash
vercel --prod
```

## 📄 相关文档

- [交互风格说明文档](/design/交互风格说明文档.md) - 设计规范
- [v2全量需求文档](/demands/v2/需求文档_全量.md) - 产品需求
- [v2增量需求文档](/demands/v2/需求文档/需求文档_增量.md) - 本次迭代需求
- [技术设计文档](/demands/v2/设计文档/技术设计文档.md) - 技术方案
- [数据模型设计](/demands/v2/设计文档/英语口语场景数据模型设计.md) - 数据库设计

## 🤝 贡献

欢迎提交Issue和PR！

## 📄 License

MIT License
