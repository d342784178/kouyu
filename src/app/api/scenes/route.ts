import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  try {
    // 使用 neon 客户端执行原始 SQL 查询
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    // 尝试从数据库获取场景列表
    let rawScenes
    try {
      rawScenes = await neonSql`SELECT * FROM scenes ORDER BY category, name`
    } catch (error) {
      console.error('Error fetching scenes from database:', error)
      // 如果数据库查询失败，返回模拟数据
      return NextResponse.json([
        {
          id: 'daily_001',
          name: '餐厅点餐',
          category: 'daily',
          description: '学习在餐厅点餐时的常用英语表达',
          difficulty: 'beginner',
          duration: 10,
          tags: ['餐厅', '点餐', '食物', '日常'],
          dialogue: {
            dialogue_id: 'dlg_daily_001',
            scene_id: 'daily_001',
            full_audio_url: 'https://cdn.example.com/audio/daily_001_full.mp3',
            duration: 45,
            rounds: [
              {
                round_number: 1,
                content: [
                  {
                    index: 1,
                    speaker: 'waiter',
                    speaker_name: '服务员',
                    text: 'Good evening! Are you ready to order?',
                    translation: '晚上好！您准备好点餐了吗？',
                    audio_url: 'https://cdn.example.com/audio/daily_001_r1_1.mp3',
                    is_key_qa: true
                  },
                  {
                    index: 2,
                    speaker: 'customer',
                    speaker_name: '顾客',
                    text: "Yes, I'd like to start with a Caesar salad.",
                    translation: '是的，我想先来一份凯撒沙拉。',
                    audio_url: 'https://cdn.example.com/audio/daily_001_r1_2.mp3',
                    is_key_qa: false
                  }
                ],
                analysis: {
                  analysis_detail: '这是点餐场景中最基础的问答。服务员询问是否准备点餐，顾客需要表达准备好并说出想要的菜品。',
                  standard_answer: {
                    answer_id: 'ans_001_01_std',
                    text: "Yes, I'd like to start with a Caesar salad.",
                    translation: '是的，我想先来一份凯撒沙拉。',
                    audio_url: 'https://cdn.example.com/audio/ans_001_01_std.mp3',
                    scenario: '直接点餐，表达明确',
                    formality: 'neutral'
                  },
                  alternative_answers: [
                    {
                      answer_id: 'ans_001_01_alt1',
                      text: 'Yes, I\'m ready. Can I have the Caesar salad?',
                      translation: '是的，我准备好了。我可以要凯撒沙拉吗？',
                      audio_url: 'https://cdn.example.com/audio/ans_001_01_alt1.mp3',
                      scenario: '礼貌询问式点餐',
                      formality: 'formal'
                    },
                    {
                      answer_id: 'ans_001_01_alt2',
                      text: 'Sure! I\'ll take a Caesar salad to start.',
                      translation: '当然！我先来一份凯撒沙拉。',
                      audio_url: 'https://cdn.example.com/audio/ans_001_01_alt2.mp3',
                      scenario: '轻松随意的表达',
                      formality: 'casual'
                    }
                  ],
                  usage_notes: "回答服务员询问时，可以直接说出菜品，也可以用疑问句礼貌询问。'I'd like'和'Can I have'都是常用表达。"
                }
              },
              {
                round_number: 2,
                content: [
                  {
                    index: 1,
                    speaker: 'waiter',
                    speaker_name: '服务员',
                    text: 'Great choice! And for your main course?',
                    translation: '很好的选择！主菜呢？',
                    audio_url: 'https://cdn.example.com/audio/daily_001_r2_1.mp3',
                    is_key_qa: true
                  },
                  {
                    index: 2,
                    speaker: 'customer',
                    speaker_name: '顾客',
                    text: 'I\'ll have the grilled salmon, please.',
                    translation: '我要烤三文鱼，谢谢。',
                    audio_url: 'https://cdn.example.com/audio/daily_001_r2_2.mp3',
                    is_key_qa: false
                  }
                ],
                analysis: {
                  analysis_detail: '点主菜时的标准表达。服务员询问主菜选择，顾客需要清晰说出想要的主菜名称。',
                  standard_answer: {
                    answer_id: 'ans_001_02_std',
                    text: 'I\'ll have the grilled salmon, please.',
                    translation: '我要烤三文鱼，谢谢。',
                    audio_url: 'https://cdn.example.com/audio/ans_001_02_std.mp3',
                    scenario: '标准点餐表达',
                    formality: 'neutral'
                  },
                  alternative_answers: [
                    {
                      answer_id: 'ans_001_02_alt1',
                      text: 'The grilled salmon sounds good.',
                      translation: '烤三文鱼听起来不错。',
                      audio_url: 'https://cdn.example.com/audio/ans_001_02_alt1.mp3',
                      scenario: '表达对菜品的兴趣',
                      formality: 'casual'
                    },
                    {
                      answer_id: 'ans_001_02_alt2',
                      text: 'Could I get the grilled salmon?',
                      translation: '我可以要烤三文鱼吗？',
                      audio_url: 'https://cdn.example.com/audio/ans_001_02_alt2.mp3',
                      scenario: '更礼貌的询问方式',
                      formality: 'formal'
                    }
                  ],
                  usage_notes: "'I'll have'是最常用的点餐表达。'sounds good'表示对菜品感兴趣，'Could I get'更加礼貌正式。"
                }
              }
            ]
          },
          vocabulary: [
            {
              vocab_id: 'vocab_001_01',
              scene_id: 'daily_001',
              type: 'word',
              content: 'order',
              phonetic: '/ˈɔːrdər/',
              translation: '点餐；订购',
              example_sentence: 'Are you ready to order?',
              example_translation: '您准备好点餐了吗？',
              audio_url: 'https://cdn.example.com/audio/vocab_order.mp3',
              round_number: 1
            },
            {
              vocab_id: 'vocab_001_02',
              scene_id: 'daily_001',
              type: 'phrase',
              content: 'ready to order',
              phonetic: '/ˈredɪ tə ˈɔːrdər/',
              translation: '准备好点餐',
              example_sentence: 'Are you ready to order?',
              example_translation: '您准备好点餐了吗？',
              audio_url: 'https://cdn.example.com/audio/vocab_ready_to_order.mp3',
              round_number: 1
            },
            {
              vocab_id: 'vocab_001_03',
              scene_id: 'daily_001',
              type: 'phrase',
              content: "I'd like to",
              phonetic: '/aɪd laɪk tə/',
              translation: '我想要（礼貌表达）',
              example_sentence: "I'd like to start with a Caesar salad.",
              example_translation: '我想先来一份凯撒沙拉。',
              audio_url: 'https://cdn.example.com/audio/vocab_id_like_to.mp3',
              round_number: 1
            }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'daily_002',
          name: '机场值机',
          category: 'daily',
          description: '学习在机场办理值机手续的常用对话',
          difficulty: 'advanced',
          duration: 10,
          tags: ['机场', '值机', '旅行', '交通'],
          dialogue: {
            dialogue_id: 'dlg_daily_002',
            scene_id: 'daily_002',
            full_audio_url: 'https://cdn.example.com/audio/daily_002_full.mp3',
            duration: 60,
            rounds: [
              {
                round_number: 1,
                content: [
                  {
                    index: 1,
                    speaker: 'passenger',
                    speaker_name: '乘客',
                    text: 'Hello, I would like to check in for my flight to New York.',
                    translation: '你好，我想办理去纽约的航班值机。',
                    audio_url: 'https://cdn.example.com/audio/daily_002_r1_1.mp3',
                    is_key_qa: true
                  },
                  {
                    index: 2,
                    speaker: 'agent',
                    speaker_name: '值机员',
                    text: 'Sure, may I see your passport and ticket please?',
                    translation: '好的，请出示您的护照和机票。',
                    audio_url: 'https://cdn.example.com/audio/daily_002_r1_2.mp3',
                    is_key_qa: false
                  }
                ],
                analysis: {
                  analysis_detail: '机场值机的标准开场白。乘客需要说明目的地并请求值机服务。',
                  standard_answer: {
                    answer_id: 'ans_002_01_std',
                    text: 'Hello, I would like to check in for my flight to New York.',
                    translation: '你好，我想办理去纽约的航班值机。',
                    audio_url: 'https://cdn.example.com/audio/ans_002_01_std.mp3',
                    scenario: '标准值机请求',
                    formality: 'neutral'
                  },
                  alternative_answers: [
                    {
                      answer_id: 'ans_002_01_alt1',
                      text: 'Hi, I need to check in for my flight to New York.',
                      translation: '嗨，我需要办理去纽约的航班值机。',
                      audio_url: 'https://cdn.example.com/audio/ans_002_01_alt1.mp3',
                      scenario: '更口语化的表达',
                      formality: 'casual'
                    },
                    {
                      answer_id: 'ans_002_01_alt2',
                      text: 'Good morning, could I check in for my flight to New York please?',
                      translation: '早上好，请问我可以办理去纽约的航班值机吗？',
                      audio_url: 'https://cdn.example.com/audio/ans_002_01_alt2.mp3',
                      scenario: '更礼貌的询问',
                      formality: 'formal'
                    }
                  ],
                  usage_notes: '办理值机时，需要清晰说明目的地和航班信息。"check in for my flight to..."是标准表达。'
                }
              }
            ]
          },
          vocabulary: [
            {
              vocab_id: 'vocab_002_01',
              scene_id: 'daily_002',
              type: 'phrase',
              content: 'check in',
              phonetic: '/tʃek ɪn/',
              translation: '办理值机；登记入住',
              example_sentence: 'I would like to check in for my flight to New York.',
              example_translation: '我想办理去纽约的航班值机。',
              audio_url: 'https://cdn.example.com/audio/vocab_check_in.mp3',
              round_number: 1
            },
            {
              vocab_id: 'vocab_002_02',
              scene_id: 'daily_002',
              type: 'word',
              content: 'flight',
              phonetic: '/flaɪt/',
              translation: '航班',
              example_sentence: 'I would like to check in for my flight to New York.',
              example_translation: '我想办理去纽约的航班值机。',
              audio_url: 'https://cdn.example.com/audio/vocab_flight.mp3',
              round_number: 1
            }
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], { status: 200 })
    }
    
    // 手动映射数据
    const allScenes = rawScenes.map((scene: any) => ({
      id: scene.id,
      name: scene.name,
      category: scene.category,
      description: scene.description,
      difficulty: scene.difficulty,
      duration: scene.duration,
      tags: scene.tags,
      dialogue: scene.dialogue,
      vocabulary: scene.vocabulary,
      createdAt: scene.created_at,
      updatedAt: scene.updated_at
    }))
    
    return NextResponse.json(allScenes, { status: 200 })
  } catch (error) {
    console.error('Error fetching scenes:', error)
    // 返回模拟数据作为后备
    return NextResponse.json([
      {
        id: 'daily_001',
        name: '餐厅点餐',
        category: 'daily',
        description: '学习在餐厅点餐时的常用英语表达',
        difficulty: 'beginner',
        duration: 10,
        tags: ['餐厅', '点餐', '食物', '日常'],
        dialogue: {
          dialogue_id: 'dlg_daily_001',
          scene_id: 'daily_001',
          full_audio_url: 'https://cdn.example.com/audio/daily_001_full.mp3',
          duration: 45,
          rounds: [
            {
              round_number: 1,
              content: [
                {
                  index: 1,
                  speaker: 'waiter',
                  speaker_name: '服务员',
                  text: 'Good evening! Are you ready to order?',
                  translation: '晚上好！您准备好点餐了吗？',
                  audio_url: 'https://cdn.example.com/audio/daily_001_r1_1.mp3',
                  is_key_qa: true
                },
                {
                  index: 2,
                  speaker: 'customer',
                  speaker_name: '顾客',
                  text: "Yes, I'd like to start with a Caesar salad.",
                  translation: '是的，我想先来一份凯撒沙拉。',
                  audio_url: 'https://cdn.example.com/audio/daily_001_r1_2.mp3',
                  is_key_qa: false
                }
              ],
              analysis: {
                analysis_detail: '这是点餐场景中最基础的问答。服务员询问是否准备点餐，顾客需要表达准备好并说出想要的菜品。',
                standard_answer: {
                  answer_id: 'ans_001_01_std',
                  text: "Yes, I'd like to start with a Caesar salad.",
                  translation: '是的，我想先来一份凯撒沙拉。',
                  audio_url: 'https://cdn.example.com/audio/ans_001_01_std.mp3',
                  scenario: '直接点餐，表达明确',
                  formality: 'neutral'
                },
                alternative_answers: [
                  {
                    answer_id: 'ans_001_01_alt1',
                    text: 'Yes, I\'m ready. Can I have the Caesar salad?',
                    translation: '是的，我准备好了。我可以要凯撒沙拉吗？',
                    audio_url: 'https://cdn.example.com/audio/ans_001_01_alt1.mp3',
                    scenario: '礼貌询问式点餐',
                    formality: 'formal'
                  },
                  {
                    answer_id: 'ans_001_01_alt2',
                    text: 'Sure! I\'ll take a Caesar salad to start.',
                    translation: '当然！我先来一份凯撒沙拉。',
                    audio_url: 'https://cdn.example.com/audio/ans_001_01_alt2.mp3',
                    scenario: '轻松随意的表达',
                    formality: 'casual'
                  }
                ],
                usage_notes: "回答服务员询问时，可以直接说出菜品，也可以用疑问句礼貌询问。'I'd like'和'Can I have'都是常用表达。"
              }
            }
          ]
        },
        vocabulary: [
          {
            vocab_id: 'vocab_001_01',
            scene_id: 'daily_001',
            type: 'word',
            content: 'order',
            phonetic: '/ˈɔːrdər/',
            translation: '点餐；订购',
            example_sentence: 'Are you ready to order?',
            example_translation: '您准备好点餐了吗？',
            audio_url: 'https://cdn.example.com/audio/vocab_order.mp3',
            round_number: 1
          },
          {
            vocab_id: 'vocab_001_02',
            scene_id: 'daily_001',
            type: 'phrase',
            content: 'ready to order',
            phonetic: '/ˈredɪ tə ˈɔːrdər/',
            translation: '准备好点餐',
            example_sentence: 'Are you ready to order?',
            example_translation: '您准备好点餐了吗？',
            audio_url: 'https://cdn.example.com/audio/vocab_ready_to_order.mp3',
            round_number: 1
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ], { status: 200 })
  }
}