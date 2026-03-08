/**
 * LLM 练习题生成 Prompt 模板
 * 用于生成选择题、填空题、问答题三种题型
 * 
 * 优化说明：
 * - 题目可基于子场景主题自主创作，不必完全依赖 QA_Pair
 * - QA_Pair 作为参考材料，帮助理解场景语境
 * - 每个子场景生成 6-9 道高质量练习题
 */

import type { SubScene, QAPair } from '@/lib/db/schema'
import type { FollowUp } from '@/types'

/**
 * 选择题输出结构
 */
export interface ChoiceQuestionOutput {
  type: 'choice'
  qaId: string | null
  triggerText: string
  triggerTextCn: string
  options: Array<{
    id: string
    text: string
    isCorrect: boolean
  }>
  explanation: string
}

/**
 * 填空题输出结构
 */
export interface FillBlankQuestionOutput {
  type: 'fill_blank'
  qaId: string | null
  template: string
  blanks: Array<{
    index: number
    answer: string
  }>
  hint: string
  knowledgePoint: string
}

/**
 * 问答题输出结构
 */
export interface SpeakingQuestionOutput {
  type: 'speaking'
  qaId: string | null
  triggerText: string
  triggerTextCn: string
  expectedAnswers: string[]
  evaluationCriteria: string[]
}

/**
 * 练习题输出联合类型
 */
export type PracticeQuestionOutput = ChoiceQuestionOutput | FillBlankQuestionOutput | SpeakingQuestionOutput

/**
 * LLM 输出 JSON 结构
 */
export interface PracticePromptOutput {
  questions: PracticeQuestionOutput[]
}

/**
 * 从 QAPair 的 followUps 字段中安全解析出 FollowUp 数组
 */
function parseFollowUps(followUps: unknown): FollowUp[] {
  if (!Array.isArray(followUps)) return []
  return followUps as FollowUp[]
}

/**
 * 格式化 QA_Pair 数据为 Prompt 输入格式
 */
function formatQaPairsForPrompt(qaPairs: QAPair[]): string {
  return qaPairs.map((qa, index) => {
    const followUps = parseFollowUps(qa.followUps)
    const followUpsText = followUps.map(r => `  - ${r.text}（${r.text_cn}）`).join('\n')

    return `[QA_${index + 1}] ID: ${qa.id}
类型: ${qa.learnRequirement}
对方说: ${qa.triggerText}
中文: ${qa.triggerTextCn}
标准回应:
${followUpsText}
${qa.usageNote ? `使用说明: ${qa.usageNote}` : ''}`
  }).join('\n\n')
}

/**
 * 构建 LLM 练习题生成 Prompt
 * 
 * @param subScene 子场景信息
 * @param qaPairs 该子场景下的所有问答对（作为参考材料）
 * @returns 完整的 Prompt 消息数组
 */
export function buildPracticePrompt(
  subScene: SubScene,
  qaPairs: QAPair[]
): Array<{ role: 'system' | 'user'; content: string }> {
  const qaPairsText = formatQaPairsForPrompt(qaPairs)

  const systemPrompt = `你是一位专业的英语口语教学专家，擅长设计高质量的口语练习题。你的任务是根据给定的场景主题和对话内容，生成三种类型的练习题：选择题、填空题和问答题。

## 角色定位
- 你精通英语口语教学法，了解二语习得理论
- 你能准确识别场景中的关键表达和语言知识点
- 你设计的题目具有教学价值，能有效帮助学习者掌握口语表达

## 重要说明
- 题目可以基于子场景主题自主创作，不必完全依赖给定的对话内容
- 给定的对话内容是参考材料，帮助你理解场景语境和常见表达
- 你可以根据场景主题扩展更多相关的对话情境
- 每个子场景生成 6-9 道题目（每种题型 2-3 道）

## 输出要求
你必须输出严格的 JSON 格式，不要包含任何其他文字说明。JSON 结构如下：

\`\`\`json
{
  "questions": [
    {
      "type": "choice",
      "qaId": "对应的QA_Pair ID（如果题目来自QA_Pair）或null（如果自主创作）",
      "triggerText": "对方说的话（英文）",
      "triggerTextCn": "对方说的话（中文）",
      "options": [
        {"id": "opt_1", "text": "选项文本", "isCorrect": true或false}
      ],
      "explanation": "答案解析，说明为什么正确答案正确，干扰项错在哪里"
    },
    {
      "type": "fill_blank",
      "qaId": "对应的QA_Pair ID或null",
      "template": "挖空后的句子，用___表示空格",
      "blanks": [{"index": 0, "answer": "正确答案"}],
      "hint": "填空提示，帮助用户回忆",
      "knowledgePoint": "知识点类型，如：动词搭配、介词用法、固定表达等"
    },
    {
      "type": "speaking",
      "qaId": "对应的QA_Pair ID或null",
      "speakerText": "对方说的话（英文）",
      "speakerTextCn": "对方说的话（中文）",
      "expectedAnswers": ["参考答案1", "参考答案2", "参考答案3"],
      "evaluationCriteria": ["评分标准1", "评分标准2", "评分标准3"]
    }
  ]
}
\`\`\`

## 题型设计规则

### 1. 选择题（choice）
- 设计 2-3 道选择题
- 可以基于对话内容，也可以根据场景主题自主创作新的对话情境
- 每道题生成 4 个选项：1 个正确答案 + 3 个干扰项
- 干扰项必须是合理的英语表达，但不符合当前语境
- 干扰项可以来自其他对话的回应，或自行设计语法正确但语境不符的表达
- 解析要详细说明正确答案的适用场景和干扰项的问题

### 2. 填空题（fill_blank）
- 设计 2-3 道填空题
- **核心原则**：题目必须帮助用户掌握该场景的核心对话表达

**考察内容**（必须与场景紧密相关）：
1. 场景高频词汇（如出租车场景：book, pick up, destination, fare）
2. 场景核心句型（如预约场景：I'd like to..., Could you...）
3. 场景功能表达（如打招呼、确认信息、结束对话）
4. 场景惯用搭配（如 check in, pick up, look for）

**禁止**：
- 挖空具体信息（地址、人名、数字、时间）
- 考察与场景无关的语法点

**每个空格生成 4 个选项**：
- 1 个正确答案
- 3 个干扰项（常见错误或语境不符的选项）

**输出格式**：
\`\`\`json
{
  "type": "fill_blank",
  "qaId": "QA_Pair ID或null",
  "template": "I'd like ___ book a taxi.",
  "blanks": [{"index": 0, "answer": "to", "options": ["to", "for", "with", "at"]}],
  "hint": "预约服务时的常用句型",
  "knowledgePoint": "would like to do（预约场景核心句型）"
}
\`\`\`

**好的示例**：
- \`I'd like ___ book a taxi.\` → \`to\`（考察 would like to do，预约场景核心句型）
- \`Could you please pick me ___ at the hotel entrance?\` → \`up\`（考察 pick up，出租车场景核心短语）
- \`What's the ___ to the city center?\` → \`fare\`（考察 fare，出租车场景核心词汇）

**不好的示例**：
- \`I need a taxi to ___ please.\` → \`123 Main Street\`（具体地址，无意义）
- \`The taxi will arrive in ___ minutes.\` → \`10\`（具体数字，无意义）

### 3. 问答题（speaking）
- 设计 2-3 道问答题
- 可以基于对话内容，也可以根据场景主题创作新的对话情境
- 提供 2-4 个可接受的参考答案
- 参考答案应包含不同难度层次（简单表达 → 高级表达）
- 评分标准要具体可操作，包括：
  - 意图达成度：是否正确回应了对方的问题
  - 语言准确性：语法和用词是否正确
  - 表达自然度：是否符合英语口语习惯
  - 关键词覆盖：是否使用了场景关键词

## 质量标准
1. 所有题目必须紧扣场景主题
2. 题目难度要符合场景设定的难度等级
3. 干扰项要有迷惑性但不能误导学习者
4. 解析和评分标准要具体、有教学价值
5. 确保输出是合法的 JSON 格式
6. 每个子场景生成 6-9 道题目（每种题型 2-3 道）`

  const userPrompt = `请根据以下场景信息生成练习题。

## 场景信息
- 场景名称：${subScene.name}
- 场景描述：${subScene.description}
- 预计学习时长：${subScene.estimatedMinutes} 分钟

## 参考对话内容
${qaPairsText}

## 生成要求
1. 生成 2-3 道选择题
2. 生成 2-3 道填空题
3. 生成 2-3 道问答题
4. 题目可以基于对话内容，也可以根据场景主题自主创作
5. 题目按选择题 → 填空题 → 问答题的顺序排列
6. 确保输出是严格的 JSON 格式，不要包含任何其他文字

请直接输出 JSON：`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
}

/**
 * 构建简化版 Prompt（仅生成指定类型的题目）
 *
 * @param subScene 子场景信息
 * @param qaPairs 该子场景下的所有问答对
 * @param questionTypes 要生成的题目类型
 * @returns 完整的 Prompt 消息数组
 */
export function buildPracticePromptForTypes(
  subScene: SubScene,
  qaPairs: QAPair[],
  questionTypes: Array<'choice' | 'fill_blank' | 'speaking'>
): Array<{ role: 'system' | 'user'; content: string }> {
  const qaPairsText = formatQaPairsForPrompt(qaPairs)
  const typeDescriptions = {
    choice: '选择题：播放对方说的话，从4个选项中选择正确回应',
    fill_blank: '填空题：根据提示填写句子中的关键词',
    speaking: '问答题：听到对方的话后，用语音回答'
  }
  const requestedTypes = questionTypes.map(t => `- ${typeDescriptions[t]}`).join('\n')

  const systemPrompt = `你是一位专业的英语口语教学专家，擅长设计高质量的口语练习题。

## 重要说明
- 题目可以基于子场景主题自主创作，不必完全依赖给定的对话内容
- 给定的对话内容是参考材料，帮助你理解场景语境

## 输出要求
输出严格的 JSON 格式，结构如下：

\`\`\`json
{
  "questions": [
    // 根据请求的题目类型生成对应结构
  ]
}
\`\`\`

## 题型结构说明

### 选择题（choice）
\`\`\`json
{
  "type": "choice",
  "qaId": "QA_Pair ID或null",
  "triggerText": "对方说的话（英文）",
  "triggerTextCn": "中文翻译",
  "options": [
    {"id": "opt_1", "text": "选项", "isCorrect": boolean}
  ],
  "explanation": "答案解析"
}
\`\`\`

### 填空题（fill_blank）
\`\`\`json
{
  "type": "fill_blank",
  "qaId": "QA_Pair ID或null",
  "template": "挖空句子，用___表示空格",
  "blanks": [{"index": 0, "answer": "答案"}],
  "hint": "提示",
  "knowledgePoint": "知识点"
}
\`\`\`

### 问答题（speaking）
\`\`\`json
{
  "type": "speaking",
  "qaId": "QA_Pair ID或null",
  "speakerText": "对方说的话（英文）",
  "speakerTextCn": "中文翻译",
  "expectedAnswers": ["参考答案1", "参考答案2"],
  "evaluationCriteria": ["评分标准1", "评分标准2"]
}
\`\`\`

## 设计规则
- 每种题型生成 2-3 道
- 题目可以基于对话内容，也可以根据场景主题自主创作
- 选择题：4个选项（1正确+3干扰），干扰项要合理但有语境差异
- 填空题：挖1-2个关键词，提供有教学价值的提示
- 问答题：提供2-4个参考答案和具体评分标准`

  const userPrompt = `请根据以下场景生成练习题。

## 场景信息
- 名称：${subScene.name}
- 描述：${subScene.description}

## 参考对话内容
${qaPairsText}

## 需要生成的题目类型
${requestedTypes}

请直接输出 JSON：`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
}

/**
 * 构建单道题目的 Prompt（用于动态生成）
 *
 * @param qaPair 目标 QA_Pair
 * @param questionType 题目类型
 * @param allQaPairs 所有 QA_Pair（用于生成干扰项）
 * @returns Prompt 消息数组
 */
export function buildSingleQuestionPrompt(
  qaPair: QAPair,
  questionType: 'choice' | 'fill_blank' | 'speaking',
  allQaPairs: QAPair[]
): Array<{ role: 'system' | 'user'; content: string }> {
  const followUps = parseFollowUps(qaPair.followUps)
  const followUpsText = followUps.map(r => `- ${r.text}（${r.text_cn}）`).join('\n')

  const typeSpecificRules = {
    choice: `生成一道选择题：
- 4个选项（1正确+3干扰）
- 正确答案来自标准回应
- 干扰项要语法正确但语境不符
- 包含详细解析`,
    fill_blank: `生成一道填空题：
- 从标准回应中挖1-2个关键词
- 用___表示空格
- 提供提示和知识点标注`,
    speaking: `生成一道问答题：
- 提供2-4个参考答案（不同难度层次）
- 提供具体评分标准（意图达成度、语言准确性、表达自然度）`
  }

  const systemPrompt = `你是英语口语教学专家。根据给定的对话内容生成一道${questionType === 'choice' ? '选择' : questionType === 'fill_blank' ? '填空' : '问答'}题。

输出严格的 JSON 格式：
\`\`\`json
{
  "question": { /* 题目结构 */ }
}
\`\`\`

${typeSpecificRules[questionType]}`

  const otherFollowUps = allQaPairs
    .filter(qa => qa.id !== qaPair.id)
    .flatMap(qa => parseFollowUps(qa.followUps).map(r => r.text))
    .slice(0, 10)

  const userPrompt = `对话信息：
- 对方说：${qaPair.triggerText}（${qaPair.triggerTextCn}）
- 标准回应：
${followUpsText}
${qaPair.usageNote ? `- 使用说明：${qaPair.usageNote}` : ''}

${questionType === 'choice' && otherFollowUps.length > 0 ? `其他对话中的回应（可作为干扰项参考）：
${otherFollowUps.join('\n')}` : ''}

请生成题目（直接输出 JSON）：`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
}

/**
 * 解析 LLM 返回的 JSON 结果
 *
 * @param content LLM 返回的文本内容
 * @returns 解析后的题目数组，或解析失败时的 null
 */
export function parsePracticePromptOutput(content: string): PracticeQuestionOutput[] | null {
  try {
    let jsonStr = content.trim()

    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7)
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }

    const parsed = JSON.parse(jsonStr.trim())

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      console.error('[parsePracticePromptOutput] 缺少 questions 数组')
      return null
    }

    for (const q of parsed.questions) {
      if (!q.type) {
        console.error('[parsePracticePromptOutput] 题目缺少 type 字段:', q)
        return null
      }

      if (q.type === 'choice' && (!q.options || !Array.isArray(q.options))) {
        console.error('[parsePracticePromptOutput] 选择题缺少 options:', q)
        return null
      }

      if (q.type === 'fill_blank' && (!q.blanks || !Array.isArray(q.blanks))) {
        console.error('[parsePracticePromptOutput] 填空题缺少 blanks:', q)
        return null
      }

      if (q.type === 'speaking' && (!q.expectedAnswers || !Array.isArray(q.expectedAnswers))) {
        console.error('[parsePracticePromptOutput] 问答题缺少 expectedAnswers:', q)
        return null
      }
    }

    return parsed.questions as PracticeQuestionOutput[]
  } catch (error) {
    console.error('[parsePracticePromptOutput] JSON 解析失败:', error)
    return null
  }
}
