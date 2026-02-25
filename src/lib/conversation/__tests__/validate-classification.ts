/**
 * 对话难度分类验证脚本
 * 用于验证分类系统的准确性和一致性
 */

import {
  classifyText,
  classifySpeechRate,
  classifyConversation,
  validateClassification,
  getDifficultyDescription,
  type DifficultyLevel,
  type ClassificationResult
} from '../difficulty-classifier'

// ==================== 测试用例 ====================

interface TestCase {
  text: string
  expectedLevel: DifficultyLevel
  description: string
}

const TEST_CASES: TestCase[] = [
  // 入门级别测试用例
  {
    text: 'Hello! How are you?',
    expectedLevel: 'easy',
    description: '简单问候语'
  },
  {
    text: 'I want to eat food. Thank you!',
    expectedLevel: 'easy',
    description: '基础表达'
  },
  {
    text: 'Please help me. I need water.',
    expectedLevel: 'easy',
    description: '简单请求'
  },

  // 标准级别测试用例
  {
    text: 'Welcome to our restaurant! What would you like to order today?',
    expectedLevel: 'medium',
    description: '餐厅场景开场'
  },
  {
    text: 'I would like to make a reservation for dinner tonight.',
    expectedLevel: 'medium',
    description: '预订表达'
  },
  {
    text: 'Could you please recommend something delicious from the menu?',
    expectedLevel: 'medium',
    description: '礼貌询问'
  },

  // 挑战级别测试用例
  {
    text: 'This is absolutely fascinating! The ambiance here is truly exquisite.',
    expectedLevel: 'hard',
    description: '高级词汇表达'
  },
  {
    text: 'I gotta say, this place is lit! Wanna hang out later?',
    expectedLevel: 'hard',
    description: '俚语使用'
  },
  {
    text: 'It is once in a blue moon that you find such exceptional cuisine.',
    expectedLevel: 'hard',
    description: '习语使用'
  },
  {
    text: 'No biggie, but I think we should hit the road soon.',
    expectedLevel: 'hard',
    description: '地道俚语'
  }
]

// ==================== 验证函数 ====================

interface ValidationReport {
  totalTests: number
  passedTests: number
  failedTests: number
  accuracy: number
  details: TestResult[]
}

interface TestResult {
  testCase: TestCase
  actualLevel: DifficultyLevel
  passed: boolean
  classification: ClassificationResult
}

/**
 * 运行分类验证测试
 */
function runValidationTests(): ValidationReport {
  const details: TestResult[] = []
  let passedCount = 0

  console.log('========================================')
  console.log('   对话难度分类系统验证测试')
  console.log('========================================\n')

  for (const testCase of TEST_CASES) {
    // 执行分类
    const classification = classifyConversation(testCase.text, testCase.expectedLevel)
    const textClassification = classification.text

    // 判断是否通过
    const passed = textClassification.level === testCase.expectedLevel
    if (passed) passedCount++

    details.push({
      testCase,
      actualLevel: textClassification.level,
      passed,
      classification
    })

    // 输出结果
    console.log(`测试: ${testCase.description}`)
    console.log(`文本: "${testCase.text}"`)
    console.log(`期望级别: ${testCase.expectedLevel}`)
    console.log(`实际级别: ${textClassification.level}`)
    console.log(`词汇复杂度: ${textClassification.vocabularyLevel}`)
    console.log(`句子复杂度: ${textClassification.sentenceComplexity}`)
    console.log(`包含习语: ${textClassification.hasIdioms}`)
    console.log(`包含俚语: ${textClassification.hasSlang}`)
    console.log(`置信度: ${textClassification.confidence}`)
    console.log(`结果: ${passed ? '✅ 通过' : '❌ 失败'}`)
    console.log('----------------------------------------\n')
  }

  return {
    totalTests: TEST_CASES.length,
    passedTests: passedCount,
    failedTests: TEST_CASES.length - passedCount,
    accuracy: Math.round((passedCount / TEST_CASES.length) * 100),
    details
  }
}

/**
 * 验证语速配置
 */
function validateSpeechRateConfig(): void {
  console.log('========================================')
  console.log('   语速配置验证')
  console.log('========================================\n')

  const levels: DifficultyLevel[] = ['easy', 'medium', 'hard']

  for (const level of levels) {
    const speechResult = classifySpeechRate(level)
    const description = getDifficultyDescription(level)

    console.log(`难度级别: ${level} (${description.label})`)
    console.log(`描述: ${description.description}`)
    console.log(`语速等级: ${speechResult.speechRate}`)
    console.log(`SSML Rate值: ${speechResult.rateValue}`)
    console.log(`预估WPM: ${speechResult.wordsPerMinute}`)
    console.log(`语音特征: ${description.speechCharacteristics}`)
    console.log(`文本特征: ${description.textCharacteristics.join(', ')}`)
    console.log('----------------------------------------\n')
  }
}

/**
 * 验证分类一致性
 */
function validateConsistency(): void {
  console.log('========================================')
  console.log('   分类一致性验证')
  console.log('========================================\n')

  // 验证同一文本多次分类结果一致
  const testText = 'Welcome to our restaurant!'
  const results: DifficultyLevel[] = []

  for (let i = 0; i < 5; i++) {
    const result = classifyText(testText)
    results.push(result.level)
  }

  const allSame = results.every(r => r === results[0])
  console.log(`测试文本: "${testText}"`)
  console.log(`5次分类结果: ${results.join(', ')}`)
  console.log(`一致性: ${allSame ? '✅ 一致' : '❌ 不一致'}`)
  console.log('----------------------------------------\n')
}

/**
 * 验证边界情况
 */
function validateEdgeCases(): void {
  console.log('========================================')
  console.log('   边界情况验证')
  console.log('========================================\n')

  const edgeCases = [
    { text: '', description: '空文本' },
    { text: '!!!???', description: '只有标点' },
    { text: '你好世界', description: '中文文本' },
    { text: 'Hi', description: '极短文本' },
    { text: 'a b c d e', description: '单字母单词' }
  ]

  for (const testCase of edgeCases) {
    const result = classifyText(testCase.text)
    const validation = validateClassification({
      text: result,
      speech: classifySpeechRate('medium'),
      overallLevel: result.level,
      timestamp: Date.now()
    })

    console.log(`边界情况: ${testCase.description}`)
    console.log(`文本: "${testCase.text}"`)
    console.log(`分类结果: ${result.level}`)
    console.log(`词数: ${result.wordCount}`)
    console.log(`验证状态: ${validation.isValid ? '✅ 有效' : '⚠️ 警告'}`)
    if (validation.issues.length > 0) {
      console.log(`问题: ${validation.issues.join(', ')}`)
    }
    console.log('----------------------------------------\n')
  }
}

/**
 * 生成验证报告
 */
function generateReport(report: ValidationReport): void {
  console.log('========================================')
  console.log('   验证报告汇总')
  console.log('========================================\n')
  console.log(`总测试数: ${report.totalTests}`)
  console.log(`通过数: ${report.passedTests}`)
  console.log(`失败数: ${report.failedTests}`)
  console.log(`准确率: ${report.accuracy}%`)
  console.log('\n========================================')

  if (report.failedTests > 0) {
    console.log('\n失败的测试:')
    report.details
      .filter(d => !d.passed)
      .forEach(d => {
        console.log(`  - ${d.testCase.description}: 期望 ${d.testCase.expectedLevel}, 实际 ${d.actualLevel}`)
      })
  }
}

// ==================== 主函数 ====================

function main(): void {
  console.log('\n')
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     对话难度分类系统 - 完整验证测试                    ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log('\n')

  // 1. 运行分类验证测试
  const report = runValidationTests()

  // 2. 验证语速配置
  validateSpeechRateConfig()

  // 3. 验证一致性
  validateConsistency()

  // 4. 验证边界情况
  validateEdgeCases()

  // 5. 生成报告
  generateReport(report)

  // 6. 最终结论
  console.log('\n')
  console.log('╔════════════════════════════════════════════════════════╗')
  if (report.accuracy >= 80) {
    console.log('║  ✅ 验证通过 - 分类系统工作正常                        ║')
  } else if (report.accuracy >= 60) {
    console.log('║  ⚠️ 验证警告 - 分类系统需要优化                        ║')
  } else {
    console.log('║  ❌ 验证失败 - 分类系统需要修复                        ║')
  }
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log('\n')
}

// 运行验证
main()
