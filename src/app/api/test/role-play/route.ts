/**
 * 角色扮演功能测试 API
 * 用于验证AI角色模拟的准确性和一致性
 *
 * 端点: POST /api/test/role-play
 */

import { NextResponse } from 'next/server'
import { callLLM, LLMProvider } from '@/lib/llm'
import {
  runAllRolePlayTests,
  generateTestReport,
  validateModelForRolePlay,
  rolePlayTestCases,
  DEFAULT_VALIDATION_CONFIG
} from '@/app/test/role-play/test-runner'
import type { ModelValidationConfig } from '@/app/test/role-play/test-cases'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      action = 'run-all',
      provider,
      model,
      config
    } = body

    console.log('[角色扮演测试] 收到请求:', action)

    const callLLMWrapper = async (messages: any[]) => {
      const response = await callLLM(
        messages as any,
        0.7,
        500,
        provider as LLMProvider,
        model
      )
      return { content: response.content }
    }

    switch (action) {
      case 'list-tests':
        return NextResponse.json({
          tests: rolePlayTestCases.map(test => ({
            id: test.id,
            name: test.name,
            description: test.description,
            scene: test.scene,
            aiRole: test.aiRole,
            userRole: test.userRole,
            isEdgeCase: test.isEdgeCase || false
          })),
          total: rolePlayTestCases.length
        })

      case 'run-all':
        console.log('[角色扮演测试] 开始运行所有测试...')

        const { results, summary } = await runAllRolePlayTests(
          callLLMWrapper,
          {
            onProgress: (completed, total, currentTest) => {
              console.log(`[${completed + 1}/${total}] ${currentTest}`)
            }
          }
        )

        const report = generateTestReport(results, summary)

        return NextResponse.json({
          success: true,
          summary,
          results: results.map(r => ({
            testId: r.testId,
            testName: r.testName,
            passed: r.passed,
            score: r.score,
            aiRole: r.aiRole,
            userRole: r.userRole
          })),
          report,
          timestamp: new Date().toISOString()
        })

      case 'validate-model':
        const validationConfig: ModelValidationConfig = config || {
          ...DEFAULT_VALIDATION_CONFIG,
          modelName: model || '未命名模型',
          provider: provider || 'unknown'
        }

        console.log('[角色扮演测试] 开始模型验证:', validationConfig.modelName)

        const validation = await validateModelForRolePlay(
          validationConfig,
          callLLMWrapper
        )

        return NextResponse.json({
          success: validation.valid,
          valid: validation.valid,
          message: validation.message,
          modelName: validationConfig.modelName,
          provider: validationConfig.provider,
          summary: validation.summary,
          requiredPassRate: validationConfig.requiredPassRate,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: '未知的操作类型',
            supportedActions: ['run-all', 'validate-model', 'list-tests']
          },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('[角色扮演测试] 错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '测试执行失败'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    name: '角色扮演功能测试 API',
    description: '用于验证AI角色模拟的准确性和一致性',
    endpoints: {
      'POST /api/test/role-play': {
        description: '执行角色扮演测试',
        actions: {
          'list-tests': '列出所有测试用例',
          'run-all': '运行所有测试用例',
          'validate-model': '验证新模型是否满足角色扮演要求'
        },
        parameters: {
          action: '操作类型 (list-tests | run-all | validate-model)',
          provider: '可选，LLM提供商',
          model: '可选，模型名称',
          config: 'validate-model时的验证配置'
        }
      }
    },
    testCoverage: {
      scenes: ['餐厅', '酒店', '商店', '机场', '办公室'],
      testCases: rolePlayTestCases.length,
      coreTests: 5,
      edgeCaseTests: 3
    },
    validationCriteria: {
      requiredPassRate: '70%',
      requiredTests: DEFAULT_VALIDATION_CONFIG.requiredTests
    }
  })
}
