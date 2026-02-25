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
    pronunciationTips: '注意 doing 的发音，/ˈduːɪŋ/，连读自然流畅',
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
    pronunciationTips: "注意 I'm 的缩写发音，doing 轻读",
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
    pronunciationTips: '注意 does 的弱读 /dəz/，this 结尾 s 清晰发出',
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
    pronunciationTips: '注意 discount 重音在第一音节 /ˈdɪs-/',
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
    pronunciationTips: "I'd like 连读要流畅，like to 中的 t 可轻化",
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
    pronunciationTips: '注意 Could I 的连读，menu 的重音在第一音节',
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
    pronunciationTips: '注意 nearest /ˈnɪrɪst/ 的发音，station 重音在前',
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
    pronunciationTips: '注意 do I 的连读，airport 重音在 air',
    audioUrl: null,
    phonetic: '/haʊ duː aɪ ɡet tuː ðə ˈeərpɔːrt/',
  },
  {
    id: 'p9',
    english: 'Could you speak more slowly, please?',
    chinese: '你能说慢一点吗？',
    partOfSpeech: '请求语',
    scene: 'daily_greeting',
    difficulty: 'beginner',
    pronunciationTips: 'slowly 重音在 slow，尾音轻柔',
    audioUrl: null,
    phonetic: '/kʊd juː spiːk mɔːr ˈsloʊli pliːz/',
  },
  {
    id: 'p10',
    english: "I'll take this one.",
    chinese: '我要这个。',
    partOfSpeech: '陈述句',
    scene: 'shopping',
    difficulty: 'beginner',
    pronunciationTips: "I'll 缩写要自然，take this 中 k 和 th 注意衔接",
    audioUrl: null,
    phonetic: '/aɪl teɪk ðɪs wʌn/',
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
        {
          round_number: 3,
          content: [
            {
              speaker: 'Customer',
              text: 'Can I pay by credit card?',
              translation: '我可以刷信用卡吗？',
            },
            {
              speaker: 'Staff',
              text: 'Of course! We accept all major cards.',
              translation: '当然！我们接受所有主要信用卡。',
            },
          ],
          analysis: {
            question: 'Can I pay by credit card?',
            answer: 'Of course! We accept all major cards.',
            alternatives: [
              "Yes, we take cards.",
              "Sure, card payment is fine.",
            ],
            explanation: '询问支付方式用 "Can I pay by...?" 或 "Do you accept...?"',
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
      {
        word: 'credit card',
        phonetic: '/ˈkredɪt kɑːrd/',
        meaning: 'n. 信用卡',
        example: 'Can I pay by credit card?',
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
        {
          round_number: 3,
          content: [
            {
              speaker: 'Waiter',
              text: 'Anything to drink?',
              translation: '需要喝什么吗？',
            },
            {
              speaker: 'Customer',
              text: 'Just water, please. And could we have the check when you get a chance?',
              translation: '只要水就好。还有，方便的话能给我们账单吗？',
            },
          ],
          analysis: {
            question: 'How do you ask for the check?',
            answer: 'Could we have the check, please?',
            alternatives: [
              "Can I get the bill?",
              "Check, please!",
              "We're ready to pay.",
            ],
            explanation: '要账单时，"check" 是美式英语，"bill" 是英式英语。最礼貌的说法加上 "please"。',
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
        example: "I'd like the pasta.",
      },
      {
        word: 'check',
        phonetic: '/tʃek/',
        meaning: 'n. 账单（美式）',
        example: 'Could we have the check?',
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
          analysis: {
            question: 'How do I get to the train station?',
            answer: 'Go straight and turn left at the second traffic light.',
            alternatives: [
              "Head straight, then take a left at the second light.",
              "Walk straight ahead and make a left turn at the second signal.",
            ],
            explanation: '指路时常用 "go straight"（直走）、"turn left/right"（左/右转）、"at the traffic light"（在红绿灯处）',
          },
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
              text: 'About 10 minutes on foot. You can also take bus number 5.',
              translation: '步行大约10分钟。你也可以坐5路公交车。',
            },
          ],
          analysis: {
            question: 'How long will it take?',
            answer: 'About 10 minutes on foot.',
            alternatives: [
              "It's about a 10-minute walk.",
              "Around 10 minutes walking.",
            ],
            explanation: '表达时间距离用 "about + 时间 + on foot" 或 "a + 时间 + walk"',
          },
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
      {
        word: 'on foot',
        phonetic: '/ɒn fʊt/',
        meaning: 'adv. 步行',
        example: 'It takes 10 minutes on foot.',
      },
    ],
  },
  {
    id: 's5',
    name: '酒店入住',
    category: 'travel',
    description: '学习酒店办理入住手续的英语表达',
    difficulty: 'intermediate',
    duration: 15,
    dialogue: {
      full_audio_url: '',
      duration: 80,
      rounds: [
        {
          round_number: 1,
          content: [
            {
              speaker: 'Guest',
              text: "Hi, I have a reservation under the name Zhang Wei.",
              translation: '你好，我有预订，名字是张威。',
            },
            {
              speaker: 'Receptionist',
              text: 'Welcome! Let me pull up your reservation. Can I see your ID?',
              translation: '欢迎！让我查一下您的预订。能看一下您的证件吗？',
            },
          ],
        },
        {
          round_number: 2,
          content: [
            {
              speaker: 'Guest',
              text: 'Sure, here you go. Is breakfast included?',
              translation: '当然，给您。早餐包含在内吗？',
            },
            {
              speaker: 'Receptionist',
              text: "Yes, breakfast is served from 7 to 10 AM in the dining room. Here's your key card — room 302.",
              translation: '是的，早餐在餐厅供应，时间是上午7点到10点。这是您的房卡，302房间。',
            },
          ],
          analysis: {
            question: 'Is breakfast included?',
            answer: "Yes, breakfast is served from 7 to 10 AM.",
            alternatives: [
              "Does the room rate include breakfast?",
              "Is breakfast part of the package?",
            ],
            explanation: '询问是否含早餐用 "Is breakfast included?" 是最常用的表达方式。',
          },
        },
      ],
    },
    vocabulary: [
      {
        word: 'reservation',
        phonetic: '/ˌrezərˈveɪʃən/',
        meaning: 'n. 预订',
        example: 'I have a reservation.',
      },
      {
        word: 'included',
        phonetic: '/ɪnˈkluːdɪd/',
        meaning: 'adj. 包含在内的',
        example: 'Is breakfast included?',
      },
      {
        word: 'key card',
        phonetic: '/kiː kɑːrd/',
        meaning: 'n. 房卡',
        example: "Here's your key card.",
      },
    ],
  },
];

// 测试题数据
export const mockTests: SceneTest[] = [
  // 初次见面 s1
  {
    id: 't1',
    sceneId: 's1',
    type: 'choice',
    order: 1,
    content: {
      question: '当别人问你 "How are you doing?" 时，下面哪个回答最自然？',
      options: [
        "I'm doing great, thanks!",
        "I am fine thank you.",
        "Yes, I am.",
        "How about you?",
      ],
      answer: "I'm doing great, thanks!",
      explanation: '"I\'m doing great, thanks!" 是最自然流畅的回答，包含了状态描述和礼貌的感谢。',
    },
  },
  {
    id: 't2',
    sceneId: 's1',
    type: 'fill_blank',
    order: 2,
    content: {
      question: '请完成这句打招呼的话：\n"Nice to ____ you! I\'m Tom."',
      answer: 'meet',
      context: '初次见面时说 "Nice to meet you!" 表示很高兴认识对方。',
      explanation: '"meet" 表示见面、遇见。"Nice to meet you" 是初次见面时最常用的问候语。',
    },
  },
  {
    id: 't3',
    sceneId: 's1',
    type: 'qa',
    order: 3,
    content: {
      question: '如果有人问你 "Where are you from?"，你会怎么回答？\n（请用英语完整回答，假设你来自上海）',
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
      question: '开放式对话练习',
      answer: '',
      context: '场景：你在咖啡厅遇到一个外国朋友，请用英语和 AI 进行一段完整的自我介绍对话。AI 将扮演外国朋友 Alex，主动与你搭话。目标：介绍你的名字、来自哪里、职业或爱好。',
    },
  },

  // 超市购物 s2
  {
    id: 't5',
    sceneId: 's2',
    type: 'choice',
    order: 1,
    content: {
      question: '在超市找不到商品，如何礼貌地向工作人员询问？',
      options: [
        'Excuse me, where can I find the milk?',
        'Where is milk?',
        'I want milk!',
        'Give me milk please.',
      ],
      answer: 'Excuse me, where can I find the milk?',
      explanation: '使用 "Excuse me" 开头表示礼貌，"where can I find...?" 是询问商品位置的标准表达。',
    },
  },
  {
    id: 't6',
    sceneId: 's2',
    type: 'fill_blank',
    order: 2,
    content: {
      question: '询问商品价格：\n"How much ____ this bread cost?"',
      answer: 'does',
      context: '"How much does + 物品 + cost?" 是询问价格的标准句型。',
      explanation: '"does" 是第三人称单数助动词，用于询问价格的句型 "How much does...cost?"',
    },
  },
  {
    id: 't7',
    sceneId: 's2',
    type: 'qa',
    order: 3,
    content: {
      question: '收银台结账时，你想问是否可以用信用卡付款，怎么说？',
      answer: 'Can I pay by credit card?',
      explanation: '询问支付方式用 "Can I pay by credit card?" 或 "Do you accept credit cards?"',
    },
  },
  {
    id: 't8',
    sceneId: 's2',
    type: 'open',
    order: 4,
    content: {
      question: '开放式对话练习',
      answer: '',
      context: '场景：你在超市购物，AI 扮演超市工作人员。你需要询问：1）某商品的位置 2）价格 3）是否可以打折。完成一段完整的购物对话。',
    },
  },

  // 餐厅点餐 s3
  {
    id: 't9',
    sceneId: 's3',
    type: 'choice',
    order: 1,
    content: {
      question: '在餐厅点餐，哪种表达最礼貌？',
      options: [
        "I'd like the chicken pasta, please.",
        "Give me chicken pasta.",
        "I want pasta.",
        "Chicken pasta!",
      ],
      answer: "I'd like the chicken pasta, please.",
      explanation: '"I\'d like..." 是最礼貌的点餐方式，结尾加 "please" 更显礼貌。',
    },
  },
  {
    id: 't10',
    sceneId: 's3',
    type: 'fill_blank',
    order: 2,
    content: {
      question: '请完成点餐对话：\n"Could I have the ____, please?"',
      answer: 'menu',
      context: '进餐厅坐下后，先索取菜单 "Could I have the menu?" 是常见的开场白。',
      explanation: '"menu" 是菜单。"Could I have the menu?" 是向服务员要菜单的礼貌表达。',
    },
  },
  {
    id: 't11',
    sceneId: 's3',
    type: 'qa',
    order: 3,
    content: {
      question: '用餐结束后，你想结账，如何向服务员表达？',
      answer: 'Could we have the check, please?',
      explanation: '"Check" 是美式英语的账单，"bill" 是英式。结账时说 "Could we have the check?" 最礼貌。',
    },
  },
  {
    id: 't12',
    sceneId: 's3',
    type: 'open',
    order: 4,
    content: {
      question: '开放式对话练习',
      answer: '',
      context: '场景：你在一家西餐厅用餐，AI 扮演服务员。完成完整的用餐流程：询问菜单、点餐、询问特色菜、最后结账。尝试使用地道的餐厅英语表达。',
    },
  },

  // 问路指路 s4
  {
    id: 't13',
    sceneId: 's4',
    type: 'choice',
    order: 1,
    content: {
      question: '向陌生人问路时，哪句话最合适？',
      options: [
        'Excuse me, how do I get to the train station?',
        'Where train station?',
        'Train station, go!',
        'Can you tell me where is train station?',
      ],
      answer: 'Excuse me, how do I get to the train station?',
      explanation: '"Excuse me" 礼貌打招呼，"how do I get to...?" 是问路的标准句型。',
    },
  },
  {
    id: 't14',
    sceneId: 's4',
    type: 'fill_blank',
    order: 2,
    content: {
      question: '指路时描述方向：\n"Go ____ ahead and turn left at the traffic light."',
      answer: 'straight',
      context: '"Go straight ahead" 表示直走，是最常用的指路方向词。',
      explanation: '"straight" 表示笔直地。"Go straight ahead" 是"直走"的标准表达。',
    },
  },
  {
    id: 't15',
    sceneId: 's4',
    type: 'qa',
    order: 3,
    content: {
      question: '你想知道步行到火车站需要多久，怎么问？',
      answer: 'How long will it take to walk there?',
      explanation: '"How long will it take...?" 用来询问所需时间，"to walk" 表明步行方式。',
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
