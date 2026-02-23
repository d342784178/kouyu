# 语习集 - 英语口语学习APP

一个专注于场景化英语口语学习的AI驱动型Web应用，帮助用户在真实对话场景中掌握实用口语表达。

## 📱 项目概述

语习集是一款基于Next.js开发的英语口语学习应用，采用场景化学习方式，结合AI技术提供个性化对话练习和精准发音反馈。应用包含丰富的日常场景对话、高频短语库和智能测试系统。

### 核心功能

- **场景学习**: 5大类场景（日常、职场、留学、旅行、社交），每个场景包含完整对话、解析和高频单词
- **短语库**: 100+高频英语短语，覆盖日常高频场景，支持按场景筛选
- **AI对话练习**: 与AI进行开放式对话练习，支持多轮对话和实时评测
- **智能测试**: 支持选择题、填空题、问答题、开放式对话等多种题型
- **发音训练**: 支持语音输入，AI自动评测发音质量
- **音频播放**: 每个短语和对话都配有标准发音音频

## 🛠️ 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **动画**: Framer Motion
- **数据库**: PostgreSQL (Neon) + Drizzle ORM
- **存储**: 腾讯云 COS (音频文件)
- **AI能力**: GLM-4-Flash (智谱AI)
- **部署**: Vercel

## 📁 项目结构

```
kouyu/
├── src/                          # 源代码
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API路由
│   │   │   ├── scenes/           # 场景相关API
│   │   │   ├── phrases/          # 短语相关API
│   │   │   ├── open-test/        # 开放式测试API
│   │   │   └── fill-blank/       # 填空测试API
│   │   ├── scene-list/           # 场景列表页
│   │   ├── scene-detail/         # 场景详情页
│   │   ├── scene-test/           # 场景测试页
│   │   ├── phrase-library/       # 短语库页面
│   │   └── phrase-detail/        # 短语详情页
│   ├── components/               # 公共组件
│   ├── lib/                      # 工具库
│   │   ├── db/                   # 数据库配置和schema
│   │   ├── audioUrl.ts           # 音频URL构建工具
│   │   └── llm.ts                # LLM调用封装
│   └── types.ts                  # 类型定义
├── prepare/                      # 数据准备脚本
│   ├── scene/                    # 场景数据
│   │   ├── data/                 # JSON数据文件
│   │   └── scripts/              # 管理脚本
│   └── phrases/                  # 短语数据
├── demands/                      # 需求文档
│   ├── v1/                       # v1版本
│   └── v2/                       # v2版本（当前）
└── .trae/                        # Trae配置
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

# AI API Key（智谱AI）
GLM_API_KEY=...

# 腾讯云COS
NEXT_PUBLIC_COS_BASE_URL=https://kouyu-scene-1300762139.cos.ap-guangzhou.myqcloud.com
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 📊 数据说明

### 场景数据

| 类别 | ID前缀 | 数量 | 说明 |
|------|--------|------|------|
| daily | daily_ | 30 | 日常场景 |
| workplace | workplace_ | 25 | 职场场景 |
| study_abroad | study_abroad_ | 20 | 留学场景 |
| travel | travel_ | 15 | 旅行场景 |
| social | social_ | 10 | 社交场景 |

- **对话内容**: 每个场景包含3-5轮对话
- **高频单词**: 每个场景提取核心单词和短语
- **音频**: 每句对话和词汇都有标准发音音频

### 短语数据

- **总数**: 100个高质量短语
- **分类**: 按场景分类
- **难度**: 入门/进阶/中级
- **音频**: 每个短语配有标准发音

### 数据库表结构

**scenes** - 场景表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| name | text | 场景名称 |
| category | text | 分类 |
| description | text | 场景描述 |
| difficulty | text | 难度 |
| duration | integer | 学习时长 |
| tags | jsonb | 关键词标签 |
| dialogue | jsonb | 对话内容 |
| vocabulary | jsonb | 高频词汇 |

**phrases** - 短语表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| english | text | 英文短语 |
| chinese | text | 中文翻译 |
| partOfSpeech | text | 词性 |
| scene | text | 适用场景 |
| difficulty | text | 难度 |
| audioUrl | text | 音频URL |

**scene_tests** - 场景测试表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| sceneId | text | 关联场景ID |
| type | text | 测试类型 |
| order | integer | 题目顺序 |
| content | jsonb | 题目内容 |

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

## 🔊 音频URL格式

音频使用 `COS:/` 协议前缀，由 `buildAudioUrl` 函数解析：

```
COS:/scene/dialogues/{scene_id}_round{n}_speaker{x}.mp3
COS:/scene/vocabulary/{scene_id}_vocab{n}_word.mp3
COS:/phrases/{phrase_id}.mp3
```

## 🛠️ 开发指南

### 数据管理命令

```bash
# 场景数据管理
npx ts-node prepare/scene/scripts/scene-manager.ts test         # 测试音频URL
npx ts-node prepare/scene/scripts/scene-manager.ts update-audio # 更新JSON音频URL
npx ts-node prepare/scene/scripts/scene-manager.ts reset        # 重置数据库
npx ts-node prepare/scene/scripts/scene-manager.ts update-db    # 更新数据库音频URL
npx ts-node prepare/scene/scripts/scene-manager.ts verify       # 验证更新结果

# 短语数据管理
npx ts-node prepare/phrases/scripts/reinit_database.ts
```

### 添加新场景

1. 准备场景JSON数据
2. 生成音频文件并上传到腾讯云COS
3. 运行 `scene-manager.ts reset` 导入数据库

## 📦 部署

项目已配置Vercel部署，推送代码到GitHub后自动部署：

```bash
vercel --prod
```

## 📄 相关文档

- [项目规则](/.trae/rules/project_rules.md) - 开发规范
- [需求文档](/demands/v2/需求文档.md) - 产品需求
- [技术设计文档](/demands/v2/设计文档/技术设计文档.md) - 技术方案
- [数据模型设计](/demands/v2/设计文档/英语口语场景数据模型设计.md) - 数据库设计

## 🤝 贡献

欢迎提交Issue和PR！

## 📄 License

MIT License
