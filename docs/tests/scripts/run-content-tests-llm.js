/**
 * 文档内容有效性测试执行脚本（LLM版本）
 * 用法: node docs/tests/scripts/run-content-tests-llm.js [--api-key=YOUR_API_KEY]
 *
 * 本脚本通过调用外部大模型（NVIDIA API）验证项目文档的内容有效性：
 * a) 基于项目内容设计一系列测试题目及对应的预期答案
 * b) 配置大模型在回答过程中可通过tool调用功能调阅本地子文档
 * c) 获取大模型针对测试题目的实际回答
 * d) 将实际答案与预期答案提交给大模型进行一致性分析
 *
 * 环境变量（优先级从高到低）：
 * 1. 命令行参数 --api-key=xxx
 * 2. 系统环境变量 NVIDIA_API_KEY
 * 3. .env.local 文件中的 NVIDIA_API_KEY
 * - NVIDIA_MODEL: 使用的模型（默认: meta/llama-3.1-405b-instruct）
 */

const fs = require('fs');
const path = require('path');

/**
 * 加载 .env.local 文件中的环境变量
 */
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const equalIndex = line.indexOf('=');
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim();
      let value = line.substring(equalIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      envVars[key] = value;
    }
  });

  return envVars;
}

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      args[key] = value || true;
    }
  });
  return args;
}

// 获取目录路径
const scriptsDir = __dirname;
const testsDir = path.dirname(scriptsDir);
const dataDir = path.join(testsDir, 'data');
const reportsDir = path.join(testsDir, 'reports');

// 确保报告目录存在
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// 加载测试配置
const testConfig = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'content-tests.json'), 'utf-8')
);

// 读取 project_rules.md
const projectRulesPath = path.join(process.cwd(), '.trae', 'rules', 'project_rules.md');
const projectRulesContent = fs.readFileSync(projectRulesPath, 'utf-8');

// 加载 .env.local
const envLocal = loadEnvLocal();

// 解析命令行参数
const cliArgs = parseArgs();

// API配置（优先级：命令行 > 系统环境变量 > .env.local）
const API_KEY = cliArgs['api-key'] || process.env.NVIDIA_API_KEY || envLocal.NVIDIA_API_KEY || '';
const MODEL = process.env.NVIDIA_MODEL || envLocal.NVIDIA_MODEL || 'z-ai/glm4.7';
const API_URL = process.env.NVIDIA_API_URL || envLocal.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';

// 并发配置
const CONCURRENCY = 5;
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3秒

// 测试结果
const results = {
  testSuite: testConfig.testSuite,
  timestamp: new Date().toISOString(),
  model: MODEL,
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    totalScore: 0,
    earnedScore: 0
  },
  details: []
};

// 并发控制
class Semaphore {
  constructor(max) {
    this.max = max;
    this.count = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.count < this.max) {
      this.count++;
      return;
    }
    return new Promise(resolve => this.queue.push(resolve));
  }

  release() {
    this.count--;
    if (this.queue.length > 0) {
      this.count++;
      const next = this.queue.shift();
      next();
    }
  }
}

const semaphore = new Semaphore(CONCURRENCY);

/**
 * 日志函数 - 脚本日志
 */
function logScript(message) {
  console.log(`[SCRIPT] ${message}`);
}

/**
 * 日志函数 - LLM返回日志
 */
function logLLM(message) {
  console.log(`[LLM] ${message}`);
}

/**
 * 日志函数 - 测试结果
 */
function logResult(message) {
  console.log(`[RESULT] ${message}`);
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 工具函数：读取本地文档
 */
function readLocalDocument(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      return { error: `文件不存在: ${filePath}` };
    }
    console.log(`[SCRIPT] 读取文件: ${fullPath}`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    return { content, path: filePath };
  } catch (error) {
    return { error: `读取失败: ${error.message}` };
  }
}

/**
 * 调用NVIDIA API获取LLM回答（带重试机制）
 */
async function callLLMOnce(messages, tools = null, maxTokens = 10480) {
  const body = {
    model: MODEL,
    messages: messages,
    temperature: 0.3,
    max_tokens: maxTokens,
    stream: false
  };

  if (tools) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 120秒超时

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(body),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API请求失败: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * 调用NVIDIA API获取LLM回答（带重试机制和并发控制）
 */
async function callLLM(messages, tools = null, retryCount = 0, maxTokens = 10048) {
  if (!API_KEY) {
    throw new Error('未设置 NVIDIA_API_KEY');
  }

  // 获取信号量许可，控制并发
  await semaphore.acquire();

  try {
    return await callLLMOnce(messages, tools, maxTokens);
  } catch (error) {
    // 处理限速错误
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      if (retryCount < MAX_RETRIES) {
        logScript(`触发限速，等待 ${RETRY_DELAY / 1000} 秒后重试 (${retryCount + 1}/${MAX_RETRIES})...`);
        await delay(RETRY_DELAY);
        return callLLM(messages, tools, retryCount + 1);
      }
      throw new Error('达到最大重试次数，API仍限速');
    }

    // 处理超时错误
    if (error.name === 'AbortError') {
      if (retryCount < MAX_RETRIES) {
        logScript(`请求超时，等待 ${RETRY_DELAY / 1000} 秒后重试 (${retryCount + 1}/${MAX_RETRIES})...`);
        await delay(RETRY_DELAY);
        return callLLM(messages, tools, retryCount + 1);
      }
      throw new Error('达到最大重试次数，请求持续超时');
    }

    // 网络错误也进行重试
    if (retryCount < MAX_RETRIES && (error.message.includes('fetch failed') || error.message.includes('network'))) {
      logScript(`网络错误，等待 ${RETRY_DELAY / 1000} 秒后重试 (${retryCount + 1}/${MAX_RETRIES})...`);
      await delay(RETRY_DELAY);
      return callLLM(messages, tools, retryCount + 1);
    }

    logScript(`LLM API调用失败: ${error.message}`);
    throw error;
  } finally {
    // 释放信号量许可
    semaphore.release();
  }
}

/**
 * 获取LLM对测试题目的回答
 */
async function getLLMAnswer(question, enableTools = true) {
  const systemPrompt = `请阅读下面的文档，然后对用户问题进行解答。

可用工具：
- read_document: 读取指定路径的文档内容

请根据问题需要，使用工具调阅相关文档获取准确信息，然后给出简洁准确的回答。

================下方为文档内容
${projectRulesContent}`;

  const userPrompt = question;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const tools = enableTools ? [
    {
      type: 'function',
      function: {
        name: 'read_document',
        description: '读取指定路径的文档内容',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '文档路径，如 "docs/01-architecture/arch-database-schema-v1.0.md"'
            }
          },
          required: ['path']
        }
      }
    }
  ] : null;

  let finalAnswer = '';
  let toolCalls = [];

  try {
    const response = await callLLM(messages, tools);

    if (response.choices[0].message.tool_calls) {
      toolCalls = response.choices[0].message.tool_calls;

      const toolResults = toolCalls.map(toolCall => {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        if (functionName === 'read_document') {
          return readLocalDocument(args.path);
        }
        return { error: '未知工具' };
      });

      messages.push(response.choices[0].message);
      toolCalls.forEach((toolCall, index) => {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResults[index])
        });
      });

      const finalResponse = await callLLM(messages, null);
      finalAnswer = finalResponse.choices[0].message.content;
    } else {
      finalAnswer = response.choices[0].message.content;
    }

    return { answer: finalAnswer, toolCalls };
  } catch (error) {
    return { error: error.message, answer: '' };
  }
}

/**
 * 一致性分析
 */
async function analyzeConsistency(question, expectedAnswer, actualAnswer) {
  const systemPrompt = `你是答案一致性分析专家。请比较预期答案和实际答案，判断它们是否表达相同的意思。

评分标准：
- 完全一致（100%）：实际答案与预期答案完全匹配
- 基本正确（80-99%）：核心信息正确，表述略有差异
- 部分正确（50-79%）：包含部分正确信息，但有遗漏或偏差
- 不正确（0-49%）：答案错误或完全偏离

请输出JSON格式：{"consistent": true/false, "score": 0-100, "reason": "分析原因"}`;

  const prompt = `问题：${question}

预期答案：${expectedAnswer}

实际答案：${actualAnswer}

请分析两个答案的一致性。`;

  try {
    // 一致性分析需要更多token，因为模型需要思考过程
    const response = await callLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ], null, 0, 100096);

    // 调试：检查响应结构
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      console.log('[DEBUG] 异常响应结构:', JSON.stringify(response, null, 2).substring(0, 500));
      return { consistent: false, score: 0, reason: 'LLM响应结构异常' };
    }

    const content = response.choices[0].message.content;

    if (!content) {
      console.log('[DEBUG] content为空, message对象:', JSON.stringify(response.choices[0].message, null, 2));
      return { consistent: false, score: 0, reason: 'LLM返回内容为空，可能是token不足' };
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        return { consistent: false, score: 0, reason: `JSON解析失败: ${parseError.message}` };
      }
    }

    return { consistent: false, score: 0, reason: '无法解析分析结果，未找到JSON格式' };
  } catch (error) {
    return { consistent: false, score: 0, reason: `分析失败: ${error.message}` };
  }
}

/**
 * 记录测试结果
 */
function recordResult(questionId, passed, earnedScore, totalScore, message) {
  results.summary.total++;
  results.summary.totalScore += totalScore;

  if (passed) {
    results.summary.passed++;
    results.summary.earnedScore += earnedScore;
  } else {
    results.summary.failed++;
  }

  const result = {
    questionId,
    passed,
    earnedScore,
    totalScore,
    message
  };

  results.details.push(result);
}

/**
 * 执行单个问题测试
 */
async function testQuestion(q) {
  logScript(`开始测试问题 ${q.id}: ${q.question}`);

  try {
    // 获取LLM回答
    const llmResult = await getLLMAnswer(q.question, true);

    if (llmResult.error) {
      logScript(`问题 ${q.id} 获取回答失败: ${llmResult.error}`);
      recordResult(q.id, false, 0, q.score, `API错误: ${llmResult.error}`);
      return;
    }

    // 打印LLM返回（截断显示）
    const answerPreview = llmResult.answer.substring(0, 150).replace(/\n/g, ' ');
    logLLM(`问题 ${q.id} 回答: ${answerPreview}...`);

    if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
      logScript(`问题 ${q.id} 使用了 ${llmResult.toolCalls.length} 个工具调用`);
    }

    // 一致性分析
    logScript(`问题 ${q.id} 进行一致性分析...`);
    const analysis = await analyzeConsistency(q.question, q.expectedAnswer, llmResult.answer);

    const passed = analysis.consistent && analysis.score >= 70;
    const earnedScore = Math.round((analysis.score / 100) * q.score);

    logResult(`问题 ${q.id} 评分: ${analysis.score}% - ${analysis.reason}`);
    logResult(`问题 ${q.id} ${passed ? '✅ 通过' : '❌ 失败'} (${earnedScore}/${q.score}分)`);

    recordResult(q.id, passed, earnedScore, q.score,
      `${analysis.reason} (评分: ${analysis.score}%)`);

    logScript(`问题 ${q.id} 测试完成`);
  } catch (error) {
    logScript(`问题 ${q.id} 测试异常: ${error.message}`);
    recordResult(q.id, false, 0, q.score, `异常: ${error.message}`);
  }
}

/**
 * 主测试执行函数
 */
async function runTests() {
  console.log(`\n========== ${testConfig.testSuite} (LLM版本) ==========\n`);
  logScript(`使用模型: ${MODEL}`);
  logScript(`API地址: ${API_URL}`);
  logScript(`并发数: ${CONCURRENCY}`);

  // 显示API密钥来源
  let keySource = '';
  if (cliArgs['api-key']) {
    keySource = '命令行参数';
  } else if (process.env.NVIDIA_API_KEY) {
    keySource = '系统环境变量';
  } else if (envLocal.NVIDIA_API_KEY) {
    keySource = '.env.local文件';
  }

  if (API_KEY) {
    logScript(`API密钥来源: ${keySource}`);
    logScript(`API密钥: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);
  } else {
    console.error('\n[SCRIPT] ❌ 错误: 未设置 NVIDIA_API_KEY');
    console.log('\n[SCRIPT] 请通过以下方式之一设置API密钥:');
    console.log('  1. 命令行参数: --api-key=your_api_key');
    console.log('  2. 系统环境变量: set NVIDIA_API_KEY=your_api_key');
    console.log('  3. .env.local文件: NVIDIA_API_KEY=your_api_key');
    process.exit(1);
  }

  const questions = testConfig.questions || [];
  logScript(`共 ${questions.length} 个测试问题，开始执行 (API并发数: ${CONCURRENCY})...\n`);

  // 并发执行所有问题（实际的并发控制已在callLLM中实现）
  const startTime = Date.now();
  await Promise.all(questions.map(q => testQuestion(q)));
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // 输出汇总
  console.log('\n========== 测试结果汇总 ==========');
  logResult(`总测试数: ${results.summary.total}`);
  logResult(`通过: ${results.summary.passed}`);
  logResult(`失败: ${results.summary.failed}`);
  logResult(`通过率: ${((results.summary.passed / results.summary.total) * 100).toFixed(2)}%`);
  logResult(`总分数: ${results.summary.earnedScore}/${results.summary.totalScore}`);
  logResult(`得分率: ${((results.summary.earnedScore / results.summary.totalScore) * 100).toFixed(2)}%`);
  logResult(`执行时间: ${duration}s`);

  // 保存结果
  const resultPath = path.join(reportsDir, 'content-test-results-llm.json');
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
  logScript(`详细结果已保存: ${resultPath}`);

  // 返回测试结果状态
  const passRate = results.summary.earnedScore / results.summary.totalScore;
  const success = passRate >= 0.75;
  logResult(`测试${success ? '✅ 通过' : '❌ 失败'} (阈值: 75%, 实际: ${(passRate * 100).toFixed(2)}%)`);
  
  return success;
}

// 执行测试
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('[SCRIPT] 测试执行失败:', error);
  process.exit(1);
});
