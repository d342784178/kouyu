# 文档质量测试套件

> 版本: v1.0
> 最后更新: 2026-02-24
> 用途: 自动化验证项目文档质量

---

## 文档简介

本文档质量测试套件用于全面验证 `project_rules.md` 及所有子文档的结构合规性和内容有效性，确保文档体系始终保持高质量状态。

---

## 目录

- [目录结构](#目录结构)
- [快速开始](#快速开始)
- [测试脚本说明](#测试脚本说明)
- [LLM内容测试](#llm内容测试)
- [自动化验证机制](#自动化验证机制)
- [测试覆盖范围](#测试覆盖范围)
- [质量状态标记](#质量状态标记)
- [常见问题](#常见问题)

---

## 目录结构

```
docs/tests/
├── data/                           # 测试数据（配置文件）
│   ├── structure-tests.json        # 结构测试用例配置
│   └── content-tests.json          # 内容测试用例配置
├── scripts/                        # 测试脚本
│   ├── run-all-tests.js            # 统一测试入口
│   ├── run-structure-tests.js      # 结构合规性测试
│   └── run-content-tests-llm.js    # 内容有效性测试（LLM版本）
├── reports/                        # 测试报告（自动生成）
│   ├── structure-test-results.json # 结构测试结果
│   ├── content-test-results-llm.json # 内容测试结果（LLM版本）
│   └── doc-quality-report.json     # 综合质量报告
└── README.md                       # 本说明文档
```

---

## 快速开始

### 执行所有测试

```bash
node docs/tests/scripts/run-all-tests.js
```

### 单独执行结构测试

```bash
node docs/tests/scripts/run-structure-tests.js
```

### 单独执行内容测试（LLM版本）

```bash
# 使用.env.local中的API密钥
node docs/tests/scripts/run-content-tests-llm.js

# 或使用命令行参数
node docs/tests/scripts/run-content-tests-llm.js --api-key=your_api_key
```
**前置准备**: 内容测试必须重新准备用例数据(历史数据可能无效)，需要根据当前项目工程内容(排除docs目录下文档,本用例就是用来测试文档质量的)随机生成关于项目多个方面的20个问题，数据格式参考 `data/content-tests.json`，每次覆盖 `data/content-tests.json`。

---



## 测试脚本说明

### 脚本文件清单

| 文件名 | 类型 | 说明 |
|--------|------|------|
| `scripts/run-all-tests.js` | 入口脚本 | 统一执行所有测试并生成综合报告 |
| `scripts/run-structure-tests.js` | 测试脚本 | 验证文档结构合规性（自动扫描） |
| `scripts/run-content-tests-llm.js` | 测试脚本 | 内容有效性测试（LLM智能分析） |
| `data/structure-tests.json` | 配置文件 | 结构测试用例定义 |
| `data/content-tests.json` | 配置文件 | 内容测试用例定义 |

### 输出文件

| 文件名 | 位置 | 说明 |
|--------|------|------|
| `structure-test-results.json` | `reports/` | 结构测试结果详情 |
| `content-test-results-llm.json` | `reports/` | 内容测试结果（LLM版本） |
| `doc-quality-report.json` | `reports/` | 综合质量报告 |

---

### 环境配置

**API密钥来源（优先级从高到低）：**

1. 命令行参数：`--api-key=xxx`
2. 系统环境变量：`NVIDIA_API_KEY`
3. `.env.local` 文件

**其他配置：**

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NVIDIA_MODEL` | 使用的模型 | `meta/llama-3.1-405b-instruct` |
| `NVIDIA_API_URL` | API地址 | `https://integrate.api.nvidia.com/v1/chat/completions` |

**设置方法：**

```bash
# 方式1：命令行参数
node docs/tests/scripts/run-content-tests-llm.js --api-key=your_api_key

# 方式2：系统环境变量（Windows）
set NVIDIA_API_KEY=your_api_key

# 方式3：.env.local文件
NVIDIA_API_KEY=your_api_key
```


## 常见问题

### Q: 测试失败时如何处理？

A: 查看 `reports/` 目录下的 `*-test-results.json` 文件，定位失败项并修复文档问题后重新测试。

### Q: 如何添加新的测试用例？

A: 编辑 `data/structure-tests.json` 或 `data/content-tests.json` 文件，按照现有格式添加测试用例。


**数据格式示例：**

```json
{
  "testSuite": "文档内容有效性测试",
  "version": "1.0",
  "description": "验证项目文档的内容有效性",
  "questions": [
    {
      "id": "Q001",
      "question": "依赖变更后需要做什么？",
      "expectedAnswer": "重启服务器",
      "score": 10
    }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 问题唯一标识，格式为 `Q` + 三位数字 |
| `question` | string | 问题内容 |
| `expectedAnswer` | string | 预期答案（关键词匹配） |
| `score` | number | 该题分值 |


### Q: 没有API密钥怎么办？

A: 提示用户配置API密钥



## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-24 | 初始版本，包含结构和内容测试 | AI |

---

*本文档版本: v1.2 | 最后更新: 2026-02-24*
