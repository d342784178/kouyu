/**
 * 练习题数据导入脚本
 * 将 prepare/new_scene/data/practice-questions/ 目录下的 JSON 数据导入数据库
 *
 * 用法：
 *   node prepare/new_scene/scripts/import-practice-questions.js [--subScene <id>] [--force]
 *
 * 选项：
 *   --subScene <id>  只导入指定子场景（不传则导入所有）
 *   --force          先删除已有数据再导入
 */

const fs = require('fs')
const path = require('path')
const { neon, neonConfig } = require('@neondatabase/serverless')

// ============================================================
// 配置
// ============================================================

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

const DATABASE_URL = process.env.DATABASE_URL
const DATA_DIR = path.resolve(__dirname, '../data/practice-questions')

// ============================================================
// 命令行参数解析
// ============================================================

const args = process.argv.slice(2)
const subSceneFilter = args.includes('--subScene') ? args[args.indexOf('--subScene') + 1] : null
const isForce = args.includes('--force')

// ============================================================
// 数据库操作
// ============================================================

async function importData() {
  console.log('=== 练习题数据导入脚本 ===')
  console.log(`模式: ${isForce ? '强制覆盖（先删除后导入）' : '增量导入'}`)

  if (!DATABASE_URL) {
    console.error('DATABASE_URL 未配置，请在 .env.local 中设置')
    process.exit(1)
  }

  // 检查数据目录
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`数据目录不存在: ${DATA_DIR}`)
    console.error('请先运行 generate-practice-questions.js 生成数据')
    process.exit(1)
  }

  // 读取所有练习题文件
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  if (files.length === 0) {
    console.error('未找到练习题数据文件')
    process.exit(1)
  }

  // 应用子场景过滤
  let targetFiles = files
  if (subSceneFilter) {
    targetFiles = files.filter(f => f === `${subSceneFilter}.json`)
    if (targetFiles.length === 0) {
      console.error(`未找到子场景 ID: ${subSceneFilter}`)
      process.exit(1)
    }
  }

  console.log(`\n共找到 ${targetFiles.length} 个练习题文件，开始导入...\n`)

  // 创建数据库连接
  const sql = neon(DATABASE_URL)

  let successCount = 0
  let failCount = 0
  let skipCount = 0
  let totalQuestions = 0

  // 并发控制：10 个并发
  const CONCURRENCY = 10
  let currentIndex = 0
  let activeCount = 0
  let processedCount = 0

  async function processFile(file) {
    activeCount++
    const filePath = path.join(DATA_DIR, file)
    const subSceneId = file.replace('.json', '')

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      const questions = data.questions || []

      if (questions.length === 0) {
        console.log(`⏭ 跳过（无题目）: ${subSceneId}`)
        skipCount++
        activeCount--
        processedCount++
        return
      }

      // 检查是否已有数据
      const existingResult = await sql`SELECT COUNT(*) as count FROM sub_scene_practice_questions WHERE sub_scene_id = ${subSceneId}`
      const existingCount = existingResult[0]?.count || 0

      if (existingCount > 0 && !isForce) {
        console.log(`⏭ 跳过（已存在 ${existingCount} 条）: ${subSceneId}`)
        skipCount++
        activeCount--
        processedCount++
        return
      }

      // 强制模式下先删除
      if (isForce && existingCount > 0) {
        await sql`DELETE FROM sub_scene_practice_questions WHERE sub_scene_id = ${subSceneId}`
      }

      // 批量插入
      const insertPromises = questions.map(q => {
        return sql`
          INSERT INTO sub_scene_practice_questions (id, sub_scene_id, type, "order", content, created_at, updated_at)
          VALUES (${q.id}, ${q.subSceneId}, ${q.type}, ${q.order}, ${JSON.stringify(q.content)}, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            type = EXCLUDED.type,
            "order" = EXCLUDED."order",
            content = EXCLUDED.content,
            updated_at = NOW()
        `
      })
      await Promise.all(insertPromises)

      console.log(`✓ ${subSceneId} (导入 ${questions.length} 道题目)`)
      successCount++
      totalQuestions += questions.length
    } catch (err) {
      console.error(`✗ ${subSceneId} 导入失败: ${err.message}`)
      failCount++
    }

    activeCount--
    processedCount++

    // 每 50 个输出进度
    if (processedCount % 50 === 0) {
      console.log(`\n--- 进度: ${processedCount}/${targetFiles.length} (成功:${successCount} 跳过:${skipCount} 失败:${failCount}) ---\n`)
    }

    // 启动下一个任务
    if (currentIndex < targetFiles.length) {
      const next = targetFiles[currentIndex++]
      processFile(next)
    }
  }

  // 启动初始并发任务
  const initialBatch = Math.min(CONCURRENCY, targetFiles.length)
  for (let i = 0; i < initialBatch; i++) {
    currentIndex++
    processFile(targetFiles[i])
  }

  // 等待所有任务完成
  await new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (activeCount === 0 && currentIndex >= targetFiles.length) {
        clearInterval(checkInterval)
        resolve(null)
      }
    }, 200)
  })

  // sql.end() 可能不存在，忽略错误
  try {
    if (typeof sql.end === 'function') {
      await sql.end()
    }
  } catch (e) {
    // 忽略
  }

  console.log(`\n=== 导入完成 ===`)
  console.log(`成功: ${successCount}，跳过: ${skipCount}，失败: ${failCount}`)
  console.log(`总计导入题目: ${totalQuestions} 道`)
}

importData().catch(err => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
