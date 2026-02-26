/**
 * 题目分析结果解析单元测试
 *
 * 测试目标：验证 LLM 返回的场景/角色/目标 JSON 解析逻辑
 * 核心场景：换模型后，只要输出格式符合约定，题目分析就能正常工作
 *
 * 被测逻辑提取自 src/app/api/open-test/analyze/route.ts
 */

import { describe, it, expect } from 'vitest'

// ==================== 被测逻辑（从 route.ts 提取） ====================

interface QuestionAnalysisResult {
  scene: string
  roles: string[]
  dialogueGoal: string
}

/**
 * 从 LLM 响应中解析题目分析结果
 * 与 route.ts 中的解析逻辑保持一致
 */
function parseQuestionAnalysis(content: string): QuestionAnalysisResult | null {
  if (!content?.trim()) return null

  const jsonMatch = content.trim().match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])

    if (
      typeof parsed.scene === 'string' &&
      Array.isArray(parsed.roles) &&
      typeof parsed.dialogueGoal === 'string'
    ) {
      return {
        scene: parsed.scene,
        roles: parsed.roles,
        dialogueGoal: parsed.dialogueGoal,
      }
    }
  } catch {
    // 解析失败
  }

  return null
}

// ==================== 测试用例 ====================

describe('题目分析结果解析', () => {
  it('标准 JSON 响应正常解析', () => {
    const llmOutput = JSON.stringify({
      scene: '餐厅',
      roles: ['顾客', '服务员'],
      dialogueGoal: '顾客向服务员点餐',
    })

    const result = parseQuestionAnalysis(llmOutput)

    expect(result).not.toBeNull()
    expect(result!.scene).toBe('餐厅')
    expect(result!.roles).toEqual(['顾客', '服务员'])
    expect(result!.dialogueGoal).toBe('顾客向服务员点餐')
  })

  it('roles 包含多个角色时正常解析', () => {
    const llmOutput = JSON.stringify({
      scene: '医院',
      roles: ['患者', '医生', '护士'],
      dialogueGoal: '患者向医生描述症状',
    })

    const result = parseQuestionAnalysis(llmOutput)

    expect(result!.roles).toHaveLength(3)
    expect(result!.roles).toContain('医生')
  })

  it('JSON 前后有多余文字时，仍能正确提取', () => {
    const llmOutput = `
根据题目分析，结果如下：
{"scene": "酒店", "roles": ["客人", "前台"], "dialogueGoal": "客人办理入住手续"}
以上是分析结果。
    `

    const result = parseQuestionAnalysis(llmOutput)
    expect(result!.scene).toBe('酒店')
  })

  it('JSON 包含 markdown 代码块时，仍能正确提取', () => {
    const llmOutput = '```json\n{"scene": "机场", "roles": ["旅客", "工作人员"], "dialogueGoal": "旅客询问登机口"}\n```'

    const result = parseQuestionAnalysis(llmOutput)
    expect(result!.scene).toBe('机场')
  })

  it('LLM 返回空内容时，返回 null', () => {
    expect(parseQuestionAnalysis('')).toBeNull()
    expect(parseQuestionAnalysis('   ')).toBeNull()
  })

  it('LLM 返回非 JSON 时，返回 null', () => {
    const result = parseQuestionAnalysis('我无法分析这道题目。')
    expect(result).toBeNull()
  })

  it('JSON 缺少 scene 字段时，返回 null', () => {
    const llmOutput = JSON.stringify({ roles: ['顾客'], dialogueGoal: '点餐' })
    expect(parseQuestionAnalysis(llmOutput)).toBeNull()
  })

  it('JSON 缺少 roles 字段时，返回 null', () => {
    const llmOutput = JSON.stringify({ scene: '餐厅', dialogueGoal: '点餐' })
    expect(parseQuestionAnalysis(llmOutput)).toBeNull()
  })

  it('roles 为非数组时，返回 null', () => {
    const llmOutput = JSON.stringify({ scene: '餐厅', roles: '顾客', dialogueGoal: '点餐' })
    expect(parseQuestionAnalysis(llmOutput)).toBeNull()
  })

  it('JSON 缺少 dialogueGoal 字段时，返回 null', () => {
    const llmOutput = JSON.stringify({ scene: '餐厅', roles: ['顾客'] })
    expect(parseQuestionAnalysis(llmOutput)).toBeNull()
  })

  it('场景名称为中文时正常解析', () => {
    const scenes = ['日常购物', '职场会议', '留学申请', '旅行问路', '社交聚会']
    for (const scene of scenes) {
      const llmOutput = JSON.stringify({ scene, roles: ['用户', 'AI'], dialogueGoal: '完成对话' })
      const result = parseQuestionAnalysis(llmOutput)
      expect(result!.scene).toBe(scene)
    }
  })
})
