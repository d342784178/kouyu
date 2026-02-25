/**
 * 对话难度分类系统测试
 * 验证分类标准的准确性和一致性
 */

import {
  classifyText,
  classifySpeechRate,
  classifyConversation,
  validateClassification,
  generateSSML,
  getDifficultyDescription,
  getSpeechRateConfig,
  SPEECH_RATE_CONFIG,
  type DifficultyLevel
} from '../difficulty-classifier'

// ==================== 测试数据 ====================

const TEST_TEXTS = {
  easy: [
    'Hello! How are you?',
    'I want to eat food.',
    'Thank you very much.',
    'Good morning! Have a nice day.',
    'Please help me. I need water.'
  ],
  medium: [
    'Welcome to our restaurant! What would you like to order today?',
    'I would like to make a reservation for dinner tonight.',
    'The hotel room is very comfortable and convenient.',
    'Could you please recommend something delicious from the menu?',
    'I need to check out tomorrow morning before noon.'
  ],
  hard: [
    'This is absolutely fascinating! The ambiance here is truly exquisite.',
    'I gotta say, this place is lit! Wanna hang out later?',
    'The service was phenomenal, and the view is breathtaking.',
    'No biggie, but I think we should hit the road soon.',
    'It is once in a blue moon that you find such exceptional cuisine.'
  ]
}

// ==================== 测试套件 ====================

describe('对话难度分类系统', () => {
  describe('文本分类', () => {
    describe('入门级别文本', () => {
      TEST_TEXTS.easy.forEach((text, index) => {
        it(`应该正确分类简单文本 ${index + 1}`, () => {
          const result = classifyText(text)
          expect(result.wordCount).toBeGreaterThan(0)
          expect(result.avgWordLength).toBeLessThan(5)
          expect(result.vocabularyLevel).toBe('simple')
          expect(result.sentenceComplexity).toBe('simple')
          expect(result.hasIdioms).toBe(false)
          expect(result.hasSlang).toBe(false)
          expect(result.confidence).toBeGreaterThan(0.8)
        })
      })
    })

    describe('标准级别文本', () => {
      TEST_TEXTS.medium.forEach((text, index) => {
        it(`应该正确分类日常文本 ${index + 1}`, () => {
          const result = classifyText(text)
          expect(result.wordCount).toBeGreaterThan(0)
          expect(result.vocabularyLevel).toMatch(/simple|daily/)
          expect(result.hasIdioms).toBe(false)
          expect(result.confidence).toBeGreaterThan(0.7)
        })
      })
    })

    describe('挑战级别文本', () => {
      TEST_TEXTS.hard.forEach((text, index) => {
        it(`应该正确分类高级文本 ${index + 1}`, () => {
          const result = classifyText(text)
          expect(result.wordCount).toBeGreaterThan(0)
          // 高级文本应该有习语、俚语或高级词汇
          expect(
            result.hasIdioms || result.hasSlang || result.vocabularyLevel === 'advanced'
          ).toBe(true)
          expect(result.confidence).toBeGreaterThan(0.7)
        })
      })
    })

    describe('边界情况', () => {
      it('应该处理空文本', () => {
        const result = classifyText('')
        expect(result.wordCount).toBe(0)
        expect(result.confidence).toBe(0)
      })

      it('应该处理只有标点的文本', () => {
        const result = classifyText('!!!???...')
        expect(result.wordCount).toBe(0)
      })

      it('应该处理中文文本', () => {
        const result = classifyText('你好世界')
        expect(result.wordCount).toBe(0)
      })
    })
  })

  describe('语速分类', () => {
    it('应该正确配置入门级别语速', () => {
      const result = classifySpeechRate('easy')
      expect(result.level).toBe('easy')
      expect(result.speechRate).toBe('slow')
      expect(result.rateValue).toBe(1.0)
      expect(result.wordsPerMinute).toBe(140)
    })

    it('应该正确配置标准级别语速', () => {
      const result = classifySpeechRate('medium')
      expect(result.level).toBe('medium')
      expect(result.speechRate).toBe('normal')
      expect(result.rateValue).toBe(1.15)
      expect(result.wordsPerMinute).toBe(160)
    })

    it('应该正确配置挑战级别语速', () => {
      const result = classifySpeechRate('hard')
      expect(result.level).toBe('hard')
      expect(result.speechRate).toBe('fast')
      expect(result.rateValue).toBe(1.3)
      expect(result.wordsPerMinute).toBe(180)
    })

    it('应该接受自定义WPM', () => {
      const result = classifySpeechRate('medium', 160)
      expect(result.wordsPerMinute).toBe(160)
      expect(result.speechRate).toBe('fast')
    })

    it('应该正确识别慢速', () => {
      const result = classifySpeechRate('easy', 90)
      expect(result.speechRate).toBe('slow')
    })

    it('应该正确识别正常语速', () => {
      const result = classifySpeechRate('medium', 120)
      expect(result.speechRate).toBe('normal')
    })
  })

  describe('综合分类', () => {
    it('应该正确综合分类入门级别', () => {
      const result = classifyConversation('Hello! How are you?', 'easy')
      expect(result.overallLevel).toBe('easy')
      expect(result.text.level).toBe('easy')
      expect(result.speech.level).toBe('easy')
      expect(result.timestamp).toBeGreaterThan(0)
    })

    it('应该正确综合分类标准级别', () => {
      const result = classifyConversation(
        'Welcome to our restaurant! What would you like to order?',
        'medium'
      )
      expect(result.overallLevel).toBe('medium')
      expect(result.speech.level).toBe('medium')
    })

    it('应该正确综合分类挑战级别', () => {
      const result = classifyConversation(
        'This is absolutely fascinating!',
        'hard'
      )
      expect(result.overallLevel).toBe('hard')
      expect(result.speech.level).toBe('hard')
    })

    it('应该在文本与难度不匹配时进行校准', () => {
      // 使用简单文本但指定高难度
      const result = classifyConversation('Hello!', 'hard')
      // 应该校准为medium
      expect(result.overallLevel).toBe('medium')
    })
  })

  describe('验证功能', () => {
    it('应该验证有效的分类结果', () => {
      const classification = classifyConversation('Hello! How are you?', 'easy')
      const validation = validateClassification(classification)
      expect(validation.isValid).toBe(true)
      expect(validation.issues).toHaveLength(0)
    })

    it('应该检测低置信度', () => {
      const classification = classifyConversation('', 'easy')
      const validation = validateClassification(classification)
      expect(validation.isValid).toBe(false)
      expect(validation.issues.length).toBeGreaterThan(0)
    })

    it('应该检测异常语速', () => {
      const classification = classifyConversation('Hello!', 'easy', 250)
      const validation = validateClassification(classification)
      expect(validation.issues.some((issue: string) => issue.includes('语速'))).toBe(true)
    })
  })

  describe('SSML生成', () => {
    it('应该生成入门级别SSML', () => {
      const ssml = generateSSML('Hello!', 'easy')
      expect(ssml).toContain('rate="0.85"')
      expect(ssml).toContain('Hello!')
      expect(ssml).toContain('<speak')
    })

    it('应该生成标准级别SSML', () => {
      const ssml = generateSSML('Hello!', 'medium')
      expect(ssml).toContain('rate="1"')
    })

    it('应该转义特殊字符', () => {
      const ssml = generateSSML('Hello & Welcome!', 'easy')
      expect(ssml).toContain('&amp;')
    })

    it('应该支持自定义语音', () => {
      const ssml = generateSSML('Hello!', 'easy', 'en-GB-SoniaNeural')
      expect(ssml).toContain('en-GB-SoniaNeural')
    })
  })

  describe('配置获取', () => {
    it('应该返回入门级别配置', () => {
      const config = getSpeechRateConfig('easy')
      expect(config.rate).toBe(0.85)
      expect(config.label).toBe('慢速')
    })

    it('应该返回标准级别配置', () => {
      const config = getSpeechRateConfig('medium')
      expect(config.rate).toBe(1.0)
      expect(config.label).toBe('正常')
    })

    it('应该返回挑战级别配置', () => {
      const config = getSpeechRateConfig('hard')
      expect(config.rate).toBe(1.0)
      expect(config.label).toBe('正常')
    })
  })

  describe('难度描述', () => {
    it('应该返回入门级别描述', () => {
      const desc = getDifficultyDescription('easy')
      expect(desc.label).toBe('入门')
      expect(desc.description).toBe('AI语速慢，词汇简单')
      expect(desc.textCharacteristics).toContain('基础词汇')
      expect(desc.speechCharacteristics).toContain('语速较慢')
    })

    it('应该返回标准级别描述', () => {
      const desc = getDifficultyDescription('medium')
      expect(desc.label).toBe('标准')
      expect(desc.description).toBe('正常语速，日常词汇')
      expect(desc.textCharacteristics).toContain('日常词汇')
    })

    it('应该返回挑战级别描述', () => {
      const desc = getDifficultyDescription('hard')
      expect(desc.label).toBe('挑战')
      expect(desc.description).toBe('正常语速，地道表达')
      expect(desc.textCharacteristics).toContain('高级词汇')
    })
  })
})

// ==================== 一致性验证 ====================

describe('分类标准一致性验证', () => {
  it('语速配置应该符合视觉规范', () => {
    // 入门：语速慢
    expect(SPEECH_RATE_CONFIG.easy.rate).toBeLessThan(1.0)
    expect(SPEECH_RATE_CONFIG.easy.label).toBe('慢速')

    // 标准：正常语速
    expect(SPEECH_RATE_CONFIG.medium.rate).toBe(1.0)
    expect(SPEECH_RATE_CONFIG.medium.label).toBe('正常')

    // 挑战：正常语速
    expect(SPEECH_RATE_CONFIG.hard.rate).toBe(1.0)
    expect(SPEECH_RATE_CONFIG.hard.label).toBe('正常')
  })

  it('WPM范围应该合理', () => {
    const easy = classifySpeechRate('easy')
    const medium = classifySpeechRate('medium')
    const hard = classifySpeechRate('hard')

    // 入门语速最慢
    expect(easy.wordsPerMinute).toBeLessThan(medium.wordsPerMinute)

    // 所有WPM在合理范围内
    expect(easy.wordsPerMinute).toBeGreaterThan(50)
    expect(hard.wordsPerMinute).toBeLessThan(200)
  })

  it('文本特征应该与难度对应', () => {
    const easyText = classifyText('Hello! How are you?')
    const hardText = classifyText('This is absolutely fascinating and breathtaking!')

    expect(easyText.avgWordLength).toBeLessThan(hardText.avgWordLength)
  })
})

// ==================== 性能测试 ====================

describe('性能测试', () => {
  it('应该在合理时间内处理短文本', () => {
    const start = Date.now()
    classifyText('Hello! How are you?')
    const duration = Date.now() - start
    expect(duration).toBeLessThan(100)
  })

  it('应该在合理时间内处理长文本', () => {
    const longText = 'Welcome to our restaurant! '.repeat(50)
    const start = Date.now()
    classifyText(longText)
    const duration = Date.now() - start
    expect(duration).toBeLessThan(500)
  })
})
