/**
 * 场景学习增强模块 - 属性测试（Property-Based Testing）
 * 使用 fast-check 库，每个测试最少运行 100 次
 *
 * Feature: scene-learning-enhancement
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateFluencyScore,
  getReviewBranch,
  type QAPairResult,
  type QAPairResultStatus,
} from '@/lib/scene-learning/scoring'
import { validateFillBlankAnswer } from '@/lib/scene-learning/progress'
import { generatePracticeQuestions } from '@/lib/scene-learning/practice'
import type { QAPair } from '@/lib/db/schema'

// ============================================================
// Arbitrary 定义（fast-check 生成器）
// ============================================================

/** 生成合法的 QAPairResultStatus */
const statusArb = fc.constantFrom<QAPairResultStatus>('fluent', 'prompted', 'failed')

/** 生成单条 QAPairResult */
const qaResultArb = fc.record<QAPairResult>({
  qaId: fc.uuid(),
  status: statusArb,
})

/** 生成 QAPairResult 数组（0-20 条） */
const qaResultsArb = fc.array(qaResultArb, { minLength: 0, maxLength: 20 })

/** 生成合法的 mustSpeakCount（0-20） */
const mustSpeakCountArb = fc.integer({ min: 0, max: 20 })

/** 生成合法的 fluencyScore（0-100 整数） */
const fluencyScoreArb = fc.integer({ min: 0, max: 100 })

/** 生成最小化的 QAPair mock（仅含属性测试所需字段） */
function makeQAPair(overrides: Partial<QAPair> = {}): QAPair {
  return {
    id: 'qa-1',
    subSceneId: 'sub-1',
    qaType: 'must_speak',
    speakerText: 'What would you like?',
    speakerTextCn: '您想要什么？',
    audioUrl: null,
    responses: [
      { text: 'Hot coffee, please.', text_cn: '热咖啡，谢谢。', audio_url: '' },
    ],
    usageNote: null,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as QAPair
}

/** 生成 QAPair 数组的 Arbitrary */
const qaPairArb = fc.record({
  id: fc.uuid(),
  subSceneId: fc.uuid(),
  qaType: fc.constantFrom<'must_speak' | 'optional'>('must_speak', 'optional'),
  speakerText: fc.string({ minLength: 1, maxLength: 80 }),
  speakerTextCn: fc.string({ minLength: 1, maxLength: 80 }),
  audioUrl: fc.option(fc.string(), { nil: null }),
  responses: fc.array(
    fc.record({
      text: fc.string({ minLength: 3, maxLength: 60 }),
      text_cn: fc.string({ minLength: 1, maxLength: 60 }),
      audio_url: fc.string(),
    }),
    { minLength: 1, maxLength: 4 }
  ),
  usageNote: fc.option(fc.string(), { nil: null }),
  order: fc.integer({ min: 1, max: 20 }),
  createdAt: fc.constant(new Date()),
  updatedAt: fc.constant(new Date()),
})

// ============================================================
// Property 1: calculateFluencyScore 输出始终在 [0, 100]
// ============================================================

describe('calculateFluencyScore', () => {
  it(
    // Feature: scene-learning-enhancement, Property 1: score is always in [0, 100]
    'Property 1: 输出始终在 [0, 100] 范围内',
    () => {
      fc.assert(
        fc.property(qaResultsArb, mustSpeakCountArb, (results, mustSpeakCount) => {
          const score = calculateFluencyScore(results, mustSpeakCount)
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(100)
        }),
        { numRuns: 100 }
      )
    }
  )

  it(
    // Feature: scene-learning-enhancement, Property 2: score is an integer
    'Property 2: 输出始终为整数',
    () => {
      fc.assert(
        fc.property(qaResultsArb, mustSpeakCountArb, (results, mustSpeakCount) => {
          const score = calculateFluencyScore(results, mustSpeakCount)
          expect(Number.isInteger(score)).toBe(true)
        }),
        { numRuns: 100 }
      )
    }
  )

  it(
    // Feature: scene-learning-enhancement, Property 3: mustSpeakCount=0 always returns 100
    'Property 3: mustSpeakCount 为 0 时始终返回 100',
    () => {
      fc.assert(
        fc.property(qaResultsArb, (results) => {
          const score = calculateFluencyScore(results, 0)
          expect(score).toBe(100)
        }),
        { numRuns: 100 }
      )
    }
  )

  it(
    // Feature: scene-learning-enhancement, Property 4: all-fluent results yield score >= 60
    'Property 4: 全部 fluent 时得分 >= 60',
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (count) => {
            const results: QAPairResult[] = Array.from({ length: count }, (_, i) => ({
              qaId: `qa-${i}`,
              status: 'fluent' as QAPairResultStatus,
            }))
            const score = calculateFluencyScore(results, count)
            expect(score).toBeGreaterThanOrEqual(60)
          }
        ),
        { numRuns: 100 }
      )
    }
  )

  it(
    // Feature: scene-learning-enhancement, Property 5: more fluent results never decrease score
    'Property 5: fluent 数量增加时得分不减少',
    () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          (mustSpeakCount, fluentCount) => {
            const clampedFluent = Math.min(fluentCount, mustSpeakCount)
            const results1: QAPairResult[] = Array.from({ length: clampedFluent }, (_, i) => ({
              qaId: `qa-${i}`,
              status: 'fluent' as QAPairResultStatus,
            }))
            // 再多加一个 fluent（如果还有空间）
            const extraFluent = clampedFluent < mustSpeakCount ? clampedFluent + 1 : clampedFluent
            const results2: QAPairResult[] = Array.from({ length: extraFluent }, (_, i) => ({
              qaId: `qa-${i}`,
              status: 'fluent' as QAPairResultStatus,
            }))
            const score1 = calculateFluencyScore(results1, mustSpeakCount)
            const score2 = calculateFluencyScore(results2, mustSpeakCount)
            expect(score2).toBeGreaterThanOrEqual(score1)
          }
        ),
        { numRuns: 100 }
      )
    }
  )
})

// ============================================================
// Property 6 & 7: getReviewBranch 分支判断
// ============================================================

describe('getReviewBranch', () => {
  it(
    // Feature: scene-learning-enhancement, Property 6: score >= 60 always returns 'replay'
    'Property 6: score >= 60 时始终返回 replay',
    () => {
      fc.assert(
        fc.property(fc.integer({ min: 60, max: 100 }), (score) => {
          expect(getReviewBranch(score)).toBe('replay')
        }),
        { numRuns: 100 }
      )
    }
  )

  it(
    // Feature: scene-learning-enhancement, Property 7: score < 60 always returns 'retry'
    'Property 7: score < 60 时始终返回 retry',
    () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 59 }), (score) => {
          expect(getReviewBranch(score)).toBe('retry')
        }),
        { numRuns: 100 }
      )
    }
  )
})

// ============================================================
// Property 8 & 9: validateFillBlankAnswer 空白验证
// ============================================================

describe('validateFillBlankAnswer', () => {
  it(
    // Feature: scene-learning-enhancement, Property 8: non-empty trimmed string returns true
    'Property 8: 含有非空白字符的字符串始终返回 true',
    () => {
      fc.assert(
        fc.property(
          // 生成至少含一个非空白字符的字符串
          fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          (answer) => {
            expect(validateFillBlankAnswer(answer)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    }
  )

  it(
    // Feature: scene-learning-enhancement, Property 9: whitespace-only string returns false
    'Property 9: 纯空白字符串始终返回 false',
    () => {
      fc.assert(
        fc.property(
          // 生成纯空白字符串（空格、制表符、换行）
          fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 10 })
            .map((chars) => chars.join('')),
          (answer) => {
            expect(validateFillBlankAnswer(answer)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    }
  )
})

// ============================================================
// Property 10 & 11: generatePracticeQuestions 练习题生成
// ============================================================

describe('generatePracticeQuestions', () => {
  it(
    // Feature: scene-learning-enhancement, Property 10: output count <= 3 * must_speak count
    'Property 10: 输出题目数量不超过 must_speak 数量的 3 倍',
    () => {
      fc.assert(
        fc.property(
          fc.array(qaPairArb, { minLength: 0, maxLength: 8 }),
          (qaPairs) => {
            const mustSpeakCount = qaPairs.filter((qa) => qa.qaType === 'must_speak').length
            const questions = generatePracticeQuestions(qaPairs as QAPair[])
            // 每个 must_speak QA_Pair 最多生成 3 道题（选择题+填空题+问答题）
            expect(questions.length).toBeLessThanOrEqual(mustSpeakCount * 3)
          }
        ),
        { numRuns: 100 }
      )
    }
  )

  it(
    // Feature: scene-learning-enhancement, Property 11: all output questions have valid type
    'Property 11: 所有输出题目的 type 均为合法值',
    () => {
      fc.assert(
        fc.property(
          fc.array(qaPairArb, { minLength: 0, maxLength: 8 }),
          (qaPairs) => {
            const questions = generatePracticeQuestions(qaPairs as QAPair[])
            const validTypes = new Set(['choice', 'fill_blank', 'speaking'])
            for (const q of questions) {
              expect(validTypes.has(q.type)).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    }
  )
})
