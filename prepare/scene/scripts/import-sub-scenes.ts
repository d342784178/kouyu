/**
 * 子场景数据导入脚本（并发批量版本）
 * 将 prepare/new_scene/data/sub-scenes/ 目录下的 JSON 文件批量 upsert 到数据库
 *
 * 用法：
 *   npx ts-node prepare/new_scene/scripts/import-sub-scenes.ts [--scene <scene_id>] [--dry-run] [--concurrency <n>]
 *
 * 选项：
 *   --scene <id>       只导入指定场景的数据
 *   --dry-run          只打印将要执行的操作，不实际写入数据库
 *   --concurrency <n>  并发数，默认 10
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') })

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../../../src/lib/db/schema'

const args = process.argv.slice(2)
const sceneFilter = args.includes('--scene') ? args[args.indexOf('--scene') + 1] : null
const isDryRun = args.includes('--dry-run')
const concurrencyIndex = args.indexOf('--concurrency')
const concurrency = concurrencyIndex >= 0 ? parseInt(args[concurrencyIndex + 1], 10) : 10

const DATA_DIR = path.resolve(__dirname, '../data/sub-scenes')

function createDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 未配置，请在 .env.local 中设置')
  }
  const sqlClient = neon(databaseUrl)
  return drizzle(sqlClient, { schema })
}

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

async function importSceneFileBatch(
  db: ReturnType<typeof drizzle>,
  filePath: string
): Promise<{ sceneId: string; subSceneCount: number; qaPairCount: number; error?: string }> {
  const fileName = path.basename(filePath)
  const sceneId = fileName.replace('.json', '')

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data: SceneFile = JSON.parse(raw)

    if (isDryRun) {
      console.log(`[dry-run] ${fileName}: ${data.subScenes.length} 子场景, ${data.subScenes.reduce((sum, s) => sum + s.qaPairs.length, 0)} 问答对`)
      return { sceneId, subSceneCount: data.subScenes.length, qaPairCount: data.subScenes.reduce((sum, s) => sum + s.qaPairs.length, 0) }
    }

    const now = new Date().toISOString()

    const subSceneValues = data.subScenes.map(subScene => ({
      id: subScene.id,
      sceneId: subScene.sceneId,
      name: subScene.name,
      description: subScene.description,
      order: subScene.order,
      estimatedMinutes: subScene.estimatedMinutes,
      updatedAt: now,
    }))

    const qaPairValues: (typeof schema.qaPairs.$inferInsert)[] = []
    for (const subScene of data.subScenes) {
      for (const qa of subScene.qaPairs) {
        qaPairValues.push({
          id: qa.id,
          subSceneId: qa.subSceneId,
          speakerText: qa.speakerText,
          speakerTextCn: qa.speakerTextCn,
          responses: qa.responses,
          usageNote: qa.usageNote,
          audioUrl: qa.audioUrl,
          qaType: qa.qaType,
          order: qa.order,
          updatedAt: now,
        })
      }
    }

    if (subSceneValues.length > 0) {
      for (let i = 0; i < subSceneValues.length; i += 50) {
        const batch = subSceneValues.slice(i, i + 50)
        for (const val of batch) {
          await db
            .insert(schema.subScenes)
            .values(val)
            .onConflictDoUpdate({
              target: schema.subScenes.id,
              set: {
                name: val.name,
                description: val.description,
                order: val.order,
                estimatedMinutes: val.estimatedMinutes,
                updatedAt: val.updatedAt,
              },
            })
        }
      }
    }

    if (qaPairValues.length > 0) {
      for (let i = 0; i < qaPairValues.length; i += 50) {
        const batch = qaPairValues.slice(i, i + 50)
        for (const val of batch) {
          await db
            .insert(schema.qaPairs)
            .values(val)
            .onConflictDoUpdate({
              target: schema.qaPairs.id,
              set: {
                speakerText: val.speakerText,
                speakerTextCn: val.speakerTextCn,
                responses: val.responses,
                usageNote: val.usageNote,
                audioUrl: val.audioUrl,
                qaType: val.qaType,
                order: val.order,
                updatedAt: val.updatedAt,
              },
            })
        }
      }
    }

    return { sceneId, subSceneCount: data.subScenes.length, qaPairCount: qaPairValues.length }
  } catch (err) {
    return { sceneId, subSceneCount: 0, qaPairCount: 0, error: (err as Error).message }
  }
}

async function processBatch(
  db: ReturnType<typeof drizzle>,
  files: string[],
  batchIndex: number,
  totalBatches: number
): Promise<{ success: number; fail: number; subScenes: number; qaPairs: number }> {
  const results = await Promise.all(
    files.map(file => importSceneFileBatch(db, path.join(DATA_DIR, file)))
  )

  let success = 0
  let fail = 0
  let subScenes = 0
  let qaPairs = 0

  for (const r of results) {
    if (r.error) {
      console.log(`  ✗ ${r.sceneId}: ${r.error}`)
      fail++
    } else {
      console.log(`  ✓ ${r.sceneId}: ${r.subSceneCount} 子场景, ${r.qaPairCount} 问答对`)
      success++
      subScenes += r.subSceneCount
      qaPairs += r.qaPairCount
    }
  }

  console.log(`\n[批次 ${batchIndex}/${totalBatches}] 完成: ${success} 成功, ${fail} 失败\n`)

  return { success, fail, subScenes, qaPairs }
}

async function main() {
  console.log('=== 子场景数据导入脚本（并发批量版） ===')
  console.log(`模式: ${isDryRun ? 'dry-run（不写入数据库）' : '正式导入'}`)
  console.log(`并发数: ${concurrency}`)

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`数据目录不存在: ${DATA_DIR}`)
    process.exit(1)
  }

  let files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))

  if (files.length === 0) {
    console.error('数据目录中没有 JSON 文件')
    process.exit(1)
  }

  if (sceneFilter) {
    files = files.filter(f => f === `${sceneFilter}.json`)
    if (files.length === 0) {
      console.error(`未找到场景 ${sceneFilter} 的数据文件`)
      process.exit(1)
    }
  }

  console.log(`\n共找到 ${files.length} 个数据文件，开始导入...\n`)

  const db = isDryRun ? null : createDb()

  const batches: string[][] = []
  for (let i = 0; i < files.length; i += concurrency) {
    batches.push(files.slice(i, i + concurrency))
  }

  let totalSuccess = 0
  let totalFail = 0
  let totalSubScenes = 0
  let totalQaPairs = 0

  for (let i = 0; i < batches.length; i++) {
    const result = await processBatch(db as ReturnType<typeof drizzle>, batches[i], i + 1, batches.length)
    totalSuccess += result.success
    totalFail += result.fail
    totalSubScenes += result.subScenes
    totalQaPairs += result.qaPairs
  }

  console.log(`\n=== 导入完成 ===`)
  console.log(`成功: ${totalSuccess} 个文件，失败: ${totalFail} 个文件`)
  console.log(`总计: ${totalSubScenes} 个子场景，${totalQaPairs} 个问答对`)

  if (!isDryRun && totalSuccess > 0) {
    console.log('\n数据已成功写入数据库')
  }
}

main().catch(err => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
