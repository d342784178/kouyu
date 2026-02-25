# 语习集 - 常见问题解决方案

> 版本: v1.0
> 最后更新: 2026-02-24
> 优先级: P1
> 阅读时间: 20分钟

---

## 文档简介

本文档汇总了语习集项目开发、部署和使用过程中常见的问题及解决方案，帮助开发者快速定位和解决问题。

---

## 目录

- [环境搭建问题](#环境搭建问题)
- [依赖安装问题](#依赖安装问题)
- [数据库问题](#数据库问题)
- [API服务问题](#api服务问题)
- [AI服务问题](#ai服务问题)
- [音频问题](#音频问题)
- [部署问题](#部署问题)
- [性能问题](#性能问题)

---

## 环境搭建问题

### Q1: Node.js 版本不兼容

**问题描述:**
```
error: Next.js requires Node.js >= 18.0.0
```

**解决方案:**

```bash
# 检查 Node.js 版本
node -v

# 如果版本低于 18，使用 nvm 升级
nvm install 18
nvm use 18

# 或使用 n
n install 18
```

---

### Q2: pnpm 未安装

**问题描述:**
```
command not found: pnpm
```

**解决方案:**

```bash
# 安装 pnpm
npm install -g pnpm

# 验证安装
pnpm -v
```

---

## 依赖安装问题

### Q3: 安装依赖失败

**问题描述:**
```
ERR_PNPM_NO_MATCHING_VERSION
```

**解决方案:**

```bash
# 1. 清除缓存
pnpm store prune

# 2. 删除 node_modules
rm -rf node_modules

# 3. 重新安装
pnpm install

# 4. 如果仍失败，尝试使用 npm
npm install
```

---

### Q4: 依赖冲突

**问题描述:**
```
ERR_PNPM_PEER_DEP_ISSUES
```

**解决方案:**

```bash
# 使用 --legacy-peer-deps 标志
pnpm install --legacy-peer-deps

# 或在 .npmrc 中添加
# legacy-peer-deps=true
```

---

## 数据库问题

### Q5: 数据库连接失败

**问题描述:**
```
Error: connect ECONNREFUSED
```

**解决方案:**

1. **检查环境变量**
   ```bash
   # 确认 .env.local 中 DATABASE_URL 格式正确
   DATABASE_URL=postgresql://username:password@host/database?sslmode=require
   ```

2. **验证数据库服务**
   ```bash
   # 测试连接
   psql $DATABASE_URL
   ```

3. **检查网络连接**
   - 确认数据库服务运行中
   - 检查防火墙设置
   - 确认 SSL 配置正确

---

### Q6: Drizzle ORM 查询失败

**问题描述:**
```
Error: relation "scenes" does not exist
```

**解决方案:**

```bash
# 1. 推送 schema 到数据库
npx drizzle-kit push

# 2. 或执行迁移
npx drizzle-kit migrate

# 3. 验证表结构
npx drizzle-kit studio
```

---

### Q7: 数据库字段映射错误

**问题描述:**
字段名与数据库列名不匹配（如 `audioUrl` vs `audio_url`）

**解决方案:**

```typescript
// 手动映射字段
const scene = {
  id: sceneData.id,
  audioUrl: sceneData.audio_url, // 手动映射
  // ...
}
```

---

## API服务问题

### Q8: API 返回 500 错误

**问题描述:**
```json
{
  "error": "Internal server error"
}
```

**解决方案:**

1. **查看服务器日志**
   ```bash
   # 开发环境
   pnpm dev
   
   # 查看 Vercel 日志
   vercel logs <project-name>
   ```

2. **检查环境变量**
   - 确认所有必需的环境变量已配置
   - 检查变量名是否正确

3. **验证数据库连接**
   ```bash
   curl http://localhost:3000/api/scenes
   ```

---

### Q9: API 返回 404

**问题描述:**
```json
{
  "error": "Not found"
}
```

**解决方案:**

1. **检查路由路径**
   - 确认 API 路由文件位置正确
   - 检查动态路由参数

2. **验证文件结构**
   ```
   src/app/api/scenes/
   ├── route.ts          # GET /api/scenes
   ├── [id]/
   │   └── route.ts      # GET /api/scenes/[id]
   └── categories/
       └── route.ts      # GET /api/scenes/categories
   ```

---

## AI服务问题

### Q10: GLM API 调用失败

**问题描述:**
```
Error: GLM API调用失败: 401
```

**解决方案:**

1. **检查 API 密钥**
   ```bash
   # 确认 .env.local 中 GLM_API_KEY 正确
   GLM_API_KEY=your_actual_api_key
   ```

2. **验证 API 额度**
   - 访问 [智谱AI控制台](https://open.bigmodel.cn)
   - 检查剩余额度

3. **检查网络连接**
   ```bash
   # 测试 API 连通性
curl https://open.bigmodel.cn/api/paas/v4/chat/completions \
     -H "Authorization: Bearer $GLM_API_KEY"
   ```

---

### Q11: AI 响应超时

**问题描述:**
```
Error: Request timeout
```

**解决方案:**

```typescript
// 增加超时时间
const response = await fetch(GLM_API_URL, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ ... }),
  signal: AbortSignal.timeout(30000), // 30秒超时
})
```

---

## 音频问题

### Q12: 音频播放失败

**问题描述:**
音频无法播放，控制台显示 404 或跨域错误

**解决方案:**

1. **检查音频 URL**
   ```typescript
   // 确认 URL 格式正确
   const audioUrl = buildAudioUrl('COS:/scene/daily_001/dialogues/...')
   ```

2. **使用音频代理**
   ```typescript
   // 通过代理解决跨域
   const proxyUrl = `/api/audio/proxy?url=${encodeURIComponent(audioUrl)}`
   ```

3. **检查 COS 配置**
   - 确认 Bucket 存在
   - 检查文件是否存在
   - 验证 CORS 配置

---

### Q13: 语音生成失败

**问题描述:**
```
Error: Speech synthesis failed
```

**解决方案:**

1. **检查 Azure 配置**
   ```bash
   # 确认环境变量
   AZURE_SPEECH_KEY=your_key
   AZURE_SPEECH_REGION=your_region
   ```

2. **使用备用 TTS**
   ```typescript
   // 降级到 Edge TTS
try {
     const result = await azureSpeech(text)
   } catch {
     const result = await edgeTTS(text)
   }
   ```

---

## 部署问题

### Q14: Vercel 构建失败

**问题描述:**
```
Error: Build failed
```

**解决方案:**

1. **本地验证构建**
   ```bash
   pnpm build
   ```

2. **检查构建日志**
   - 在 Vercel 控制台查看详细错误
   - 检查 TypeScript 错误

3. **常见修复**
   ```bash
   # 清除缓存重新部署
   vercel --force
   
   # 或重新安装依赖
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

---

### Q15: 环境变量未生效

**问题描述:**
生产环境缺少环境变量

**解决方案:**

1. **检查 Vercel 配置**
   - 进入 Project Settings → Environment Variables
   - 确认变量已添加
   - 重新部署以生效

2. **检查变量前缀**
   ```bash
   # 客户端需要 NEXT_PUBLIC_ 前缀
   NEXT_PUBLIC_COS_BASE_URL=https://...
   ```

---

## 性能问题

### Q16: 页面加载缓慢

**问题描述:**
首屏加载时间超过 3 秒

**解决方案:**

1. **启用静态生成**
   ```typescript
   // 对不常变化的页面使用 SSG
   export const dynamic = 'force-static'
   ```

2. **优化图片**
   ```typescript
   import Image from 'next/image'
   
   <Image
     src="/image.jpg"
     width={800}
     height={600}
     priority  // 首屏图片优先加载
   />
   ```

3. **代码分割**
   ```typescript
   import dynamic from 'next/dynamic'
   
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     loading: () => <p>Loading...</p>,
   })
   ```

---

### Q17: API 响应慢

**问题描述:**
API 响应时间超过 1 秒

**解决方案:**

1. **添加缓存**
   ```typescript
   export const revalidate = 60 // 60秒缓存
   ```

2. **优化数据库查询**
   ```typescript
   // 添加索引
   CREATE INDEX idx_scenes_category ON scenes(category);
   ```

3. **使用连接池**
   ```typescript
   // Neon 自动处理连接池
   import { neon } from '@neondatabase/serverless'
   ```

---

## 调试技巧

### 开启详细日志

```typescript
// 在 API 路由中添加日志
export async function GET() {
  console.log('[API] 开始处理请求')
  const startTime = Date.now()
  
  try {
    const data = await fetchData()
    console.log(`[API] 处理完成: ${Date.now() - startTime}ms`)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] 处理错误:', error)
    throw error
  }
}
```

### 使用 React DevTools

```bash
# 安装 React DevTools 浏览器扩展
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools

# 检查组件渲染性能
# 检查 Props 和 State
```

### 网络调试

```bash
# 使用 curl 测试 API
curl -v http://localhost:3000/api/scenes

# 检查响应头
curl -I http://localhost:3000/api/scenes
```

---

## 获取帮助

### 内部资源

- [项目概述](../00-core/core-project-overview-v1.0.md)
- [快速开始](../00-core/core-quickstart-v1.0.md)
- [API接口文档](../03-api/api-endpoints-v1.0.md)

### 外部资源

- [Next.js 文档](https://nextjs.org/docs)
- [Drizzle ORM 文档](https://orm.drizzle.team)
- [Neon 文档](https://neon.tech/docs)
- [智谱AI 文档](https://open.bigmodel.cn/dev/howuse/glm-4-flash)

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-24 | 初始版本 | AI |
