/**
 * 子场景数据导入脚本
 * 将 prepare/new_scene/data/sub-scenes/ 目录下的 JSON 文件批量 upsert 到数据库
 *
 * 用法：
 *   npx ts-node prepare/new_scene/scripts/import-sub-scenes.ts [--scene <scene_id>] [--dry-run]
 *
 * 选项：
 *   --scene <id>   只导入指定场景的数据
 *   --dry-run      只打印将要执行的操作，不实际写入数据库
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql as drizzleSql } from 'drizzle-orm'
import * as schema from '../../../src/lib/db/schema.js'

// ============================================================
// 命令行参数解析
// ============================================================

const args = process.argv.slice(2)
const sceneFilter = args.includes('--scene') ? args[args.indexOf('--scene') + 1] : null
const isDryRun = args.includes('--dry-run')

// ============================================================
// 数据目录
// ============================================================

const DATA_DIR = path.resolve(__dirname, '../data/sub-scenes')

// ============================================================
// 数据库连接
// ============================================================

function createDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 未配置，请在 .env.local 中设置')
  }
  const sqlClient = neon(databaseUrl)
  return drizzle(sqlClient, { schema })
}

// ============================================================
// 导入单个场景文件
// ============================================================

interface QAPairData {
  id: string
  subSceneId: string
  speakerText: string
  speakerTextCn: string
  responses: unknown[]
  usageNote: string | null
  audioUrl: string | null
  qaType: string
  order: number
}

interface SubSceneData {
  id: string
  sceneId: string
  name: string
  description: string
  order: number
  estimatedMinutes: number
  qaPairs: QAPairData[]
}

interface SceneFile {
  sceneId: string
  sceneName: string
  generatedAt: string
  subScenes: SubSceneData[]
}

async function importSceneFile(
  db: ReturnType<typeof drizzle>,
  filePath: string
): Promise<{ subSceneCount: number; qaPairCount: number }> {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const data: SceneFile = JSON.parse(raw)

  let subSceneCount = 0
  let qaPairCount = 0

  for (const subScene of data.subScenes) {
    if (isDryRun) {
      console.log(`  [dry-run] upsert sub_scene: ${subScene.id} (${subScene.name})`)
      console.log(`    qa_pairs: ${subScene.qaPairs.length} 条`)
      subSceneCount++
      qaPairCount += subScene.qaPairs.length
      continue
    }

    // Upsert 子场景
    await db
      .insert(schema.subScenes)
      .values({
        id: subScene.id,
        sceneId: subScene.sceneId,
        name: subScene.name,
        description: subScene.description,
        order: subScene.order,
        estimatedMinutes: subScene.estimatedMinutes,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: schema.subScenes.id,
        set: {
          name: subScene.name,
          description: subScene.description,
          order: subScene.order,
          estimatedMinutes: subScene.estimatedMinutes,
          updatedAt: new Date().toISOString(),
        },
      })

    subSceneCount++

    // Upsert 问答对
    for (const qa of subScene.qaPairs) {
      await db
        .insert(schema.qaPairs)
        .values({
          id: qa.id,
          subSceneId: qa.subSceneId,
          speakerText: qa.speakerText,
          speakerTextCn: qa.speakerTextCn,
          responses: qa.responses,
          usageNote: qa.usageNote,
          audioUrl: qa.audioUrl,
          qaType: qa.qaType,
          order: qa.order,
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: schema.qaPairs.id,
          set: {
            speakerText: qa.speakerText,
            speakerTextCn: qa.speakerTextCn,
            responses: qa.responses,
            usageNote: qa.usageNote,
            audioUrl: qa.audioUrl,
            qaType: qa.qaType,
            order: qa.order,
            updatedAt: new Date().toISOString(),
          },
        })

      qaPairCount++
    }
  }

  return { subSceneCount, qaPairCount }
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log('=== 子场景数据导入脚本 ===')
  console.log(`模式: ${isDryRun ? 'dry-run（不写入数据库）' : '正式导入'}`)

  // 检查数据目录
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`数据目录不存在: ${DATA_DIR}`)
    console.error('请先运行 generate-sub-scenes.js 生成数据')
    process.exit(1)
  }

  // 读取所有 JSON 文件
  let files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))

  if (files.length === 0) {
    console.error('数据目录中没有 JSON 文件，请先运行 generate-sub-scenes.js')
    process.exit(1)
  }

  // 应用场景过滤
  if (sceneFilter) {
    files = files.filter(f => f === `${sceneFilter}.json`)
    if (files.length === 0) {
      console.error(`未找到场景 ${sceneFilter} 的数据文件`)
      process.exit(1)
    }
  }

  console.log(`\n共找到 ${files.length} 个数据文件，开始导入...\n`)

  // 创建数据库连接（dry-run 时跳过）
  const db = isDryRun ? null : createDb()

  let totalSubScenes = 0
  let totalQaPairs = 0
  let successCount = 0
  let failCount = 0

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file)
    const sceneId = file.replace('.json', '')

    console.log(`处理: ${file}`)

    try {
      const { subSceneCount, qaPairCount } = await importSceneFile(
        db as ReturnType<typeof drizzle>,
        filePath
      )
      totalSubScenes += subSceneCount
      totalQaPairs += qaPairCount
      successCount++
      console.log(`  ✓ 子场景: ${subSceneCount}，问答对: ${qaPairCount}`)
    } catch (err) {
      console.error(`  ✗ 导入失败: ${(err as Error).message}`)
      failCount++
    }
  }

  console.log(`\n=== 导入完成 ===`)
  console.log(`成功: ${successCount} 个文件，失败: ${failCount} 个文件`)
  console.log(`总计: ${totalSubScenes} 个子场景，${totalQaPairs} 个问答对`)

  if (!isDryRun && successCount > 0) {
    console.log('\n数据已成功写入数据库')
    console.log('可通过 /api/scenes/[id]/sub-scenes 接口验证数据')
  }
}

main().catch(err => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
