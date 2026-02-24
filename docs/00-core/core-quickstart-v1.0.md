# 语习集 - 快速开始

> 版本: v1.0
> 最后更新: 2026-02-24
> 优先级: P0
> 阅读时间: 15分钟

---

## 文档简介

本文档指导您快速搭建语习集项目的开发环境，并在本地运行项目。

---

## 目录

- [环境要求](#环境要求)
- [安装步骤](#安装步骤)
- [配置环境变量](#配置环境变量)
- [启动项目](#启动项目)
- [验证安装](#验证安装)
- [常见问题](#常见问题)

---

## 环境要求

### 必需软件

| 软件 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18.0 | JavaScript运行时 |
| pnpm | >= 8.0 | 包管理器 |
| Git | >= 2.0 | 版本控制 |

### 验证环境

```bash
# 检查Node.js版本
node -v

# 检查pnpm版本
pnpm -v

# 检查Git版本
git -v
```

---

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd kouyu
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填写必要的环境变量。

---

## 配置环境变量

### 必需配置

```env
# 数据库
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# AI服务
GLM_API_KEY=your_glm_api_key
GLM_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
GLM_MODEL=glm-4-flash

# 音频存储
NEXT_PUBLIC_COS_BASE_URL=https://your-bucket.cos.ap-region.myqcloud.com

# Azure语音
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_region
```

### 获取配置值

| 配置项 | 获取方式 |
|--------|----------|
| `DATABASE_URL` | [Neon控制台](https://console.neon.tech) |
| `GLM_API_KEY` | [智谱AI开放平台](https://open.bigmodel.cn) |
| `NEXT_PUBLIC_COS_BASE_URL` | [腾讯云COS控制台](https://console.cloud.tencent.com/cos) |
| `AZURE_SPEECH_KEY` | [Azure门户](https://portal.azure.com) |

---

## 启动项目

### 开发模式

```bash
pnpm dev
```

项目将在 `http://localhost:3000` 启动。

### 生产模式

```bash
pnpm build
pnpm start
```

---

## 验证安装

### 检查点1: 首页访问

访问 `http://localhost:3000`，确认能看到首页。

### 检查点2: 场景列表

访问 `http://localhost:3000/scene-list`，确认能加载场景列表。

### 检查点3: 数据库连接

```bash
# 测试数据库连接
npx ts-node prepare/scene/scripts/scene-manager.ts test
```

### 检查点4: API测试

```bash
# 测试场景API
curl http://localhost:3000/api/scenes
```

---

## 常见问题

### Q1: 安装依赖失败？

**A:** 尝试以下步骤：
1. 清除缓存: `pnpm store prune`
2. 删除node_modules: `rm -rf node_modules`
3. 重新安装: `pnpm install`

### Q2: 数据库连接失败？

**A:** 检查：
1. `DATABASE_URL` 格式是否正确
2. 数据库服务是否运行
3. 网络连接是否正常
4. SSL配置是否正确

### Q3: AI服务调用失败？

**A:** 检查：
1. `GLM_API_KEY` 是否正确
2. API额度是否充足
3. 网络连接是否正常

### Q4: 音频播放失败？

**A:** 检查：
1. `NEXT_PUBLIC_COS_BASE_URL` 配置
2. 音频文件是否存在
3. 浏览器控制台是否有错误

---

## 下一步

- [项目概述](./core-project-overview-v1.0.md) - 了解项目详情
- [编码规范](../02-development/dev-coding-standards-v1.0.md) - 开始开发
- [API文档](../03-api/) - 调用接口

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-24 | 初始版本 | - |
