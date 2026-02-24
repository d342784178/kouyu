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

## LLM内容测试

### 测试流程

LLM内容测试通过调用外部大模型（NVIDIA API）执行以下流程：

```
┌─────────────────────────────────────────────────────────────────┐
│  a) 基于项目内容设计测试题目及预期答案                            │
│     ↓                                                           │
│  b) 配置大模型通过tool调用调阅本地子文档                          │
│     ↓                                                           │
│  c) 获取大模型针对测试题目的实际回答                              │
│     ↓                                                           │
│  d) 将实际答案与预期答案提交给大模型进行一致性分析                 │
└─────────────────────────────────────────────────────────────────┘
```

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

### Tool调用功能

LLM测试脚本配置了 `read_document` 工具，允许大模型调阅本地文档：

- **功能**: 读取指定路径的文档内容
- **参数**: `path` (文档路径)
- **示例**: `docs/01-architecture/arch-database-schema-v1.0.md`

### 并发与重试

- **并发数**: 5
- **超时时间**: 60秒
- **重试次数**: 最多5次
- **重试间隔**: 3秒

### 日志分类

脚本使用三种日志前缀区分不同类型的输出：

| 前缀 | 用途 |
|------|------|
| `[SCRIPT]` | 脚本执行流程日志 |
| `[LLM]` | 大模型返回内容 |
| `[RESULT]` | 测试结果 |

### 一致性分析

LLM会对实际答案与预期答案进行智能分析，输出：

```json
{
  "consistent": true/false,
  "score": 85,
  "reason": "核心信息正确，表述略有差异"
}
```

**评分标准：**
- 完全一致（100%）：实际答案与预期答案完全匹配
- 基本正确（80-99%）：核心信息正确，表述略有差异
- 部分正确（50-79%）：包含部分正确信息，但有遗漏或偏差
- 不正确（0-49%）：答案错误或完全偏离

---

## 自动化验证机制

### 强制验证流程

**每次更新 `project_rules.md` 后，必须执行以下流程：**

```
修改文档 → 执行测试 → 检查报告 → 修复问题 → 提交更新
```

### 验证触发条件

以下情况必须执行自动化测试：

- 修改 `project_rules.md` 内容
- 新增、删除或重命名子文档
- 修改文档索引表
- 更新文档元信息

### 通过标准

| 测试类型 | 通过阈值 | 说明 |
|----------|----------|------|
| 结构合规性 | ≥ 95% | 元信息、章节、链接完整性 |
| 内容有效性（LLM） | ≥ 75% | LLM智能分析准确性 |
| 综合评定 | 全部通过 | 方可提交更新 |

**质量状态标记：**
- 测试通过后，文档更新方可提交
- 测试报告自动保存至 `docs/tests/reports/doc-quality-report.json`

### 更新流程

1. 修改文档内容
2. 更新版本号和变更日志
3. **执行自动化测试**：`node docs/tests/scripts/run-all-tests.js`
4. 检查测试报告，修复问题
5. 测试通过后，提交文档更新

### 更新后检查清单

- [ ] 文档内所有相对链接可正常跳转
- [ ] 代码示例与当前实现一致
- [ ] 版本号已递增
- [ ] 变更日志已记录
- [ ] **自动化测试已通过**

---

## 测试覆盖范围

### 结构合规性测试

- **元信息完整性**: 版本号、日期、优先级、阅读时间
- **章节结构规范性**: 文档简介、目录、变更日志
- **文档索引一致性**: 序号连续、路径正确、优先级标注
- **交叉引用有效性**: 死链检测、链接可解析性

### 内容有效性测试

- **项目约束理解**: 核心约束表内容准确性
- **文档定位理解**: 使用场景指引准确性
- **维护规范理解**: 变更触发条件和维护流程
- **工具调用能力**: 子文档查阅和信息整合

---

## 质量状态标记

### 状态说明

| 状态 | 标记 | 说明 |
|------|------|------|
| 通过 | ✅ PASSED | 所有测试通过，可以提交 |
| 失败 | ❌ FAILED | 存在测试失败，需要修复 |

### 质量报告示例

```json
{
  "timestamp": "2026-02-24T10:30:00.000Z",
  "overallStatus": "PASSED",
  "qualityBadge": "PASSED",
  "summary": {
    "structure": {
      "total": 23,
      "passed": 23,
      "failed": 0,
      "passRate": "100.00%",
      "status": "PASSED"
    },
    "content": {
      "total": 28,
      "passed": 22,
      "failed": 6,
      "passRate": "78.57%",
      "scoreRate": "82.14%",
      "status": "PASSED"
    }
  },
  "verificationPassed": true
}
```

---

## 维护责任

- **AI助手** 负责在每次文档更新前执行测试
- **测试脚本** 由项目维护者统一维护
- **测试用例** 随文档结构变化同步更新

---

## 常见问题

### Q: 测试失败时如何处理？

A: 查看 `reports/` 目录下的 `*-test-results.json` 文件，定位失败项并修复文档问题后重新测试。

### Q: 如何添加新的测试用例？

A: 编辑 `data/structure-tests.json` 或 `data/content-tests.json` 文件，按照现有格式添加测试用例。

### Q: LLM测试需要付费吗？

A: 是的，LLM测试通过NVIDIA API调用大模型，会产生API调用费用。建议在关键版本更新时使用。

### Q: 没有API密钥怎么办？

A: 请通过以下方式获取API密钥：
1. 访问 NVIDIA NIM 平台注册账号
2. 创建API密钥
3. 将密钥配置到 `.env.local` 文件或通过命令行参数传入

### Q: 测试脚本需要定期更新吗？

A: 当文档结构发生变化（如新增文档类别）时，需要同步更新测试脚本和配置文件。

### Q: 报告文件需要提交到版本控制吗？

A: 报告文件是自动生成的，建议添加到 `.gitignore` 中，不需要提交到版本控制。

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-02-24 | 初始版本，包含结构和内容测试 | AI |
| v1.1 | 2026-02-24 | 新增LLM内容测试脚本，支持NVIDIA API | AI |
| v1.2 | 2026-02-24 | 移除本地版本内容测试，统一使用LLM测试 | AI |

---

*本文档版本: v1.2 | 最后更新: 2026-02-24*
