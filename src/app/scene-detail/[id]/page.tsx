'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import DialogueContent from './components/DialogueContent'
import VocabularyContent from './components/VocabularyContent'
import PlayAllButton from './components/PlayAllButton'

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

export default function SceneDetail() {
  const params = useParams<{ id: string }>()
  const id = params.id || ''
  
  const [scene, setScene] = useState<Scene | null>(null)
  const [dialogueRounds, setDialogueRounds] = useState<DialogueRound[]>([])
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([])
  const [dialogueAnalysis, setDialogueAnalysis] = useState<QAAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedAnalysis, setExpandedAnalysis] = useState<number[]>([])

  // 获取场景详情的函数
  const getSceneById = async (id: string): Promise<Scene> => {
    try {
      // 在客户端组件中，直接使用相对路径
      const response = await fetch(`/api/scenes/${id}`)
      
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

  // 切换解析卡片的展开/折叠状态
  const toggleAnalysis = (index: number) => {
    setExpandedAnalysis(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index)
      } else {
        return [...prev, index]
      }
    })
  }

  // 在组件挂载时获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const sceneData = await getSceneById(id)
        setScene(sceneData)
        
        // 从场景数据中提取对话回合
        // 注意：audio_url 应该是相对路径格式如 "COS:/scene/dialogues/xxx.mp3"
        // 如果 audio_url 不存在或为空字符串，保留空值（前端会显示"暂不支持音频播放"）
        const rounds = sceneData.dialogue.rounds.map(round => ({
          ...round,
          content: round.content.map(dialogue => ({
            ...dialogue,
            audio_url: dialogue.audio_url && dialogue.audio_url.trim() !== '' ? dialogue.audio_url : ''
          }))
        }))
        setDialogueRounds(rounds)
        
        // 从场景数据中提取词汇
        const vocab = sceneData.vocabulary.map(vocab => ({
          ...vocab,
          audio_url: vocab.audio_url && vocab.audio_url.trim() !== '' ? vocab.audio_url : ''
        }))
        setVocabulary(vocab)
        
        // 从场景数据中提取解析（从对话回合中）
        const analysis = rounds.map(round => round.analysis)
        setDialogueAnalysis(analysis)
        
        // 默认展开第一个解析
        if (analysis.length > 0) {
          setExpandedAnalysis([0])
        }
      } catch (error) {
        console.error('Error fetching scene data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])
  
  // 计算学习时间（模拟）
  const learningTime = '10分钟'
  
  // 如果场景数据未加载，显示加载状态
  if (!scene) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-text-primary">加载中...</div>
      </div>
    )
  }
  
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
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full whitespace-nowrap">{scene.category}</span>
              <span className="px-3 py-1 bg-green-50 text-green-600 text-sm rounded-full whitespace-nowrap">{scene.difficulty}</span>
              <span className="px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-full whitespace-nowrap">{learningTime}</span>
            </div>
            <div className="flex-shrink-0">
              <PlayAllButton rounds={dialogueRounds} />
            </div>
          </div>
          <p className="text-sm text-text-secondary">{scene.description}</p>
        </div>
      </div>

      {/* 对话内容 */}
      <div id="dialogue-content" className="mx-6 mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">对话学习</h2>
        
        <div className="bg-white rounded-card shadow-card p-6">
          <DialogueContent rounds={dialogueRounds} />
        </div>
      </div>

      {/* 对话解析 */}
      <div id="dialogue-analysis" className="mx-6 mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">对话解析</h2>
        
        <div className="space-y-6">
          {dialogueAnalysis.map((analysis, index) => {
            const isExpanded = expandedAnalysis.includes(index)
            return (
              <div key={index} id={`analysis-${index + 1}`} className="bg-white rounded-card shadow-card overflow-hidden">
                {/* 解析头部 - 可点击展开/折叠 */}
                <div 
                  className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer transition-colors hover:from-blue-100 hover:to-indigo-100"
                  onClick={() => toggleAnalysis(index)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-text-primary">解析 #{index + 1}</h3>
                      <button className="text-primary transition-transform">
                        <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        标准回答: {analysis.standard_answer.text.substring(0, 20)}{analysis.standard_answer.text.length > 20 ? '...' : ''}
                      </span>
                      {analysis.alternative_answers.length > 0 && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          备选回答: {analysis.alternative_answers.length}个
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {analysis.analysis_detail.substring(0, 80)}{analysis.analysis_detail.length > 80 ? '...' : ''}
                    </p>
                  </div>
                </div>
                
                {/* 解析内容 */}
                {isExpanded && (
                  <div className="p-4 space-y-4 animate-fadeIn">
                    {/* 分析详情 */}
                    <div className="analysis-detail">
                      <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center">
                        <i className="fas fa-info-circle text-blue-500 mr-2"></i>
                        分析详情
                      </h4>
                      <p className="text-sm text-text-secondary ml-6">{analysis.analysis_detail}</p>
                    </div>
                    
                    {/* 标准回答 */}
                    <div className="standard-answer">
                      <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center">
                        <i className="fas fa-check-circle text-green-500 mr-2"></i>
                        标准回答
                      </h4>
                      <div className="ml-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-text-primary mb-1">{analysis.standard_answer.text}</p>
                            <p className="text-xs text-text-secondary mb-2">{analysis.standard_answer.translation}</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                场景: {analysis.standard_answer.scenario}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                正式度: {analysis.standard_answer.formality}
                              </span>
                            </div>
                          </div>
                          {analysis.standard_answer.audio_url && (
                            <button className="ml-3 text-primary flex-shrink-0">
                              <i className="fas fa-play-circle text-xl"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 备选回答 */}
                    {analysis.alternative_answers.length > 0 && (
                      <div className="alternative-answers">
                        <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center">
                          <i className="fas fa-list-alt text-purple-500 mr-2"></i>
                          备选回答
                        </h4>
                        <div className="ml-6 space-y-3">
                          {analysis.alternative_answers.map((answer, answerIndex) => (
                            <div key={answer.answer_id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="flex items-start">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-text-primary mb-1">
                                    回答 {answerIndex + 1}: {answer.text}
                                  </p>
                                  <p className="text-xs text-text-secondary mb-2">{answer.translation}</p>
                                  <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                      场景: {answer.scenario}
                                    </span>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                      正式度: {answer.formality}
                                    </span>
                                  </div>
                                </div>
                                {answer.audio_url && (
                                  <button className="ml-3 text-primary flex-shrink-0">
                                    <i className="fas fa-play-circle text-xl"></i>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* 使用说明 */}
                    <div className="usage-notes">
                      <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center">
                        <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
                        使用说明
                      </h4>
                      <div className="ml-6 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                        <p className="text-sm text-text-secondary">{analysis.usage_notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 高频单词/短语 */}
      <div id="high-frequency-words" className="mx-6 mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">高频词汇</h2>
        
        <div className="bg-white rounded-card shadow-card p-4">
          <VocabularyContent vocabulary={vocabulary} />
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