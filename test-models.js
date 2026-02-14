const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// 要测试的模型列表
const models = [
  'arceeai/trinity-large-preview:free',
  'stepfun/step-3.5-flash:free',
  'z-ai/glm-4.5-air:free',
  'deepseek/deepseek-r1-0528:free',
  'nvidia/nemotron-3-nano-30b-a3b:free'
];

// 测试题目
const testTopic = '在餐厅点餐';

// 构建系统提示词
const systemPrompt = `
你是一位英语学习助手。请分析以下测试题目并提取：
1. 场景：对话发生的地点
2. 角色：对话参与者（作为列表）
3. 对话目标：对话的主题

保持分析简洁明了。仅以JSON格式输出这三个部分的内容。

示例输入：
在餐厅点餐

示例输出：
{
  "scene": "餐厅",
  "roles": ["顾客", "服务员"],
  "dialogueGoal": "顾客向服务员点餐"
}
`;

// 构建消息历史
const messages = [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: testTopic }
];

// 测试单个模型
async function testModel(model) {
  console.log(`\n=== 测试模型: ${model} ===`);
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://your-application.com',
        'X-Title': 'English Learning Scene Test',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });
    
    const endTime = Date.now();
    const apiCallTime = endTime - startTime;
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`API错误: ${response.status}`, errorData);
      return { model, success: false, error: errorData };
    }
    
    const data = await response.json();
    console.log(`调用时间: ${apiCallTime} ms`);
    console.log(`消耗tokens: ${data.usage?.total_tokens || '未知'}`);
    
    const message = data.choices[0]?.message;
    if (message?.content) {
      console.log(`原始回复长度: ${message.content.length} 字符`);
      console.log(`原始回复: ${message.content}`);
      
      // 尝试提取JSON
      const jsonMatch = message.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedResult = JSON.parse(jsonMatch[0]);
          console.log(`解析结果:`, parsedResult);
          return { 
            model, 
            success: true, 
            content: message.content, 
            parsed: parsedResult,
            hasJson: true,
            isComplete: true
          };
        } catch (parseError) {
          console.error(`JSON解析错误:`, parseError);
          return { 
            model, 
            success: true, 
            content: message.content, 
            hasJson: false,
            parseError: parseError.message
          };
        }
      } else {
        console.log(`没有找到JSON格式`);
        return { 
          model, 
          success: true, 
          content: message.content, 
          hasJson: false
        };
      }
    } else {
      console.log(`没有content字段`);
      return { 
        model, 
        success: false, 
        error: '没有content字段'
      };
    }
  } catch (error) {
    console.error(`测试失败:`, error);
    return { 
      model, 
      success: false, 
      error: error.message
    };
  }
}

// 测试所有模型
async function testAllModels() {
  console.log('开始测试不同模型...');
  console.log('测试题目:', testTopic);
  
  const results = [];
  
  for (const model of models) {
    const result = await testModel(model);
    results.push(result);
  }
  
  console.log('\n=== 测试结果总结 ===');
  results.forEach(result => {
    console.log(`\n模型: ${result.model}`);
    console.log(`成功: ${result.success}`);
    if (result.success) {
      console.log(`是否包含JSON: ${result.hasJson}`);
      if (result.parsed) {
        console.log(`解析结果:`, result.parsed);
      }
    } else {
      console.log(`错误: ${result.error}`);
    }
  });
}

// 运行测试
testAllModels();
