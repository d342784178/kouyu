# LLM 测试脚本

这个目录包含用于测试项目中所有大语言模型（LLM）调用的脚本。

## 文件说明

| 文件 | 说明 |
|------|------|
| `test-llm-prompts.mjs` | **主测试脚本**，测试所有 API 路由中的大模型调用 |
| `test-llm-prompts.ts` | TypeScript 版本（需要 ts-node） |
| `test-models.mjs` | 测试不同 GLM 模型版本的可用性 |
| `test-glm-4-5.mjs` | 专门测试 glm-4.5 模型 |

## 使用方法

### 运行主测试脚本

```bash
node tests/llm/test-llm-prompts.mjs
```

### 测试内容

脚本会测试以下 4 个场景：

1. **对话初始化 (initiate)** - 测试 `/api/open-test/initiate`
   - 验证模型能否生成英文开场白
   - 检查是否包含中文、思考过程等

2. **对话继续 (continue)** - 测试 `/api/open-test/continue`
   - 验证模型能否根据对话历史继续对话
   - 检查 `isComplete` 完成判断标志
   - 验证 JSON 格式响应

3. **题目分析 (analyze)** - 测试 `/api/open-test/analyze`
   - 验证模型能否正确分析题目并返回 JSON
   - 检查场景、角色、对话目标的提取

4. **填空题评测 (fill-blank/evaluate)** - 测试 `/api/fill-blank/evaluate`
   - 验证模型能否评测用户答案
   - 检查返回的 JSON 格式是否正确
   - 验证 analysis 和 suggestions 为中文

### 测试模型可用性

```bash
node tests/llm/test-models.mjs
```

测试所有可用的 GLM 模型版本，检查哪些模型可以正常使用。

## 测试结果解读

### 检查项说明

- **非空**: 响应内容是否为空
- **无中文(英文场景)**: 英文对话场景是否返回纯英文
- **长度合理**: 响应长度是否在合理范围内 (10-500 字符)
- **无思考过程**: 响应是否包含思考过程标记
- **hasValidJSON**: 是否包含有效的 JSON 格式
- **isComplete**: 对话完成判断是否正确
- **analysisIsChinese**: analysis 字段是否为中文
- **suggestionsAreChinese**: suggestions 字段是否为中文

### 优化建议

测试脚本会自动分析结果并给出优化建议：

- 空响应问题：可能需要更换模型版本
- 中文混入问题：需要优化 prompt 强调只返回英文
- 思考过程问题：需要优化 prompt 减少思考
- Token 使用过高：可能需要简化 prompt

## 模型配置

当前使用的模型：`glm-4-flash`

如需更换模型，请修改：
- `tests/llm/test-llm-prompts.mjs` 中的 `MODEL` 常量
- `src/lib/llm.ts` 中的 `MODEL` 常量

## 适配其他模型

当更换大模型版本时，建议：

1. 先运行测试脚本验证新模型是否正常工作
2. 检查响应格式是否符合预期
3. 根据需要调整 prompt 以获得更好的效果
4. 确保所有测试通过后再部署到生产环境

## 注意事项

- 测试脚本会实际调用 GLM API，会产生费用
- 测试过程可能需要 10-30 秒，请耐心等待
- 如果测试失败，请检查 API Key 是否有效
- 当前只有 `glm-4-flash` 是免费模型，其他模型需要付费

## 测试模型列表

| 模型 | 可用性 | 说明 |
|------|--------|------|
| glm-4 | ❌ | 需要付费 |
| glm-4-plus | ❌ | 需要付费 |
| glm-4-air | ❌ | 需要付费 |
| glm-4-airx | ❌ | 需要付费 |
| glm-4.5 | ❌ | 需要付费 |
| glm-4-flash | ✅ | **免费可用** |
| glm-4v | ❌ | 需要付费 |
| glm-4v-plus | ❌ | 需要付费 |
| glm-4-alltools | ❌ | 需要付费 |
