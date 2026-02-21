/**
 * 大模型 Prompt 测试脚本
 * 测试项目中所有调用大模型的地方，验证返回是否符合预期
 * 用法: node scripts/test-llm-prompts.mjs
 */

// GLM API 配置
const GLM_API_KEY = '6b35d40fa78f134ba53d669abf0d26f5.udk8D9gGzss6l9o5'
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const MODEL = 'glm-4-flash'

// 测试配置
const TEST_CONFIG = {
  timeout: 30000,
  maxResponseLength: 500,
  minResponseLength: 10,
}

/**
 * 调用 GLM API
 */
async function callLLM(messages, temperature = 0.7, maxTokens = 1000) {
  const requestBody = {
    model: MODEL,
    messages: messages,
    temperature: temperature,
    max_tokens: maxTokens,
    top_p: 0.95,
  }

  const response = await fetch(GLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GLM_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`GLM API调用失败: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage,
  }
}

/**
 * 验证响应是否符合预期
 */
function validateResponse(response) {
  const notEmpty = response.trim().length > 0
  const chineseRegex = /[\u4e00-\u9fa5]/
  const noChinese = !chineseRegex.test(response)
  const reasonableLength = 
    response.length >= TEST_CONFIG.minResponseLength && 
    response.length <= TEST_CONFIG.maxResponseLength
  
  const thinkingPatterns = [
    /让我思考/i, /我需要/i, /首先/i, /步骤/i,
    /分析/i, /推理/i, /思考/i, /考虑/i,
  ]
  const noThinkingProcess = !thinkingPatterns.some(pattern => pattern.test(response))
  
  return { notEmpty, noChinese, reasonableLength, noThinkingProcess }
}

/**
 * 测试 1: 对话初始化 (initiate)
 */
async function testInitiateConversation() {
  const name = '对话初始化 (initiate)'
  const startTime = Date.now()
  
  try {
    const systemPrompt = `你是Alex，在餐厅场景中。用户是顾客。
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
Welcome to our restaurant! What can I get for you today?`

    const messages = [
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
      error: error.message,
      duration: Date.now() - startTime,
      checks: { notEmpty: false, noChinese: false, reasonableLength: false, noThinkingProcess: false },
    }
  }
}

/**
 * 测试 2: 对话继续 (continue) - 带完成判断
 */
async function testContinueConversation() {
  const name = '对话继续 (continue)'
  const startTime = Date.now()
  
  try {
    const systemPrompt = `You are a waiter in a restaurant scenario. The user is a customer.
Your dialogue goal is: Customer orders food and completes the order.

Difficulty Level: medium
- Beginner: Use simple sentences, basic vocabulary, avoid idioms
- Intermediate: Use compound sentences, natural expressions, moderate idioms
- Advanced: Use complex sentence structures, authentic idioms, implied intentions/humor

## Your Task
First, analyze if the dialogue goal has been achieved based on the conversation history.
Then respond in this exact JSON format:
{"isComplete":true/false,"message":"Your English response here"}

## When is Dialogue Complete?
Set isComplete to TRUE when:
- The dialogue goal has been achieved (e.g., order completed)
- User clearly indicates ending (says goodbye, thanks and ends)
- Dialogue naturally concludes with no need to continue

Set isComplete to FALSE when:
- The goal is not yet achieved
- More information or action is needed
- Natural dialogue should continue

## Important Rules
1. Output ONLY the JSON object, no other text
2. isComplete must be a boolean (true or false)
3. message must be in English, matching the difficulty level
4. If isComplete is true, message should be a polite closing
5. If isComplete is false, message should continue the conversation naturally
6. No Chinese, no explanations, no markdown code blocks

## Examples
Complete dialogue: {"isComplete":true,"message":"Thank you for dining with us! Have a wonderful day!"}
Incomplete dialogue: {"isComplete":false,"message":"Would you like anything else to drink?"}`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Hi there! What do you recommend today?' },
      { role: 'assistant', content: 'Welcome! Our special today is the grilled salmon with seasonal vegetables.' },
      { role: 'user', content: 'That sounds great! I\'ll have the salmon and a glass of white wine.' }
    ]

    const response = await callLLM(messages, 0.7, 500)
    const duration = Date.now() - startTime
    
    // 解析 JSON 响应
    let isComplete = false
    let message = ''
    let hasValidJSON = false
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (typeof parsed.isComplete === 'boolean' && parsed.message) {
          isComplete = parsed.isComplete
          message = parsed.message
          hasValidJSON = true
        }
      }
    } catch (e) {
      console.log('JSON 解析失败:', e.message)
    }
    
    const checks = validateResponse(message || response.content)
    
    return {
      name,
      success: checks.notEmpty && checks.noChinese && hasValidJSON,
      response: response.content,
      usage: response.usage,
      duration,
      checks: {
        ...checks,
        hasValidJSON,
        isComplete,
      },
    }
  } catch (error) {
    return {
      name,
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
      checks: { notEmpty: false, noChinese: false, reasonableLength: false, noThinkingProcess: false, hasValidJSON: false, isComplete: false },
    }
  }
}

/**
 * 测试 3: 题目分析 (analyze)
 */
async function testAnalyzeQuestion() {
  const name = '题目分析 (analyze)'
  const startTime = Date.now()
  
  try {
    const systemPrompt = `你是一位英语学习助手。请分析以下测试题目并提取：
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
}`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'How would you start the conversation with the waiter?' }
    ]

    const response = await callLLM(messages, 0.7, 500)
    const duration = Date.now() - startTime
    
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
        noChinese: hasChinese,
        reasonableLength: response.content.length >= 50,
        noThinkingProcess: !response.content.includes('让我'),
      },
    }
  } catch (error) {
    return {
      name,
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
      checks: { notEmpty: false, noChinese: false, reasonableLength: false, noThinkingProcess: false },
    }
  }
}

/**
 * 测试 4: 填空题评测 (fill-blank/evaluate)
 */
async function testFillBlankEvaluate() {
  const name = '填空题评测 (fill-blank/evaluate)'
  const startTime = Date.now()
  
  try {
    const systemPrompt = `你是一位专业的英语评测专家。请评测用户的填空题回答，判断是否符合题目要求并给出分析。

## 评测标准
1. **正确性判断**（isCorrect）：
   - 对比用户答案和参考答案，判断是否表达了相同或相近的意思
   - 考虑同义词、不同表达方式、语法变体等情况

2. **分析内容**（analysis）：
   - 使用中文说明用户答案与参考答案的对比结果
   - 指出用户答案的优点和不足
   - 解释为什么判定为正确或错误

3. **改进建议**（suggestions）：
   - 提供2-3条具体、可操作的中文改进建议

## 输出要求
请以JSON格式输出结果：
{
  "isCorrect": true/false,
  "analysis": "使用中文撰写的详细分析说明",
  "suggestions": ["中文建议1", "中文建议2", "中文建议3"]
}

## 重要提示
1. isCorrect 必须是布尔值（true/false）
2. analysis 必须使用中文撰写
3. suggestions 数组必须使用中文
4. 所有文字输出必须使用中文，除了引用英文单词或句子`

    const evaluationContent = `题目：请完成这句打招呼的话："Nice to ____ you! I'm Tom."
参考答案：meet
用户回答：see

请评测用户的回答是否符合题目要求，并给出中文分析。`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: evaluationContent }
    ]

    const response = await callLLM(messages, 0.7, 500)
    const duration = Date.now() - startTime
    
    const notEmpty = response.content.trim().length > 0
    const hasJSON = response.content.includes('{') && response.content.includes('}')
    const hasChinese = /[\u4e00-\u9fa5]/.test(response.content)
    
    // 尝试解析 JSON 验证 analysis 和 suggestions 是否为中文
    let analysisIsChinese = false
    let suggestionsAreChinese = false
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.analysis) {
          analysisIsChinese = /[\u4e00-\u9fa5]/.test(parsed.analysis)
        }
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          suggestionsAreChinese = parsed.suggestions.every((s) => /[\u4e00-\u9fa5]/.test(s))
        }
      }
    } catch (e) {
      // 解析失败，不影响主要检查结果
    }
    
    return {
      name,
      success: notEmpty && hasJSON && analysisIsChinese && suggestionsAreChinese,
      response: response.content,
      usage: response.usage,
      duration,
      checks: {
        notEmpty,
        noChinese: hasChinese, // 评测结果应该包含中文
        reasonableLength: response.content.length >= 50,
        noThinkingProcess: !response.content.includes('让我'),
        analysisIsChinese,
        suggestionsAreChinese,
      },
    }
  } catch (error) {
    return {
      name,
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
      checks: { notEmpty: false, noChinese: false, reasonableLength: false, noThinkingProcess: false, analysisIsChinese: false, suggestionsAreChinese: false },
    }
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('========================================')
  console.log('🧪 大模型 Prompt 测试开始')
  console.log(`🤖 模型: ${MODEL}`)
  console.log('========================================\n')
  
  const tests = [
    testInitiateConversation,
    testContinueConversation,
    testAnalyzeQuestion,
    testFillBlankEvaluate,
  ]
  
  const results = []
  
  for (const test of tests) {
    console.log(`\n⏳ 正在运行: ${test.name}...`)
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
  
  const highTokenUsage = results.filter(r => r.usage && r.usage.total_tokens > 1000)
  if (highTokenUsage.length > 0) {
    console.log(`  - ${highTokenUsage.length} 个测试Token使用过高，可能需要优化 prompt 简洁性`)
  }
  
  console.log('\n========================================')
  
  // 返回测试结果
  return results
}

// 运行测试
runAllTests().catch(console.error)
