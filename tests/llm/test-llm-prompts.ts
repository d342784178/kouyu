/**
 * 大模型 Prompt 测试脚本
 * 测试项目中所有调用大模型的地方，验证返回是否符合预期
 * 用法: npx ts-node scripts/test-llm-prompts.ts
 */

import { callLLM, Message } from '../../src/lib/llm'

// 测试配置
const TEST_CONFIG = {
  // 测试超时时间（毫秒）
  timeout: 30000,
  // 期望的响应最大长度
  maxResponseLength: 500,
  // 期望的响应最小长度（确保不是空响应）
  minResponseLength: 10,
}

// 测试结果类型
interface TestResult {
  name: string
  success: boolean
  response?: string
  error?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  duration: number
  checks: {
    notEmpty: boolean
    noChinese: boolean
    reasonableLength: boolean
    noThinkingProcess: boolean
  }
}

/**
 * 验证响应是否符合预期
 */
function validateResponse(response: string): {
  notEmpty: boolean
  noChinese: boolean
  reasonableLength: boolean
  noThinkingProcess: boolean
} {
  // 检查是否为空
  const notEmpty = response.trim().length > 0
  
  // 检查是否包含中文字符（除了特定场景外，一般应该避免）
  const chineseRegex = /[\u4e00-\u9fa5]/
  const noChinese = !chineseRegex.test(response)
  
  // 检查长度是否合理
  const reasonableLength = 
    response.length >= TEST_CONFIG.minResponseLength && 
    response.length <= TEST_CONFIG.maxResponseLength
  
  // 检查是否包含思考过程标记
  const thinkingPatterns = [
    /让我思考/i,
    /我需要/i,
    /首先/i,
    /步骤/i,
    /分析/i,
    /推理/i,
    /思考/i,
    /考虑/i,
  ]
  const noThinkingProcess = !thinkingPatterns.some(pattern => pattern.test(response))
  
  return {
    notEmpty,
    noChinese,
    reasonableLength,
    noThinkingProcess,
  }
}

/**
 * 测试 1: 对话初始化 (initiate)
 */
async function testInitiateConversation(): Promise<TestResult> {
  const name = '对话初始化 (initiate)'
  const startTime = Date.now()
  
  try {
    const systemPrompt = `
你是Alex，在餐厅场景中。用户是顾客。
你的目标是开始一段关于顾客向服务员点餐的自然英语对话。

难度等级：medium
- Beginner：使用简单句子，基础词汇，避免俚语
- Intermediate：使用复合句，自然表达，适量习语
- Advanced：使用复杂句式，地道俚语，隐含意图/幽默

直接生成一句友好、自然的英文开场白，邀请用户回应。保持简短（1-2句话）。

重要要求：
1. 直接输出英文回复，不要思考过程
2. 不要包含任何中文、解释或其他内容
3. 只返回纯英文句子
4. 确保是完整的英文句子

示例：
场景：餐厅 | AI：服务员 | 用户：顾客 | 目标：点餐
Welcome to our restaurant! What can I get for you today?
    `.trim()

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请开始对话。' }
    ]

    const response = await callLLM(messages, 0.7, 500)
    const duration = Date.now() - startTime
    
    const checks = validateResponse(response.content)
    
    return {
      name,
      success: checks.notEmpty && checks.noChinese,
      response: response.content,
      usage: response.usage,
      duration,
      checks,
    }
  } catch (error) {
    return {
      name,
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      duration: Date.now() - startTime,
      checks: {
        notEmpty: false,
        noChinese: false,
        reasonableLength: false,
        noThinkingProcess: false,
      },
    }
  }
}

/**
 * 测试 2: 对话继续 (continue)
 */
async function testContinueConversation(): Promise<TestResult> {
  const name = '对话继续 (continue)'
  const startTime = Date.now()
  
  try {
    const systemPrompt = `
你是服务员，在餐厅场景中。用户是顾客。
你的目标是继续关于顾客与服务员对话的对话。

难度等级：medium
- Beginner：使用简单句子，基础词汇，避免俚语
- Intermediate：使用复合句，自然表达，适量习语
- Advanced：使用复杂句式，地道俚语，隐含意图/幽默

重要要求：
1. 只返回英文回复，不要包含任何中文或其他语言
2. 不要包含任何思考过程、解释或其他内容
3. 直接返回最终的英文回复文本
4. 确保回复是完整的句子，符合英文语法
5. 请根据对话历史上下文进行回应

示例：
顾客：I would like to order a hamburger and fries, please.
服务员：Sure! How would you like your hamburger cooked, and would you like a drink with that?
    `.trim()

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Hi there! What do you recommend today?' },
      { role: 'assistant', content: 'Welcome! Our special today is the grilled salmon with seasonal vegetables.' },
      { role: 'user', content: '请根据以上对话历史，继续对话。' }
    ]

    const response = await callLLM(messages, 0.7, 500)
    const duration = Date.now() - startTime
    
    const checks = validateResponse(response.content)
    
    return {
      name,
      success: checks.notEmpty && checks.noChinese,
      response: response.content,
      usage: response.usage,
      duration,
      checks,
    }
  } catch (error) {
    return {
      name,
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      duration: Date.now() - startTime,
      checks: {
        notEmpty: false,
        noChinese: false,
        reasonableLength: false,
        noThinkingProcess: false,
      },
    }
  }
}

/**
 * 测试 3: 题目分析 (analyze - 题目分析模式)
 */
async function testAnalyzeQuestion(): Promise<TestResult> {
  const name = '题目分析 (analyze/question)'
  const startTime = Date.now()
  
  try {
    const systemPrompt = `
你是一位英语学习助手。请分析以下测试题目并提取：
1. 场景：对话发生的地点（必须用中文回答）
2. 角色：对话参与者（必须用中文回答，作为列表）
3. 对话目标：对话的主题（必须用中文回答）

重要要求：
- 所有输出必须使用中文，即使是英文题目也要翻译成中文
- 角色名称要使用中文表达（如：顾客、服务员、医生、患者等）
- 场景名称要使用中文表达（如：餐厅、医院、酒店等）

仅以JSON格式输出这三个部分的内容。

示例输入：
How would you start the conversation with the waiter?

示例输出：
{
  "scene": "餐厅",
  "roles": ["顾客", "服务员"],
  "dialogueGoal": "顾客向服务员点餐"
}
    `.trim()

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'How would you start the conversation with the waiter?' }
    ]

    const response = await callLLM(messages, 0.7, 500)
    const duration = Date.now() - startTime
    
    // 对于题目分析，我们期望返回JSON格式，包含中文
    const notEmpty = response.content.trim().length > 0
    const hasJSON = response.content.includes('{') && response.content.includes('}')
    const hasChinese = /[\u4e00-\u9fa5]/.test(response.content)
    
    return {
      name,
      success: notEmpty && hasJSON && hasChinese,
      response: response.content,
      usage: response.usage,
      duration,
      checks: {
        notEmpty,
        noChinese: hasChinese, // 题目分析应该包含中文
        reasonableLength: response.content.length >= 50,
        noThinkingProcess: !response.content.includes('让我'),
      },
    }
  } catch (error) {
    return {
      name,
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      duration: Date.now() - startTime,
      checks: {
        notEmpty: false,
        noChinese: false,
        reasonableLength: false,
        noThinkingProcess: false,
      },
    }
  }
}

/**
 * 测试 4: 填空题评测 (fill-blank/evaluate)
 */
async function testFillBlankEvaluate(): Promise<TestResult> {
  const name = '填空题评测 (fill-blank/evaluate)'
  const startTime = Date.now()
  
  try {
    const systemPrompt = `
你是一位专业的英语评测专家。请评测用户的填空题回答，判断是否符合题目要求并给出分析。

## 评测标准
1. 判断用户回答是否符合题目要求（isCorrect: true/false）
2. 分析用户回答的优点和不足
3. 给出具体的改进建议

## 输出要求
请以JSON格式输出结果：
{
  "isCorrect": true,
  "analysis": "用户回答基本符合题目要求，语法正确，表达清晰。",
  "suggestions": ["建议1", "建议2"]
}

## 重要提示
1. isCorrect 表示回答是否正确（布尔值）
2. analysis 要具体、有建设性，解释为什么对或错
3. suggestions 要实用、可操作，帮助用户改进
4. 即使用户回答与标准答案不完全一致，只要符合题目要求也可以认为是正确的
    `.trim()

    const evaluationContent = `
题目：请完成这句打招呼的话："Nice to ____ you! I'm Tom."
参考答案：meet
用户回答：see

请评测用户的回答是否符合题目要求，并给出分析。
    `.trim()

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: evaluationContent }
    ]

    const response = await callLLM(messages, 0.7, 500)
    const duration = Date.now() - startTime
    
    const notEmpty = response.content.trim().length > 0
    const hasJSON = response.content.includes('{') && response.content.includes('}')
    const hasChinese = /[\u4e00-\u9fa5]/.test(response.content)
    
    return {
      name,
      success: notEmpty && hasJSON,
      response: response.content,
      usage: response.usage,
      duration,
      checks: {
        notEmpty,
        noChinese: hasChinese, // 评测结果应该包含中文
        reasonableLength: response.content.length >= 50,
        noThinkingProcess: !response.content.includes('让我'),
      },
    }
  } catch (error) {
    return {
      name,
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      duration: Date.now() - startTime,
      checks: {
        notEmpty: false,
        noChinese: false,
        reasonableLength: false,
        noThinkingProcess: false,
      },
    }
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('========================================')
  console.log('🧪 大模型 Prompt 测试开始')
  console.log('========================================\n')
  
  const tests = [
    testInitiateConversation,
    testContinueConversation,
    testAnalyzeQuestion,
    testFillBlankEvaluate,
  ]
  
  const results: TestResult[] = []
  
  for (const test of tests) {
    const result = await test()
    results.push(result)
    
    // 打印测试结果
    console.log(`\n📋 ${result.name}`)
    console.log(`   状态: ${result.success ? '✅ 通过' : '❌ 失败'}`)
    console.log(`   耗时: ${result.duration}ms`)
    
    if (result.error) {
      console.log(`   错误: ${result.error}`)
    }
    
    if (result.usage) {
      console.log(`   Token使用: ${result.usage.total_tokens} (提示: ${result.usage.prompt_tokens}, 生成: ${result.usage.completion_tokens})`)
    }
    
    console.log(`   检查项:`)
    console.log(`     - 非空: ${result.checks.notEmpty ? '✅' : '❌'}`)
    console.log(`     - 无中文(英文场景): ${result.checks.noChinese ? '✅' : '❌'}`)
    console.log(`     - 长度合理: ${result.checks.reasonableLength ? '✅' : '❌'}`)
    console.log(`     - 无思考过程: ${result.checks.noThinkingProcess ? '✅' : '❌'}`)
    
    if (result.response) {
      console.log(`   响应内容:`)
      console.log(`     ${result.response.substring(0, 200)}${result.response.length > 200 ? '...' : ''}`)
    }
    
    console.log('   ' + '-'.repeat(50))
  }
  
  // 打印总结
  console.log('\n========================================')
  console.log('📊 测试总结')
  console.log('========================================')
  
  const passedTests = results.filter(r => r.success).length
  const totalTests = results.length
  
  console.log(`总计: ${totalTests} 个测试`)
  console.log(`通过: ${passedTests} 个 ✅`)
  console.log(`失败: ${totalTests - passedTests} 个 ❌`)
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  
  // 检查是否有需要优化的地方
  console.log('\n🔍 优化建议:')
  
  const emptyResponses = results.filter(r => !r.checks.notEmpty)
  if (emptyResponses.length > 0) {
    console.log(`  - ${emptyResponses.length} 个测试返回空响应，需要检查模型是否正常生成内容`)
  }
  
  const unexpectedChinese = results.filter(r => r.name.includes('对话') && !r.checks.noChinese)
  if (unexpectedChinese.length > 0) {
    console.log(`  - ${unexpectedChinese.length} 个对话测试包含中文，需要优化 prompt 强调只返回英文`)
  }
  
  const thinkingDetected = results.filter(r => !r.checks.noThinkingProcess)
  if (thinkingDetected.length > 0) {
    console.log(`  - ${thinkingDetected.length} 个测试检测到思考过程，需要优化 prompt 减少思考`)
  }
  
  console.log('\n========================================')
  
  // 返回测试结果供其他程序使用
  return results
}

// 运行测试
runAllTests().catch(console.error)
