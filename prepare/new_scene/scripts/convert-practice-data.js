/**
 * 数据转换脚本
 * 将旧格式（每个子场景一个文件，包含所有题型）转换为新格式（每个题型独立文件）
 *
 * 旧格式：{subSceneId}.json（包含 choice, fill_blank, speaking）
 * 新格式：{subSceneId}_{type}.json（每个题型独立文件）
 *
 * 用法：
 *   node prepare/new_scene/scripts/convert-practice-data.js
 */

const fs = require('fs')
const path = require('path')

const INPUT_DIR = path.resolve(__dirname, '../data/practice-questions')
const OUTPUT_DIR = path.resolve(__dirname, '../data/practice-questions-new')
const VALID_TYPES = ['choice', 'fill_blank', 'speaking']

async function main() {
  console.log('=== 练习题数据格式转换脚本 ===\n')

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // 读取所有旧格式文件
  const files = fs.readdirSync(INPUT_DIR).filter(f => {
    // 只处理旧格式文件（不包含下划线分隔的题型后缀）
    if (!f.endsWith('.json')) return false
    const name = f.replace('.json', '')
    // 新格式文件名包含 _choice, _fill_blank, _speaking
    if (name.endsWith('_choice') || name.endsWith('_fill_blank') || name.endsWith('_speaking')) {
      return false
    }
    return true
  })

  console.log(`找到 ${files.length} 个旧格式文件\n`)

  let totalConverted = 0
  let totalQuestions = 0
  const typeCounts = { choice: 0, fill_blank: 0, speaking: 0 }

  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file)
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      const { subSceneId, subSceneName, questions } = data

      if (!questions || !Array.isArray(questions)) {
        console.log(`⏭ 跳过（无题目）: ${file}`)
        continue
      }

      // 按题型分组
      const questionsByType = {}
      for (const q of questions) {
        const type = q.type
        if (!VALID_TYPES.includes(type)) {
          console.warn(`⚠ 未知题型: ${type} in ${file}`)
          continue
        }
        if (!questionsByType[type]) {
          questionsByType[type] = []
        }
        questionsByType[type].push(q)
      }

      // 为每个题型生成新文件
      for (const type of VALID_TYPES) {
        const typeQuestions = questionsByType[type] || []
        if (typeQuestions.length === 0) continue

        // 重新编号并更新 ID
        const reorderedQuestions = typeQuestions.map((q, index) => ({
          ...q,
          id: `${subSceneId}_${type}_${index + 1}`,
          type,
          order: index + 1,
        }))

        // 构建新格式数据
        const newData = {
          subSceneId,
          subSceneName,
          questionType: type,
          generatedAt: data.generatedAt,
          model: data.model,
          questions: reorderedQuestions,
        }

        // 写入新文件
        const outputFileName = `${subSceneId}_${type}.json`
        const outputPath = path.join(OUTPUT_DIR, outputFileName)
        fs.writeFileSync(outputPath, JSON.stringify(newData, null, 2), 'utf-8')

        typeCounts[type] += reorderedQuestions.length
        totalQuestions += reorderedQuestions.length
      }

      totalConverted++
      if (totalConverted % 50 === 0) {
        console.log(`已处理: ${totalConverted}/${files.length}`)
      }
    } catch (err) {
      console.error(`✗ 处理失败: ${file} - ${err.message}`)
    }
  }

  console.log(`\n=== 转换完成 ===`)
  console.log(`处理文件: ${totalConverted}/${files.length}`)
  console.log(`总题目数: ${totalQuestions}`)
  console.log(`  - 选择题: ${typeCounts.choice}`)
  console.log(`  - 填空题: ${typeCounts.fill_blank}`)
  console.log(`  - 问答题: ${typeCounts.speaking}`)
  console.log(`\n输出目录: ${OUTPUT_DIR}`)
  console.log('\n下一步：')
  console.log('1. 检查输出目录中的数据是否正确')
  console.log('2. 删除旧数据：rm -rf prepare/new_scene/data/practice-questions/*.json')
  console.log('3. 移动新数据：mv prepare/new_scene/data/practice-questions-new/*.json prepare/new_scene/data/practice-questions/')
  console.log('4. 删除临时目录：rm -rf prepare/new_scene/data/practice-questions-new')
  console.log('5. 清空数据库表并重新导入：node prepare/new_scene/scripts/import-practice-questions.js --force')
}

main().catch(err => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
