import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'

// 从文件中读取场景数据
function getSceneDataFromFile(id: string) {
  try {
    // 读取场景数据文件
    const scenesDataPath = path.join(process.cwd(), 'prepare', 'scene', 'data', 'final_100_scenes.json')
    const scenesData = JSON.parse(fs.readFileSync(scenesDataPath, 'utf-8'))
    
    // 查找匹配的场景
    const scene = scenesData.find((s: any) => s.scene_id === id)
    
    if (scene) {
      // 转换为API响应格式
      return {
        id: scene.scene_id,
        name: scene.scene_name,
        category: scene.category,
        description: scene.description,
        difficulty: scene.difficulty,
        duration: 10, // 默认值
        tags: scene.tags,
        dialogue: {
          dialogue_id: `dlg_${scene.scene_id}`,
          scene_id: scene.scene_id,
          full_audio_url: `https://cdn.example.com/audio/${scene.scene_id}_full.mp3`,
          duration: 30, // 默认值
          rounds: scene.dialogue.rounds.map((round: any) => ({
            round_number: round.round_number,
            content: round.content.map((speech: any) => ({
              index: speech.index,
              speaker: speech.speaker,
              speaker_name: speech.speaker_name,
              text: speech.text,
              translation: speech.translation,
              audio_url: speech.audio_url || `https://cdn.example.com/audio/${scene.scene_id}_r${round.round_number}_${speech.index}.mp3`,
              is_key_qa: speech.is_key_qa
            })),
            analysis: round.analysis
          }))
        },
        vocabulary: scene.vocabulary.map((vocab: any) => ({
          vocab_id: `vocab_${scene.scene_id}_${vocab.content.toLowerCase().replace(/\s+/g, '_')}`,
          scene_id: scene.scene_id,
          type: vocab.type,
          content: vocab.content,
          phonetic: vocab.phonetic,
          translation: vocab.translation,
          example_sentence: vocab.example_sentence,
          example_translation: vocab.example_translation,
          audio_url: vocab.audio_url || `https://cdn.example.com/audio/vocab_${vocab.content.toLowerCase().replace(/\s+/g, '_')}.mp3`,
          round_number: vocab.round_number
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
    
    return null
  } catch (error) {
    console.error('Error reading scene data from file:', error)
    return null
  }
}

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
    // 首先尝试从数据库获取
    try {
      // 使用 neon 客户端执行原始 SQL 查询
      const neonSql = neon(process.env.DATABASE_URL || '')
      const result = await neonSql`SELECT * FROM scenes WHERE id = ${id}`
      const sceneData = result[0]
      
      if (sceneData) {
        // 解析 JSONB 字段（如果是字符串）
        let dialogue = sceneData.dialogue
        let vocabulary = sceneData.vocabulary
        let tags = sceneData.tags
        
        if (typeof dialogue === 'string') {
          dialogue = JSON.parse(dialogue)
        }
        if (typeof vocabulary === 'string') {
          vocabulary = JSON.parse(vocabulary)
        }
        if (typeof tags === 'string') {
          tags = JSON.parse(tags)
        }
        
        // 转换数据库格式为API响应格式
        const scene = {
          id: sceneData.id,
          name: sceneData.name,
          category: sceneData.category,
          description: sceneData.description,
          difficulty: sceneData.difficulty,
          duration: sceneData.duration,
          tags: tags,
          dialogue: dialogue,
          vocabulary: vocabulary,
          createdAt: sceneData.created_at,
          updatedAt: sceneData.updated_at
        }
        
        return NextResponse.json(scene, { status: 200 })
      }
    } catch (error) {
      console.error('Error fetching scene from database:', error)
    }
    
    // 如果数据库中没有找到，尝试从文件中读取场景数据
    const sceneFromFile = getSceneDataFromFile(id)
    if (sceneFromFile) {
      return NextResponse.json(sceneFromFile, { status: 200 })
    }
    
    // 如果都没有找到，返回模拟数据
    return NextResponse.json(
      getMockSceneData(id),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in GET /api/scenes/[id]:', error)
    // 返回模拟数据作为后备
    return NextResponse.json(
      getMockSceneData(id),
      { status: 200 }
    )
  }
}

// 模拟场景数据
function getMockSceneData(sceneId: string) {
  // 根据场景ID返回不同的模拟数据
  if (sceneId === 'daily_001' || sceneId === 'scene_1') {
    return {
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
          },
          {
            round_number: 3,
            content: [
              {
                index: 1,
                speaker: 'waiter',
                speaker_name: '服务员',
                text: 'How would you like it cooked?',
                translation: '您想要几分熟？',
                audio_url: 'https://cdn.example.com/audio/daily_001_r3_1.mp3',
                is_key_qa: true
              },
              {
                index: 2,
                speaker: 'customer',
                speaker_name: '顾客',
                text: 'Medium, please.',
                translation: '五分熟，谢谢。',
                audio_url: 'https://cdn.example.com/audio/daily_001_r3_2.mp3',
                is_key_qa: false
              }
            ],
            analysis: {
              analysis_detail: '点牛排或鱼类时，服务员常会询问烹饪程度。需要掌握不同熟度的英文表达。',
              standard_answer: {
                answer_id: 'ans_001_03_std',
                text: 'Medium, please.',
                translation: '五分熟，谢谢。',
                audio_url: 'https://cdn.example.com/audio/ans_001_03_std.mp3',
                scenario: '标准回答烹饪程度',
                formality: 'neutral'
              },
              alternative_answers: [
                {
                  answer_id: 'ans_001_03_alt1',
                  text: "I'd like it medium, please.",
                  translation: '我想要五分熟，谢谢。',
                  audio_url: 'https://cdn.example.com/audio/ans_001_03_alt1.mp3',
                  scenario: '完整句式表达',
                  formality: 'formal'
                },
                {
                  answer_id: 'ans_001_03_alt2',
                  text: 'Medium would be great.',
                  translation: '五分熟就很好。',
                  audio_url: 'https://cdn.example.com/audio/ans_001_03_alt2.mp3',
                  scenario: '更随意的表达',
                  formality: 'casual'
                }
              ],
              usage_notes: '常见熟度表达：rare(三分熟)、medium-rare(四分熟)、medium(五分熟)、medium-well(七分熟)、well-done(全熟)。可以直接说熟度，也可以用完整句式。'
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
        },
        {
          vocab_id: 'vocab_001_04',
          scene_id: 'daily_001',
          type: 'word',
          content: 'salad',
          phonetic: '/ˈsæləd/',
          translation: '沙拉',
          example_sentence: "I'd like to start with a Caesar salad.",
          example_translation: '我想先来一份凯撒沙拉。',
          audio_url: 'https://cdn.example.com/audio/vocab_salad.mp3',
          round_number: 1
        },
        {
          vocab_id: 'vocab_001_05',
          scene_id: 'daily_001',
          type: 'phrase',
          content: 'main course',
          phonetic: '/meɪn kɔːrs/',
          translation: '主菜',
          example_sentence: 'And for your main course?',
          example_translation: '主菜呢？',
          audio_url: 'https://cdn.example.com/audio/vocab_main_course.mp3',
          round_number: 2
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  } else if (sceneId === 'daily_002' || sceneId === 'scene_2') {
    return {
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
          },
          {
            round_number: 2,
            content: [
              {
                index: 1,
                speaker: 'passenger',
                speaker_name: '乘客',
                text: 'Here you are. I would prefer a window seat if possible.',
                translation: '给您。如果可能的话，我想要一个靠窗的座位。',
                audio_url: 'https://cdn.example.com/audio/daily_002_r2_1.mp3',
                is_key_qa: true
              },
              {
                index: 2,
                speaker: 'agent',
                speaker_name: '值机员',
                text: 'Let me check... Yes, I can assign you a window seat.',
                translation: '让我查一下...好的，我可以给您安排一个靠窗的座位。',
                audio_url: 'https://cdn.example.com/audio/daily_002_r2_2.mp3',
                is_key_qa: false
              }
            ],
            analysis: {
              analysis_detail: '值机时，乘客可以表达对座位的偏好。需要掌握座位偏好的英文表达。',
              standard_answer: {
                answer_id: 'ans_002_02_std',
                text: 'Here you are. I would prefer a window seat if possible.',
                translation: '给您。如果可能的话，我想要一个靠窗的座位。',
                audio_url: 'https://cdn.example.com/audio/ans_002_02_std.mp3',
                scenario: '标准座位偏好表达',
                formality: 'neutral'
              },
              alternative_answers: [
                {
                  answer_id: 'ans_002_02_alt1',
                  text: 'Here they are. Do you have any window seats available?',
                  translation: '给您。还有靠窗的座位吗？',
                  audio_url: 'https://cdn.example.com/audio/ans_002_02_alt1.mp3',
                  scenario: '询问式表达',
                  formality: 'casual'
                },
                {
                  answer_id: 'ans_002_02_alt2',
                  text: 'Here you go. I\'d like a window seat, please.',
                  translation: '给您。我想要一个靠窗的座位，谢谢。',
                  audio_url: 'https://cdn.example.com/audio/ans_002_02_alt2.mp3',
                  scenario: '直接请求式表达',
                  formality: 'formal'
                }
              ],
              usage_notes: '表达座位偏好时，可以用"I would prefer..."、"Do you have any... available?"或"I\'d like..."等表达。常见座位类型：window seat(靠窗座位)、aisle seat(靠过道座位)、middle seat(中间座位)。'
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
        },
        {
          vocab_id: 'vocab_002_03',
          scene_id: 'daily_002',
          type: 'phrase',
          content: 'window seat',
          phonetic: '/ˈwɪndoʊ sit/',
          translation: '靠窗座位',
          example_sentence: 'I would prefer a window seat if possible.',
          example_translation: '如果可能的话，我想要一个靠窗的座位。',
          audio_url: 'https://cdn.example.com/audio/vocab_window_seat.mp3',
          round_number: 2
        },
        {
          vocab_id: 'vocab_002_04',
          scene_id: 'daily_002',
          type: 'phrase',
          content: 'I would prefer',
          phonetic: '/aɪ wʊd ˈprɛfər/',
          translation: '我更喜欢；我想要',
          example_sentence: 'I would prefer a window seat if possible.',
          example_translation: '如果可能的话，我想要一个靠窗的座位。',
          audio_url: 'https://cdn.example.com/audio/vocab_i_would_prefer.mp3',
          round_number: 2
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  } else {
    // 默认场景数据
    return {
      id: sceneId,
      name: '日常问候',
      category: 'daily',
      description: '学习日常问候的高频对话，掌握不同场景下的问候方式。',
      difficulty: 'beginner',
      duration: 10,
      tags: ['问候', '日常', '基础'],
      dialogue: {
        dialogue_id: `dlg_${sceneId}`,
        scene_id: sceneId,
        full_audio_url: `https://cdn.example.com/audio/${sceneId}_full.mp3`,
        duration: 30,
        rounds: [
          {
            round_number: 1,
            content: [
              {
                index: 1,
                speaker: 'A',
                speaker_name: 'A',
                text: 'Hello! How are you today?',
                translation: '你好！你今天怎么样？',
                audio_url: `https://cdn.example.com/audio/${sceneId}_r1_1.mp3`,
                is_key_qa: true
              },
              {
                index: 2,
                speaker: 'B',
                speaker_name: 'B',
                text: "I'm doing great, thanks! How about you?",
                translation: '我很好，谢谢！你呢？',
                audio_url: `https://cdn.example.com/audio/${sceneId}_r1_2.mp3`,
                is_key_qa: false
              }
            ],
            analysis: {
              analysis_detail: '这是最基础的日常问候对话。用于熟人之间的问候。',
              standard_answer: {
                answer_id: `ans_${sceneId}_01_std`,
                text: "I'm doing great, thanks! How about you?",
                translation: '我很好，谢谢！你呢？',
                audio_url: `https://cdn.example.com/audio/ans_${sceneId}_01_std.mp3`,
                scenario: '标准问候回答',
                formality: 'neutral'
              },
              alternative_answers: [
                {
                  answer_id: `ans_${sceneId}_01_alt1`,
                  text: "I'm good, thanks. And you?",
                  translation: '我很好，谢谢。你呢？',
                  audio_url: `https://cdn.example.com/audio/ans_${sceneId}_01_alt1.mp3`,
                  scenario: '简洁回答',
                  formality: 'casual'
                },
                {
                  answer_id: `ans_${sceneId}_01_alt2`,
                  text: "I'm doing well, thank you for asking. How are you?",
                  translation: '我很好，谢谢你的关心。你怎么样？',
                  audio_url: `https://cdn.example.com/audio/ans_${sceneId}_01_alt2.mp3`,
                  scenario: '正式回答',
                  formality: 'formal'
                }
              ],
              usage_notes: '"How are you today?"是询问对方当天状态的常用表达。回答时，通常会先说明自己的状态，然后反问对方。'
            }
          }
        ]
      },
      vocabulary: [
        {
          vocab_id: `vocab_${sceneId}_01`,
          scene_id: sceneId,
          type: 'word',
          content: 'hello',
          phonetic: '/həˈloʊ/',
          translation: '你好',
          example_sentence: 'Hello! How are you today?',
          example_translation: '你好！你今天怎么样？',
          audio_url: `https://cdn.example.com/audio/vocab_hello.mp3`,
          round_number: 1
        },
        {
          vocab_id: `vocab_${sceneId}_02`,
          scene_id: sceneId,
          type: 'word',
          content: 'thanks',
          phonetic: '/θæŋks/',
          translation: '谢谢',
          example_sentence: "I'm doing great, thanks!",
          example_translation: '我很好，谢谢！',
          audio_url: `https://cdn.example.com/audio/vocab_thanks.mp3`,
          round_number: 1
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
}
