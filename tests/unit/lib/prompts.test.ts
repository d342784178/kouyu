/**
 * src/lib/prompts/role-play-prompts.ts 单元测试
 *
 * 测试目标：
 * 1. generateInitiatePrompt - 开场白 prompt 生成
 * 2. generateContinuePrompt - 续接对话 prompt 生成（不含对话历史）
 * 3. generateAnalysisPrompt - 场景分析 prompt 生成
 * 4. validatePromptRoleConsistency - 角色一致性验证（支持中英文）
 * 5. generateRoleGuidancePrompt - 角色指导 prompt 生成
 */

import { describe, it, expect } from 'vitest'
import {
  generateInitiatePrompt,
  generateContinuePrompt,
  generateAnalysisPrompt,
  validatePromptRoleConsistency,
  generateRoleGuidancePrompt,
} from '../../../src/lib/prompts/role-play-prompts'

// ==================== generateInitiatePrompt ====================

describe('generateInitiatePrompt', () => {
  const base = {
    scene: 'restaurant',
    aiRole: 'waiter',
    userRole: 'customer',
    goal: 'Help the customer order food',
    difficulty: 'easy',
  }

  it('包含角色、场景、目标信息', () => {
    const prompt = generateInitiatePrompt(base.scene, base.aiRole, base.userRole, base.goal, base.difficulty)

    expect(prompt).toContain('waiter')
    expect(prompt).toContain('restaurant')
    expect(prompt).toContain('customer')
    expect(prompt).toContain(base.goal)
  })

  it('easy 难度映射为 Beginner', () => {
    const prompt = generateInitiatePrompt(base.scene, base.aiRole, base.userRole, base.goal, 'easy')
    expect(prompt).toContain('Beginner')
    expect(prompt).toContain('simple sentences')
  })

  it('medium 难度映射为 Intermediate', () => {
    const prompt = generateInitiatePrompt(base.scene, base.aiRole, base.userRole, base.goal, 'medium')
    expect(prompt).toContain('Intermediate')
    expect(prompt).toContain('compound sentences')
  })

  it('hard 难度映射为 Advanced', () => {
    const prompt = generateInitiatePrompt(base.scene, base.aiRole, base.userRole, base.goal, 'hard')
    expect(prompt).toContain('Advanced')
    expect(prompt).toContain('complex structures')
  })

  it('包含角色坚持规则', () => {
    const prompt = generateInitiatePrompt(base.scene, base.aiRole, base.userRole, base.goal, base.difficulty)
    expect(prompt).toContain('Speak only as')
    expect(prompt).toContain('never as')
  })

  it('要求只输出英文，不含解释', () => {
    const prompt = generateInitiatePrompt(base.scene, base.aiRole, base.userRole, base.goal, base.difficulty)
    expect(prompt).toContain('Output only the English sentence')
  })

  it('未知难度等级直接透传', () => {
    const prompt = generateInitiatePrompt(base.scene, base.aiRole, base.userRole, base.goal, 'expert')
    expect(prompt).toContain('expert')
  })
})

// ==================== generateContinuePrompt ====================

describe('generateContinuePrompt', () => {
  const base = {
    scene: 'airport',
    aiRole: 'check-in staff',
    userRole: 'traveler',
    goal: 'Help traveler check in for their flight',
    difficulty: 'medium',
  }

  it('包含角色、场景、目标信息', () => {
    const prompt = generateContinuePrompt(base.scene, base.aiRole, base.userRole, base.goal, base.difficulty)

    expect(prompt).toContain('check-in staff')
    expect(prompt).toContain('airport')
    expect(prompt).toContain('traveler')
    expect(prompt).toContain(base.goal)
  })

  it('不包含对话历史（历史通过 messages 数组传递）', () => {
    const prompt = generateContinuePrompt(base.scene, base.aiRole, base.userRole, base.goal, base.difficulty)
    // prompt 不应包含对话历史格式
    expect(prompt).not.toContain('user:')
    expect(prompt).not.toContain('assistant:')
    expect(prompt).not.toContain('【对话历史】')
  })

  it('包含角色坚持规则', () => {
    const prompt = generateContinuePrompt(base.scene, base.aiRole, base.userRole, base.goal, base.difficulty)
    expect(prompt).toContain('never switch roles')
  })

  it('包含离题引导规则', () => {
    const prompt = generateContinuePrompt(base.scene, base.aiRole, base.userRole, base.goal, base.difficulty)
    expect(prompt).toContain('off-topic')
    expect(prompt).toContain('redirect')
  })

  it('要求只输出英文回复', () => {
    const prompt = generateContinuePrompt(base.scene, base.aiRole, base.userRole, base.goal, base.difficulty)
    expect(prompt).toContain('Output only the English response')
  })

  it('easy/medium/hard 难度都能正确映射', () => {
    const easyPrompt = generateContinuePrompt(base.scene, base.aiRole, base.userRole, base.goal, 'easy')
    const hardPrompt = generateContinuePrompt(base.scene, base.aiRole, base.userRole, base.goal, 'hard')

    expect(easyPrompt).toContain('Beginner')
    expect(hardPrompt).toContain('Advanced')
  })
})

// ==================== generateAnalysisPrompt ====================

describe('generateAnalysisPrompt', () => {
  it('包含场景描述', () => {
    const desc = 'A customer is ordering coffee at a café'
    const prompt = generateAnalysisPrompt(desc)
    expect(prompt).toContain(desc)
  })

  it('要求输出 JSON 格式', () => {
    const prompt = generateAnalysisPrompt('test scene')
    expect(prompt).toContain('JSON')
    expect(prompt).toContain('scene')
    expect(prompt).toContain('roles')
    expect(prompt).toContain('dialogueGoal')
  })

  it('要求只输出 JSON，不含其他文字', () => {
    const prompt = generateAnalysisPrompt('test scene')
    expect(prompt).toContain('Output only valid JSON')
  })
})

// ==================== validatePromptRoleConsistency ====================

describe('validatePromptRoleConsistency', () => {
  it('英文格式 prompt 角色匹配时，验证通过', () => {
    const prompt = generateInitiatePrompt('restaurant', 'waiter', 'customer', 'take order', 'easy')
    const result = validatePromptRoleConsistency(prompt, 'waiter')

    expect(result.isValid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('英文格式 prompt 角色不匹配时，报告问题', () => {
    const prompt = generateInitiatePrompt('restaurant', 'waiter', 'customer', 'take order', 'easy')
    const result = validatePromptRoleConsistency(prompt, 'chef')

    expect(result.isValid).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('continue prompt 角色匹配时，验证通过', () => {
    const prompt = generateContinuePrompt('hospital', 'doctor', 'patient', 'diagnose', 'medium')
    const result = validatePromptRoleConsistency(prompt, 'doctor')

    expect(result.isValid).toBe(true)
  })

  it('prompt 缺少角色定义时，报告问题', () => {
    const result = validatePromptRoleConsistency('This is a test prompt without role definition.', 'waiter')

    expect(result.isValid).toBe(false)
    expect(result.issues.some(i => i.includes('未找到角色定义'))).toBe(true)
  })

  it('prompt 缺少角色坚持规则时，报告问题', () => {
    // 手动构造一个有角色定义但没有坚持规则的 prompt
    const prompt = 'You are waiter in a restaurant scenario.'
    const result = validatePromptRoleConsistency(prompt, 'waiter')

    expect(result.isValid).toBe(false)
    expect(result.issues.some(i => i.includes('角色坚持规则'))).toBe(true)
  })
})

// ==================== generateRoleGuidancePrompt ====================

describe('generateRoleGuidancePrompt', () => {
  it('基础参数生成正常', () => {
    const prompt = generateRoleGuidancePrompt('hotel', 'receptionist', 'guest', 'check-in process')

    expect(prompt).toContain('receptionist')
    expect(prompt).toContain('hotel')
    expect(prompt).toContain('guest')
  })

  it('传入 aiRoleTraits 时包含特征描述', () => {
    const traits = ['friendly', 'professional', 'helpful']
    const prompt = generateRoleGuidancePrompt('hotel', 'receptionist', 'guest', 'check-in', traits)

    expect(prompt).toContain('friendly')
    expect(prompt).toContain('professional')
    expect(prompt).toContain('Character traits')
  })

  it('传入 typicalPhrases 时包含参考表达', () => {
    const phrases = ['Welcome to our hotel!', 'May I see your ID?']
    const prompt = generateRoleGuidancePrompt('hotel', 'receptionist', 'guest', 'check-in', [], phrases)

    expect(prompt).toContain('Welcome to our hotel!')
    expect(prompt).toContain('Typical phrases')
  })

  it('不传 traits 和 phrases 时，不包含对应章节', () => {
    const prompt = generateRoleGuidancePrompt('hotel', 'receptionist', 'guest', 'check-in')

    expect(prompt).not.toContain('Character traits')
    expect(prompt).not.toContain('Typical phrases')
  })

  it('包含角色坚持规则', () => {
    const prompt = generateRoleGuidancePrompt('hotel', 'receptionist', 'guest', 'check-in')
    expect(prompt).toContain('Speak only as')
  })
})
