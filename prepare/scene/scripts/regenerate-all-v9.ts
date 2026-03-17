/**
 * 全量生成脚本 V9
 * 使用优化后的Prompt V9 + Qwen-80b
 * 
 * 核心改进：
 * 1. 简化模式定义 - 用"问/答"替代复杂概念
 * 2. 强调高频/常见/典型的对话示例
 * 3. 问答对数量2-4个
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '../../../.env.local') })

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const MODEL = 'qwen/qwen3-next-80b-a3b-instruct'
const CONCURRENCY = 10

const DATA_DIR = path.join(__dirname, '../data')
const OUTPUT_DIR = path.join(DATA_DIR, 'sub-scenes')
const PROGRESS_PATH = path.join(__dirname, '../data/regenerate-v9-progress.json')

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isForce = args.includes('--force')

interface Scene {
  id: string
  name: string
  category: string
  description: string
}

interface Progress {
  completed: string[]
  failed: string[]
  lastRun: string
}

function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_PATH)) {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'))
  }
  return { completed: [], failed: [], lastRun: '' }
}

function saveProgress(progress: Progress) {
  progress.lastRun = new Date().toISOString()
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf-8')
}

async function callLLM(messages: Array<{role: string, content: string}>): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) throw new Error('NVIDIA_API_KEY 未配置')
  
  const response = await fetch(NVIDIA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 8000
    })
  })
  
  if (!response.ok) {
    throw new Error(`API调用失败: ${response.status}`)
  }
  
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

function parseJSON(content: string): any {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('未找到JSON')
  return JSON.parse(jsonMatch[0])
}

function isSocialScene(sceneId: string): boolean {
  return sceneId.startsWith('social_')
}

const STEP1_PROMPT = `你是英语口语教学内容设计专家。请为以下场景设计子场景拆分。

场景信息：
- 场景ID: {sceneId}
- 场景名称: {sceneName}
- 场景描述: {sceneDescription}

请设计 4-5 个子场景，每个子场景代表该场景下的一个独立对话情境。

要求：
1. 子场景应覆盖该场景的完整流程（从开始到结束）
2. 每个子场景应是一个独立的、可练习的对话单元
3. 子场景名称简洁（8字以内）
4. 子场景描述清晰（30字以内）

请按以下JSON格式返回：
{
  "subScenes": [
    {
      "name": "子场景名称（中文）",
      "description": "子场景描述（中文）",
      "order": 1
    }
  ]
}`

const STEP2_PROMPT = `你是英语口语教学内容设计专家。请为以下场景生成问答对数据。

场景：{sceneName}
场景类型：{sceneType}
子场景：{subSceneName}

================================================================================
【核心要求】
================================================================================

请生成恰好 3 个问答对（不多不少）。

这些问答对必须是该子场景中【高频】【常见】【典型】的对话示例：
- 学习者在真实场景中极大概率会遇到
- 对话内容实用、地道、符合真实交流习惯
- 避免生僻、罕见或不自然的表达

================================================================================
【关键：followUps必须包含2-3个不同的回答】
================================================================================

每个问答对的 followUps 必须包含 2-3 个【不同情况】的回答，而不是同一回答的不同表述！

✅ 正确示例（不同情况）：
{
  "triggerText": "How would you like to pay?",
  "followUps": [
    {"text": "I'll pay by card, please.", "text_cn": "我刷卡，谢谢。", "situation": "刷卡支付"},
    {"text": "Do you accept cash?", "text_cn": "你们收现金吗？", "situation": "现金支付"},
    {"text": "Can I use Apple Pay?", "text_cn": "可以用Apple Pay吗？", "situation": "移动支付"}
  ]
}

❌ 错误示例（同一回答的不同表述）：
{
  "triggerText": "How would you like to pay?",
  "followUps": [
    {"text": "I'll pay by card.", "text_cn": "我刷卡。"},
    {"text": "Card, please.", "text_cn": "刷卡，谢谢。"},
    {"text": "I'd like to use my card.", "text_cn": "我想用卡支付。"}
  ]
}

【不同情况的维度】：
- 不同选择：刷卡/现金/移动支付
- 不同态度：同意/拒绝/犹豫
- 不同条件：有时间/没时间/需要确认
- 不同偏好：喜欢/不喜欢/无所谓
- 不同结果：成功/失败/需要等待

================================================================================
【第一步：理解两种对话模式】
================================================================================

模式A：用户提问，对方回答
- 名称：user_asks
- triggerText = 用户的问题（如"What do you recommend?"）
- triggerSpeakerRole = "customer"（所有场景都是customer！）
- followUps = 对方的回答（服务员用staff，朋友用peer）

模式B：对方提问，用户回答  
- 名称：user_responds
- triggerText = 对方的问题（如"How would you like to pay?"）
- triggerSpeakerRole = "staff"（服务场景）或"peer"（社交场景）
- followUps = 用户的不同回答（2-3个不同情况）

【重要】user_asks的triggerSpeakerRole永远是"customer"，不管是服务场景还是社交场景！

================================================================================
【第二步：生成前必须回答的问题】
================================================================================

对于每个问答对，生成前先回答：

1. triggerText是谁说的？
   - 如果是用户说的 → dialogueMode = "user_asks", triggerSpeakerRole = "customer"
   - 如果是服务员说的 → dialogueMode = "user_responds", triggerSpeakerRole = "staff"

2. followUps是谁说的？
   - user_asks模式 → followUps是服务员说的（2-3个不同情况的回答）
   - user_responds模式 → followUps是用户说的（2-3个不同情况的回答）

================================================================================
【第三步：避免常见错误 - 必须严格遵守】
================================================================================

❌ 错误1：角色混淆
- dialogueMode标记为user_responds，但followUps却是服务员的回应
- 正确：user_responds模式下，followUps必须是用户的回答

❌ 错误2：触发文本与子场景不匹配
- 在"支付费用"子场景中，triggerText却是加油前的询问
- 正确：triggerText必须精准对应当前子场景的核心动作

❌ 错误3：缺失关键业务环节
- 银行场景缺少"我需要出示什么证件？"
- 理发店预约缺少询问多个时间段
- 正确：必须覆盖该子场景的核心交互环节

❌ 错误4：用户回应不自然
- 用户说"I usually have free time after work"解释个人日程
- 正确：用户回应应简洁直接，如"Yes, 2 PM works for me."

❌ 错误5：对话逻辑不符合场景情感
- 紧急求助场景缺乏紧迫感
- 感谢场景缺乏自然回应
- 正确：对话风格必须符合场景的情感基调

================================================================================
【输出格式】
================================================================================

{
  "qaPairs": [
    {
      "triggerText": "触发文本（英文）",
      "triggerTextCn": "触发文本（中文）",
      "dialogueMode": "user_asks 或 user_responds",
      "triggerSpeakerRole": "customer 或 staff 或 peer",
      "scenarioHintCn": "场景提示（中文）",
      "followUps": [
        {"text": "回答1（英文）", "text_cn": "回答1（中文）", "situation": "情况说明"},
        {"text": "回答2（英文）", "text_cn": "回答2（中文）", "situation": "情况说明"},
        {"text": "回答3（英文）", "text_cn": "回答3（中文）", "situation": "情况说明"}
      ],
      "usageNote": "使用说明",
      "learnRequirement": "speak_trigger 或 speak_followup",
      "order": 1
    }
  ]
}`

function validateQAPair(qa: any, isSocial: boolean): {valid: boolean, error?: string} {
  if (qa.dialogueMode === 'user_asks') {
    if (qa.triggerSpeakerRole !== 'customer') {
      return {valid: false, error: `user_asks模式但triggerSpeakerRole是${qa.triggerSpeakerRole}，应为customer`}
    }
  } else if (qa.dialogueMode === 'user_responds') {
    const expectedRole = isSocial ? 'peer' : 'staff'
    if (qa.triggerSpeakerRole !== expectedRole && qa.triggerSpeakerRole !== 'staff') {
      return {valid: false, error: `user_responds模式但triggerSpeakerRole是${qa.triggerSpeakerRole}，应为${expectedRole}`}
    }
  }
  return {valid: true}
}

async function generateSubScenes(scene: Scene): Promise<any[]> {
  const prompt = STEP1_PROMPT
    .replace('{sceneId}', scene.id)
    .replace('{sceneName}', scene.name)
    .replace('{sceneDescription}', scene.description)
  
  const content = await callLLM([
    { role: 'system', content: '你是英语口语教学内容设计专家。请设计4-5个子场景。' },
    { role: 'user', content: prompt }
  ])
  
  const data = parseJSON(content)
  
  if (!data.subScenes || data.subScenes.length < 3) {
    throw new Error(`子场景数量不足: ${data.subScenes?.length || 0}`)
  }
  
  return data.subScenes.map((sub: any, idx: number) => ({
    id: `${scene.id}_sub_${idx + 1}`,
    name: sub.name,
    description: sub.description,
    order: sub.order ?? idx + 1
  }))
}

async function generateQAPairs(scene: Scene, subScene: any): Promise<any[]> {
  const isSocial = isSocialScene(scene.id)
  const sceneType = isSocial ? '社交场景（朋友、同事等）' : '服务场景（餐厅、银行、医院等）'
  
  const prompt = STEP2_PROMPT
    .replace('{sceneName}', scene.name)
    .replace('{sceneType}', sceneType)
    .replace('{subSceneName}', subScene.name)
  
  const systemPrompt = isSocial
    ? '你是英语口语教学内容设计专家。社交场景用peer，服务场景用staff。生成前先判断triggerText是谁说的。'
    : '你是英语口语教学内容设计专家。生成前先判断triggerText是谁说的：用户说的用user_asks，服务员说的用user_responds。'
  
  const content = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ])
  
  const data = parseJSON(content)
  
  if (!data.qaPairs || data.qaPairs.length < 3) {
    throw new Error(`问答对数量不足: ${data.qaPairs?.length || 0}`)
  }
  
  const qaPairs = data.qaPairs.slice(0, 3).map((qa: any, qaIdx: number) => {
    const qaId = `${subScene.id}_qa_${qaIdx + 1}`
    
    const validation = validateQAPair(qa, isSocial)
    if (!validation.valid) {
      console.log(`    ⚠️ ${validation.error}`)
      if (qa.dialogueMode === 'user_asks') {
        qa.triggerSpeakerRole = 'customer'
      } else if (qa.dialogueMode === 'user_responds') {
        qa.triggerSpeakerRole = isSocial ? 'peer' : 'staff'
      }
    }
    
    return {
      id: qaId,
      subSceneId: subScene.id,
      dialogueMode: qa.dialogueMode || 'user_responds',
      triggerText: qa.triggerText,
      triggerTextCn: qa.triggerTextCn,
      triggerSpeakerRole: qa.triggerSpeakerRole || (isSocial ? 'peer' : 'staff'),
      scenarioHint: qa.scenarioHint || null,
      scenarioHintCn: qa.scenarioHintCn || null,
      followUps: (qa.followUps || []).map((resp: any, respIdx: number) => ({
        text: resp.text || '',
        text_cn: resp.text_cn || '',
        audio_url: `COS:/qa/responses/${qaId}_response${respIdx}.mp3`
      })),
      usageNote: qa.usageNote || null,
      audioUrl: `COS:/qa/questions/${qaId}.mp3`,
      learnRequirement: qa.learnRequirement || 'speak_followup',
      order: qa.order ?? qaIdx + 1,
    }
  })
  
  return qaPairs
}

async function processScene(scene: Scene): Promise<any> {
  console.log(`\n处理: ${scene.name}`)
  
  const subScenes = await generateSubScenes(scene)
  console.log(`  子场景: ${subScenes.length}个`)
  
  const allQAPairs: any[] = []
  
  for (const subScene of subScenes) {
    console.log(`  - ${subScene.name}`)
    const qaPairs = await generateQAPairs(scene, subScene)
    allQAPairs.push(...qaPairs)
    console.log(`    ✓ ${qaPairs.length}个问答对`)
  }
  
  const result = {
    sceneId: scene.id,
    sceneName: scene.name,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    subScenes: subScenes.map((sub, idx) => ({
      id: sub.id,
      sceneId: scene.id,
      name: sub.name,
      description: sub.description,
      order: sub.order,
      estimatedMinutes: 5,
      qaPairs: allQAPairs.filter(qa => qa.subSceneId === sub.id)
    }))
  }
  
  console.log(`  ✓ 完成: ${subScenes.length}子场景, ${allQAPairs.length}问答对`)
  
  return result
}

async function main() {
  console.log('========================================')
  console.log('  全量生成脚本 V9')
  console.log('  Prompt V9 + Qwen-80b')
  console.log('========================================')
  console.log(`模型: ${MODEL}`)
  console.log(`并发数: ${CONCURRENCY}`)
  console.log(`模式: ${isDryRun ? 'dry-run' : '正式生成'}`)
  console.log(`时间: ${new Date().toLocaleString()}\n`)
  
  const scenesPath = path.join(DATA_DIR, 'scenes_final.json')
  let scenes: Scene[]
  
  try {
    scenes = JSON.parse(fs.readFileSync(scenesPath, 'utf-8'))
    console.log(`共 ${scenes.length} 个场景`)
  } catch {
    console.log('未找到scenes_final.json，使用测试场景')
    scenes = [
      { id: 'daily_001', name: '餐厅点餐', category: 'daily', description: '在餐厅点餐、用餐、结账' },
      { id: 'daily_003', name: '咖啡店点单', category: 'daily', description: '在咖啡店点咖啡' },
    ]
  }
  
  if (isDryRun) {
    console.log('\n[dry-run] 不实际生成')
    return
  }
  
  const progress = loadProgress()
  const toProcess = isForce 
    ? scenes 
    : scenes.filter(s => !progress.completed.includes(s.id))
  
  if (toProcess.length === 0) {
    console.log('\n所有场景已处理完成')
    return
  }
  
  console.log(`\n待处理: ${toProcess.length} 个场景`)
  
  let successCount = 0
  let failCount = 0
  
  for (const scene of toProcess) {
    try {
      const data = await processScene(scene)
      const outputPath = path.join(OUTPUT_DIR, `${scene.id}.json`)
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')
      
      progress.completed.push(scene.id)
      progress.failed = progress.failed.filter(id => id !== scene.id)
      saveProgress(progress)
      
      successCount++
    } catch (error) {
      console.error(`✗ ${scene.name}: ${error}`)
      progress.failed.push(scene.id)
      saveProgress(progress)
      failCount++
    }
  }
  
  console.log(`\n=== 完成 ===`)
  console.log(`成功: ${successCount}`)
  console.log(`失败: ${failCount}`)
  console.log(`\n下一步：运行 analyze-quality-v2.ts 验证数据质量`)
}

main()
