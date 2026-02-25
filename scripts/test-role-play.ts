/**
 * 角色扮演功能测试脚本
 * 用于验证AI角色模拟的准确性和一致性
 *
 * 使用方法:
 * npx ts-node scripts/test-role-play.ts
 */

import { callLLM } from '../src/lib/llm'
import {
  runAllRolePlayTests,
  generateTestReport,
  validateModelForRolePlay,
  rolePlayTestCases,
  DEFAULT_VALIDATION_CONFIG
} from '../src/app/test/role-play/test-runner'

// 模型验证配置
const MODEL_VALIDATION_CONFIG = {
  ...DEFAULT_VALIDATION_CONFIG,
  modelName: process.env.TEST_MODEL_NAME || '当前模型',
  provider: process.env.LLM_PROVIDER || 'nvidia'
}

async function main() {
  console.log('========================================')
  console.log('    角色扮演功能测试')
  console.log('========================================')
  console.log('')
  console.log(`测试模型: ${MODEL_VALIDATION_CONFIG.modelName}`)
  console.log(`提供商: ${MODEL_VALIDATION_CONFIG.provider}`)
  console.log(`测试用例数: ${rolePlayTestCases.length}`)
  console.log('')
  console.log('开始测试...')
  console.log('')

  try {
    // 方式1: 运行所有测试
    const { results, summary } = await runAllRolePlayTests(
      async (messages) => {
        const response = await callLLM(messages as any, 0.7, 500)
        return { content: response.content }
      },
      {
        onProgress: (completed, total, currentTest) => {
          console.log(`[${completed + 1}/${total}] ${currentTest}`)
        }
      }
    )

    console.log('')
    console.log(generateTestReport(results, summary))

    // 方式2: 模型验证（用于新模型引入）
    console.log('')
    console.log('========================================')
    console.log('    模型验证检查')
    console.log('========================================')
    console.log('')

    const validation = await validateModelForRolePlay(
      MODEL_VALIDATION_CONFIG,
      async (messages) => {
        const response = await callLLM(messages as any, 0.7, 500)
        return { content: response.content }
      }
    )

    console.log(validation.message)
    console.log('')
    console.log(`验证详情:`)
    console.log(`  - 必过测试: ${validation.summary.passed}/${MODEL_VALIDATION_CONFIG.requiredTests.length}`)
    console.log(`  - 通过率: ${validation.summary.passRate}%`)
    console.log(`  - 平均得分: ${validation.summary.averageScore}/100`)
    console.log('')

    if (validation.valid) {
      console.log('✅ 模型验证通过，可以投入使用')
      process.exit(0)
    } else {
      console.log('❌ 模型验证未通过，请优化后再试')
      process.exit(1)
    }

  } catch (error) {
    console.error('测试执行失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
}

export { main }
