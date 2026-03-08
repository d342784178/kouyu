import { NextRequest, NextResponse } from 'next/server'
import { getSubSceneById, getQAPairsBySubSceneId } from '@/lib/db/sub-scenes'
import { callLLMForScene } from '@/lib/llm'
import type { AIDialogueRequest, AIDialogueResponse, FollowUp, DialogueMode } from '@/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/sub-scenes/[subSceneId]/ai-dialogue
 * 调用大模型判断用户输入是否语义匹配当前 QA_Pair，并推进对话
 * 支持两种对话模式：
 * - user_responds: AI 先说 triggerText，用户回应需匹配 followUps
 * - user_asks: 用户提问需匹配 triggerText，AI 回复 followUps 中的回答
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { subSceneId: string } }
) {
  const { subSceneId } = params

  try {
    const body: AIDialogueRequest = await request.json()
    const { userMessage, currentQaIndex, conversationHistory, dialogueMode } = body

    const subScene = await getSubSceneById(subSceneId)
    if (!subScene) {
      return NextResponse.json({ error: 'Sub-scene not found' }, { status: 404 })
    }

    const qaPairs = await getQAPairsBySubSceneId(subSceneId)
    if (qaPairs.length === 0) {
      return NextResponse.json({ error: 'No QA pairs found' }, { status: 404 })
    }

    if (currentQaIndex < 0 || currentQaIndex >= qaPairs.length) {
      return NextResponse.json({ error: 'Invalid QA index' }, { status: 400 })
    }

    const currentQa = qaPairs[currentQaIndex]
    const currentDialogueMode: DialogueMode = dialogueMode || (currentQa.dialogueMode as DialogueMode) || 'user_responds'

    const followUps: FollowUp[] = Array.isArray(currentQa.followUps)
      ? (currentQa.followUps as FollowUp[])
      : []

    const recentHistory = conversationHistory.slice(-5)
    const historyText = recentHistory
      .map(msg => `${msg.role === 'ai' ? 'AI' : '用户'}: ${msg.text}`)
      .join('\n')

    let messages: Array<{ role: 'system' | 'user'; content: string }>

    if (currentDialogueMode === 'user_responds') {
      const responseOptions = followUps
        .map((r, i) => `${i + 1}. ${r.text}（${r.text_cn}）`)
        .join('\n')

      messages = [
        {
          role: 'system' as const,
          content: `你是英语口语场景练习助手。当前场景：${subScene.name}。
请判断用户的回应是否符合当前场景的语义要求。
你需要返回一个 JSON 对象，格式如下：
{
  "pass": true/false,
  "reason": "简短说明判断理由（中文，20字以内）",
  "hint": "当pass为false时，给出具体的提示信息（中文，告诉用户应该如何回应，30字以内）"
}
只返回 JSON，不要有其他内容。`,
        },
        {
          role: 'user' as const,
          content: `场景对话历史：
${historyText || '（对话刚开始）'}

当前对方说的话：${currentQa.triggerText}（${currentQa.triggerTextCn}）

参考回应（以下任意一种语义均视为通过）：
${responseOptions}

用户实际回应：${userMessage}

请判断用户回应是否语义匹配。如果不匹配，请给出具体的提示信息。`,
        },
      ]
    } else {
      messages = [
        {
          role: 'system' as const,
          content: `你是英语口语场景练习助手。当前场景：${subScene.name}。
请判断用户的提问是否与预期问题语义相近。
你需要返回一个 JSON 对象，格式如下：
{
  "pass": true/false,
  "reason": "简短说明判断理由（中文，20字以内）",
  "hint": "当pass为false时，给出具体的提示信息（中文，告诉用户应该如何提问，30字以内）"
}
只返回 JSON，不要有其他内容。`,
        },
        {
          role: 'user' as const,
          content: `场景对话历史：
${historyText || '（对话刚开始）'}

用户应该问的问题：${currentQa.triggerText}（${currentQa.triggerTextCn}）

用户实际提问：${userMessage}

请判断用户提问是否语义匹配。如果不匹配，请给出具体的提示信息。`,
        },
      ]
    }

    const llmResult = await callLLMForScene('question-evaluation', messages, 0.3, 300)

    let pass = false
    let hint: string | undefined
    let reason: string | undefined
    try {
      const jsonMatch = llmResult.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        pass = Boolean(parsed.pass)
        hint = parsed.hint
        reason = parsed.reason
      }
    } catch {
      console.warn('[ai-dialogue] LLM 返回内容解析失败，默认 pass=false:', llmResult.content)
    }

    const nextQaIndex = pass ? currentQaIndex + 1 : currentQaIndex
    const isComplete = pass && nextQaIndex >= qaPairs.length

    let aiMessage: string | undefined
    if (!pass) {
      if (currentDialogueMode === 'user_responds') {
        aiMessage = "Hmm, that doesn't quite fit. Try again — what would you say here?"
      } else {
        aiMessage = "That's not quite the question I expected. Try asking something different."
      }
    } else if (pass && !isComplete && nextQaIndex < qaPairs.length) {
      const nextQa = qaPairs[nextQaIndex]
      if (nextQa.dialogueMode === 'user_asks') {
        const randomFollowUp = followUps[Math.floor(Math.random() * followUps.length)]
        aiMessage = randomFollowUp?.text || nextQa.triggerText
      } else {
        aiMessage = nextQa.triggerText
      }
    } else if (isComplete) {
      aiMessage = "Great job! You've completed this scene. 🎉"
    }

    const response: AIDialogueResponse = {
      pass,
      nextQaIndex,
      aiMessage,
      isComplete,
      hint: !pass ? hint : undefined,
      reason: !pass ? reason : undefined,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error(`[POST /api/sub-scenes/${subSceneId}/ai-dialogue] 处理失败:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
