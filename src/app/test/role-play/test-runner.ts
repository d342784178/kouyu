/**
 * 角色扮演测试执行器
 * 用于运行测试用例并生成报告
 */

import {
  generateInitiatePrompt,
  generateContinuePrompt,
  validatePromptRoleConsistency
} from '@/lib/prompts/role-play-prompts'
import {
  RolePlayTestCase,
  RolePlayTestResult,
  ModelValidationConfig,
  rolePlayTestCases,
  DEFAULT_VALIDATION_CONFIG
} from './test-cases'

export type LLMCaller = (messages: Array<{ role: string; content: string }>) => Promise<{ content: string }>

/**
 * 执行单个测试用例
 */
export async function runRolePlayTest(
  testCase: RolePlayTestCase,
  callLLM: LLMCaller
): Promise<RolePlayTestResult> {
  try {
    // 1. 生成提示词
    const prompt = testCase.conversationHistory
      ? generateContinuePrompt(
          testCase.scene,
          testCase.aiRole,
          testCase.userRole,
          testCase.dialogueGoal,
          testCase.difficultyLevel
        )
      : generateInitiatePrompt(
          testCase.scene,
          testCase.aiRole,
          testCase.userRole,
          testCase.dialogueGoal,
          testCase.difficultyLevel
        )

    // 2. 验证提示词角色一致性
    const promptValidation = validatePromptRoleConsistency(prompt, testCase.aiRole)

    // 3. 调用LLM获取响应
    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: '请开始对话。' }
    ]

    let responseValid = true
    let responseIssues: string[] = []
    let roleConsistencyScore = 100

    try {
      const response = await callLLM(messages)
      const responseText = response.content.toLowerCase()

      // 4. 验证响应中的角色一致性
      const hasExpectedIndicators = testCase.expectedBehavior.openingIndicators.some(
        indicator => responseText.includes(indicator.toLowerCase())
      )

      const hasForbiddenIndicators = testCase.expectedBehavior.forbiddenIndicators.some(
        indicator => responseText.includes(indicator.toLowerCase())
      )

      if (!hasExpectedIndicators) {
        responseIssues.push(`响应未包含预期的${testCase.aiRole}角色特征词`)
        roleConsistencyScore -= 30
      }

      if (hasForbiddenIndicators) {
        responseIssues.push(`响应包含${testCase.userRole}角色的特征词，存在角色错位`)
        roleConsistencyScore -= 50
      }

      responseValid = responseIssues.length === 0

    } catch (error) {
      responseValid = false
      responseIssues.push(`LLM调用失败: ${error instanceof Error ? error.message : '未知错误'}`)
      roleConsistencyScore = 0
    }

    // 5. 计算总分
    const promptScore = promptValidation.isValid ? 100 : 50
    const finalScore = Math.round((promptScore + roleConsistencyScore) / 2)

    return {
      testId: testCase.id,
      testName: testCase.name,
      scene: testCase.scene,
      aiRole: testCase.aiRole,
      userRole: testCase.userRole,
      passed: finalScore >= 70 && promptValidation.isValid && responseValid,
      score: finalScore,
      details: {
        promptValid: promptValidation.isValid,
        promptIssues: promptValidation.issues,
        responseValid,
        responseIssues,
        roleConsistency: roleConsistencyScore
      },
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    return {
      testId: testCase.id,
      testName: testCase.name,
      scene: testCase.scene,
      aiRole: testCase.aiRole,
      userRole: testCase.userRole,
      passed: false,
      score: 0,
      details: {
        promptValid: false,
        promptIssues: [`测试执行失败: ${error instanceof Error ? error.message : '未知错误'}`],
        responseValid: false,
        responseIssues: [],
        roleConsistency: 0
      },
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * 运行所有测试用例
 */
export async function runAllRolePlayTests(
  callLLM: LLMCaller,
  options?: {
    filter?: (test: RolePlayTestCase) => boolean
    onProgress?: (completed: number, total: number, currentTest: string) => void
  }
): Promise<{
  results: RolePlayTestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    averageScore: number
    passRate: number
  }
}> {
  const testsToRun = options?.filter
    ? rolePlayTestCases.filter(options.filter)
    : rolePlayTestCases

  const results: RolePlayTestResult[] = []

  for (let i = 0; i < testsToRun.length; i++) {
    const test = testsToRun[i]
    options?.onProgress?.(i, testsToRun.length, test.name)

    const result = await runRolePlayTest(test, callLLM)
    results.push(result)
  }

  const summary = {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    averageScore: Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length),
    passRate: Math.round((results.filter(r => r.passed).length / results.length) * 100)
  }

  return { results, summary }
}

/**
 * 生成测试报告
 */
export function generateTestReport(
  results: RolePlayTestResult[],
  summary: { total: number; passed: number; failed: number; averageScore: number; passRate: number }
): string {
  const lines: string[] = []

  lines.push('========================================')
  lines.push('    角色扮演功能测试报告')
  lines.push('========================================')
  lines.push('')
  lines.push(`测试时间: ${new Date().toLocaleString()}`)
  lines.push(`测试用例总数: ${summary.total}`)
  lines.push(`通过: ${summary.passed} | 失败: ${summary.failed}`)
  lines.push(`平均得分: ${summary.averageScore}/100`)
  lines.push(`通过率: ${summary.passRate}%`)
  lines.push('')
  lines.push('----------------------------------------')
  lines.push('')

  const failedTests = results.filter(r => !r.passed)
  if (failedTests.length > 0) {
    lines.push('【失败的测试】')
    lines.push('')
    failedTests.forEach(test => {
      lines.push(`❌ ${test.testName}`)
      lines.push(`   得分: ${test.score}/100`)
      lines.push(`   场景: ${test.scene} | AI角色: ${test.aiRole} | 用户角色: ${test.userRole}`)
      if (test.details.promptIssues.length > 0) {
        lines.push(`   提示词问题:`)
        test.details.promptIssues.forEach(issue => lines.push(`     - ${issue}`))
      }
      if (test.details.responseIssues.length > 0) {
        lines.push(`   响应问题:`)
        test.details.responseIssues.forEach(issue => lines.push(`     - ${issue}`))
      }
      lines.push('')
    })
    lines.push('----------------------------------------')
    lines.push('')
  }

  const passedTests = results.filter(r => r.passed)
  if (passedTests.length > 0) {
    lines.push('【通过的测试】')
    lines.push('')
    passedTests.forEach(test => {
      lines.push(`✅ ${test.testName} (${test.score}/100)`)
    })
    lines.push('')
  }

  lines.push('========================================')
  if (summary.passRate >= 80) {
    lines.push('✅ 测试通过 - 角色扮演功能正常')
  } else if (summary.passRate >= 60) {
    lines.push('⚠️ 测试警告 - 角色扮演功能部分正常，建议优化')
  } else {
    lines.push('❌ 测试失败 - 角色扮演功能存在严重问题，需要修复')
  }
  lines.push('========================================')

  return lines.join('\n')
}

/**
 * 验证模型是否满足角色扮演要求
 */
export async function validateModelForRolePlay(
  config: ModelValidationConfig,
  callLLM: LLMCaller
): Promise<{
  valid: boolean
  results: RolePlayTestResult[]
  summary: { total: number; passed: number; failed: number; averageScore: number; passRate: number }
  message: string
}> {
  const { results, summary } = await runAllRolePlayTests(callLLM, {
    filter: test => config.requiredTests.includes(test.id)
  })

  const requiredTestsPassed = config.requiredTests.every(
    requiredId => results.find(r => r.testId === requiredId)?.passed
  )

  const valid = summary.passRate >= config.requiredPassRate && requiredTestsPassed

  let message: string
  if (valid) {
    message = `✅ 模型 ${config.modelName} 通过角色扮演验证 (通过率: ${summary.passRate}%)`
  } else {
    const reasons: string[] = []
    if (summary.passRate < config.requiredPassRate) {
      reasons.push(`通过率 ${summary.passRate}% 低于要求的 ${config.requiredPassRate}%`)
    }
    if (!requiredTestsPassed) {
      reasons.push('部分必过测试未通过')
    }
    message = `❌ 模型 ${config.modelName} 未通过验证: ${reasons.join(', ')}`
  }

  return { valid, results, summary, message }
}

export { rolePlayTestCases, DEFAULT_VALIDATION_CONFIG }
export type { RolePlayTestCase, RolePlayTestResult, ModelValidationConfig }
