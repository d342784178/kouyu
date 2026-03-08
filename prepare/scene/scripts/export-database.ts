/**
 * 数据库数据导出脚本
 * 将数据库中的数据导出到本地 JSON 文件
 *
 * 用法：
 *   npx tsx prepare/scene/scripts/export-database.ts
 *
 * 导出内容：
 *   - scenes -> prepare/scene/data/scenes_final.json
 *   - sub_scenes + qa_pairs -> prepare/scene/data/sub-scenes/{scene_id}.json
 *   - sub_scene_practice_questions -> prepare/scene/data/practice-questions/{sub_scene_id}_{type}.json
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })

import { neon } from '@neondatabase/serverless'

const DATA_DIR = path.resolve(__dirname, '../data')
const SUB_SCENES_DIR = path.resolve(__dirname, '../data/sub-scenes')
const PRACTICE_QUESTIONS_DIR = path.resolve(__dirname, '../data/practice-questions')

interface Scene {
  id: string
  name: string
  category: string
  description: string
  difficulty: string
  duration: number | null
  tags: unknown
  practiceContentCache: unknown
}

interface SubScene {
  id: string
  scene_id: string
  name: string
  description: string
  order: number
  estimated_minutes: number | null
}

interface QAPair {
  id: string
  sub_scene_id: string
  dialogue_mode: string
  trigger_text: string
  trigger_text_cn: string
  trigger_speaker_role: string
  scenario_hint: string | null
  scenario_hint_cn: string | null
  follow_ups: unknown
  usage_note: string | null
  audio_url: string | null
  learn_requirement: string
  order: number
}

interface PracticeQuestion {
  id: string
  sub_scene_id: string
  type: string
  order: number
  content: unknown
}

async function exportData(): Promise<void> {
  console.log('=== 数据库数据导出脚本 ===\n')

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL 环境变量未设置')
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  // 确保目录存在
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.mkdirSync(SUB_SCENES_DIR, { recursive: true })
  fs.mkdirSync(PRACTICE_QUESTIONS_DIR, { recursive: true })

  // 1. 导出 scenes
  console.log('📋 步骤1: 导出 scenes...')
  const scenes = await sql<Scene[]>`
    SELECT id, name, category, description, difficulty, duration, tags, practice_content_cache
    FROM scenes
    ORDER BY id
  `
  const scenesOutputPath = path.join(DATA_DIR, 'scenes_final.json')
  fs.writeFileSync(scenesOutputPath, JSON.stringify(scenes, null, 2), 'utf-8')
  console.log(`   ✓ 导出 ${scenes.length} 个场景到 ${scenesOutputPath}\n`)

  // 2. 导出 sub_scenes
  console.log('📋 步骤2: 导出 sub_scenes...')
  const subScenes = await sql<SubScene[]>`
    SELECT id, scene_id, name, description, "order", estimated_minutes
    FROM sub_scenes
    ORDER BY scene_id, "order"
  `
  console.log(`   ✓ 查询到 ${subScenes.length} 个子场景\n`)

  // 3. 导出 qa_pairs
  console.log('📋 步骤3: 导出 qa_pairs...')
  const qaPairs = await sql<QAPair[]>`
    SELECT 
      id, 
      sub_scene_id, 
      dialogue_mode, 
      trigger_text, 
      trigger_text_cn, 
      trigger_speaker_role,
      scenario_hint,
      scenario_hint_cn,
      follow_ups, 
      usage_note, 
      audio_url, 
      learn_requirement, 
      "order"
    FROM qa_pairs
    ORDER BY sub_scene_id, "order"
  `
  console.log(`   ✓ 查询到 ${qaPairs.length} 个问答对\n`)

  // 4. 按 scene_id 分组导出 sub-scenes 文件
  console.log('📋 步骤4: 导出 sub-scenes JSON 文件...')
  const subScenesByScene = new Map<string, SubScene[]>()
  for (const sub of subScenes) {
    if (!subScenesByScene.has(sub.scene_id)) {
      subScenesByScene.set(sub.scene_id, [])
    }
    subScenesByScene.get(sub.scene_id)!.push(sub)
  }

  const qaPairsBySubScene = new Map<string, QAPair[]>()
  for (const qa of qaPairs) {
    if (!qaPairsBySubScene.has(qa.sub_scene_id)) {
      qaPairsBySubScene.set(qa.sub_scene_id, [])
    }
    qaPairsBySubScene.get(qa.sub_scene_id)!.push(qa)
  }

  let subSceneFileCount = 0
  for (const [sceneId, subs] of subScenesByScene) {
    const scene = scenes.find(s => s.id === sceneId)
    const outputData = {
      sceneId,
      sceneName: scene?.name || sceneId,
      exportedAt: new Date().toISOString(),
      subScenes: subs.map(sub => ({
        id: sub.id,
        sceneId: sub.scene_id,
        name: sub.name,
        description: sub.description,
        order: sub.order,
        estimatedMinutes: sub.estimated_minutes || 5,
        qaPairs: (qaPairsBySubScene.get(sub.id) || []).map(qa => ({
          id: qa.id,
          subSceneId: qa.sub_scene_id,
          dialogueMode: qa.dialogue_mode,
          triggerText: qa.trigger_text,
          triggerTextCn: qa.trigger_text_cn,
          triggerSpeakerRole: qa.trigger_speaker_role,
          scenarioHint: qa.scenario_hint,
          scenarioHintCn: qa.scenario_hint_cn,
          followUps: qa.follow_ups,
          usageNote: qa.usage_note,
          audioUrl: qa.audio_url,
          learnRequirement: qa.learn_requirement,
          order: qa.order,
        })),
      })),
    }

    const outputPath = path.join(SUB_SCENES_DIR, `${sceneId}.json`)
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8')
    subSceneFileCount++
  }
  console.log(`   ✓ 导出 ${subSceneFileCount} 个子场景文件\n`)

  // 5. 导出 practice_questions
  console.log('📋 步骤5: 导出 practice_questions...')
  const practiceQuestions = await sql<PracticeQuestion[]>`
    SELECT id, sub_scene_id, type, "order", content
    FROM sub_scene_practice_questions
    ORDER BY sub_scene_id, type, "order"
  `
  console.log(`   ✓ 查询到 ${practiceQuestions.length} 道练习题\n`)

  // 按 sub_scene_id + type 分组
  const questionsByKey = new Map<string, PracticeQuestion[]>()
  for (const q of practiceQuestions) {
    const key = `${q.sub_scene_id}_${q.type}`
    if (!questionsByKey.has(key)) {
      questionsByKey.set(key, [])
    }
    questionsByKey.get(key)!.push(q)
  }

  let practiceFileCount = 0
  for (const [key, questions] of questionsByKey) {
    const subSceneId = questions[0].sub_scene_id
    const type = questions[0].type
    const subScene = subScenes.find(s => s.id === subSceneId)
    const scene = subScene ? scenes.find(s => s.id === subScene.scene_id) : null

    const outputData = {
      subSceneId,
      subSceneName: subScene?.name || subSceneId,
      questionType: type,
      exportedAt: new Date().toISOString(),
      questions: questions.map(q => ({
        id: q.id,
        subSceneId: q.sub_scene_id,
        type: q.type,
        order: q.order,
        content: q.content,
      })),
    }

    const outputPath = path.join(PRACTICE_QUESTIONS_DIR, `${key}.json`)
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8')
    practiceFileCount++
  }
  console.log(`   ✓ 导出 ${practiceFileCount} 个练习题文件\n`)

  // 6. 输出统计
  console.log('='.repeat(50))
  console.log('✅ 数据导出完成!\n')
  console.log('导出统计:')
  console.log(`  - 场景: ${scenes.length} 个`)
  console.log(`  - 子场景: ${subScenes.length} 个`)
  console.log(`  - 问答对: ${qaPairs.length} 个`)
  console.log(`  - 练习题: ${practiceQuestions.length} 道`)
  console.log(`\n导出文件:`)
  console.log(`  - ${scenesOutputPath}`)
  console.log(`  - ${SUB_SCENES_DIR}/ (${subSceneFileCount} 个文件)`)
  console.log(`  - ${PRACTICE_QUESTIONS_DIR}/ (${practiceFileCount} 个文件)`)
}

exportData().catch((error) => {
  console.error('\n❌ 导出失败:', error)
  process.exit(1)
})
