/**
 * 练习题数据导入脚本
 * 将 prepare/new_scene/data/practice-questions/ 目录下的 JSON 数据导入数据库
 *
 * 用法：
 *   node prepare/new_scene/scripts/import-practice-questions.js [选项]
 *
 * 选项：
 *   --subScene <id>   只导入指定子场景（不传则导入所有）
 *   --type <type>     只导入指定题型：choice, fill_blank, speaking（不传则导入所有）
 *   --force           先删除已有数据再导入
 *
 * 示例：
 *   # 导入所有数据
 *   node prepare/new_scene/scripts/import-practice-questions.js
 *
 *   # 只导入填空题
 *   node prepare/new_scene/scripts/import-practice-questions.js --type fill_blank
 *
 *   # 只导入指定子场景的选择题
 *   node prepare/new_scene/scripts/import-practice-questions.js --subScene travel_072_sub_1 --type choice
 *
 *   # 强制覆盖已有数据
 *   node prepare/new_scene/scripts/import-practice-questions.js --type fill_blank --force
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
const typeFilter = args.includes('--type') ? args[args.indexOf('--type') + 1] : null
const isForce = args.includes('--force')

const VALID_TYPES = ['choice', 'fill_blank', 'speaking']

if (typeFilter && !VALID_TYPES.includes(typeFilter)) {
  console.error(`无效的题型: ${typeFilter}，有效选项: ${VALID_TYPES.join(', ')}`)
  process.exit(1)
}

// ============================================================
// 数据库操作
// ============================================================

async function importData() {
  console.log('=== 练习题数据导入脚本 ===')
  console.log(`模式: ${isForce ? '强制覆盖（先删除后导入）' : '增量导入'}`)
  console.log(`题型过滤: ${typeFilter || '全部'}`)

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
  let files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  if (files.length === 0) {
    console.error('未找到练习题数据文件')
    process.exit(1)
  }

  // 应用题型过滤（新格式：subSceneId_type.json）
  if (typeFilter) {
    files = files.filter(f => f.endsWith(`_${typeFilter}.json`))
    if (files.length === 0) {
      console.error(`未找到题型 ${typeFilter} 的数据文件`)
      process.exit(1)
    }
  }

  // 应用子场景过滤
  if (subSceneFilter) {
    if (typeFilter) {
      // 指定了题型：精确匹配 subSceneId_type.json
      files = files.filter(f => f === `${subSceneFilter}_${typeFilter}.json`)
    } else {
      // 未指定题型：匹配所有 subSceneId_*.json
      files = files.filter(f => f.startsWith(`${subSceneFilter}_`))
    }
    if (files.length === 0) {
      console.error(`未找到子场景 ID: ${subSceneFilter}`)
      process.exit(1)
    }
  }

  console.log(`\n共找到 ${files.length} 个练习题文件，开始导入...\n`)

  // 创建数据库连接
  const sql = neon(DATABASE_URL)

  let successCount = 0
  let failCount = 0
  let skipCount = 0
  let totalQuestions = 0

  // 并发控制：10 个并发
  const CONCURRENCY = 30
  let currentIndex = 0
  let activeCount = 0
  let processedCount = 0

  async function processFile(file) {
    activeCount++
    const filePath = path.join(DATA_DIR, file)
    // 文件名格式：subSceneId_type.json
    const fileName = file.replace('.json', '')
    const lastUnderscoreIdx = fileName.lastIndexOf('_')
    const subSceneId = fileName.slice(0, lastUnderscoreIdx)
    const questionType = fileName.slice(lastUnderscoreIdx + 1)

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      const questions = data.questions || []

      if (questions.length === 0) {
        console.log(`⏭ 跳过（无题目）: ${fileName}`)
        skipCount++
        activeCount--
        processedCount++
        return
      }

      // 检查是否已有该子场景该类型的数据
      const existingResult = await sql`
        SELECT COUNT(*) as count FROM sub_scene_practice_questions 
        WHERE sub_scene_id = ${subSceneId} AND type = ${questionType}
      `
      const existingCount = existingResult[0]?.count || 0

      if (existingCount > 0 && !isForce) {
        console.log(`⏭ 跳过（已存在 ${existingCount} 条）: ${fileName}`)
        skipCount++
        activeCount--
        processedCount++
        return
      }

      // 强制模式下先删除该子场景该类型的数据
      if (isForce && existingCount > 0) {
        await sql`
          DELETE FROM sub_scene_practice_questions 
          WHERE sub_scene_id = ${subSceneId} AND type = ${questionType}
        `
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

      console.log(`✓ ${fileName} (导入 ${questions.length} 道题目)`)
      successCount++
      totalQuestions += questions.length
    } catch (err) {
      console.error(`✗ ${fileName} 导入失败: ${err.message}`)
      failCount++
    }

    activeCount--
    processedCount++

    // 每 50 个输出进度
    if (processedCount % 50 === 0) {
      console.log(`\n--- 进度: ${processedCount}/${files.length} (成功:${successCount} 跳过:${skipCount} 失败:${failCount}) ---\n`)
    }

    // 启动下一个任务
    if (currentIndex < files.length) {
      const next = files[currentIndex++]
      processFile(next)
    }
  }

  // 启动初始并发任务
  const initialBatch = Math.min(CONCURRENCY, files.length)
  for (let i = 0; i < initialBatch; i++) {
    currentIndex++
    processFile(files[i])
  }

  // 等待所有任务完成
  await new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (activeCount === 0 && currentIndex >= files.length) {
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
