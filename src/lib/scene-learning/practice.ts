/**
 * 练习题生成工具函数
 * 根据子场景的 QA_Pair 列表，生成选择题、填空题、问答题三种题型
 */

import type { QAPair } from '@/lib/db/schema'
import type { PracticeQuestion, QAResponse, ChoiceOption, BlankItem } from '@/types'

/**
 * 从 QAPair 的 responses 字段中安全解析出 QAResponse 数组
 */
function parseResponses(responses: unknown): QAResponse[] {
  if (!Array.isArray(responses)) return []
  return responses as QAResponse[]
}

/**
 * 生成选择题
 * 从 must_speak 类型的 QA_Pair 生成：播放 speaker_text 音频，4个选项（1个正确 + 3个干扰项）
 * 干扰项从其他 QA_Pair 的 responses 中取
 */
function generateChoiceQuestion(
  targetQa: QAPair,
  allQaPairs: QAPair[]
): PracticeQuestion | null {
  const responses = parseResponses(targetQa.responses)
  if (responses.length === 0) return null

  // 正确答案取第一条 response
  const correctResponse = responses[0]
  const correctOption: ChoiceOption = {
    id: `${targetQa.id}_correct`,
    text: correctResponse.text,
    isCorrect: true,
  }

  // 收集干扰项：从其他 QA_Pair 的 responses 中取
  const distractors: ChoiceOption[] = []
  for (const qa of allQaPairs) {
    if (qa.id === targetQa.id) continue
    const otherResponses = parseResponses(qa.responses)
    for (const resp of otherResponses) {
      // 避免与正确答案重复
      if (resp.text !== correctResponse.text) {
        distractors.push({
          id: `${qa.id}_distractor_${distractors.length}`,
          text: resp.text,
          isCorrect: false,
        })
      }
      if (distractors.length >= 3) break
    }
    if (distractors.length >= 3) break
  }

  // 干扰项不足3个时无法生成有效选择题
  if (distractors.length < 3) return null

  // 将正确答案随机插入4个选项中
  const options = [...distractors.slice(0, 3)]
  const insertIndex = Math.floor(Math.random() * 4)
  options.splice(insertIndex, 0, correctOption)

  return {
    type: 'choice',
    qaId: targetQa.id,
    audioUrl: targetQa.audioUrl ?? '',
    options,
  }
}

/**
 * 从句子中提取关键词并生成填空模板
 * 策略：将句子中的实义词（名词、动词、形容词等）替换为 ___
 * 简单实现：取句子中长度 >= 3 的单词作为关键词候选，选取1-2个
 */
function generateFillBlankTemplate(
  text: string
): { template: string; blanks: BlankItem[] } | null {
  // 将句子按单词分割，保留标点
  const words = text.split(/(\s+)/)
  const wordTokens: { word: string; index: number; isWord: boolean }[] = []

  let wordIndex = 0
  for (const token of words) {
    const trimmed = token.trim()
    if (trimmed.length > 0) {
      // 去除标点后的纯单词
      const pureWord = trimmed.replace(/[^a-zA-Z']/g, '')
      const isWord = pureWord.length >= 3
      wordTokens.push({ word: token, index: wordIndex, isWord })
      if (isWord) wordIndex++
    }
  }

  // 找出可作为关键词的单词（长度 >= 3 的实义词）
  const candidateIndices: number[] = []
  let realWordIdx = 0
  const realWords: string[] = []

  for (const token of text.split(/\s+/)) {
    const pureWord = token.replace(/[^a-zA-Z']/g, '')
    if (pureWord.length >= 3) {
      // 跳过常见虚词
      const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'did', 'did', 'let', 'put', 'say', 'she', 'too', 'use', 'that', 'this', 'with', 'have', 'from', 'they', 'will', 'been', 'when', 'what', 'your', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other', 'into', 'than', 'then', 'some', 'these', 'about', 'would', 'make', 'like', 'just', 'know', 'take', 'into', 'year', 'good', 'much', 'also', 'well', 'back', 'come', 'here', 'more', 'very', 'even', 'most', 'give', 'over', 'such', 'after', 'think', 'where', 'being', 'those', 'never', 'still', 'should', 'before', 'through', 'because', 'between', 'please'])
      if (!stopWords.has(pureWord.toLowerCase())) {
        candidateIndices.push(realWordIdx)
        realWords.push(pureWord)
      }
      realWordIdx++
    }
  }

  if (candidateIndices.length === 0) return null

  // 选取1-2个关键词作为空格（优先选中间位置的词）
  const maxBlanks = Math.min(2, candidateIndices.length)
  const selectedIndices = candidateIndices.slice(
    Math.floor(candidateIndices.length / 2) - Math.floor(maxBlanks / 2),
    Math.floor(candidateIndices.length / 2) - Math.floor(maxBlanks / 2) + maxBlanks
  ).filter(i => i !== undefined)

  if (selectedIndices.length === 0) {
    // 退回到取第一个候选词
    selectedIndices.push(candidateIndices[0])
  }

  // 构建模板：将选中的关键词替换为 ___
  const blanks: BlankItem[] = []
  let blankIndex = 0
  let realWordCount = 0
  const resultParts: string[] = []

  for (const token of text.split(/(\s+)/)) {
    const trimmed = token.trim()
    if (trimmed.length === 0) {
      resultParts.push(token)
      continue
    }
    const pureWord = trimmed.replace(/[^a-zA-Z']/g, '')
    if (pureWord.length >= 3) {
      if (selectedIndices.includes(realWordCount)) {
        // 保留标点（如句末的句号）
        const punctuation = trimmed.replace(/[a-zA-Z']/g, '')
        blanks.push({ index: blankIndex++, answer: pureWord })
        resultParts.push('___' + punctuation)
      } else {
        resultParts.push(token)
      }
      realWordCount++
    } else {
      resultParts.push(token)
    }
  }

  if (blanks.length === 0) return null

  return {
    template: resultParts.join(''),
    blanks,
  }
}

/**
 * 生成填空题
 * 从 must_speak 类型的 QA_Pair 的第一条 response 生成
 */
function generateFillBlankQuestion(targetQa: QAPair): PracticeQuestion | null {
  const responses = parseResponses(targetQa.responses)
  if (responses.length === 0) return null

  const firstResponse = responses[0]
  const result = generateFillBlankTemplate(firstResponse.text)
  if (!result) return null

  return {
    type: 'fill_blank',
    qaId: targetQa.id,
    template: result.template,
    blanks: result.blanks,
  }
}

/**
 * 生成问答题
 * 从 must_speak 类型的 QA_Pair 生成，展示 speaker_text 要求语音回答
 */
function generateSpeakingQuestion(targetQa: QAPair): PracticeQuestion {
  return {
    type: 'speaking',
    qaId: targetQa.id,
    speakerText: targetQa.speakerText,
    speakerTextCn: targetQa.speakerTextCn,
  }
}

/**
 * 根据 QA_Pair 列表生成练习题
 * 顺序：选择题 → 填空题 → 问答题
 * 仅从 must_speak 类型的 QA_Pair 生成题目
 *
 * @param qaPairs 子场景下的所有问答对
 * @returns 练习题数组（选择题 + 填空题 + 问答题）
 */
export function generatePracticeQuestions(qaPairs: QAPair[]): PracticeQuestion[] {
  // 筛选出 must_speak 类型的 QA_Pair
  const mustSpeakQas = qaPairs.filter(qa => qa.qaType === 'must_speak')

  const choiceQuestions: PracticeQuestion[] = []
  const fillBlankQuestions: PracticeQuestion[] = []
  const speakingQuestions: PracticeQuestion[] = []

  for (const qa of mustSpeakQas) {
    // 生成选择题
    const choiceQ = generateChoiceQuestion(qa, qaPairs)
    if (choiceQ) choiceQuestions.push(choiceQ)

    // 生成填空题
    const fillQ = generateFillBlankQuestion(qa)
    if (fillQ) fillBlankQuestions.push(fillQ)

    // 生成问答题（每个 must_speak QA_Pair 都生成一道）
    speakingQuestions.push(generateSpeakingQuestion(qa))
  }

  // 按选择题 → 填空题 → 问答题顺序返回
  return [...choiceQuestions, ...fillBlankQuestions, ...speakingQuestions]
}
