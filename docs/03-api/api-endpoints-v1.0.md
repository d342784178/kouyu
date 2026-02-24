# 语习集 - API接口文档

> 版本: v1.0
> 最后更新: 2026-02-24
> 优先级: P1
> 阅读时间: 20分钟

---

## 接口概览

| 模块 | 基础路径 | 说明 |
|------|----------|------|
| 场景 | `/api/scenes` | 场景列表、详情、测试题 |
| 短语 | `/api/phrases` | 短语列表、详情 |
| 开放式测试 | `/api/open-test` | 对话初始化、交互、分析 |
| 音频 | `/api/audio` | 音频代理 |

---

## 场景API

### GET /api/scenes

获取场景列表。

**Query参数:**
- `page`: 页码，默认1
- `pageSize`: 每页数量，默认10
- `category`: 分类筛选
- `search`: 搜索关键词

### GET /api/scenes/[id]

获取场景详情。

### GET /api/scenes/[id]/tests

获取场景测试题。

---

## 短语API

### GET /api/phrases

获取短语列表。

### GET /api/phrases/[id]

获取短语详情。

---

## 开放式测试API

### POST /api/open-test/initiate

初始化对话测试。

### POST /api/open-test/chat

对话交互。

### POST /api/open-test/analyze

分析题目。

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-24 | 初始版本 | - |
