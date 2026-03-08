/**
 * 练习题生成工具函数
 * 根据子场景的 QA_Pair 列表，生成选择题、填空题、问答题三种题型
 * 支持两种对话模式：
 * - user_responds: 用户回应型，听问题选回答
 * - user_asks: 用户提问型，看场景选提问
 */

import type { QAPair } from '@/lib/db/schema'
import type { PracticeQuestion, FollowUp, ChoiceOption, BlankItem } from '@/types'

/**
 * 从 QAPair 的 followUps 字段中安全解析出 FollowUp 数组
 */
function parseFollowUps(followUps: unknown): FollowUp[] {
  if (!Array.isArray(followUps)) return []
  return followUps as FollowUp[]
}

/**
 * 生成选择题 - user_responds 模式
 * 播放 triggerText 音频，4个选项（1个正确回应 + 3个干扰项）
 */
function generateChoiceQuestionUserResponds(
  targetQa: QAPair,
  allQaPairs: QAPair[]
): PracticeQuestion | null {
  const followUps = parseFollowUps(targetQa.followUps)
  if (followUps.length === 0) return null

  const correctFollowUp = followUps[0]
  const correctOption: ChoiceOption = {
    id: `${targetQa.id}_correct`,
    text: correctFollowUp.text,
    isCorrect: true,
  }

  const distractors: ChoiceOption[] = []
  for (const qa of allQaPairs) {
    if (qa.id === targetQa.id) continue
    const otherFollowUps = parseFollowUps(qa.followUps)
    for (const followUp of otherFollowUps) {
      if (followUp.text !== correctFollowUp.text) {
        distractors.push({
          id: `${qa.id}_distractor_${distractors.length}`,
          text: followUp.text,
          isCorrect: false,
        })
      }
      if (distractors.length >= 3) break
    }
    if (distractors.length >= 3) break
  }

  if (distractors.length < 3) return null

  const options = [...distractors.slice(0, 3)]
  const insertIndex = Math.floor(Math.random() * 4)
  options.splice(insertIndex, 0, correctOption)

  return {
    type: 'choice',
    qaId: targetQa.id,
    audioUrl: targetQa.audioUrl ?? '',
    triggerText: targetQa.triggerText,
    triggerTextCn: targetQa.triggerTextCn,
    options,
    dialogueMode: 'user_responds',
  }
}

/**
 * 生成选择题 - user_asks 模式
 * 展示场景提示，4个选项（1个正确提问 + 3个干扰项）
 */
function generateChoiceQuestionUserAsks(
  targetQa: QAPair,
  allQaPairs: QAPair[]
): PracticeQuestion | null {
  const correctOption: ChoiceOption = {
    id: `${targetQa.id}_correct`,
    text: targetQa.triggerText,
    isCorrect: true,
  }

  const distractors: ChoiceOption[] = []
  for (const qa of allQaPairs) {
    if (qa.id === targetQa.id) continue
    if (qa.dialogueMode !== 'user_asks') continue
    if (qa.triggerText !== targetQa.triggerText) {
      distractors.push({
        id: `${qa.id}_distractor_${distractors.length}`,
        text: qa.triggerText,
        isCorrect: false,
      })
    }
    if (distractors.length >= 3) break
  }

  if (distractors.length < 3) {
    const allTriggerTexts = allQaPairs
      .filter(qa => qa.id !== targetQa.id && qa.triggerText !== targetQa.triggerText)
      .map(qa => qa.triggerText)
    
    const uniqueTexts = [...new Set(allTriggerTexts)]
    for (const text of uniqueTexts) {
      if (distractors.length >= 3) break
      distractors.push({
        id: `distractor_${distractors.length}`,
        text,
        isCorrect: false,
      })
    }
  }

  if (distractors.length < 3) return null

  const options = [...distractors.slice(0, 3)]
  const insertIndex = Math.floor(Math.random() * 4)
  options.splice(insertIndex, 0, correctOption)

  return {
    type: 'choice',
    qaId: targetQa.id,
    scenarioHint: targetQa.scenarioHintCn ?? '',
    options,
    dialogueMode: 'user_asks',
  }
}

/**
 * 从句子中提取关键词并生成填空模板
 */
function generateFillBlankTemplate(
  text: string
): { template: string; blanks: BlankItem[] } | null {
  const words = text.split(/(\s+)/)
  const wordTokens: { word: string; index: number; isWord: boolean }[] = []

  let wordIndex = 0
  for (const token of words) {
    const trimmed = token.trim()
    if (trimmed.length > 0) {
      const pureWord = trimmed.replace(/[^a-zA-Z']/g, '')
      const isWord = pureWord.length >= 3
      wordTokens.push({ word: token, index: wordIndex, isWord })
      if (isWord) wordIndex++
    }
  }

  const candidateIndices: number[] = []
  let realWordIdx = 0
  const realWords: string[] = []

  for (const token of text.split(/\s+/)) {
    const pureWord = token.replace(/[^a-zA-Z']/g, '')
    if (pureWord.length >= 3) {
      const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'did', 'did', 'let', 'put', 'say', 'she', 'too', 'use', 'that', 'this', 'with', 'have', 'from', 'they', 'will', 'been', 'when', 'what', 'your', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other', 'into', 'than', 'then', 'some', 'these', 'about', 'would', 'make', 'like', 'just', 'know', 'take', 'into', 'year', 'good', 'much', 'also', 'well', 'back', 'come', 'here', 'more', 'very', 'even', 'most', 'give', 'over', 'such', 'after', 'think', 'where', 'being', 'those', 'never', 'still', 'should', 'before', 'through', 'because', 'between', 'please'])
      if (!stopWords.has(pureWord.toLowerCase())) {
        candidateIndices.push(realWordIdx)
        realWords.push(pureWord)
      }
      realWordIdx++
    }
  }

  if (candidateIndices.length === 0) return null

  const maxBlanks = Math.min(2, candidateIndices.length)
  const selectedIndices = candidateIndices.slice(
    Math.floor(candidateIndices.length / 2) - Math.floor(maxBlanks / 2),
    Math.floor(candidateIndices.length / 2) - Math.floor(maxBlanks / 2) + maxBlanks
  ).filter(i => i !== undefined)

  if (selectedIndices.length === 0) {
    selectedIndices.push(candidateIndices[0])
  }

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
 * 生成填空题 - user_responds 模式
 * 填空回应内容（followUps[0]）
 */
function generateFillBlankQuestionUserResponds(targetQa: QAPair): PracticeQuestion | null {
  const followUps = parseFollowUps(targetQa.followUps)
  if (followUps.length === 0) return null

  const firstFollowUp = followUps[0]
  const result = generateFillBlankTemplate(firstFollowUp.text)
  if (!result) return null

  return {
    type: 'fill_blank',
    qaId: targetQa.id,
    template: result.template,
    blanks: result.blanks,
    dialogueMode: 'user_responds',
  }
}

/**
 * 生成填空题 - user_asks 模式
 * 填空提问内容（triggerText）
 */
function generateFillBlankQuestionUserAsks(targetQa: QAPair): PracticeQuestion | null {
  const result = generateFillBlankTemplate(targetQa.triggerText)
  if (!result) return null

  return {
    type: 'fill_blank',
    qaId: targetQa.id,
    template: result.template,
    blanks: result.blanks,
    scenarioHint: targetQa.scenarioHintCn ?? '',
    dialogueMode: 'user_asks',
  }
}

/**
 * 生成问答题 - user_responds 模式
 * 展示 triggerText 要求语音回答
 */
function generateSpeakingQuestionUserResponds(targetQa: QAPair): PracticeQuestion {
  return {
    type: 'speaking',
    qaId: targetQa.id,
    triggerText: targetQa.triggerText,
    triggerTextCn: targetQa.triggerTextCn,
    dialogueMode: 'user_responds',
  }
}

/**
 * 生成问答题 - user_asks 模式
 * 展示场景提示要求语音提问
 */
function generateSpeakingQuestionUserAsks(targetQa: QAPair): PracticeQuestion {
  return {
    type: 'speaking',
    qaId: targetQa.id,
    triggerText: targetQa.triggerText,
    triggerTextCn: targetQa.triggerTextCn,
    scenarioHint: targetQa.scenarioHintCn ?? '',
    dialogueMode: 'user_asks',
  }
}

/**
 * 根据 QA_Pair 列表生成练习题
 * 顺序：选择题 → 填空题 → 问答题
 * 
 * 支持两种对话模式：
 * - user_responds (speak_followup): 听问题选回答
 * - user_asks (speak_trigger): 看场景选提问
 *
 * @param qaPairs 子场景下的所有问答对
 * @returns 练习题数组（选择题 + 填空题 + 问答题）
 */
export function generatePracticeQuestions(qaPairs: QAPair[]): PracticeQuestion[] {
  const choiceQuestions: PracticeQuestion[] = []
  const fillBlankQuestions: PracticeQuestion[] = []
  const speakingQuestions: PracticeQuestion[] = []

  for (const qa of qaPairs) {
    if (qa.learnRequirement === 'speak_followup') {
      const choiceQ = generateChoiceQuestionUserResponds(qa, qaPairs)
      if (choiceQ) choiceQuestions.push(choiceQ)

      const fillQ = generateFillBlankQuestionUserResponds(qa)
      if (fillQ) fillBlankQuestions.push(fillQ)

      speakingQuestions.push(generateSpeakingQuestionUserResponds(qa))
    } else if (qa.learnRequirement === 'speak_trigger') {
      const choiceQ = generateChoiceQuestionUserAsks(qa, qaPairs)
      if (choiceQ) choiceQuestions.push(choiceQ)

      const fillQ = generateFillBlankQuestionUserAsks(qa)
      if (fillQ) fillBlankQuestions.push(fillQ)

      speakingQuestions.push(generateSpeakingQuestionUserAsks(qa))
    }
  }

  return [...choiceQuestions, ...fillBlankQuestions, ...speakingQuestions]
}
