/**
 * 流畅度评分工具函数
 * 用于 AI 模拟对话阶段的得分计算和对话后处理分支判断
 */

/**
 * QA_Pair 回应状态
 * - fluent: 流畅通过（用户直接回答正确）
 * - prompted: 提示后通过（AI 提示后用户回答正确）
 * - failed: 未通过（用户未能正确回答）
 */
export type QAPairResultStatus = 'fluent' | 'prompted' | 'failed'

/**
 * 单个 QA_Pair 的回应结果
 */
export interface QAPairResult {
  /** QA_Pair 的 id */
  qaId: string
  /** 回应状态 */
  status: QAPairResultStatus
}

/**
 * 计算流畅度得分
 * 公式：流畅通过数 / mustSpeakCount × 100
 * 结果始终在 [0, 100] 范围内
 *
 * @param results 所有 QA_Pair 的回应结果列表
 * @param mustSpeakCount must_speak 类型 QA_Pair 的总数
 * @returns 流畅度得分（0-100 整数）
 */
export function calculateFluencyScore(
  results: QAPairResult[],
  mustSpeakCount: number
): number {
  // mustSpeakCount 为 0 时返回满分（无需说话的场景视为完全通过）
  if (mustSpeakCount === 0) return 100

  // 统计流畅通过的数量
  const fluentCount = results.filter(r => r.status === 'fluent').length

  // 计算得分并限制在 [0, 100] 范围内
  const score = (fluentCount / mustSpeakCount) * 100
  return Math.min(100, Math.max(0, Math.round(score)))
}

/**
 * 根据流畅度得分判断对话后处理分支
 * - score >= 60：进入"回听对比"流程（replay）
 * - score < 60：进入"定向重练"流程（retry）
 *
 * @param fluencyScore 流畅度得分（0-100）
 * @returns 'replay' 或 'retry'
 */
export function getReviewBranch(fluencyScore: number): 'replay' | 'retry' {
  return fluencyScore >= 60 ? 'replay' : 'retry'
}
