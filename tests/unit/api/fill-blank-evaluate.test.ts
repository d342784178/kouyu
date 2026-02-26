/**
 * 填空题/问答题评测逻辑单元测试
 *
 * 测试目标：验证 LLM 返回的 JSON 解析逻辑是否健壮
 * 核心场景：换模型后，只要输出格式符合约定，业务逻辑就能正常工作
 *
 * 被测逻辑提取自 src/app/api/fill-blank/evaluate/route.ts
 */

import { describe, it, expect } from 'vitest'

// ==================== 被测逻辑（从 route.ts 提取） ====================

interface EvaluationResult {
  isCorrect: boolean
  analysis: string
  suggestions: string[]
}

const DEFAULT_RESULT: EvaluationResult = {
  isCorrect: false,
  analysis: '回答已提交。',
  suggestions: ['继续保持良好的学习习惯'],
}

/**
 * 从 LLM 响应中解析评测结果
 * 与 route.ts 中的解析逻辑保持一致
 */
function parseEvaluationResult(content: string): EvaluationResult {
  if (!content) return { ...DEFAULT_RESULT }

  const trimmedContent = content.trim()
  const jsonMatch = trimmedContent.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { ...DEFAULT_RESULT }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (typeof parsed.isCorrect === 'boolean' && parsed.analysis) {
      return {
        isCorrect: parsed.isCorrect,
        analysis: parsed.analysis,
        suggestions: parsed.suggestions || [],
      }
    }
  } catch {
    // 解析失败，返回默认值
  }

  return { ...DEFAULT_RESULT }
}

// ==================== 测试用例 ====================

describe('填空题评测结果解析', () => {
  it('标准 JSON 响应：正确答案', () => {
    const llmOutput = JSON.stringify({
      isCorrect: true,
      analysis: '回答正确，语法准确。',
      suggestions: ['可以尝试更多同义词表达'],
    })

    const result = parseEvaluationResult(llmOutput)

    expect(result.isCorrect).toBe(true)
    expect(result.analysis).toBe('回答正确，语法准确。')
    expect(result.suggestions).toHaveLength(1)
  })

  it('标准 JSON 响应：错误答案', () => {
    const llmOutput = JSON.stringify({
      isCorrect: false,
      analysis: '用户使用了 see，但正确答案是 meet。',
      suggestions: ['注意固定搭配 nice to meet you', '多练习问候语'],
    })

    const result = parseEvaluationResult(llmOutput)

    expect(result.isCorrect).toBe(false)
    expect(result.suggestions).toHaveLength(2)
  })

  it('JSON 前后有多余文字时，仍能正确提取', () => {
    const llmOutput = `
好的，以下是我的评测结果：
{"isCorrect": true, "analysis": "回答正确", "suggestions": ["建议1"]}
希望对你有帮助。
    `

    const result = parseEvaluationResult(llmOutput)
    expect(result.isCorrect).toBe(true)
    expect(result.analysis).toBe('回答正确')
  })

  it('JSON 包含 markdown 代码块时，仍能正确提取', () => {
    const llmOutput = '```json\n{"isCorrect": false, "analysis": "语法错误", "suggestions": []}\n```'

    const result = parseEvaluationResult(llmOutput)
    expect(result.isCorrect).toBe(false)
    expect(result.analysis).toBe('语法错误')
  })

  it('LLM 返回空内容时，使用默认结果', () => {
    const result = parseEvaluationResult('')
    expect(result).toEqual(DEFAULT_RESULT)
  })

  it('LLM 返回非 JSON 内容时，使用默认结果', () => {
    const result = parseEvaluationResult('抱歉，我无法处理这个请求。')
    expect(result).toEqual(DEFAULT_RESULT)
  })

  it('JSON 缺少 isCorrect 字段时，使用默认结果', () => {
    const llmOutput = JSON.stringify({ analysis: '分析内容', suggestions: [] })
    const result = parseEvaluationResult(llmOutput)
    expect(result).toEqual(DEFAULT_RESULT)
  })

  it('JSON 缺少 analysis 字段时，使用默认结果', () => {
    const llmOutput = JSON.stringify({ isCorrect: true, suggestions: [] })
    const result = parseEvaluationResult(llmOutput)
    expect(result).toEqual(DEFAULT_RESULT)
  })

  it('suggestions 字段缺失时，返回空数组', () => {
    const llmOutput = JSON.stringify({ isCorrect: true, analysis: '正确' })
    const result = parseEvaluationResult(llmOutput)
    expect(result.suggestions).toEqual([])
  })

  it('isCorrect 为字符串 "true" 时，不通过验证（类型严格）', () => {
    const llmOutput = JSON.stringify({ isCorrect: 'true', analysis: '分析' })
    const result = parseEvaluationResult(llmOutput)
    // 字符串 "true" 不是 boolean，应回退到默认值
    expect(result).toEqual(DEFAULT_RESULT)
  })

  it('analysis 为中文内容时，正常解析', () => {
    const llmOutput = JSON.stringify({
      isCorrect: true,
      analysis: '用户的回答"meet"完全正确，符合英语固定搭配"nice to meet you"的用法。',
      suggestions: ['可以学习更多问候语固定搭配', '尝试在不同语境中使用'],
    })

    const result = parseEvaluationResult(llmOutput)
    expect(result.analysis).toContain('meet')
    expect(result.suggestions).toHaveLength(2)
  })
})
