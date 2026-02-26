/**
 * 对话分析结果解析单元测试
 *
 * 测试目标：验证 LLM 返回的对话评分 JSON 解析逻辑
 * 核心变更：overallScore 由代码层计算（5维度均值），LLM 不再返回该字段
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

/** 默认兜底结果（LLM 调用或解析失败时使用） */
function generateDefaultAnalysis(): ConversationAnalysisResult {
  return {
    overallScore: 70,
    dimensions: {
      content: 70,
      contentExplanation: '评测服务暂时不可用，请稍后重试',
      grammar: 70,
      grammarExplanation: '评测服务暂时不可用，请稍后重试',
      vocabulary: 70,
      vocabularyExplanation: '评测服务暂时不可用，请稍后重试',
      pronunciation: 70,
      pronunciationExplanation: '评测服务暂时不可用，请稍后重试',
      fluency: 70,
      fluencyExplanation: '评测服务暂时不可用，请稍后重试',
    },
    suggestions: ['评测服务暂时不可用，请稍后重试'],
    conversationFlow: '评测服务暂时不可用，无法完成本次对话分析，请稍后重试。',
  }
}

/**
 * 从 LLM 响应中解析对话分析结果
 * 与 route.ts 中的解析逻辑保持一致
 * 注意：LLM 不再返回 overallScore，由代码层计算
 */
function parseConversationAnalysis(content: string): ConversationAnalysisResult {
  if (!content?.trim()) return generateDefaultAnalysis()

  const jsonMatch = content.trim().match(/\{[\s\S]*\}/)
  if (!jsonMatch) return generateDefaultAnalysis()

  try {
    const parsed = JSON.parse(jsonMatch[0])
    const d = parsed.dimensions

    // 验证必要字段：dimensions.content 必须存在，suggestions 必须是数组
    if (
      d &&
      typeof d.content === 'number' &&
      Array.isArray(parsed.suggestions)
    ) {
      // overallScore = 5个维度均值，代码层计算
      const overallScore = Math.round(
        ((d.content ?? 70) + (d.grammar ?? 70) + (d.vocabulary ?? 70) + (d.pronunciation ?? 70) + (d.fluency ?? 70)) / 5
      )
      return {
        overallScore,
        dimensions: {
          content: d.content ?? 70,
          contentExplanation: d.contentExplanation,
          grammar: d.grammar ?? 70,
          grammarExplanation: d.grammarExplanation,
          vocabulary: d.vocabulary ?? 70,
          vocabularyExplanation: d.vocabularyExplanation,
          pronunciation: d.pronunciation ?? 70,
          pronunciationExplanation: d.pronunciationExplanation,
          fluency: d.fluency ?? 70,
          fluencyExplanation: d.fluencyExplanation,
        },
        suggestions: parsed.suggestions,
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
  it('完整评分 JSON 正常解析，overallScore 由代码计算', () => {
    const llmOutput = JSON.stringify({
      dimensions: {
        content: 80,
        contentExplanation: '内容切题',
        grammar: 90,
        grammarExplanation: '语法正确',
        vocabulary: 70,
        vocabularyExplanation: '词汇中等',
        pronunciation: 60,
        pronunciationExplanation: '发音一般',
        fluency: 100,
        fluencyExplanation: '非常流畅',
      },
      suggestions: ['多练习复杂句型', '注意时态一致性'],
      conversationFlow: '对话自然流畅',
    })

    const result = parseConversationAnalysis(llmOutput)

    // overallScore = (80+90+70+60+100)/5 = 80
    expect(result.overallScore).toBe(80)
    expect(result.dimensions.content).toBe(80)
    expect(result.dimensions.grammar).toBe(90)
    expect(result.suggestions).toHaveLength(2)
    expect(result.conversationFlow).toContain('流畅')
  })

  it('overallScore 是 5 个维度的均值（四舍五入）', () => {
    const llmOutput = JSON.stringify({
      dimensions: { content: 75, grammar: 82, vocabulary: 68, pronunciation: 71, fluency: 79 },
      suggestions: [],
      conversationFlow: '正常',
    })

    const result = parseConversationAnalysis(llmOutput)
    // (75+82+68+71+79)/5 = 375/5 = 75
    expect(result.overallScore).toBe(75)
  })

  it('overallScore 四舍五入到整数', () => {
    const llmOutput = JSON.stringify({
      dimensions: { content: 80, grammar: 80, vocabulary: 80, pronunciation: 80, fluency: 81 },
      suggestions: [],
      conversationFlow: '正常',
    })

    const result = parseConversationAnalysis(llmOutput)
    // (80+80+80+80+81)/5 = 401/5 = 80.2 → 80
    expect(result.overallScore).toBe(80)
    expect(Number.isInteger(result.overallScore)).toBe(true)
  })

  it('dimensions 缺少部分字段时，缺失维度使用默认值 70', () => {
    const llmOutput = JSON.stringify({
      dimensions: { content: 75 }, // 只有 content
      suggestions: [],
      conversationFlow: '一般',
    })

    const result = parseConversationAnalysis(llmOutput)

    expect(result.dimensions.grammar).toBe(70)
    expect(result.dimensions.vocabulary).toBe(70)
    expect(result.dimensions.fluency).toBe(70)
    // overallScore = (75+70+70+70+70)/5 = 71
    expect(result.overallScore).toBe(71)
  })

  it('explanation 字段可选，缺失时为 undefined', () => {
    const llmOutput = JSON.stringify({
      dimensions: { content: 80, grammar: 78, vocabulary: 82, pronunciation: 75, fluency: 80 },
      suggestions: ['建议1'],
      conversationFlow: '流畅',
    })

    const result = parseConversationAnalysis(llmOutput)

    expect(result.dimensions.contentExplanation).toBeUndefined()
    expect(result.dimensions.grammarExplanation).toBeUndefined()
  })

  it('LLM 返回空内容时，使用兜底结果（所有维度为 70）', () => {
    const result = parseConversationAnalysis('')
    expect(result.overallScore).toBe(70)
    expect(result.dimensions.content).toBe(70)
    expect(result.suggestions[0]).toContain('暂时不可用')
  })

  it('LLM 返回非 JSON 时，使用兜底结果', () => {
    const result = parseConversationAnalysis('很抱歉，我无法完成分析。')
    expect(result.overallScore).toBe(70)
    expect(result.conversationFlow).toContain('暂时不可用')
  })

  it('JSON 前后有多余文字时，仍能正确提取', () => {
    const llmOutput = `
以下是分析结果：
{"dimensions": {"content": 78, "grammar": 75, "vocabulary": 80, "pronunciation": 72, "fluency": 77}, "suggestions": ["加油"], "conversationFlow": "正常"}
分析完毕。
    `

    const result = parseConversationAnalysis(llmOutput)
    // (78+75+80+72+77)/5 = 382/5 = 76.4 → 76
    expect(result.overallScore).toBe(76)
    expect(result.dimensions.content).toBe(78)
  })

  it('suggestions 为非数组时，回退到兜底结果', () => {
    const llmOutput = JSON.stringify({
      dimensions: { content: 80 },
      suggestions: '多练习', // 错误类型
      conversationFlow: '流畅',
    })

    const result = parseConversationAnalysis(llmOutput)
    // suggestions 不是数组，验证失败，返回兜底
    expect(result.overallScore).toBe(70)
  })

  it('dimensions 缺失时，使用兜底结果', () => {
    const llmOutput = JSON.stringify({
      suggestions: [],
      conversationFlow: '流畅',
    })

    const result = parseConversationAnalysis(llmOutput)
    expect(result.overallScore).toBe(70)
  })

  it('dimensions.content 不是数字时，使用兜底结果', () => {
    const llmOutput = JSON.stringify({
      dimensions: { content: '80', grammar: 75 }, // content 是字符串
      suggestions: [],
      conversationFlow: '流畅',
    })

    const result = parseConversationAnalysis(llmOutput)
    expect(result.overallScore).toBe(70)
  })

  it('分数在 0-100 范围内', () => {
    const llmOutput = JSON.stringify({
      dimensions: { content: 95, grammar: 90, vocabulary: 92, pronunciation: 88, fluency: 93 },
      suggestions: ['继续保持'],
      conversationFlow: '优秀',
    })

    const result = parseConversationAnalysis(llmOutput)

    expect(result.overallScore).toBeGreaterThanOrEqual(0)
    expect(result.overallScore).toBeLessThanOrEqual(100)
    Object.values(result.dimensions).forEach((v) => {
      if (typeof v === 'number') {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    })
  })
})
