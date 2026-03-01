// 测试数据配置
export const TEST_SCENES = {
  daily: {
    id: 'daily_001',
    name: '初次见面',
    category: '日常',
    difficulty: '初级',
  },
  workplace: {
    id: 'workplace_001',
    name: '面试自我介绍',
    category: '职场',
    difficulty: '中级',
  },
  travel: {
    id: 'travel_001',
    name: '机场问路',
    category: '旅行',
    difficulty: '初级',
  },
}

export const CATEGORIES = ['全部', '日常', '职场', '留学', '旅行', '社交']

export const DIFFICULTIES = ['初级', '中级', '高级']

// 测试用户数据
export const TEST_USER = {
  name: '测试用户',
  level: '初级',
}

// API响应模拟数据
export const MOCK_SCENE_DETAIL = {
  id: 'daily_001',
  name: '初次见面',
  category: '日常',
  description: '学习如何用英语进行初次见面的问候和自我介绍',
  difficulty: '初级',
  duration: 10,
  tags: ['问候', '自我介绍', '日常'],
  dialogue: [
    {
      round_number: 1,
      speaker: 'speaker1',
      speaker_name: 'Tom',
      text: 'Hello! Nice to meet you. My name is Tom.',
      translation: '你好！很高兴认识你。我叫汤姆。',
      audio_url: 'COS:/scene/dialogues/daily_001_round1_speaker1.mp3',
      is_key_qa: true,
    },
    {
      round_number: 1,
      speaker: 'speaker2',
      speaker_name: 'Lisa',
      text: 'Nice to meet you too, Tom. I\'m Lisa.',
      translation: '我也很高兴认识你，汤姆。我是丽莎。',
      audio_url: 'COS:/scene/dialogues/daily_001_round1_speaker2.mp3',
      is_key_qa: false,
    },
  ],
  vocabulary: [
    {
      vocab_id: 'daily_001_vocab_01',
      type: 'word',
      content: 'Nice to meet you',
      phonetic: '/naɪs tuː miːt juː/',
      translation: '很高兴认识你',
      audio_url: 'COS:/scene/vocabulary/daily_001_vocab1_word.mp3',
      example: 'Nice to meet you. I\'m John.',
      example_translation: '很高兴认识你。我是约翰。',
      example_audio_url: 'COS:/scene/vocabulary/daily_001_vocab1_example.mp3',
      round_number: 1,
      difficulty: 'easy',
    },
  ],
}

export const MOCK_TESTS = [
  {
    id: 'test_choice_001',
    sceneId: 'daily_001',
    type: 'choice',
    order: 1,
    content: {
      question: 'What does "Nice to meet you" mean?',
      options: ['很高兴认识你', '再见', '早上好', '谢谢'],
      correct_answer: 0,
      analysis: '"Nice to meet you" 是初次见面时的常用问候语，表示"很高兴认识你"。',
    },
  },
  {
    id: 'test_qa_001',
    sceneId: 'daily_001',
    type: 'qa',
    order: 2,
    content: {
      question: 'How would you introduce yourself to someone new?',
      reference_answers: [
        {
          text: 'Hello, my name is [Your Name]. Nice to meet you.',
          style: 'neutral',
          description: '标准自我介绍方式',
        },
      ],
      analysis: '自我介绍时应包含问候和姓名，保持友好和礼貌。',
    },
  },
]

// 新题型 mock 数据
export const MOCK_FILL_BLANK_TEST = {
  id: 'test_fill_blank_001',
  sceneId: 'daily_001',
  type: 'fill_blank',
  order: 3,
  content: {
    template: "Nice to ___ you. My name ___ Tom.",
    scenarioHint: '初次见面时的自我介绍场景',
    referenceAnswer: 'meet / is',
    keywords: ['meet', 'is', 'name'],
  },
}

export const MOCK_GUIDED_ROLEPLAY_TEST = {
  id: 'test_guided_roleplay_001',
  sceneId: 'daily_001',
  type: 'guided_roleplay',
  order: 4,
  content: {
    situationDescription: '你在一个商务会议上第一次见到新同事，需要进行自我介绍。',
    dialogueGoal: '用英语向新同事介绍自己的姓名和职位',
    keywordHints: ['name', 'position', 'pleased', 'meet'],
    evaluationDimensions: ['意图达成度', '语言自然度', '词汇使用'],
  },
}

export const MOCK_VOCAB_ACTIVATION_TEST = {
  id: 'test_vocab_001',
  sceneId: 'daily_001',
  type: 'vocab_activation',
  order: 5,
  content: {
    chineseHint: '很高兴认识你',
    targetWord: 'pleased',
    partOfSpeech: 'adjective',
    sceneId: 'daily_001',
    exampleSentence: "I'm pleased to meet you.",
    exampleTranslation: '很高兴认识你。',
    phonetic: '/pliːzd/',
  },
}

// 填空题评测 mock 响应
export const MOCK_FILL_BLANK_EVALUATE_RESPONSE = {
  isCorrect: true,
  referenceAnswer: 'meet / is',
  semanticAnalysis: '答案符合场景语境，表达自然流畅。',
  feedback: '很好！这是初次见面的标准表达方式。',
}

// 情景再现评测 mock 响应
export const MOCK_GUIDED_ROLEPLAY_EVALUATE_RESPONSE = {
  intentScore: 85,
  naturalness: '表达自然，符合商务场合语气。',
  vocabularyFeedback: '词汇使用得当，"pleased to meet you" 是地道表达。',
  suggestions: ['可以加上职位信息使介绍更完整', '语调可以更自信一些'],
  referenceExpression: "Hi, I'm Tom. I'm the project manager. Pleased to meet you.",
}

// 测试选择器
export const SELECTORS = {
  // 场景列表页
  sceneList: {
    header: 'h1:has-text("场景学习")',
    searchInput: 'input[placeholder="搜索场景..."]',
    categoryButton: (category: string) => `button:has-text("${category}")`,
    sceneCard: '[class*="rounded-2xl"]:has(h3)',
    sceneTitle: 'h3',
    loadMoreIndicator: 'text=下拉加载更多',
  },
  // 场景详情页
  sceneDetail: {
    backButton: 'a[href="/scene-learning"]',
    sceneName: 'h1',
    difficultyBadge: 'span:has-text("初级"), span:has-text("中级"), span:has-text("高级")',
    dialogueSection: 'h2:has-text("对话学习")',
    vocabularySection: 'h2:has-text("高频词汇")',
    startTestButton: 'a:has-text("开始测试")',
    playAllButton: 'button:has-text("播放全部")',
  },
  // 场景测试页
  sceneTest: {
    progressBar: '[class*="bg-gradient-to-r"]',
    questionType: 'span:has-text("选择题"), span:has-text("问答题")',
    optionButton: (index: number) => `button:has-text("${String.fromCharCode(65 + index)}")`,
    submitButton: 'button:has-text("提交答案")',
    nextButton: 'button:has-text("下一题")',
    backToSceneButton: 'button:has-text("返回场景")',
    resultCard: '[class*="rounded-2xl"]:has-text("回答")',
    // 新题型选择器
    fillBlankInput: 'input[placeholder="填写答案"]',
    fillBlankSubmit: 'button:has-text("提交")',
    fillBlankResult: 'text=/回答正确|回答有误/',
    guidedRoleplayTextarea: 'textarea[placeholder*="英文"]',
    guidedRoleplaySubmit: 'button:has-text("提交")',
    guidedRoleplayScore: 'text=/意图达成度/',
    vocabInput: 'input[placeholder*="英文单词"]',
    vocabSubmit: 'button:has-text("确认")',
    vocabResult: 'text=/回答正确|回答有误|接近正确/',
  },
  // 场景详情页跟读练习
  shadowing: {
    entryButton: 'button:has-text("跟读练习")',
    module: '[class*="ShadowingModule"], text=/跟读练习/',
  },
}
