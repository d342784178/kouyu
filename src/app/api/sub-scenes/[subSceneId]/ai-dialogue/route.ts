import { NextRequest, NextResponse } from 'next/server'
import { getSubSceneById, getQAPairsBySubSceneId } from '@/lib/db/sub-scenes'
import { callLLMForScene } from '@/lib/llm'
import type { AIDialogueRequest, AIDialogueResponse, QAResponse } from '@/types'

// 禁用 Next.js 数据缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/sub-scenes/[subSceneId]/ai-dialogue
 * 调用大模型判断用户回应是否语义匹配当前 QA_Pair，并推进对话
 * 使用模型: nvidia/qwen/qwen3-next-80b-a3b-instruct (测评模型)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { subSceneId: string } }
) {
  const { subSceneId } = params

  try {
    // 解析请求体
    const body: AIDialogueRequest = await request.json()
    const { userMessage, currentQaIndex, conversationHistory } = body

    // 获取子场景信息
    const subScene = await getSubSceneById(subSceneId)
    if (!subScene) {
      return NextResponse.json({ error: 'Sub-scene not found' }, { status: 404 })
    }

    // 获取该子场景下所有问答对
    const qaPairs = await getQAPairsBySubSceneId(subSceneId)
    if (qaPairs.length === 0) {
      return NextResponse.json({ error: 'No QA pairs found' }, { status: 404 })
    }

    // 边界检查：确保 currentQaIndex 合法
    if (currentQaIndex < 0 || currentQaIndex >= qaPairs.length) {
      return NextResponse.json({ error: 'Invalid QA index' }, { status: 400 })
    }

    const currentQa = qaPairs[currentQaIndex]

    // 解析当前 QA_Pair 的所有合法回应
    const responses: QAResponse[] = Array.isArray(currentQa.responses)
      ? (currentQa.responses as QAResponse[])
      : []

    // 构建参考回应列表文本
    const responseOptions = responses
      .map((r, i) => `${i + 1}. ${r.text}（${r.text_cn}）`)
      .join('\n')

    // 构建对话历史上下文（最近5条，避免 token 过多）
    const recentHistory = conversationHistory.slice(-5)
    const historyText = recentHistory
      .map(msg => `${msg.role === 'ai' ? 'AI' : '用户'}: ${msg.text}`)
      .join('\n')

    // 调用测评模型进行语义判断
    const messages = [
      {
        role: 'system' as const,
        content: `你是英语口语场景练习助手。当前场景：${subScene.name}。
请判断用户的回应是否符合当前场景的语义要求。
你需要返回一个 JSON 对象，格式如下：
{
  "pass": true/false,  // 用户回应是否语义匹配
  "reason": "简短说明判断理由（中文，20字以内）",
  "hint": "当pass为false时，给出具体的提示信息（中文，告诉用户应该如何回应，30字以内）"
}
只返回 JSON，不要有其他内容。`,
      },
      {
        role: 'user' as const,
        content: `场景对话历史：
${historyText || '（对话刚开始）'}

当前对方说的话：${currentQa.speakerText}（${currentQa.speakerTextCn}）

参考回应（以下任意一种语义均视为通过）：
${responseOptions}

用户实际回应：${userMessage}

请判断用户回应是否语义匹配。如果不匹配，请给出具体的提示信息。`,
      },
    ]

    const llmResult = await callLLMForScene('question-evaluation', messages, 0.3, 300)

    // 解析 LLM 返回的 JSON
    let pass = false
    let hint: string | undefined
    let reason: string | undefined
    try {
      // 提取 JSON 内容（防止 LLM 返回多余文字）
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

    // 计算下一个 QA 索引
    const nextQaIndex = pass ? currentQaIndex + 1 : currentQaIndex
    const isComplete = pass && nextQaIndex >= qaPairs.length

    // 若通过且还有下一条，返回下一条 speaker_text 作为 AI 消息
    let aiMessage: string | undefined
    if (!pass) {
      // 未通过：给出提示，让用户重新输入
      aiMessage = "Hmm, that doesn't quite fit. Try again — what would you say here?"
    } else if (pass && !isComplete && nextQaIndex < qaPairs.length) {
      aiMessage = qaPairs[nextQaIndex].speakerText
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
