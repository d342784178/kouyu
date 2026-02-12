import Link from 'next/link'

// 定义场景类型
interface Scene {
  id: string
  name: string
  category: string
  description: string
  difficulty: string
  coverImage: string | null
  createdAt: string
  updatedAt: string
}

// 定义对话类型
interface Dialogue {
  id: string
  sceneId: string
  speaker: string
  content: string
  translation: string
  audioUrl: string | null
  order: number
  createdAt: string
  updatedAt: string
}

// 定义对话解析类型
interface DialogueAnalysis {
  id: string
  phrase: string
  explanation: string
  answers: {
    text: string
    translation: string
    scenario: string
  }[]
}

// 定义高频单词类型
interface HighFrequencyWord {
  id: string
  word: string
  pronunciation: string
  meaning: string
  originalSentence: string
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
        category: '日常场景',
        description: '学习日常问候的高频对话，掌握不同场景下的问候方式。',
        difficulty: '入门',
        coverImage: 'https://via.placeholder.com/400x200',
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
      category: '日常场景',
      description: '学习日常问候的高频对话，掌握不同场景下的问候方式。',
      difficulty: '入门',
      coverImage: 'https://via.placeholder.com/400x200',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }
}

// 获取场景对话的辅助函数
async function getSceneDialogues(sceneId: string): Promise<Dialogue[]> {
  try {
    // 在服务器组件中，使用当前URL或环境变量构建绝对URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000' // 开发环境默认URL
    
    // 调用API获取场景对话（禁用缓存以确保获取最新数据）
    const response = await fetch(`${baseUrl}/api/scenes/${sceneId}/dialogues`, { cache: 'no-store' })
    
    let dialogues: Dialogue[] = []
    
    if (response.ok) {
      dialogues = await response.json()
    } else {
      // 如果API调用失败，返回模拟数据
      dialogues = [
        {
          id: 'dialogue_1',
          sceneId: sceneId,
          speaker: 'A',
          content: 'Hello! How are you today?',
          translation: '你好！你今天怎么样？',
          audioUrl: null,
          order: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'dialogue_2',
          sceneId: sceneId,
          speaker: 'B',
          content: 'I\'m doing great, thanks! How about you?',
          translation: '我很好，谢谢！你呢？',
          audioUrl: null,
          order: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'dialogue_3',
          sceneId: sceneId,
          speaker: 'A',
          content: 'I\'m good too. It\'s nice to see you!',
          translation: '我也很好。很高兴见到你！',
          audioUrl: null,
          order: 3,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'dialogue_4',
          sceneId: sceneId,
          speaker: 'B',
          content: 'Nice to see you too! How have you been?',
          translation: '我也很高兴见到你！你最近怎么样？',
          audioUrl: null,
          order: 4,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    }
    
    // 按顺序排序对话
    return dialogues.sort((a, b) => a.order - b.order)
  } catch (error) {
    console.error(`Error fetching dialogues for scene ${sceneId}:`, error)
    // 返回模拟数据
    return [
      {
        id: 'dialogue_1',
        sceneId: sceneId,
        speaker: 'A',
        content: 'Hello! How are you today?',
        translation: '你好！你今天怎么样？',
        audioUrl: null,
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'dialogue_2',
        sceneId: sceneId,
        speaker: 'B',
        content: 'I\'m doing great, thanks! How about you?',
        translation: '我很好，谢谢！你呢？',
        audioUrl: null,
        order: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'dialogue_3',
        sceneId: sceneId,
        speaker: 'A',
        content: 'I\'m good too. It\'s nice to see you!',
        translation: '我也很好。很高兴见到你！',
        audioUrl: null,
        order: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'dialogue_4',
        sceneId: sceneId,
        speaker: 'B',
        content: 'Nice to see you too! How have you been?',
        translation: '我也很高兴见到你！你最近怎么样？',
        audioUrl: null,
        order: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }
}

// 获取对话解析的辅助函数
async function getDialogueAnalysis(): Promise<DialogueAnalysis[]> {
  // 返回模拟数据
  return [
    {
      id: 'analysis_1',
      phrase: 'How are you today?',
      explanation: '这是一个常见的问候语，用于询问对方当天的状态。',
      answers: [
        {
          text: 'I\'m doing great, thanks!',
          translation: '我很好，谢谢！',
          scenario: '当你状态非常好时使用。'
        },
        {
          text: 'I\'m okay, thanks for asking.',
          translation: '我还可以，谢谢你的关心。',
          scenario: '当你状态一般时使用。'
        },
        {
          text: 'Not bad, how about you?',
          translation: '还不错，你呢？',
          scenario: '当你状态还可以，同时反问对方时使用。'
        }
      ]
    }
  ]
}

// 获取高频单词的辅助函数
async function getHighFrequencyWords(): Promise<HighFrequencyWord[]> {
  // 返回模拟数据
  return [
    {
      id: 'word_1',
      word: 'hello',
      pronunciation: '[həˈləʊ]',
      meaning: '你好',
      originalSentence: 'Hello! How are you today?'
    },
    {
      id: 'word_2',
      word: 'thanks',
      pronunciation: '[θæŋks]',
      meaning: '谢谢',
      originalSentence: 'I\'m doing great, thanks!'
    },
    {
      id: 'word_3',
      word: 'nice',
      pronunciation: '[naɪs]',
      meaning: '高兴的，愉快的',
      originalSentence: 'It\'s nice to see you!'
    }
  ]
}

export default async function SceneDetail({ params }: { params: { id: string } }) {
  const { id } = params
  // 获取场景详情
  const scene = await getSceneById(id)
  // 获取场景对话
  const dialogues = await getSceneDialogues(id)
  // 获取对话解析
  const dialogueAnalysis = await getDialogueAnalysis()
  // 获取高频单词
  const highFrequencyWords = await getHighFrequencyWords()
  
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
            {Array.from({ length: Math.ceil(dialogues.length / 2) }).map((_, turnIndex) => {
              const turnDialogues = dialogues.slice(turnIndex * 2, turnIndex * 2 + 2);
              return (
                <div key={turnIndex} id={`dialogue-turn-${turnIndex + 1}`} className="space-y-3">
                  {turnDialogues.map((dialogue, index) => (
                    <div key={dialogue.id} className={`flex flex-col ${dialogue.speaker === 'A' ? 'space-y-2' : 'items-end space-y-2'}`}>
                      <div 
                        className={`p-4 max-w-[80%] ${dialogue.speaker === 'A' ? 'align-self-start' : 'align-self-end'}`}
                        style={{
                          backgroundColor: dialogue.speaker === 'A' ? '#f3f4f6' : '#2563eb',
                          borderRadius: dialogue.speaker === 'A' ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                          color: dialogue.speaker === 'A' ? '#1f2937' : 'white'
                        }}
                      >
                        <p className="text-sm">{dialogue.content}</p>
                      </div>
                      <div className={`flex items-center ${dialogue.speaker === 'A' ? 'space-x-2' : 'flex-row-reverse space-x-2'}`}>
                        {dialogue.speaker === 'A' && (
                          <span className="text-xs text-text-secondary">{dialogue.speaker}: {dialogue.translation}</span>
                        )}
                        <button id={`play-turn-${turnIndex + 1}${dialogue.speaker === 'B' ? '-response' : ''}`} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-play text-gray-600 text-xs"></i>
                        </button>
                        {dialogue.speaker === 'B' && (
                          <span className="text-xs text-text-secondary">{dialogue.speaker}: {dialogue.translation}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 对话解析 */}
      <div id="dialogue-analysis" className="mx-6 mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">对话解析</h2>
        
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="space-y-4">
            {dialogueAnalysis.map((analysis, index) => (
              <div key={analysis.id} id={`analysis-${index + 1}`}>
                <h3 className="text-base font-semibold text-text-primary mb-2">{analysis.phrase}</h3>
                <p className="text-sm text-text-secondary mb-3">{analysis.explanation}</p>
                
                <div className="space-y-3">
                  {analysis.answers.map((answer, answerIndex) => (
                    <div key={answerIndex} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-text-primary mb-1">回答{answerIndex + 1}: {answer.text}</p>
                      <p className="text-xs text-text-secondary">{answer.translation}</p>
                      <p className="text-xs text-text-secondary mt-1">适用场景：{answer.scenario}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 高频单词 */}
      <div id="high-frequency-words" className="mx-6 mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">高频单词</h2>
        
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="space-y-4">
            {highFrequencyWords.map((word, index) => (
              <div key={word.id} id={`word-${index + 1}`} className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary mb-1">{word.word}</h3>
                  <p className="text-sm text-text-secondary mb-1">{word.pronunciation} {word.meaning}</p>
                  <p className="text-xs text-text-secondary">原句: {word.originalSentence}</p>
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