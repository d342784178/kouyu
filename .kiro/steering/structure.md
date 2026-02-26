# 项目结构

## 目录组织

```
kouyu/
├── src/                          # 源代码目录
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
│   │   ├── phrase-detail/        # 短语详情页
│   │   ├── profile/              # 个人中心页
│   │   ├── admin/                # 管理后台
│   │   ├── layout.tsx            # 根布局
│   │   └── page.tsx              # 首页
│   ├── components/               # 公共组件
│   │   ├── BottomNav.tsx         # 底部导航栏
│   │   ├── CircularProgress.tsx  # 圆形进度条
│   │   ├── Loading.tsx           # 加载组件
│   │   └── OpenTestDialog.tsx    # 开放式测试对话框
│   ├── hooks/                    # 自定义Hooks
│   │   └── useAudio.ts           # 音频播放Hook
│   ├── lib/                      # 工具库
│   │   ├── db/                   # 数据库相关
│   │   │   ├── index.ts          # 数据库连接
│   │   │   ├── schema.ts         # Drizzle ORM schema
│   │   │   └── scenes.ts         # 场景数据操作
│   │   ├── conversation/         # 对话管理
│   │   ├── prompts/              # AI提示词模板
│   │   ├── audioUrl.ts           # 音频URL构建工具
│   │   └── llm.ts                # LLM调用封装
│   ├── styles/                   # 样式文件
│   │   └── globals.css           # 全局样式
│   └── types.ts                  # 全局类型定义
├── prepare/                      # 数据准备脚本
│   ├── scene/                    # 场景数据
│   │   ├── data/                 # JSON数据文件
│   │   └── scripts/              # 数据管理脚本
│   └── phrases/                  # 短语数据
├── tests/                        # 测试文件
│   └── e2e/                      # 端到端测试
│       ├── fixtures/             # 测试数据
│       ├── tests/                # 测试用例
│       └── utils/                # 测试工具
├── demands/                      # 需求文档
│   ├── v1/                       # v1版本需求
│   ├── v2/                       # v2版本需求
│   │   ├── 设计文档/             # 设计文档
│   │   └── 需求文档.md           # 需求文档
│   ├── 原型图/                   # 原型图
│   └── 交互风格说明文档.md       # 交互风格说明
├── .kiro/                        # Kiro配置
│   └── steering/                 # Steering规则
└── .trae/                        # Trae配置（旧）
    ├── documents/                # 文档
    ├── rules/                    # 项目规则
    ├── specs/                    # 规格说明
    └── temp/                     # 临时文件
```

## 关键约定

### 路由结构

- **页面路由**: 使用App Router，每个页面在 `src/app/` 下有独立目录
- **API路由**: 在 `src/app/api/` 下，使用 `route.ts` 文件
- **动态路由**: 使用 `[id]` 格式，如 `/scene-detail/[id]`

### 组件组织

- **页面组件**: 放在对应的页面目录下
- **公共组件**: 放在 `src/components/` 目录
- **组件命名**: 使用PascalCase，如 `BottomNav.tsx`

### 数据层

- **Schema定义**: 在 `src/lib/db/schema.ts` 中使用Drizzle ORM定义
- **数据操作**: 在 `src/lib/db/` 下按模块组织，如 `scenes.ts`
- **API调用**: 页面组件通过fetch调用 `/api/*` 路由

### 音频资源

- **存储**: 腾讯云COS
- **URL格式**: 使用 `COS:/` 协议前缀，由 `buildAudioUrl()` 函数解析
- **示例**: `COS:/scene/dialogues/{scene_id}_round{n}_speaker{x}.mp3`

### 样式规范

- **全局样式**: 在 `src/styles/globals.css` 中定义
- **Tailwind配置**: 使用统一的设计token（圆角、阴影、颜色）
- **圆角**: `rounded-card` (16px)
- **阴影**: `shadow-card`
- **响应式**: 移动优先设计

### 类型定义

- **全局类型**: 在 `src/types.ts` 中定义
- **组件类型**: 在组件文件内定义或使用全局类型
- **API类型**: 与数据库schema保持一致

### 测试组织

- **端到端测试**: 在 `tests/e2e/` 目录
- **测试数据**: 在 `tests/e2e/fixtures/` 目录
- **测试工具**: 在 `tests/e2e/utils/` 目录

## 数据库表结构

主要数据表：

- **scenes** - 场景表（id, name, category, description, difficulty, dialogue, vocabulary）
- **phrases** - 短语表（id, english, chinese, scene, difficulty, audioUrl）
- **scene_tests** - 场景测试表（id, sceneId, type, order, content）
- **open_tests** - 开放式测试表（id, sceneId, conversationHistory, status）

## 忽略目录

以下目录在构建和监听时被忽略：

- `demands/原型图/yuxiji/` - 原型图项目
- `node_modules/` - 依赖包
- `.git/` - Git仓库
- `.next/` - Next.js构建输出
