/**
 * 角色扮演提示词生成器
 * 通用版本 - 不依赖硬编码场景配置
 *
 * 所有角色信息从外部传入，支持任意场景和角色组合
 */

// 难度等级映射
const difficultyMap: Record<string, string> = {
  easy: 'Beginner',
  medium: 'Intermediate',
  hard: 'Advanced',
}

// 难度等级对应的语言要求
const difficultyInstructions: Record<string, string> = {
  Beginner: 'Use simple sentences and basic vocabulary. Avoid slang and idioms.',
  Intermediate: 'Use compound sentences and natural expressions. Include some common idioms.',
  Advanced: 'Use complex structures, idiomatic English, and implied meaning where natural.',
}

/**
 * 生成初始化对话的系统提示词
 * 完全通用，所有参数从外部传入
 */
export function generateInitiatePrompt(
  scene: string,
  aiRole: string,
  userRole: string,
  dialogueGoal: string,
  difficultyLevel: string
): string {
  const difficulty = difficultyMap[difficultyLevel] || difficultyLevel
  const instruction = difficultyInstructions[difficulty] || difficultyInstructions['Intermediate']

  return `You are ${aiRole} in a ${scene} scenario. The user is playing ${userRole}.

Goal: ${dialogueGoal}

Difficulty (${difficulty}): ${instruction}

Start the conversation with a natural, friendly English greeting (1-2 sentences).
Rules:
- Speak only as ${aiRole}, never as ${userRole}
- Output only the English sentence, no explanations or Chinese text`
}

/**
 * 生成继续对话的系统提示词
 * 对话历史通过 messages 数组传递，此处只定义角色规则
 */
export function generateContinuePrompt(
  scene: string,
  aiRole: string,
  userRole: string,
  dialogueGoal: string,
  difficultyLevel: string
): string {
  const difficulty = difficultyMap[difficultyLevel] || difficultyLevel
  const instruction = difficultyInstructions[difficulty] || difficultyInstructions['Intermediate']

  return `You are ${aiRole} in a ${scene} scenario. The user is playing ${userRole}.

Goal: ${dialogueGoal}

Difficulty (${difficulty}): ${instruction}

Rules:
- Speak only as ${aiRole}, never switch roles
- Keep responses concise (1-2 sentences)
- If the user's reply is off-topic, gently redirect: e.g. "I'm not sure I follow. I was asking about [topic]."
- Output only the English response, no explanations or Chinese text`
}

/**
 * 生成题目分析的提示词
 * 用于从场景描述中提取关键信息
 */
export function generateAnalysisPrompt(sceneDescription: string): string {
  return `You are an English learning assistant. Analyze the scene description and extract:
1. scene: where the dialogue takes place
2. roles: participants (as a list)
3. dialogueGoal: the topic/purpose of the dialogue

Output only valid JSON, no other text.

Scene description:
${sceneDescription}

Output format:
{
  "scene": "scene name",
  "roles": ["role1", "role2"],
  "dialogueGoal": "dialogue goal description"
}`
}

/**
 * 验证提示词中的角色一致性
 * 用于测试和调试
 */
export function validatePromptRoleConsistency(
  prompt: string,
  expectedAiRole: string
): { isValid: boolean; issues: string[] } {
  const issues: string[] = []

  // 检查提示词中是否包含正确的角色定义（支持中英文格式）
  const rolePatternEn = /You are (.+?) in/
  const rolePatternZh = /你是(.+?)，/
  const matchEn = prompt.match(rolePatternEn)
  const matchZh = prompt.match(rolePatternZh)
  const match = matchEn || matchZh

  if (match) {
    const detectedRole = match[1].trim()
    if (!detectedRole.includes(expectedAiRole)) {
      issues.push(`提示词中定义的角色"${detectedRole}"与期望角色"${expectedAiRole}"不一致`)
    }
  } else {
    issues.push('提示词中未找到角色定义')
  }

  // 检查是否包含角色坚持规则
  const hasRoleRule =
    prompt.includes('never switch roles') ||
    prompt.includes('Speak only as') ||
    prompt.includes('不要扮演') ||
    prompt.includes('不要切换角色')

  if (!hasRoleRule) {
    issues.push('提示词缺少角色坚持规则')
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}

/**
 * 生成角色行为指导提示词（可选增强）
 * 当需要更详细的角色指导时使用
 */
export function generateRoleGuidancePrompt(
  scene: string,
  aiRole: string,
  userRole: string,
  dialogueGoal: string,
  aiRoleTraits?: string[],
  typicalPhrases?: string[]
): string {
  const traitsSection =
    aiRoleTraits && aiRoleTraits.length > 0
      ? `\nCharacter traits:\n${aiRoleTraits.map((t) => `- ${t}`).join('\n')}`
      : ''

  const phrasesSection =
    typicalPhrases && typicalPhrases.length > 0
      ? `\nTypical phrases:\n${typicalPhrases.map((p) => `- "${p}"`).join('\n')}`
      : ''

  return `You are ${aiRole} in a ${scene} scenario. The user is playing ${userRole}.

Goal: ${dialogueGoal}${traitsSection}${phrasesSection}

Start the conversation with a natural, friendly English greeting (1-2 sentences).
Rules:
- Speak only as ${aiRole}
- Output only the English sentence, no explanations or Chinese text`
}
