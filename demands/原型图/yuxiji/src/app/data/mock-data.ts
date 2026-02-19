import { Phrase, Scene, SceneTest, UserProgress } from '../types';

// 用户进度数据
export const mockUserProgress: UserProgress = {
  todayLearned: 12,
  todayMinutes: 25,
  consecutiveDays: 7,
  reviewCount: 8,
  totalLearned: 156,
};

// 短语数据
export const mockPhrases: Phrase[] = [
  {
    id: 'p1',
    english: 'How are you doing?',
    chinese: '你好吗？',
    partOfSpeech: '问候语',
    scene: 'daily_greeting',
    difficulty: 'beginner',
    pronunciationTips: '注意 doing 的发音，/ˈduːɪŋ/',
    audioUrl: null,
    phonetic: '/haʊ ɑːr juː ˈduːɪŋ/',
  },
  {
    id: 'p2',
    english: "I'm doing great, thanks!",
    chinese: '我很好，谢谢！',
    partOfSpeech: '回答语',
    scene: 'daily_greeting',
    difficulty: 'beginner',
    pronunciationTips: "注意 I'm 的连读",
    audioUrl: null,
    phonetic: '/aɪm ˈduːɪŋ ɡreɪt θæŋks/',
  },
  {
    id: 'p3',
    english: 'How much does this cost?',
    chinese: '这个多少钱？',
    partOfSpeech: '疑问句',
    scene: 'shopping',
    difficulty: 'beginner',
    pronunciationTips: '注意 does 的弱读',
    audioUrl: null,
    phonetic: '/haʊ mʌtʃ dʌz ðɪs kɒst/',
  },
  {
    id: 'p4',
    english: 'Can I get a discount?',
    chinese: '可以打折吗？',
    partOfSpeech: '疑问句',
    scene: 'shopping',
    difficulty: 'intermediate',
    pronunciationTips: '注意 discount 重音在第一音节',
    audioUrl: null,
    phonetic: '/kæn aɪ ɡet ə ˈdɪskaʊnt/',
  },
  {
    id: 'p5',
    english: "I'd like to order, please",
    chinese: '我想点餐',
    partOfSpeech: '陈述句',
    scene: 'dining',
    difficulty: 'beginner',
    pronunciationTips: "I'd like 连读要流畅",
    audioUrl: null,
    phonetic: '/aɪd laɪk tuː ˈɔːrdər pliːz/',
  },
  {
    id: 'p6',
    english: 'Could I have the menu?',
    chinese: '能给我看看菜单吗？',
    partOfSpeech: '疑问句',
    scene: 'dining',
    difficulty: 'beginner',
    pronunciationTips: '注意 Could I 的连读',
    audioUrl: null,
    phonetic: '/kʊd aɪ hæv ðə ˈmenjuː/',
  },
  {
    id: 'p7',
    english: 'Where is the nearest subway station?',
    chinese: '最近的地铁站在哪里？',
    partOfSpeech: '疑问句',
    scene: 'travel',
    difficulty: 'intermediate',
    pronunciationTips: '注意 nearest 的发音',
    audioUrl: null,
    phonetic: '/weər ɪz ðə ˈnɪrɪst ˈsʌbweɪ ˈsteɪʃən/',
  },
  {
    id: 'p8',
    english: 'How do I get to the airport?',
    chinese: '我怎么去机场？',
    partOfSpeech: '疑问句',
    scene: 'travel',
    difficulty: 'beginner',
    pronunciationTips: '注意 do I 的连读',
    audioUrl: null,
    phonetic: '/haʊ duː aɪ ɡet tuː ðə ˈeərpɔːrt/',
  },
];

// 场景数据
export const mockScenes: Scene[] = [
  {
    id: 's1',
    name: '初次见面',
    category: 'daily_greeting',
    description: '学习如何用英语进行自我介绍和初次见面的基本对话',
    difficulty: 'beginner',
    duration: 10,
    dialogue: {
      full_audio_url: '',
      duration: 45,
      rounds: [
        {
          round_number: 1,
          content: [
            {
              speaker: 'Tom',
              text: 'Hi! Nice to meet you.',
              translation: '嗨！很高兴见到你。',
            },
            {
              speaker: 'Lisa',
              text: 'Nice to meet you too! How are you doing?',
              translation: '我也很高兴见到你！你好吗？',
            },
          ],
        },
        {
          round_number: 2,
          content: [
            {
              speaker: 'Tom',
              text: "I'm doing great, thanks! What's your name?",
              translation: '我很好，谢谢！你叫什么名字？',
            },
            {
              speaker: 'Lisa',
              text: "I'm Lisa. And you?",
              translation: '我叫Lisa。你呢？',
            },
          ],
          analysis: {
            question: "What's your name?",
            answer: "I'm Lisa.",
            alternatives: [
              "My name is Lisa.",
              "You can call me Lisa.",
              "I'm Lisa Smith.",
            ],
            explanation: '询问姓名时，可以用多种方式回答。最简洁的是 "I\'m + 名字"，正式场合可以说 "My name is..."',
          },
        },
        {
          round_number: 3,
          content: [
            {
              speaker: 'Tom',
              text: "I'm Tom. Where are you from?",
              translation: '我叫Tom。你来自哪里？',
            },
            {
              speaker: 'Lisa',
              text: "I'm from Beijing. How about you?",
              translation: '我来自北京。你呢？',
            },
          ],
          analysis: {
            question: 'Where are you from?',
            answer: "I'm from Beijing.",
            alternatives: [
              "I come from Beijing.",
              "I'm from China, Beijing to be specific.",
            ],
            explanation: '回答来自哪里用 "I\'m from + 地点" 最常见，也可以用 "I come from..."',
          },
        },
      ],
    },
    vocabulary: [
      {
        word: 'meet',
        phonetic: '/miːt/',
        meaning: 'v. 遇见，见面',
        example: 'Nice to meet you.',
      },
      {
        word: 'doing',
        phonetic: '/ˈduːɪŋ/',
        meaning: 'v. 做（现在分词）',
        example: 'How are you doing?',
      },
      {
        word: 'name',
        phonetic: '/neɪm/',
        meaning: 'n. 名字',
        example: "What's your name?",
      },
      {
        word: 'from',
        phonetic: '/frɒm/',
        meaning: 'prep. 来自',
        example: 'Where are you from?',
      },
    ],
  },
  {
    id: 's2',
    name: '超市购物',
    category: 'shopping',
    description: '学习在超市购物时的常用英语表达',
    difficulty: 'beginner',
    duration: 12,
    dialogue: {
      full_audio_url: '',
      duration: 60,
      rounds: [
        {
          round_number: 1,
          content: [
            {
              speaker: 'Customer',
              text: 'Excuse me, where can I find the milk?',
              translation: '打扰一下，我在哪里能找到牛奶？',
            },
            {
              speaker: 'Staff',
              text: "It's in aisle 3, on the left.",
              translation: '在第3通道，左边。',
            },
          ],
        },
        {
          round_number: 2,
          content: [
            {
              speaker: 'Customer',
              text: 'Thank you! And how much does this bread cost?',
              translation: '谢谢！这个面包多少钱？',
            },
            {
              speaker: 'Staff',
              text: "It's $2.99.",
              translation: '2.99美元。',
            },
          ],
          analysis: {
            question: 'How much does this cost?',
            answer: "It's $2.99.",
            alternatives: [
              "That's $2.99.",
              "It costs $2.99.",
              "$2.99.",
            ],
            explanation: '询问价格时，回答可以用 "It\'s + 价格" 或 "It costs + 价格"',
          },
        },
      ],
    },
    vocabulary: [
      {
        word: 'excuse',
        phonetic: '/ɪkˈskjuːz/',
        meaning: 'v. 原谅，打扰',
        example: 'Excuse me.',
      },
      {
        word: 'aisle',
        phonetic: '/aɪl/',
        meaning: 'n. 通道，走道',
        example: "It's in aisle 3.",
      },
      {
        word: 'cost',
        phonetic: '/kɒst/',
        meaning: 'v. 花费，价值',
        example: 'How much does it cost?',
      },
    ],
  },
  {
    id: 's3',
    name: '餐厅点餐',
    category: 'dining',
    description: '学习在餐厅点餐的完整流程和常用表达',
    difficulty: 'intermediate',
    duration: 15,
    dialogue: {
      full_audio_url: '',
      duration: 90,
      rounds: [
        {
          round_number: 1,
          content: [
            {
              speaker: 'Waiter',
              text: 'Good evening! Are you ready to order?',
              translation: '晚上好！准备好点餐了吗？',
            },
            {
              speaker: 'Customer',
              text: 'Yes, could I have the menu first?',
              translation: '是的，我能先看看菜单吗？',
            },
          ],
        },
        {
          round_number: 2,
          content: [
            {
              speaker: 'Waiter',
              text: 'Of course! Here you go.',
              translation: '当然！给您。',
            },
            {
              speaker: 'Customer',
              text: "I'd like the chicken pasta, please.",
              translation: '我想要鸡肉意大利面，谢谢。',
            },
          ],
          analysis: {
            question: 'What would you like to order?',
            answer: "I'd like the chicken pasta.",
            alternatives: [
              "I'll have the chicken pasta.",
              "Can I get the chicken pasta?",
              "The chicken pasta, please.",
            ],
            explanation: '点餐时最礼貌的说法是 "I\'d like..."，也可以用 "I\'ll have..." 或 "Can I get..."',
          },
        },
      ],
    },
    vocabulary: [
      {
        word: 'order',
        phonetic: '/ˈɔːrdər/',
        meaning: 'v. 点餐，订购',
        example: 'Are you ready to order?',
      },
      {
        word: 'menu',
        phonetic: '/ˈmenjuː/',
        meaning: 'n. 菜单',
        example: 'Could I have the menu?',
      },
      {
        word: 'pasta',
        phonetic: '/ˈpæstə/',
        meaning: 'n. 意大利面',
        example: 'I\'d like the pasta.',
      },
    ],
  },
  {
    id: 's4',
    name: '问路指路',
    category: 'travel',
    description: '学习如何用英语问路和指路',
    difficulty: 'intermediate',
    duration: 12,
    dialogue: {
      full_audio_url: '',
      duration: 75,
      rounds: [
        {
          round_number: 1,
          content: [
            {
              speaker: 'Tourist',
              text: 'Excuse me, how do I get to the train station?',
              translation: '打扰一下，我怎么去火车站？',
            },
            {
              speaker: 'Local',
              text: 'Go straight ahead and turn left at the second traffic light.',
              translation: '直走，然后在第二个红绿灯左转。',
            },
          ],
        },
        {
          round_number: 2,
          content: [
            {
              speaker: 'Tourist',
              text: 'How long will it take to walk there?',
              translation: '走路去那里要多久？',
            },
            {
              speaker: 'Local',
              text: 'About 10 minutes.',
              translation: '大约10分钟。',
            },
          ],
        },
      ],
    },
    vocabulary: [
      {
        word: 'straight',
        phonetic: '/streɪt/',
        meaning: 'adv. 直接地',
        example: 'Go straight ahead.',
      },
      {
        word: 'turn',
        phonetic: '/tɜːrn/',
        meaning: 'v. 转弯',
        example: 'Turn left.',
      },
      {
        word: 'traffic light',
        phonetic: '/ˈtræfɪk laɪt/',
        meaning: 'n. 红绿灯',
        example: 'Turn at the traffic light.',
      },
    ],
  },
];

// 测试题数据
export const mockTests: SceneTest[] = [
  // 初次见面的测试题
  {
    id: 't1',
    sceneId: 's1',
    type: 'choice',
    order: 1,
    content: {
      question: '当别人问你 "How are you doing?" 时，你应该如何回答？',
      options: [
        "I'm doing great, thanks!",
        "I'm fine, thank you!",
        "Pretty good!",
        "All of the above",
      ],
      answer: "All of the above",
      explanation: '所有这些回答都是正确的。在英语中，回答 "How are you doing?" 有多种方式，都表示"我很好"。',
    },
  },
  {
    id: 't2',
    sceneId: 's1',
    type: 'fill_blank',
    order: 2,
    content: {
      question: '请填空：Nice to ____ you!',
      answer: 'meet',
      context: 'Nice to meet you! 是初次见面时的标准问候语。',
      explanation: '"meet" 表示见面、遇见。"Nice to meet you" 是初次见面时最常用的问候语。',
    },
  },
  {
    id: 't3',
    sceneId: 's1',
    type: 'qa',
    order: 3,
    content: {
      question: '如果有人问你 "Where are you from?"，你会怎么回答？（假设你来自上海）',
      answer: "I'm from Shanghai.",
      explanation: '回答来自哪里，最常用的句型是 "I\'m from + 地点"。',
    },
  },
  {
    id: 't4',
    sceneId: 's1',
    type: 'open',
    order: 4,
    content: {
      question: '场景：你在咖啡厅遇到一个外国朋友，请用英语和TA进行一段自我介绍的对话。',
      answer: '',
      context: '这是一个开放式对话练习，AI 将扮演外国朋友，与你进行真实对话。',
    },
  },
  // 超市购物的测试题
  {
    id: 't5',
    sceneId: 's2',
    type: 'choice',
    order: 1,
    content: {
      question: '在超市购物时，如果想问某个商品的价格，应该怎么说？',
      options: [
        'How much does this cost?',
        'What is the price?',
        'How much is it?',
        'All of the above',
      ],
      answer: 'All of the above',
      explanation: '这些表达都可以用来询问价格，都是正确的。',
    },
  },
  {
    id: 't6',
    sceneId: 's2',
    type: 'fill_blank',
    order: 2,
    content: {
      question: '请填空：Excuse me, where can I ____ the milk?',
      answer: 'find',
      explanation: '"find" 表示找到、发现。询问某物在哪里时，常用 "Where can I find...?"',
    },
  },
];

// 场景分类
export const sceneCategories = [
  { id: 'all', name: '全部', icon: '🌟' },
  { id: 'daily_greeting', name: '日常问候', icon: '👋' },
  { id: 'shopping', name: '购物消费', icon: '🛒' },
  { id: 'dining', name: '餐饮服务', icon: '🍽️' },
  { id: 'travel', name: '旅行出行', icon: '✈️' },
];

// 难度标签配置
export const difficultyConfig = {
  beginner: { label: '入门', color: 'bg-green-100 text-green-700' },
  intermediate: { label: '进阶', color: 'bg-blue-100 text-blue-700' },
  advanced: { label: '高级', color: 'bg-purple-100 text-purple-700' },
};

// 场景分类配置
export const categoryConfig: Record<string, { label: string; color: string }> = {
  daily_greeting: { label: '日常问候', color: 'bg-amber-100 text-amber-700' },
  shopping: { label: '购物消费', color: 'bg-pink-100 text-pink-700' },
  dining: { label: '餐饮服务', color: 'bg-orange-100 text-orange-700' },
  travel: { label: '旅行出行', color: 'bg-cyan-100 text-cyan-700' },
};
