/**
 * 测试不同 GLM 模型版本
 * 用法: node scripts/test-models.mjs
 */

const GLM_API_KEY = '6b35d40fa78f134ba53d669abf0d26f5.udk8D9gGzss6l9o5'
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

// 要测试的模型列表
const MODELS_TO_TEST = [
  'glm-4',
  'glm-4-plus',
  'glm-4-air',
  'glm-4-airx',
  'glm-4-flash',
  'glm-4v',
  'glm-4v-plus',
  'glm-4-alltools',
]

async function testModel(modelName) {
  console.log(`\n🧪 测试模型: ${modelName}`)
  console.log('-'.repeat(50))
  
  const startTime = Date.now()
  
  try {
    const requestBody = {
      model: modelName,
      messages: [
        { role: 'system', content: '你是一个英语对话助手。请用英文回复。' },
        { role: 'user', content: 'Hello! How are you?' }
      ],
      temperature: 0.7,
      max_tokens: 100,
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

    const duration = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.log(`   ❌ API 错误: ${response.status}`)
      console.log(`   错误详情: ${errorText.substring(0, 200)}`)
      return { model: modelName, success: false, error: `HTTP ${response.status}`, duration }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const usage = data.usage
    
    console.log(`   状态: ${content ? '✅ 成功' : '❌ 空响应'}`)
    console.log(`   耗时: ${duration}ms`)
    console.log(`   Token: ${usage?.total_tokens || 'N/A'} (提示: ${usage?.prompt_tokens || 'N/A'}, 生成: ${usage?.completion_tokens || 'N/A'})`)
    console.log(`   响应: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`)
    
    return { 
      model: modelName, 
      success: !!content, 
      content: content.substring(0, 200),
      duration,
      usage
    }
  } catch (error) {
    console.log(`   ❌ 异常: ${error.message}`)
    return { model: modelName, success: false, error: error.message, duration: Date.now() - startTime }
  }
}

async function runTests() {
  console.log('========================================')
  console.log('🤖 GLM 模型版本测试')
  console.log('========================================')
  
  const results = []
  
  for (const model of MODELS_TO_TEST) {
    const result = await testModel(model)
    results.push(result)
    
    // 等待 1 秒避免频率限制
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // 总结
  console.log('\n========================================')
  console.log('📊 测试结果总结')
  console.log('========================================')
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`\n✅ 可用模型 (${successful.length}/${results.length}):`)
  successful.forEach(r => {
    console.log(`   - ${r.model} (${r.duration}ms, ${r.usage?.total_tokens || 'N/A'} tokens)`)
  })
  
  if (failed.length > 0) {
    console.log(`\n❌ 不可用模型 (${failed.length}/${results.length}):`)
    failed.forEach(r => {
      console.log(`   - ${r.model}: ${r.error || '空响应'}`)
    })
  }
  
  // 推荐模型
  console.log('\n💡 推荐模型:')
  if (successful.length > 0) {
    // 按 token 使用排序，推荐最经济的
    const sortedByTokens = [...successful].sort((a, b) => 
      (a.usage?.total_tokens || Infinity) - (b.usage?.total_tokens || Infinity)
    )
    console.log(`   最经济: ${sortedByTokens[0]?.model}`)
    
    // 按速度排序
    const sortedBySpeed = [...successful].sort((a, b) => a.duration - b.duration)
    console.log(`   最快: ${sortedBySpeed[0]?.model}`)
  }
  
  console.log('\n========================================')
}

runTests().catch(console.error)
