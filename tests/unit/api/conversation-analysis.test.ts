/**
 * 对话分析结果解析单元测试
 *
 * 测试目标：验证 LLM 返回的对话评分 JSON 解析逻辑
 * 核心场景：换模型后，只要输出格式符合约定，评分维度解析就能正常工作
 *
 * 被测逻辑提取自 src/app/api/open-test/conversation-analysis/route.ts
 */

import { describe, it, expect } from 'vitest'

// ==================== 被测逻辑（从 route.ts 提取） ====================

interface ConversationAnalysisResult {
  overallScore: number
  dimensions: {
    content: number
    contentExplanation?: string
    grammar: number
    grammarExplanation?: string
    vocabulary: number
    vocabularyExplanation?: string
    pronunciation: number
    pronunciationExplanation?: string
    fluency: number
    fluencyExplanation?: string
  }
  suggestions: string[]
  conversationFlow: string
}

/** 默认兜底结果 */
function generateDefaultAnalysis(): ConversationAnalysisResult {
  return {
    overallScore: 70,
    dimensions: {
      content: 70,
      grammar: 70,
      vocabulary: 70,
      pronunciation: 70,
      fluency: 70,
    },
    suggestions: ['继续练习，保持进步'],
    conversationFlow: '对话基本流畅',
  }
}

/**
 * 从 LLM 响应中解析对话分析结果
 * 与 route.ts 中的解析逻辑保持一致
 */
function parseConversationAnalysis(content: string): ConversationAnalysisResult {
  if (!content?.trim()) return generateDefaultAnalysis()

  const jsonMatch = content.trim().match(/\{[\s\S]*\}/)
  if (!jsonMatch) return generateDefaultAnalysis()

  try {
    const parsed = JSON.parse(jsonMatch[0])

    // 验证必要字段
    if (
      typeof parsed.overallScore === 'number' &&
      parsed.dimensions &&
      typeof parsed.dimensions.content === 'number'
    ) {
      return {
        overallScore: parsed.overallScore,
        dimensions: {
          content: parsed.dimensions.content,
          contentExplanation: parsed.dimensions.contentExplanation,
          grammar: parsed.dimensions.grammar ?? 70,
          grammarExplanation: parsed.dimensions.grammarExplanation,
          vocabulary: parsed.dimensions.vocabulary ?? 70,
          vocabularyExplanation: parsed.dimensions.vocabularyExplanation,
          pronunciation: parsed.dimensions.pronunciation ?? 70,
          pronunciationExplanation: parsed.dimensions.pronunciationExplanation,
          fluency: parsed.dimensions.fluency ?? 70,
          fluencyExplanation: parsed.dimensions.fluencyExplanation,
        },
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        conversationFlow: parsed.conversationFlow || '对话已完成',
      }
    }
  } catch {
    // 解析失败
  }

  return generateDefaultAnalysis()
}

// ==================== 测试用例 ====================

describe('对话分析结果解析', () => {
  it('完整评分 JSON 正常解析', () => {
    const llmOutput = JSON.stringify({
      overallScore: 85,
      dimensions: {
        content: 88,
        contentExplanation: '内容丰富，切题',
        grammar: 82,
        grammarExplanation: '语法基本正确',
        vocabulary: 90,
        vocabularyExplanation: '词汇多样',
        pronunciation: 80,
        pronunciationExplanation: '发音清晰',
        fluency: 85,
        fluencyExplanation: '表达流畅',
      },
      suggestions: ['多练习复杂句型', '注意时态一致性'],
      conversationFlow: '对话自然流畅，话题推进合理',
    })

    const result = parseConversationAnalysis(llmOutput)

    expect(result.overallScore).toBe(85)
    expect(result.dimensions.content).toBe(88)
    expect(result.dimensions.vocabulary).toBe(90)
    expect(result.suggestions).toHaveLength(2)
    expect(result.conversationFlow).toContain('流畅')
  })

  it('分数在 0-100 范围内', () => {
    const llmOutput = JSON.stringify({
      overallScore: 95,
      dimensions: { content: 95, grammar: 90, vocabulary: 92, pronunciation: 88, fluency: 93 },
      suggestions: [],
      conversationFlow: '优秀',
    })

    const result = parseConversationAnalysis(llmOutput)

    expect(result.overallScore).toBeGreaterThanOrEqual(0)
    expect(result.overallScore).toBeLessThanOrEqual(100)
    expect(result.dimensions.content).toBeGreaterThanOrEqual(0)
    expect(result.dimensions.grammar).toBeLessThanOrEqual(100)
  })

  it('dimensions 缺少部分字段时，使用默认值 70', () => {
    const llmOutput = JSON.stringify({
      overallScore: 75,
      dimensions: { content: 75 }, // 只有 content
      suggestions: [],
      conversationFlow: '一般',
    })

    const result = parseConversationAnalysis(llmOutput)

    expect(result.dimensions.grammar).toBe(70)
    expect(result.dimensions.vocabulary).toBe(70)
    expect(result.dimensions.fluency).toBe(70)
  })

  it('explanation 字段可选，缺失时为 undefined', () => {
    const llmOutput = JSON.stringify({
      overallScore: 80,
      dimensions: { content: 80, grammar: 78, vocabulary: 82, pronunciation: 75, fluency: 80 },
      suggestions: ['建议1'],
      conversationFlow: '流畅',
    })

    const result = parseConversationAnalysis(llmOutput)

    expect(result.dimensions.contentExplanation).toBeUndefined()
    expect(result.dimensions.grammarExplanation).toBeUndefined()
  })

  it('LLM 返回空内容时，使用默认兜底结果', () => {
    const result = parseConversationAnalysis('')
    const defaultResult = generateDefaultAnalysis()

    expect(result.overallScore).toBe(defaultResult.overallScore)
    expect(result.dimensions.content).toBe(defaultResult.dimensions.content)
  })

  it('LLM 返回非 JSON 时，使用默认兜底结果', () => {
    const result = parseConversationAnalysis('很抱歉，我无法完成分析。')
    expect(result.overallScore).toBe(70)
  })

  it('JSON 前后有多余文字时，仍能正确提取', () => {
    const llmOutput = `
以下是分析结果：
{"overallScore": 78, "dimensions": {"content": 78, "grammar": 75, "vocabulary": 80, "pronunciation": 72, "fluency": 77}, "suggestions": ["加油"], "conversationFlow": "正常"}
分析完毕。
    `

    const result = parseConversationAnalysis(llmOutput)
    expect(result.overallScore).toBe(78)
  })

  it('suggestions 为非数组时，返回空数组', () => {
    const llmOutput = JSON.stringify({
      overallScore: 80,
      dimensions: { content: 80 },
      suggestions: '多练习', // 错误类型
      conversationFlow: '流畅',
    })

    const result = parseConversationAnalysis(llmOutput)
    expect(result.suggestions).toEqual([])
  })

  it('overallScore 缺失时，使用默认兜底结果', () => {
    const llmOutput = JSON.stringify({
      dimensions: { content: 80 },
      suggestions: [],
      conversationFlow: '流畅',
    })

    const result = parseConversationAnalysis(llmOutput)
    expect(result.overallScore).toBe(70) // 默认值
  })
})
