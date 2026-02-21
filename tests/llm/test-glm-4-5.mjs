/**
 * 测试 glm-4.5 模型
 */

const GLM_API_KEY = '6b35d40fa78f134ba53d669abf0d26f5.udk8D9gGzss6l9o5'
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

async function testModel() {
  console.log('🧪 测试模型: glm-4.5')
  console.log('-'.repeat(50))
  
  const startTime = Date.now()
  
  try {
    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4.5',
        messages: [
          { role: 'system', content: '你是一个英语对话助手。请用英文回复。' },
          { role: 'user', content: 'Hello! How are you?' }
        ],
        temperature: 0.7,
        max_tokens: 100,
        top_p: 0.95,
      }),
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.log('   ❌ API 错误:', response.status)
      console.log('   错误详情:', errorText.substring(0, 300))
      return
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const usage = data.usage
    
    console.log('   状态:', content ? '✅ 成功' : '❌ 空响应')
    console.log('   耗时:', duration + 'ms')
    console.log('   Token:', usage?.total_tokens || 'N/A', '(提示:', usage?.prompt_tokens || 'N/A', ', 生成:', usage?.completion_tokens || 'N/A', ')')
    console.log('   响应:', content.substring(0, 100))
    
  } catch (error) {
    console.log('   ❌ 异常:', error.message)
  }
}

testModel()
