/**
 * 子场景数据导入脚本（简化版，直接用 SQL）
 * 将 prepare/new_scene/data/sub-scenes/ 目录下的 JSON 文件批量 upsert 到数据库
 *
 * 用法：
 *   node prepare/new_scene/scripts/import-sub-scenes-simple.js [--scene <scene_id>] [--dry-run]
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// 从 .env.local 加载环境变量
function loadEnv() {
  const envPath = path.resolve(__dirname, '../../../.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv()

const args = process.argv.slice(2)
const sceneFilter = args.includes('--scene') ? args[args.indexOf('--scene') + 1] : null
const isDryRun = args.includes('--dry-run')

const DATA_DIR = path.resolve(__dirname, '../data/sub-scenes')

// 使用 Neon HTTP API 执行 SQL
async function executeSql(sql, params = []) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 未配置')
  }

  // 解析 DATABASE_URL
  const url = new URL(databaseUrl)
  const [user, password] = url.username && url.password 
    ? [url.username, url.password] 
    : ['', '']
  const host = url.hostname
  const database = url.pathname.slice(1)

  // Neon HTTP API endpoint
  const apiUrl = `https://${host}/sql`

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      query: sql,
      params: params,
    })

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${password}`,
      },
    }

    const req = https.request(apiUrl, options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) {
            reject(new Error(`SQL 错误: ${parsed.error.message}`))
            return
          }
          resolve(parsed)
        } catch (e) {
          reject(new Error(`响应解析失败: ${e.message}`))
        }
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function importSceneFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(raw)

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
    const subSceneSql = `
      INSERT INTO sub_scenes (id, scene_id, name, description, "order", estimated_minutes, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        "order" = EXCLUDED."order",
        estimated_minutes = EXCLUDED.estimated_minutes,
        updated_at = EXCLUDED.updated_at
    `
    
    await executeSql(subSceneSql, [
      subScene.id,
      subScene.sceneId,
      subScene.name,
      subScene.description,
      subScene.order,
      subScene.estimatedMinutes,
      new Date().toISOString(),
    ])

    subSceneCount++

    // Upsert 问答对
    for (const qa of subScene.qaPairs) {
      const qaSql = `
        INSERT INTO qa_pairs (
          id, sub_scene_id, speaker_text, speaker_text_cn, 
          responses, usage_note, audio_url, qa_type, "order", updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          speaker_text = EXCLUDED.speaker_text,
          speaker_text_cn = EXCLUDED.speaker_text_cn,
          responses = EXCLUDED.responses,
          usage_note = EXCLUDED.usage_note,
          audio_url = EXCLUDED.audio_url,
          qa_type = EXCLUDED.qa_type,
          "order" = EXCLUDED."order",
          updated_at = EXCLUDED.updated_at
      `

      await executeSql(qaSql, [
        qa.id,
        qa.subSceneId,
        qa.speakerText,
        qa.speakerTextCn,
        JSON.stringify(qa.responses),
        qa.usageNote,
        qa.audioUrl,
        qa.qaType,
        qa.order,
        new Date().toISOString(),
      ])

      qaPairCount++
    }
  }

  return { subSceneCount, qaPairCount }
}

async function main() {
  console.log('=== 子场景数据导入脚本 ===')
  console.log(`模式: ${isDryRun ? 'dry-run（不写入数据库）' : '正式导入'}`)

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

  let totalSubScenes = 0
  let totalQaPairs = 0
  let successCount = 0
  let failCount = 0

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file)
    console.log(`处理: ${file}`)

    try {
      const { subSceneCount, qaPairCount } = await importSceneFile(filePath)
      totalSubScenes += subSceneCount
      totalQaPairs += qaPairCount
      successCount++
      console.log(`  ✓ 子场景: ${subSceneCount}，问答对: ${qaPairCount}`)
    } catch (err) {
      console.error(`  ✗ 导入失败: ${err.message}`)
      failCount++
    }
  }

  console.log(`\n=== 导入完成 ===`)
  console.log(`成功: ${successCount} 个文件，失败: ${failCount} 个文件`)
  console.log(`总计: ${totalSubScenes} 个子场景，${totalQaPairs} 个问答对`)

  if (!isDryRun && successCount > 0) {
    console.log('\n数据已成功写入数据库')
  }
}

main().catch(err => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
