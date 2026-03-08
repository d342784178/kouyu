# 技术栈

## 核心框架

- **Next.js 14** (App Router) - React全栈框架
- **TypeScript 5** - 类型安全
- **React 18** - UI库

## 样式和UI

- **Tailwind CSS 3.4** - 实用优先的CSS框架
- **Framer Motion 12** - 动画库
- **FontAwesome 7** - 图标库

## 数据层

- **PostgreSQL** (Neon) - 关系型数据库
- **Drizzle ORM 0.45** - 类型安全的ORM
- **Drizzle Kit 0.31** - 数据库迁移工具

## AI能力

- **GLM-4-Flash** (智谱AI) - 大语言模型，用于对话生成和评测
- **AI SDK 6** (@ai-sdk/openai) - AI集成框架
- **Microsoft Cognitive Services Speech SDK** - 语音识别和评测
- **Edge TTS / MSEdge TTS** - 文本转语音

## 存储

- **腾讯云COS** - 音频文件存储
- **Vercel Blob** - 文件上传和CDN

## 测试

- **Playwright 1.58** - 端到端测试框架

### 前端语音测试
前端测试录音功能时,可以使用以下脚本播放语音

- 直接指定语音内容
python .kiro/temp/tts-test/tts_play.py -t "Hello, how are you today?"




## 开发工具

- **ESLint** - 代码检查
- **PostCSS + Autoprefixer** - CSS处理
- **ts-node** - TypeScript执行环境

## 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器 (http://localhost:3000)

# 构建和部署
pnpm build            # 生产构建
pnpm start            # 启动生产服务器
pnpm lint             # 代码检查

# 测试
pnpm test:e2e         # 运行端到端测试
pnpm test:e2e:ui      # UI模式运行测试（可视化调试）
pnpm test:e2e:debug   # 调试模式
pnpm test:e2e:report  # 查看测试报告

# 数据管理
npx ts-node prepare/scene/scripts/scene-manager.ts reset        # 重置场景数据
npx ts-node prepare/scene/scripts/scene-manager.ts update-audio # 更新音频URL
npx ts-node prepare/scene/scripts/scene-manager.ts verify       # 验证数据
npx ts-node prepare/phrases/scripts/reinit_database.ts          # 重置短语数据
```

## 环境变量

项目需要在 `.env.local` 中配置：

- `DATABASE_URL` - PostgreSQL连接字符串
- `GLM_API_KEY` - 智谱AI API密钥
- `NEXT_PUBLIC_COS_BASE_URL` - 腾讯云COS基础URL

## 部署平台

- **Vercel** - 主要部署平台，推送到GitHub自动部署
