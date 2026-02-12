import Link from 'next/link'

// 定义场景类型
interface Scene {
  id: string
  name: string
  category: string
  description: string
  difficulty: string
  duration: number
  tags: string[]
  dialogue: Dialogue
  vocabulary: Vocabulary[]
  createdAt: string
  updatedAt: string
}

// 定义对话类型
interface Dialogue {
  dialogue_id: string
  scene_id: string
  full_audio_url: string
  duration: number
  rounds: DialogueRound[]
}

// 定义对话回合类型
interface DialogueRound {
  round_number: number
  content: DialogueContent[]
  analysis: QAAnalysis
}

// 定义对话内容类型
interface DialogueContent {
  index: number
  speaker: string
  speaker_name: string
  text: string
  translation: string
  audio_url: string
  is_key_qa: boolean
}

// 定义问答解析类型
interface QAAnalysis {
  analysis_detail: string
  standard_answer: Answer
  alternative_answers: Answer[]
  usage_notes: string
}

// 定义回答类型
interface Answer {
  answer_id: string
  text: string
  translation: string
  audio_url: string
  scenario: string
  formality: string
}

// 定义词汇类型
interface Vocabulary {
  vocab_id: string
  scene_id: string
  type: string
  content: string
  phonetic: string
  translation: string
  example_sentence: string
  example_translation: string
  audio_url: string
  round_number: number
}

// 获取场景详情的辅助函数
async function getSceneById(id: string): Promise<Scene> {
  try {
    // 在服务器组件中，使用当前URL或环境变量构建绝对URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000' // 开发环境默认URL
    
    // 调用API获取场景详情（禁用缓存以确保获取最新数据）
    const response = await fetch(`${baseUrl}/api/scenes/${id}`, { cache: 'no-store' })
    
    let scene: Scene
    
    if (response.ok) {
      scene = await response.json()
    } else {
      // 如果API调用失败，返回模拟数据
      scene = {
        id: id,
        name: '日常问候',
        category: 'daily',
        description: '学习日常问候的高频对话，掌握不同场景下的问候方式。',
        difficulty: 'beginner',
        duration: 10,
        tags: ['问候', '日常', '基础'],
        dialogue: {
          dialogue_id: `dlg_${id}`,
          scene_id: id,
          full_audio_url: `https://cdn.example.com/audio/${id}_full.mp3`,
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
                  audio_url: `https://cdn.example.com/audio/${id}_r1_1.mp3`,
                  is_key_qa: true
                },
                {
                  index: 2,
                  speaker: 'B',
                  speaker_name: 'B',
                  text: "I'm doing great, thanks! How about you?",
                  translation: '我很好，谢谢！你呢？',
                  audio_url: `https://cdn.example.com/audio/${id}_r1_2.mp3`,
                  is_key_qa: false
                }
              ],
              analysis: {
                analysis_detail: '这是最基础的日常问候对话。用于熟人之间的问候。',
                standard_answer: {
                  answer_id: `ans_${id}_01_std`,
                  text: "I'm doing great, thanks! How about you?",
                  translation: '我很好，谢谢！你呢？',
                  audio_url: `https://cdn.example.com/audio/ans_${id}_01_std.mp3`,
                  scenario: '标准问候回答',
                  formality: 'neutral'
                },
                alternative_answers: [
                  {
                    answer_id: `ans_${id}_01_alt1`,
                    text: "I'm good, thanks. And you?",
                    translation: '我很好，谢谢。你呢？',
                    audio_url: `https://cdn.example.com/audio/ans_${id}_01_alt1.mp3`,
                    scenario: '简洁回答',
                    formality: 'casual'
                  },
                  {
                    answer_id: `ans_${id}_01_alt2`,
                    text: "I'm doing well, thank you for asking. How are you?",
                    translation: '我很好，谢谢你的关心。你怎么样？',
                    audio_url: `https://cdn.example.com/audio/ans_${id}_01_alt2.mp3`,
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
            vocab_id: `vocab_${id}_01`,
            scene_id: id,
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
            vocab_id: `vocab_${id}_02`,
            scene_id: id,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
    
    return scene
  } catch (error) {
    console.error(`Error fetching scene ${id}:`, error)
    // 返回模拟数据
    return {
      id: id,
      name: '日常问候',
      category: 'daily',
      description: '学习日常问候的高频对话，掌握不同场景下的问候方式。',
      difficulty: 'beginner',
      duration: 10,
      tags: ['问候', '日常', '基础'],
      dialogue: {
        dialogue_id: `dlg_${id}`,
        scene_id: id,
        full_audio_url: `https://cdn.example.com/audio/${id}_full.mp3`,
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
                audio_url: `https://cdn.example.com/audio/${id}_r1_1.mp3`,
                is_key_qa: true
              },
              {
                index: 2,
                speaker: 'B',
                speaker_name: 'B',
                text: "I'm doing great, thanks! How about you?",
                translation: '我很好，谢谢！你呢？',
                audio_url: `https://cdn.example.com/audio/${id}_r1_2.mp3`,
                is_key_qa: false
              }
            ],
            analysis: {
              analysis_detail: '这是最基础的日常问候对话。用于熟人之间的问候。',
              standard_answer: {
                answer_id: `ans_${id}_01_std`,
                text: "I'm doing great, thanks! How about you?",
                translation: '我很好，谢谢！你呢？',
                audio_url: `https://cdn.example.com/audio/ans_${id}_01_std.mp3`,
                scenario: '标准问候回答',
                formality: 'neutral'
              },
              alternative_answers: [
                {
                  answer_id: `ans_${id}_01_alt1`,
                  text: "I'm good, thanks. And you?",
                  translation: '我很好，谢谢。你呢？',
                  audio_url: `https://cdn.example.com/audio/ans_${id}_01_alt1.mp3`,
                  scenario: '简洁回答',
                  formality: 'casual'
                },
                {
                  answer_id: `ans_${id}_01_alt2`,
                  text: "I'm doing well, thank you for asking. How are you?",
                  translation: '我很好，谢谢你的关心。你怎么样？',
                  audio_url: `https://cdn.example.com/audio/ans_${id}_01_alt2.mp3`,
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
          vocab_id: `vocab_${id}_01`,
          scene_id: id,
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
          vocab_id: `vocab_${id}_02`,
          scene_id: id,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
}

export default async function SceneDetail({ params }: { params: { id: string } }) {
  const { id } = params
  // 获取场景详情
  const scene = await getSceneById(id)
  // 从场景数据中提取对话回合
  const dialogueRounds = scene.dialogue.rounds
  // 从场景数据中提取词汇
  const vocabulary = scene.vocabulary
  // 从场景数据中提取解析（从对话回合中）
  const dialogueAnalysis = dialogueRounds.map(round => round.analysis)
  
  // 计算学习时间（模拟）
  const learningTime = '10分钟'
  
  return (
    <div id="scene-detail-content" className="pb-20">
      {/* 顶部导航栏 */}
      <header id="top-header" className="bg-white px-6 py-4 shadow-sm sticky top-0 z-30">
        <div id="header-content" className="flex items-center justify-between">
          {/* 返回按钮 */}
          <Link 
            href="/scene-list" 
            id="back-btn" 
            className="w-10 h-10 flex items-center justify-center"
          >
            <i className="fas fa-arrow-left text-text-primary text-lg"></i>
          </Link>
          
          {/* 页面标题 */}
          <h1 id="page-title" className="text-lg font-semibold text-text-primary">{scene.name}</h1>
          
          {/* 分享按钮 */}
          <button id="share-btn" className="w-10 h-10 flex items-center justify-center">
            <i className="fas fa-share-alt text-text-primary text-lg"></i>
          </button>
        </div>
      </header>

      {/* 场景信息 */}
      <div id="scene-info" className="mx-6 mt-4">
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full">{scene.category}</span>
              <span className="px-3 py-1 bg-green-50 text-green-600 text-sm rounded-full">{scene.difficulty}</span>
              <span className="px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-full">{learningTime}</span>
            </div>
            <button id="play-all-btn" className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-medium">
              <i className="fas fa-play"></i>
              <span>播放全部</span>
            </button>
          </div>
          <p className="text-sm text-text-secondary">{scene.description}</p>
        </div>
      </div>

      {/* 对话内容 */}
      <div id="dialogue-content" className="mx-6 mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">对话学习</h2>
        
        <div className="bg-white rounded-card shadow-card p-6">
          <div className="space-y-6">
            {/* 对话回合 */}
            {dialogueRounds.map((round, turnIndex) => (
              <div key={round.round_number} id={`dialogue-turn-${round.round_number}`} className="space-y-3">
                <h3 className="text-sm font-medium text-text-secondary mb-2">回合 {round.round_number}</h3>
                {round.content.map((dialogue, index) => (
                  <div key={dialogue.index} className={`flex flex-col ${dialogue.speaker === 'waiter' || dialogue.speaker === 'A' || dialogue.speaker === 'agent' ? 'space-y-2' : 'items-end space-y-2'}`}>
                    <div 
                      className={`p-4 max-w-[80%] ${dialogue.speaker === 'waiter' || dialogue.speaker === 'A' || dialogue.speaker === 'agent' ? 'align-self-start' : 'align-self-end'}`}
                      style={{
                        backgroundColor: dialogue.speaker === 'waiter' || dialogue.speaker === 'A' || dialogue.speaker === 'agent' ? '#f3f4f6' : '#2563eb',
                        borderRadius: dialogue.speaker === 'waiter' || dialogue.speaker === 'A' || dialogue.speaker === 'agent' ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                        color: dialogue.speaker === 'waiter' || dialogue.speaker === 'A' || dialogue.speaker === 'agent' ? '#1f2937' : 'white'
                      }}
                    >
                      <p className="text-sm">{dialogue.text}</p>
                    </div>
                    <div className={`flex items-center ${dialogue.speaker === 'waiter' || dialogue.speaker === 'A' || dialogue.speaker === 'agent' ? 'space-x-2' : 'flex-row-reverse space-x-2'}`}>
                      {dialogue.speaker === 'waiter' || dialogue.speaker === 'A' || dialogue.speaker === 'agent' && (
                        <span className="text-xs text-text-secondary">{dialogue.speaker_name}: {dialogue.translation}</span>
                      )}
                      <button id={`play-turn-${round.round_number}-${index + 1}`} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-play text-gray-600 text-xs"></i>
                      </button>
                      {dialogue.speaker === 'customer' || dialogue.speaker === 'B' || dialogue.speaker === 'passenger' && (
                        <span className="text-xs text-text-secondary">{dialogue.speaker_name}: {dialogue.translation}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 对话解析 */}
      <div id="dialogue-analysis" className="mx-6 mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">对话解析</h2>
        
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="space-y-4">
            {dialogueAnalysis.map((analysis, index) => (
              <div key={index} id={`analysis-${index + 1}`}>
                <p className="text-sm text-text-secondary mb-3">{analysis.analysis_detail}</p>
                
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-text-primary mb-1">标准回答: {analysis.standard_answer.text}</p>
                    <p className="text-xs text-text-secondary">{analysis.standard_answer.translation}</p>
                    <p className="text-xs text-text-secondary mt-1">适用场景：{analysis.standard_answer.scenario}</p>
                    <p className="text-xs text-text-secondary mt-1">正式程度：{analysis.standard_answer.formality}</p>
                  </div>
                  
                  {analysis.alternative_answers.map((answer, answerIndex) => (
                    <div key={answer.answer_id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-text-primary mb-1">备选回答{answerIndex + 1}: {answer.text}</p>
                      <p className="text-xs text-text-secondary">{answer.translation}</p>
                      <p className="text-xs text-text-secondary mt-1">适用场景：{answer.scenario}</p>
                      <p className="text-xs text-text-secondary mt-1">正式程度：{answer.formality}</p>
                    </div>
                  ))}
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-text-primary mb-1">使用说明</p>
                    <p className="text-xs text-text-secondary">{analysis.usage_notes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 高频单词/短语 */}
      <div id="high-frequency-words" className="mx-6 mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">高频词汇</h2>
        
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="space-y-4">
            {vocabulary.map((vocab, index) => (
              <div key={vocab.vocab_id} id={`word-${index + 1}`} className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-1">{vocab.content} <span className="text-xs text-text-secondary">({vocab.type === 'word' ? '单词' : '短语'})</span></h3>
                  <p className="text-sm text-text-secondary mb-1">{vocab.phonetic} {vocab.translation}</p>
                  <p className="text-xs text-text-secondary">原句: {vocab.example_sentence}</p>
                  <p className="text-xs text-text-secondary">翻译: {vocab.example_translation}</p>
                </div>
                <button id={`play-word-${index + 1}`} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-play text-gray-600 text-xs"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 开始测试按钮 */}
      <div id="test-button" className="mx-6 mt-8 mb-20">
        <Link 
          href={`/scene-test/${scene.id}`} 
          id="start-test-btn" 
          className="block w-full py-4 bg-primary text-white rounded-card text-lg font-semibold shadow-card text-center"
        >
          开始测试
        </Link>
      </div>

      {/* 底部导航栏 */}
      <nav id="bottom-nav" className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light flex justify-around items-center h-16 px-2 safe-bottom z-40">
        <Link id="nav-home" href="/" className="flex flex-col items-center p-2 text-text-secondary">
          <i className="fas fa-home text-xl"></i>
          <span className="text-xs mt-0.5">首页</span>
        </Link>
        <Link id="nav-library" href="/phrase-library" className="flex flex-col items-center p-2 text-text-secondary">
          <i className="fas fa-book text-xl"></i>
          <span className="text-xs mt-0.5">短语库</span>
        </Link>
        <Link id="nav-scene" href="/scene-list" className="flex flex-col items-center p-2 text-primary">
          <i className="fas fa-map-marker-alt text-xl"></i>
          <span className="text-xs mt-0.5 font-medium">场景学习</span>
        </Link>
        <Link id="nav-profile" href="#" className="flex flex-col items-center p-2 text-text-secondary">
          <i className="fas fa-user text-xl"></i>
          <span className="text-xs mt-0.5">我的</span>
        </Link>
      </nav>
    </div>
  )
}