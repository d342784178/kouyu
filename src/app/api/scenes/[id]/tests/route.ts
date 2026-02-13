/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: { id: string }
  }
) {
  const { id } = params

  try {
    // 使用 neon 客户端执行原始 SQL 查询
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    // 尝试从数据库获取场景测试题
    let testData
    try {
      const result = await neonSql`SELECT * FROM scene_tests WHERE scene_id = ${id} ORDER BY "order"`
      testData = result
      
      if (!testData || testData.length === 0) {
        // 如果数据库中没有找到测试题，返回模拟数据
        return NextResponse.json(
          getMockTestData(id),
          { status: 200 }
        )
      }
    } catch (error) {
      console.error('Error fetching scene tests from database:', error)
      // 如果数据库查询失败，返回模拟数据
      return NextResponse.json(
        getMockTestData(id),
        { status: 200 }
      )
    }
    
    // 转换数据库格式为API响应格式
    const tests = testData.map((test: any) => ({
      id: test.id,
      sceneId: test.scene_id,
      type: test.type,
      order: test.order,
      content: test.content,
      createdAt: test.created_at,
      updatedAt: test.updated_at
    }))
    
    return NextResponse.json(tests, { status: 200 })
  } catch (error) {
    console.error('Error in GET /api/scenes/[id]/tests:', error)
    // 返回模拟数据作为后备
    return NextResponse.json(
      getMockTestData(id),
      { status: 200 }
    )
  }
}

// 模拟测试数据
function getMockTestData(sceneId: string) {
  // 根据场景ID返回不同的模拟测试数据
  if (sceneId === 'daily_001' || sceneId === 'scene_1') {
    return [
      {
        id: 'test_001_01',
        sceneId: 'daily_001',
        type: 'choice',
        order: 1,
        content: {
          question: 'Are you ready to order?',
          question_audio_url: 'https://cdn.example.com/audio/test_001_01_q.mp3',
          options: [
            {
              option_id: 'opt_001_01_a',
              text: "Yes, I'd like to start with a Caesar salad.",
              audio_url: 'https://cdn.example.com/audio/test_001_01_a.mp3',
              is_correct: true,
              explanation: '正确。这是标准的点餐回答，表达清晰。'
            },
            {
              option_id: 'opt_001_01_b',
              text: 'Can I have the Caesar salad?',
              audio_url: 'https://cdn.example.com/audio/test_001_01_b.mp3',
              is_correct: true,
              explanation: '正确。用疑问句礼貌地询问，也是合适的表达。'
            },
            {
              option_id: 'opt_001_01_c',
              text: 'I don\'t like salad.',
              audio_url: 'https://cdn.example.com/audio/test_001_01_c.mp3',
              is_correct: false,
              explanation: '不合适。服务员问是否准备点餐，应该回答是否准备好或直接点餐。'
            },
            {
              option_id: 'opt_001_01_d',
              text: 'What time is it?',
              audio_url: 'https://cdn.example.com/audio/test_001_01_d.mp3',
              is_correct: false,
              explanation: '不合适。这个回答与点餐无关。'
            }
          ]
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test_001_02',
        sceneId: 'daily_001',
        type: 'qa',
        order: 2,
        content: {
          question: 'How would you like it cooked?',
          question_audio_url: 'https://cdn.example.com/audio/test_001_02_q.mp3',
          standard_answer: 'Medium, please.',
          standard_answer_audio_url: 'https://cdn.example.com/audio/test_001_02_std.mp3',
          answer_key_points: [
            '表达烹饪程度（如medium、well-done等）',
            '使用礼貌用语（如please）'
          ],
          acceptable_variations: [
            'Medium, please.',
            "I'd like it medium, please.",
            'Medium would be great.',
            'Medium well, please.'
          ]
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test_001_03',
        sceneId: 'daily_001',
        type: 'open_dialogue',
        order: 3,
        content: {
          ai_role: 'waiter',
          ai_role_name: '服务员',
          scenario_description: '你在一家西餐厅用餐，服务员会帮你点餐。请与服务员进行自然对话，完成点餐过程。',
          dialogue_starters: [
            'Good evening! Welcome to our restaurant. Are you ready to order?',
            'Hi there! Have you decided what you\'d like to have?',
            'Good evening! Can I take your order?'
          ],
          key_topics: [
            '点前菜或沙拉',
            '点主菜',
            '询问或回答烹饪方式',
            '点饮料',
            '礼貌用语'
          ],
          suggested_rounds: 8,
          evaluation_criteria: {
            fluency: 0.25,
            accuracy: 0.35,
            relevance: 0.25,
            vocabulary: 0.15
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  } else if (sceneId === 'daily_002' || sceneId === 'scene_2') {
    return [
      {
        id: 'test_002_01',
        sceneId: 'daily_002',
        type: 'choice',
        order: 1,
        content: {
          question: 'Hello, I would like to check in for my flight to New York.',
          question_audio_url: 'https://cdn.example.com/audio/test_002_01_q.mp3',
          options: [
            {
              option_id: 'opt_002_01_a',
              text: 'Sure, may I see your passport and ticket please?',
              audio_url: 'https://cdn.example.com/audio/test_002_01_a.mp3',
              is_correct: true,
              explanation: '正确。值机员需要查看乘客的护照和机票。'
            },
            {
              option_id: 'opt_002_01_b',
              text: 'What time is your flight?',
              audio_url: 'https://cdn.example.com/audio/test_002_01_b.mp3',
              is_correct: true,
              explanation: '正确。值机员也可能询问航班时间。'
            },
            {
              option_id: 'opt_002_01_c',
              text: 'Do you have any luggage?',
              audio_url: 'https://cdn.example.com/audio/test_002_01_c.mp3',
              is_correct: false,
              explanation: '不合适。值机员通常会先查看证件，然后再询问行李。'
            },
            {
              option_id: 'opt_002_01_d',
              text: 'Welcome to our restaurant!',
              audio_url: 'https://cdn.example.com/audio/test_002_01_d.mp3',
              is_correct: false,
              explanation: '不合适。这是餐厅的欢迎语，不是机场值机的回应。'
            }
          ]
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test_002_02',
        sceneId: 'daily_002',
        type: 'qa',
        order: 2,
        content: {
          question: 'I would prefer a window seat if possible.',
          question_audio_url: 'https://cdn.example.com/audio/test_002_02_q.mp3',
          standard_answer: 'Let me check... Yes, I can assign you a window seat.',
          standard_answer_audio_url: 'https://cdn.example.com/audio/test_002_02_std.mp3',
          answer_key_points: [
            '表示需要查看座位情况',
            '确认是否可以满足座位偏好',
            '给出明确的回应'
          ],
          acceptable_variations: [
            'Let me check... Yes, I can assign you a window seat.',
            'Let me see... I have a window seat available for you.',
            'Sure, let me check... Yes, we have window seats available.',
            'I\'ll check for you... Yes, here\'s a window seat.'
          ]
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test_002_03',
        sceneId: 'daily_002',
        type: 'open_dialogue',
        order: 3,
        content: {
          ai_role: 'agent',
          ai_role_name: '值机员',
          scenario_description: '你在机场办理值机手续，值机员会帮助你完成值机过程。请与值机员进行自然对话，完成值机手续。',
          dialogue_starters: [
            'Good morning! Welcome to our airline. How can I help you today?',
            'Hello! What can I do for you today?',
            'Good morning! Are you checking in for a flight?'
          ],
          key_topics: [
            '说明目的地',
            '出示证件',
            '表达座位偏好',
            '询问行李托运',
            '确认登机时间和登机口'
          ],
          suggested_rounds: 10,
          evaluation_criteria: {
            fluency: 0.25,
            accuracy: 0.35,
            relevance: 0.25,
            vocabulary: 0.15
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  } else {
    // 默认测试数据
    return [
      {
        id: `test_${sceneId}_01`,
        sceneId: sceneId,
        type: 'choice',
        order: 1,
        content: {
          question: 'Hello! How are you today?',
          question_audio_url: `https://cdn.example.com/audio/test_${sceneId}_01_q.mp3`,
          options: [
            {
              option_id: `opt_${sceneId}_01_a`,
              text: "I'm doing great, thanks! How about you?",
              audio_url: `https://cdn.example.com/audio/test_${sceneId}_01_a.mp3`,
              is_correct: true,
              explanation: '正确。这是标准的问候回答，表达清晰。'
            },
            {
              option_id: `opt_${sceneId}_01_b`,
              text: "I'm good, thanks. And you?",
              audio_url: `https://cdn.example.com/audio/test_${sceneId}_01_b.mp3`,
              is_correct: true,
              explanation: '正确。简洁的问候回答，也是合适的表达。'
            },
            {
              option_id: `opt_${sceneId}_01_c`,
              text: 'What\'s your name?',
              audio_url: `https://cdn.example.com/audio/test_${sceneId}_01_c.mp3`,
              is_correct: false,
              explanation: '不合适。对方问你怎么样，应该回答自己的状态。'
            },
            {
              option_id: `opt_${sceneId}_01_d`,
              text: 'I don\'t know.',
              audio_url: `https://cdn.example.com/audio/test_${sceneId}_01_d.mp3`,
              is_correct: false,
              explanation: '不合适。这个回答不够礼貌和具体。'
            }
          ]
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: `test_${sceneId}_02`,
        sceneId: sceneId,
        type: 'qa',
        order: 2,
        content: {
          question: 'Hello! How are you today?',
          question_audio_url: `https://cdn.example.com/audio/test_${sceneId}_02_q.mp3`,
          standard_answer: "I'm doing great, thanks! How about you?",
          standard_answer_audio_url: `https://cdn.example.com/audio/test_${sceneId}_02_std.mp3`,
          answer_key_points: [
            '表达自己的状态（如great、good等）',
            '表示感谢',
            '反问对方'
          ],
          acceptable_variations: [
            "I'm doing great, thanks! How about you?",
            "I'm good, thanks. And you?",
            "I'm doing well, thank you. How are you?",
            "Great! Thanks for asking. How about you?"
          ]
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  }
}
