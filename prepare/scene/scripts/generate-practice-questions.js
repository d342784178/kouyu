/**
 * 子场景练习题生成脚本
 * 调用 NVIDIA API (qwen/qwen3-next-80b-a3b-instruct 为每个子场景生成练习题
 * 输出到 prepare/new_scene/data/practice-questions/{sub_scene_id}_{type}.json
 *
 * 用法：
 *   node prepare/new_scene/scripts/generate-practice-questions.js [选项]
 *
 * 选项：
 *   --subScene <id>   只处理指定子场景（不传则处理所有子场景）
 *   --type <type>     只生成指定题型：choice, fill_blank, speaking（不传则生成所有题型）
 *   --dry-run         只打印生成结果，不写入文件
 *   --force           强制覆盖已有文件
 *
 * 示例：
 *   # 生成所有子场景的所有题型
 *   node prepare/new_scene/scripts/generate-practice-questions.js
 *
 *   # 只生成填空题
 *   node prepare/new_scene/scripts/generate-practice-questions.js --type fill_blank
 *
 *   # 只生成指定子场景的选择题
 *   node prepare/new_scene/scripts/generate-practice-questions.js --subScene travel_072_sub_1 --type choice
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

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

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY
const MODEL = 'qwen/qwen3-next-80b-a3b-instruct'
const SUB_SCENES_DIR = path.resolve(__dirname, '../data/sub-scenes')
const OUTPUT_DIR = path.resolve(__dirname, '../data/practice-questions')

// ============================================================
// 命令行参数解析
// ============================================================

const args = process.argv.slice(2)
const subSceneFilter = args.includes('--subScene') ? args[args.indexOf('--subScene') + 1] : null
const typeFilter = args.includes('--type') ? args[args.indexOf('--type') + 1] : null
const isDryRun = args.includes('--dry-run')
const isForce = args.includes('--force')

const VALID_TYPES = ['choice', 'fill_blank', 'speaking']
const TYPES_TO_GENERATE = typeFilter ? [typeFilter] : VALID_TYPES

if (typeFilter && !VALID_TYPES.includes(typeFilter)) {
  console.error(`无效的题型: ${typeFilter}，有效选项: ${VALID_TYPES.join(', ')}`)
  process.exit(1)
}

// ============================================================
// NVIDIA Qwen3 API 调用
// ============================================================

/**
 * 调用 NVIDIA qwen3-next-80b-a3b-instruct API
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<string>}
 */
function callQwen(messages) {
  return new Promise((resolve, reject) => {
    if (!NVIDIA_API_KEY) {
      reject(new Error('NVIDIA_API_KEY 未配置，请在 .env.local 中设置'))
      return
    }

    const body = JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 8000,
    })

    const options = {
      hostname: 'integrate.api.nvidia.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) {
            reject(new Error(`NVIDIA API 错误: ${JSON.stringify(parsed.error)}`))
            return
          }
          const content = parsed.choices?.[0]?.message?.content ?? ''
          resolve(content)
        } catch (e) {
          reject(new Error(`响应解析失败: ${e.message}`))
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(180000, () => {
      req.destroy(new Error('NVIDIA API 请求超时（120s）'))
    })
    req.write(body)
    req.end()
  })
}

// ============================================================
// 数据生成逻辑
// ============================================================

/**
 * 为单个子场景生成指定类型的练习题
 * @param {Object} subSceneData 子场景数据（从 JSON 文件读取）
 * @param {string} questionType 题型：choice, fill_blank, speaking
 * @returns {Promise<Object>}
 */
async function generatePracticeQuestions(subSceneData, questionType) {
  const { id: subSceneId, name, description, estimatedMinutes, qaPairs } = subSceneData

  console.log(`\n[生成] 子场景: ${name} (${subSceneId}) - 题型: ${questionType}`)

  // 格式化问答对数据
  const qaPairsText = (qaPairs || []).map((qa, index) => {
    const responses = (qa.responses || []).map(r => `  - ${r.text}（${r.text_cn}）`).join('\n')
    return `[QA_${index + 1}] ID: ${qa.id}
类型: ${qa.qaType}
对方说: ${qa.speakerText}
中文: ${qa.speakerTextCn}
标准回应:
${responses}
${qa.usageNote ? `使用说明: ${qa.usageNote}` : ''}`
  }).join('\n\n')

  // 根据题型获取 Prompt 配置
  const typeSpecificPrompt = getTypeSpecificPrompt(questionType)

  // 使用新的 prompt 结构
  const systemPrompt = typeSpecificPrompt.systemPrompt
  const userPrompt = typeSpecificPrompt.userPrompt
    .replace('{name}', name)
    .replace('{description}', description)
    .replace('{estimatedMinutes}', estimatedMinutes || 5)
    .replace('{qaPairsText}', qaPairsText)

  const content = await callQwen([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  // 提取 JSON
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7)
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3)
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3)
  }

  const generated = JSON.parse(jsonStr.trim())

  if (!generated.questions || !Array.isArray(generated.questions)) {
    throw new Error(`子场景 ${subSceneId} 的 LLM 响应中缺少 questions 数组`)
  }

  // 构建结果
  const result = {
    subSceneId,
    subSceneName: name,
    questionType,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    questions: generated.questions.map((q, index) => ({
      id: `${subSceneId}_${questionType}_${index + 1}`,
      subSceneId,
      type: questionType,
      order: index + 1,
      content: q,
    })),
  }

  return result
}

/**
 * 获取题型特定的 Prompt 配置
 * @param {string} questionType 题型
 * @returns {Object}
 */
function getTypeSpecificPrompt(questionType) {
  const prompts = {
    choice: {
      title: '选择题',
      systemPrompt: `你是一位专业的英语口语教学专家，擅长设计高质量的口语练习题。你的任务是根据给定的场景主题和对话示例，生成选择题。

## 角色定位
- 你精通英语口语教学法，了解二语习得理论
- 你能准确识别场景中的核心交际任务和语言知识点
- 你设计的题目具有教学价值，能有效帮助学习者掌握口语表达

## 核心目标
1. 测试用户能否准确理解对方问题（避免答非所问）
2. 测试用户能否在常见&高频情形下给出恰当回答（避免听懂但不会表达）

## 主题提炼要求
1. 从问答对中识别核心问题类型（如：询问、确认、请求、拒绝等）
2. 从问答对中识别核心回答模式（如：I'd like to..., Could you..., I'm looking for...）
3. 结合子场景主题，确定该场景的核心交际任务

## 题目创作要求
1. 基于提炼的主题，设计全新的具体情形
2. 情形必须是常见&高频的实际生活情境（禁止低频、罕见、极端情形）
3. 对话内容必须重新创作，不能复用问答对原文
4. 每道题必须明确描述具体情形，让用户代入实际场景
5. 设计 2-3 道选择题

## 选项设计要求
- 正确答案：该情形下最自然、最常用的表达
- 干扰项类型：
  1. 答非所问型：听懂问题但回答了别的内容
  2. 理解偏差型：误解了问题的真实意图
  3. 表达不当型：理解正确但表达不自然或不完整
- 所有选项必须是实际对话中可能出现的真实表达
- 每道题 4 个选项：1 个正确答案 + 3 个干扰项

## 禁止事项
- 禁止直接复用问答对的原文内容
- 禁止对问答对进行简单的挖空或改写
- 禁止设计低频、罕见、极端的情形
- 禁止考察生僻表达或低频用法

## 输出格式
你必须输出严格的 JSON 格式，不要包含任何其他文字说明。JSON 结构如下：

\`\`\`json
{
  "questions": [
    {
      "type": "choice",
      "situation": "具体情形描述（常见&高频的实际生活情境）",
      "speakerText": "对方说的话（英文）",
      "speakerTextCn": "对方说的话（中文翻译）",
      "options": [
        {"id": "opt_1", "text": "选项文本（英文）", "isCorrect": true或false}
      ],
      "explanation": "答案解析：说明正确答案为何正确，各干扰项的问题所在"
    }
  ]
}
\`\`\`

## 质量标准
1. 题目必须紧扣场景主题，基于提炼的核心交际任务
2. 情形必须真实、常见、高频
3. 正确答案必须是该情形下的最佳表达
4. 干扰项必须有迷惑性但不能误导学习者
5. 解析要具体、有教学价值
6. 确保输出是合法的 JSON 格式`,
      userPrompt: `请根据以下场景信息生成选择题。

## 子场景信息
- 场景名称：{name}
- 场景描述：{description}
- 预计学习时长：{estimatedMinutes} 分钟

## 问答对示例（用于提炼主题，禁止直接复用）
{qaPairsText}

## 生成要求
1. 从上述子场景和问答对中提炼核心主题
2. 基于提炼的主题，设计全新的常见&高频情形
3. 设计 2-3 道选择题
4. 确保输出是严格的 JSON 格式，不要包含任何其他文字

请直接输出 JSON：`,
    },
    fill_blank: {
      title: '填空题',
      systemPrompt: `你是一位专业的英语口语教学专家，擅长设计高质量的口语练习题。你的任务是根据给定的场景主题和对话示例，生成填空题。

## 角色定位
- 你精通英语口语教学法，了解二语习得理论
- 你能准确识别场景中的核心表达结构和功能词汇
- 你设计的题目具有教学价值，能有效帮助学习者掌握口语表达

## 核心目标
1. 测试用户能否准确理解对方问题
2. 测试用户能否在常见&高频情形下使用正确的表达方式

## 主题提炼要求
1. 从问答对中识别核心表达结构（如：would like to, could you, I'm looking for）
2. 从问答对中识别关键功能词汇（如：目的地、时间、数量等场景相关词汇）
3. 结合子场景主题，确定该场景的核心语言点

## 题目创作要求
1. 基于提炼的主题，设计全新的具体情形
2. 情形必须是常见&高频的实际生活情境（禁止低频、罕见、极端情形）
3. 对话内容必须重新创作，不能复用问答对原文
4. 每道题必须明确描述具体情形，让用户代入实际场景
5. 空格位置必须是该情形下最核心、最常用的表达
6. 设计 2-3 道填空题

## 空格设计要求
- 空格位置必须是该情形下最核心、最常用的表达
- 考察的是实际表达中必须掌握的关键词或句型
- 每个空格必须有 4 个选项（1 个正确答案 + 3 个干扰项）
- 禁止考察具体信息（地址、人名、数字、时间）
- 禁止考察生僻表达或低频用法

## 干扰项设计要求
1. 常见错误：学习者容易犯的表达错误
2. 语法正确但语境不符：语法对但不符合该情形
3. 母语干扰：中文思维导致的错误表达
4. 近义混淆：相似表达但用法不同

## 禁止事项
- 禁止直接复用问答对的原文内容
- 禁止对问答对进行简单的挖空或改写
- 禁止设计低频、罕见、极端的情形
- 禁止考察具体信息（地址、人名、数字、时间）
- 禁止考察生僻表达或低频用法

## 输出格式
你必须输出严格的 JSON 格式，不要包含任何其他文字说明。JSON 结构如下：

\`\`\`json
{
  "questions": [
    {
      "type": "fill_blank",
      "situation": "具体情形描述（常见&高频的实际生活情境）",
      "speakerText": "对方说的话（英文）",
      "speakerTextCn": "对方说的话（中文翻译）",
      "responseTemplate": "用户回答模板，用___表示空格",
      "blanks": [
        {
          "index": 0,
          "answer": "正确答案",
          "options": ["选项1", "选项2", "选项3", "选项4"]
        }
      ],
      "hint": "填空提示，帮助用户回忆",
      "knowledgePoint": "考察的知识点类型"
    }
  ]
}
\`\`\`

## 质量标准
1. 题目必须紧扣场景主题，基于提炼的核心语言点
2. 情形必须真实、常见、高频
3. 空格位置必须是该情形下的核心表达
4. 干扰项必须有迷惑性但不能误导学习者
5. 确保输出是合法的 JSON 格式`,
      userPrompt: `请根据以下场景信息生成填空题。

## 子场景信息
- 场景名称：{name}
- 场景描述：{description}
- 预计学习时长：{estimatedMinutes} 分钟

## 问答对示例（用于提炼主题，禁止直接复用）
{qaPairsText}

## 生成要求
1. 从上述子场景和问答对中提炼核心主题和表达结构
2. 基于提炼的主题，设计全新的常见&高频情形
3. 设计 2-3 道填空题
4. 禁止考察具体信息（地址、人名、数字、时间）
5. 确保输出是严格的 JSON 格式，不要包含任何其他文字

请直接输出 JSON：`,
    },
    speaking: {
      title: '问答题',
      systemPrompt: `你是一位专业的英语口语教学专家，擅长设计高质量的口语练习题。你的任务是根据给定的场景主题和对话示例，生成问答题。

## 角色定位
- 你精通英语口语教学法，了解二语习得理论
- 你能准确识别场景中的核心交际任务和语言知识点
- 你设计的题目具有教学价值，能有效帮助学习者掌握口语表达

## 核心目标
1. 测试用户能否准确理解对方问题（避免答非所问）
2. 测试用户能否在常见&高频情形下给出恰当回答（避免听懂但不会表达）

## 主题提炼要求
1. 从问答对中识别核心问题类型（如：询问、确认、请求、拒绝等）
2. 从问答对中识别核心回答模式（如：I'd like to..., Could you..., I'm looking for...）
3. 结合子场景主题，确定该场景的核心交际任务

## 题目创作要求
1. 基于提炼的主题，设计全新的具体情形
2. 情形必须是常见&高频的实际生活情境（禁止低频、罕见、极端情形）
3. 对话内容必须重新创作，不能复用问答对原文
4. 每道题必须明确描述具体情形，让用户代入实际场景
5. 设计 2-3 道问答题

## 参考答案设计要求
- 提供 2-4 个可接受的参考答案
- 参考答案应包含不同难度层次（简单表达 → 高级表达）
- 所有参考答案必须是该情形下自然、常用的表达

## 评分标准要求
评分标准要具体可操作，包括：
- 意图达成度：是否正确回应了对方的问题
- 语言准确性：语法和用词是否正确
- 表达自然度：是否符合英语口语习惯
- 关键词覆盖：是否使用了场景关键词

## 禁止事项
- 禁止直接复用问答对的原文内容
- 禁止设计低频、罕见、极端的情形
- 禁止考察生僻表达或低频用法

## 输出格式
你必须输出严格的 JSON 格式，不要包含任何其他文字说明。JSON 结构如下：

\`\`\`json
{
  "questions": [
    {
      "type": "speaking",
      "situation": "具体情形描述（常见&高频的实际生活情境）",
      "speakerText": "对方说的话（英文）",
      "speakerTextCn": "对方说的话（中文翻译）",
      "expectedAnswers": ["参考答案1", "参考答案2", "参考答案3"],
      "evaluationCriteria": ["评分标准1", "评分标准2", "评分标准3"]
    }
  ]
}
\`\`\`

## 质量标准
1. 题目必须紧扣场景主题，基于提炼的核心交际任务
2. 情形必须真实、常见、高频
3. 参考答案必须是该情形下的自然表达
4. 评分标准要具体、有教学价值
5. 确保输出是合法的 JSON 格式`,
      userPrompt: `请根据以下场景信息生成问答题。

## 子场景信息
- 场景名称：{name}
- 场景描述：{description}
- 预计学习时长：{estimatedMinutes} 分钟

## 问答对示例（用于提炼主题，禁止直接复用）
{qaPairsText}

## 生成要求
1. 从上述子场景和问答对中提炼核心主题
2. 基于提炼的主题，设计全新的常见&高频情形
3. 设计 2-3 道问答题
4. 每道题提供 2-4 个参考答案
5. 确保输出是严格的 JSON 格式，不要包含任何其他文字

请直接输出 JSON：`,
    },
  }

  return prompts[questionType]
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log('=== 子场景练习题生成脚本 ===')
  console.log(`模型: ${MODEL}`)
  console.log(`模式: ${isDryRun ? 'dry-run（不写入文件）' : '正式生成'}`)
  console.log(`强制覆盖: ${isForce ? '是' : '否'}`)
  console.log(`生成题型: ${TYPES_TO_GENERATE.join(', ')}`)

  // 确保输出目录存在
  if (!isDryRun) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // 检查子场景数据目录
  if (!fs.existsSync(SUB_SCENES_DIR)) {
    console.error(`子场景数据目录不存在: ${SUB_SCENES_DIR}`)
    console.error('请先运行 generate-sub-scenes.js 生成子场景数据')
    process.exit(1)
  }

  // 读取所有子场景文件
  const subSceneFiles = fs.readdirSync(SUB_SCENES_DIR).filter(f => f.endsWith('.json'))
  if (subSceneFiles.length === 0) {
    console.error('未找到子场景数据文件')
    process.exit(1)
  }

  // 收集所有子场景
  let subScenes = []
  for (const file of subSceneFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(SUB_SCENES_DIR, file), 'utf-8'))
      // 每个文件包含一个场景的多个子场景
      if (data.subScenes && Array.isArray(data.subScenes)) {
        subScenes.push(...data.subScenes)
      }
    } catch (e) {
      console.warn(`跳过无效文件: ${file}`)
    }
  }

  // 应用子场景过滤
  if (subSceneFilter) {
    subScenes = subScenes.filter(s => s.id === subSceneFilter)
    if (subScenes.length === 0) {
      console.error(`未找到子场景 ID: ${subSceneFilter}`)
      process.exit(1)
    }
  }

  // 构建任务列表：每个子场景 × 每个题型
  const tasks = []
  for (const subScene of subScenes) {
    for (const questionType of TYPES_TO_GENERATE) {
      const outputPath = path.join(OUTPUT_DIR, `${subScene.id}_${questionType}.json`)
      if (!isForce && fs.existsSync(outputPath)) {
        console.log(`⏭ 跳过（已存在）: ${subScene.id}_${questionType}`)
      } else {
        tasks.push({ subScene, questionType, outputPath })
      }
    }
  }

  console.log(`\n共 ${subScenes.length} 个子场景 × ${TYPES_TO_GENERATE.length} 个题型 = ${subScenes.length * TYPES_TO_GENERATE.length} 个任务`)
  console.log(`需要生成: ${tasks.length} 个任务\n`)

  if (tasks.length === 0) {
    console.log('所有任务已存在，无需生成')
    return
  }

  let successCount = 0
  let failCount = 0
  let skipCount = subScenes.length * TYPES_TO_GENERATE.length - tasks.length

  // 并发控制：15 个并发
  const CONCURRENCY = 15
  // 失败重试次数
  const MAX_RETRY = 2

  // 并发池控制 - 真正的持续并发
  let currentIndex = 0
  let activeCount = 0
  let processedCount = 0

  async function processTask(task) {
    activeCount++
    const { subScene, questionType, outputPath } = task

    let lastErr
    for (let attempt = 1; attempt <= MAX_RETRY + 1; attempt++) {
      try {
        const result = await generatePracticeQuestions(subScene, questionType)
        if (isDryRun) {
          console.log(`\n[dry-run] ${subScene.id}_${questionType} 生成结果预览:`)
          console.log(JSON.stringify(result, null, 2).slice(0, 500) + '...')
        } else {
          fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8')
          console.log(`✓ ${subScene.id}_${questionType} (题目: ${result.questions.length})`)
        }
        successCount++
        break
      } catch (err) {
        lastErr = err
        if (attempt <= MAX_RETRY) {
          console.warn(`⚠ ${subScene.id}_${questionType} 第${attempt}次失败，重试中... (${err.message})`)
          await new Promise(r => setTimeout(r, 3000 * attempt))
        }
      }
    }
    
    if (lastErr && !fs.existsSync(outputPath)) {
      console.error(`✗ ${subScene.id}_${questionType} 最终失败: ${lastErr.message}`)
      failCount++
    }

    activeCount--
    processedCount++
    if (processedCount % 10 === 0 || processedCount === tasks.length) {
      console.log(`\n--- 进度: ${processedCount}/${tasks.length} (成功:${successCount} 跳过:${skipCount} 失败:${failCount}) ---\n`)
    }

    // 启动下一个任务
    if (currentIndex < tasks.length) {
      const next = tasks[currentIndex++]
      processTask(next)
    }
  }

  // 启动初始并发任务
  const initialBatch = Math.min(CONCURRENCY, tasks.length)
  for (let i = 0; i < initialBatch; i++) {
    currentIndex++
    processTask(tasks[i])
  }

  // 等待所有任务完成
  await new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (activeCount === 0 && currentIndex >= tasks.length) {
        clearInterval(checkInterval)
        resolve(null)
      }
    }, 500)
  })

  console.log(`\n=== 生成完成 ===`)
  console.log(`成功: ${successCount}，跳过: ${skipCount}，失败: ${failCount}`)
  if (!isDryRun && successCount > 0) {
    console.log(`\n输出目录: ${OUTPUT_DIR}`)
    console.log('下一步：运行 import-practice-questions.js 将数据导入数据库')
    console.log('  node prepare/new_scene/scripts/import-practice-questions.js')
  }
}

main().catch(err => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
