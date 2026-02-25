/**
 * 对话难度分类系统
 * 根据视觉规范对对话文本和音频语速进行系统化分类
 *
 * 难度等级定义（对应UI显示）：
 * - 入门(easy): AI语速慢，词汇简单
 * - 标准(medium): 正常语速，日常词汇
 * - 挑战(hard): 正常语速，地道表达
 */

// ==================== 类型定义 ====================

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

/**
 * 语速等级
 */
export type SpeechRate = 'slow' | 'normal' | 'fast'

/**
 * 词汇复杂度等级
 */
export type VocabularyLevel = 'simple' | 'daily' | 'advanced'

/**
 * 句子复杂度等级
 */
export type SentenceComplexity = 'simple' | 'compound' | 'complex'

/**
 * 对话文本分类结果
 */
export interface TextClassificationResult {
  level: DifficultyLevel
  vocabularyLevel: VocabularyLevel
  sentenceComplexity: SentenceComplexity
  hasIdioms: boolean
  hasSlang: boolean
  wordCount: number
  avgWordLength: number
  confidence: number
}

/**
 * 音频语速分类结果
 */
export interface SpeechRateClassificationResult {
  level: DifficultyLevel
  speechRate: SpeechRate
  rateValue: number
  wordsPerMinute: number
  confidence: number
}

/**
 * 完整分类结果
 */
export interface ClassificationResult {
  text: TextClassificationResult
  speech: SpeechRateClassificationResult
  overallLevel: DifficultyLevel
  timestamp: number
}

// ==================== 分类标准配置 ====================

/**
 * 语速配置（SSML prosody rate值）
 * WPM参考：入门150，标准160，挑战180
 */
export const SPEECH_RATE_CONFIG: Record<DifficultyLevel, { rate: number; label: string; description: string; wpm: number }> = {
  easy: {
    rate: 1.0,
    label: '慢速',
    description: 'AI语速慢，便于初学者理解',
    wpm: 150
  },
  medium: {
    rate: 1.15,
    label: '正常',
    description: '正常语速，日常对话速度',
    wpm: 160
  },
  hard: {
    rate: 1.3,
    label: '较快',
    description: '语速较快，地道表达',
    wpm: 180
  }
}

/**
 * 词汇复杂度指标
 */
export const VOCABULARY_METRICS = {
  easy: {
    maxAvgWordLength: 5,
    maxSyllablesPerWord: 2,
    allowedComplexWords: 0,
    characteristics: ['基础词汇', '常用词', '避免俚语']
  },
  medium: {
    maxAvgWordLength: 6,
    maxSyllablesPerWord: 3,
    allowedComplexWords: 3,
    characteristics: ['日常词汇', '适量习语', '自然表达']
  },
  hard: {
    maxAvgWordLength: 8,
    maxSyllablesPerWord: 4,
    allowedComplexWords: Infinity,
    characteristics: ['高级词汇', '地道俚语', '隐含意图']
  }
}

/**
 * 句子复杂度指标
 */
export const SENTENCE_COMPLEXITY_METRICS = {
  easy: {
    maxClauseCount: 1,
    characteristics: ['简单句', '短句', '直接表达']
  },
  medium: {
    maxClauseCount: 2,
    characteristics: ['复合句', '连接词使用', '适度复杂']
  },
  hard: {
    maxClauseCount: 4,
    characteristics: ['复杂句', '多重从句', '隐含意义']
  }
}

// ==================== 词汇库 ====================

/**
 * 简单词汇库（入门级别）
 */
const SIMPLE_VOCABULARY = new Set([
  'hello', 'hi', 'good', 'bad', 'yes', 'no', 'please', 'thank', 'sorry',
  'eat', 'drink', 'go', 'come', 'see', 'look', 'want', 'need', 'like',
  'big', 'small', 'hot', 'cold', 'new', 'old', 'happy', 'sad',
  'time', 'day', 'week', 'month', 'year', 'today', 'tomorrow',
  'water', 'food', 'book', 'pen', 'car', 'house', 'school'
])

/**
 * 日常词汇库（标准级别）
 */
const DAILY_VOCABULARY = new Set([
  'restaurant', 'hotel', 'airport', 'hospital', 'supermarket',
  'conversation', 'appointment', 'reservation', 'recommendation',
  'delicious', 'comfortable', 'convenient', 'available', 'expensive',
  'breakfast', 'lunch', 'dinner', 'menu', 'order', 'bill', 'tip',
  'check-in', 'check-out', 'room', 'reception', 'elevator'
])

/**
 * 高级/地道表达库（挑战级别）
 */
const ADVANCED_VOCABULARY = new Set([
  'intriguing', 'fascinating', 'exceptional', 'remarkable', 'stunning',
  'exquisite', 'magnificent', 'breathtaking', 'phenomenal', 'spectacular'
])

/**
 * 习语库
 */
const IDIOMS = new Set([
  'break the ice', 'piece of cake', 'hit the road', 'call it a day',
  'under the weather', 'once in a blue moon', 'bite the bullet',
  'cut corners', 'hit the nail on the head', 'let the cat out of the bag'
])

/**
 * 俚语库
 */
const SLANG = new Set([
  'gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'dunno',
  'cool', 'awesome', 'lit', 'chill', 'hang out', 'catch up',
  'no biggie', 'my bad', 'you bet', 'fair enough', 'spot on'
])

// ==================== 分类函数 ====================

/**
 * 计算单词音节数
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (word.length <= 3) return 1

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')
  const match = word.match(/[aeiouy]{1,2}/g)
  return match ? match.length : 1
}

/**
 * 分析句子复杂度
 */
function analyzeSentenceComplexity(text: string): SentenceComplexity {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length === 0) return 'simple'

  let totalClauses = 0
  const conjunctions = ['and', 'but', 'or', 'so', 'because', 'although', 'while', 'if', 'when', 'that', 'which', 'who']

  for (const sentence of sentences) {
    let clauseCount = 1
    const words = sentence.toLowerCase().split(/\s+/)
    for (const word of words) {
      if (conjunctions.includes(word)) {
        clauseCount++
      }
    }
    totalClauses += clauseCount
  }

  const avgClauses = totalClauses / sentences.length

  if (avgClauses >= 2.5) return 'complex'
  if (avgClauses >= 1.5) return 'compound'
  return 'simple'
}

/**
 * 检测文本中的习语
 */
function detectIdioms(text: string): boolean {
  const lowerText = text.toLowerCase()
  for (const idiom of IDIOMS) {
    if (lowerText.includes(idiom)) return true
  }
  return false
}

/**
 * 检测文本中的俚语
 */
function detectSlang(text: string): boolean {
  const lowerText = text.toLowerCase()
  const words = lowerText.split(/\s+/)
  for (const word of words) {
    if (SLANG.has(word)) return true
  }
  for (const slang of SLANG) {
    if (slang.includes(' ') && lowerText.includes(slang)) return true
  }
  return false
}

/**
 * 计算词汇复杂度分数
 */
function calculateVocabularyScore(text: string): { score: number; level: VocabularyLevel } {
  const words = text.toLowerCase().match(/[a-z]+/g) || []
  if (words.length === 0) return { score: 0, level: 'simple' }

  let simpleCount = 0
  let dailyCount = 0
  let advancedCount = 0
  let totalSyllables = 0
  let totalLength = 0

  for (const word of words) {
    totalSyllables += countSyllables(word)
    totalLength += word.length

    if (SIMPLE_VOCABULARY.has(word)) {
      simpleCount++
    } else if (DAILY_VOCABULARY.has(word)) {
      dailyCount++
    } else if (ADVANCED_VOCABULARY.has(word)) {
      advancedCount++
    }
  }

  const avgSyllables = totalSyllables / words.length
  const avgLength = totalLength / words.length

  // 计算复杂度分数 (0-100)
  let score = 0
  if (avgSyllables > 2.5) score += 30
  else if (avgSyllables > 1.8) score += 15

  if (avgLength > 6) score += 30
  else if (avgLength > 4.5) score += 15

  if (advancedCount > 0) score += 25
  if (dailyCount > words.length * 0.1) score += 15

  // 确定等级
  let level: VocabularyLevel
  if (score >= 60) level = 'advanced'
  else if (score >= 30) level = 'daily'
  else level = 'simple'

  return { score: Math.min(score, 100), level }
}

/**
 * 分类对话文本
 */
export function classifyText(text: string): TextClassificationResult {
  const words = text.match(/\b[a-zA-Z]+\b/g) || []
  const wordCount = words.length

  if (wordCount === 0) {
    return {
      level: 'easy',
      vocabularyLevel: 'simple',
      sentenceComplexity: 'simple',
      hasIdioms: false,
      hasSlang: false,
      wordCount: 0,
      avgWordLength: 0,
      confidence: 0
    }
  }

  // 计算平均词长
  const totalLength = words.reduce((sum, word) => sum + word.length, 0)
  const avgWordLength = totalLength / wordCount

  // 分析词汇复杂度
  const vocabResult = calculateVocabularyScore(text)

  // 分析句子复杂度
  const sentenceComplexity = analyzeSentenceComplexity(text)

  // 检测习语和俚语
  const hasIdioms = detectIdioms(text)
  const hasSlang = detectSlang(text)

  // 综合判断难度等级
  let level: DifficultyLevel
  let confidence = 0.8

  // 决策逻辑
  if (vocabResult.level === 'advanced' || hasIdioms || hasSlang || sentenceComplexity === 'complex') {
    level = 'hard'
    confidence = 0.9
  } else if (vocabResult.level === 'daily' || sentenceComplexity === 'compound') {
    level = 'medium'
    confidence = 0.85
  } else {
    level = 'easy'
    confidence = 0.9
  }

  // 特殊情况调整
  if (avgWordLength < 4 && wordCount < 10 && !hasIdioms && !hasSlang) {
    level = 'easy'
    confidence = 0.95
  }

  return {
    level,
    vocabularyLevel: vocabResult.level,
    sentenceComplexity,
    hasIdioms,
    hasSlang,
    wordCount,
    avgWordLength: Math.round(avgWordLength * 100) / 100,
    confidence: Math.round(confidence * 100) / 100
  }
}

/**
 * 获取语速配置
 */
export function getSpeechRateConfig(difficultyLevel: DifficultyLevel) {
  return SPEECH_RATE_CONFIG[difficultyLevel]
}

/**
 * 分类音频语速
 * WPM配置：入门140，标准160，挑战180
 */
export function classifySpeechRate(
  difficultyLevel: DifficultyLevel,
  wordsPerMinute?: number
): SpeechRateClassificationResult {
  const config = SPEECH_RATE_CONFIG[difficultyLevel]

  // 使用配置的WPM值或传入的自定义值
  const calculatedWPM = wordsPerMinute ?? config.wpm

  // 确定语速等级
  let speechRate: SpeechRate
  if (calculatedWPM < 140) {
    speechRate = 'slow'
  } else if (calculatedWPM <= 160) {
    speechRate = 'normal'
  } else {
    speechRate = 'fast'
  }

  return {
    level: difficultyLevel,
    speechRate,
    rateValue: config.rate,
    wordsPerMinute: calculatedWPM,
    confidence: 0.9
  }
}

/**
 * 综合分类
 */
export function classifyConversation(
  text: string,
  difficultyLevel: DifficultyLevel,
  wordsPerMinute?: number
): ClassificationResult {
  const textClassification = classifyText(text)
  const speechClassification = classifySpeechRate(difficultyLevel, wordsPerMinute)

  // 综合判断：以预设难度为主，文本分析为辅
  let overallLevel: DifficultyLevel = difficultyLevel

  // 如果文本分析与预设难度差异过大，进行校准
  if (difficultyLevel === 'easy' && textClassification.level === 'hard') {
    overallLevel = 'medium'
  } else if (difficultyLevel === 'hard' && textClassification.level === 'easy') {
    overallLevel = 'medium'
  }

  return {
    text: textClassification,
    speech: speechClassification,
    overallLevel,
    timestamp: Date.now()
  }
}

/**
 * 生成SSML配置
 */
export function generateSSML(
  text: string,
  difficultyLevel: DifficultyLevel,
  voice: string = 'en-US-AriaNeural'
): string {
  const config = SPEECH_RATE_CONFIG[difficultyLevel]
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
    <voice name="${voice}">
        <prosody rate="${config.rate}">
            ${escapedText}
        </prosody>
    </voice>
</speak>`
}

/**
 * 验证分类结果
 */
export function validateClassification(result: ClassificationResult): {
  isValid: boolean
  issues: string[]
} {
  const issues: string[] = []

  // 验证文本分类
  if (result.text.confidence < 0.5) {
    issues.push('文本分类置信度较低')
  }

  if (result.text.wordCount === 0) {
    issues.push('文本为空或无法解析')
  }

  // 验证语速分类
  if (result.speech.wordsPerMinute < 50 || result.speech.wordsPerMinute > 200) {
    issues.push('语速数值异常')
  }

  // 验证一致性
  if (result.overallLevel === 'easy' && result.text.level === 'hard') {
    issues.push('整体难度与文本分析结果不一致')
  }

  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * 获取难度等级描述
 */
export function getDifficultyDescription(level: DifficultyLevel): {
  label: string
  description: string
  textCharacteristics: string[]
  speechCharacteristics: string
} {
  const descriptions = {
    easy: {
      label: '入门',
      description: 'AI语速慢，词汇简单',
      textCharacteristics: VOCABULARY_METRICS.easy.characteristics,
      speechCharacteristics: '语速较慢 (WPM: 150)，清晰发音，适当停顿'
    },
    medium: {
      label: '标准',
      description: '正常语速，日常词汇',
      textCharacteristics: VOCABULARY_METRICS.medium.characteristics,
      speechCharacteristics: '正常语速 (WPM: 160)，自然流畅，标准发音'
    },
    hard: {
      label: '挑战',
      description: '语速较快，地道表达',
      textCharacteristics: VOCABULARY_METRICS.hard.characteristics,
      speechCharacteristics: '语速较快 (WPM: 180)，地道俚语，隐含表达'
    }
  }

  return descriptions[level]
}
