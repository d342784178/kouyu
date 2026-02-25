/**
 * 角色扮演提示词生成器
 * 通用版本 - 不依赖硬编码场景配置
 *
 * 所有角色信息从外部传入，支持任意场景和角色组合
 */

// 难度等级映射
const difficultyMap: Record<string, string> = {
  'easy': 'Beginner',
  'medium': 'Intermediate',
  'hard': 'Advanced'
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
  const prompt = `【角色设定】
你是${aiRole}，在${scene}场景中。用户是${userRole}。

【对话目标】
${dialogueGoal}

【难度等级】${difficultyMap[difficultyLevel] || difficultyLevel}
- Beginner：使用简单句子，基础词汇，避免俚语
- Intermediate：使用复合句，自然表达，适量习语
- Advanced：使用复杂句式，地道俚语，隐含意图/幽默

【任务】
作为${aiRole}，生成一句友好、自然的英文开场白，邀请用户（${userRole}）回应。保持简短（1-2句话）。

【重要要求】
1. 你必须始终以${aiRole}的身份说话，不要扮演${userRole}或其他角色
2. 从${aiRole}的视角出发，自然地开始对话
3. 直接输出英文回复，不要思考过程
4. 不要包含任何中文、解释或其他内容
5. 只返回纯英文句子
6. 确保是完整的英文句子

【输出格式示例】
Hello! Nice to meet you.

现在，作为${aiRole}，请直接输出你的英文开场白：`

  return prompt
}

/**
 * 生成继续对话的系统提示词
 * 完全通用，所有参数从外部传入
 */
export function generateContinuePrompt(
  scene: string,
  aiRole: string,
  userRole: string,
  dialogueGoal: string,
  difficultyLevel: string,
  conversation: { role: string; content: string }[]
): string {
  const prompt = `【角色设定】
你是${aiRole}，在${scene}场景中。用户是${userRole}。

【对话目标】
${dialogueGoal}

【难度等级】${difficultyMap[difficultyLevel] || difficultyLevel}
- Beginner：使用简单句子，基础词汇，避免俚语
- Intermediate：使用复合句，自然表达，适量习语
- Advanced：使用复杂句式，地道俚语，隐含意图/幽默

【对话历史】
${conversation.map(msg => `${msg.role === 'user' ? userRole : aiRole}: ${msg.content}`).join('\n')}

【任务】
以${aiRole}的身份，根据对话历史自然回应。保持简短（1-2句话）。

【重要要求】
1. 你必须始终以${aiRole}的身份说话，不要切换角色
2. 只返回英文回复，不要包含任何中文
3. 不要包含思考过程、解释或其他内容
4. 确保回复符合${aiRole}的身份和对话上下文

【输出格式示例】
That sounds great! I would love to hear more about it.

现在，作为${aiRole}，请直接输出你的英文回应：`

  return prompt
}

/**
 * 生成题目分析的提示词
 * 用于从场景描述中提取关键信息
 */
export function generateAnalysisPrompt(sceneDescription: string): string {
  return `你是一位英语学习助手。请分析以下场景描述并提取：
1. 场景：对话发生的地点
2. 角色：对话参与者（作为列表）
3. 对话目标：对话的主题

保持分析简洁明了。仅以JSON格式输出这三个部分的内容。

场景描述：
${sceneDescription}

请以JSON格式输出：
{
  "scene": "场景名称",
  "roles": ["角色1", "角色2"],
  "dialogueGoal": "对话目标描述"
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

  // 检查提示词中是否包含正确的角色定义
  const rolePattern = /你是(.+?)，/
  const match = prompt.match(rolePattern)

  if (match) {
    const detectedRole = match[1].trim()
    if (!detectedRole.includes(expectedAiRole)) {
      issues.push(`提示词中定义的角色"${detectedRole}"与期望角色"${expectedAiRole}"不一致`)
    }
  } else {
    issues.push('提示词中未找到角色定义')
  }

  // 检查是否包含角色坚持警告
  if (!prompt.includes('不要扮演') && !prompt.includes('不要切换角色')) {
    issues.push('提示词缺少角色坚持警告')
  }

  return {
    isValid: issues.length === 0,
    issues
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
  const traitsSection = aiRoleTraits && aiRoleTraits.length > 0
    ? `\n【角色行为特征】\n${aiRoleTraits.map(trait => `- ${trait}`).join('\n')}`
    : ''

  const phrasesSection = typicalPhrases && typicalPhrases.length > 0
    ? `\n【参考表达方式】\n${typicalPhrases.map(phrase => `- "${phrase}"`).join('\n')}`
    : ''

  return `【角色设定】
你是${aiRole}，在${scene}场景中。用户是${userRole}。

【对话目标】
${dialogueGoal}${traitsSection}${phrasesSection}

【任务】
作为${aiRole}，生成一句友好、自然的英文开场白。保持简短（1-2句话）。

【重要要求】
1. 你必须始终以${aiRole}的身份说话
2. 直接输出英文回复，不要思考过程
3. 不要包含任何中文、解释或其他内容
4. 只返回纯英文句子

现在，作为${aiRole}，请直接输出你的英文开场白：`
}
