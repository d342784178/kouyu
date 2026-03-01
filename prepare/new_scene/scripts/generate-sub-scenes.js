/**
 * 子场景数据生成脚本
 * 调用 NVIDIA API (qwen/qwen3-next-80b-a3b-instruct) 为每个场景生成子场景和问答对数据
 * 输出到 prepare/new_scene/data/sub-scenes/{scene_id}.json
 *
 * 用法：
 *   node prepare/new_scene/scripts/generate-sub-scenes.js [--scene <scene_id>] [--dry-run]
 *
 * 选项：
 *   --scene <id>   只处理指定场景（不传则处理所有场景）
 *   --dry-run      只打印生成结果，不写入文件
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
const OUTPUT_DIR = path.resolve(__dirname, '../data/sub-scenes')

// ============================================================
// 命令行参数解析
// ============================================================

const args = process.argv.slice(2)
const sceneFilter = args.includes('--scene') ? args[args.indexOf('--scene') + 1] : null
const isDryRun = args.includes('--dry-run')
const isForce = args.includes('--force') // 强制覆盖已有文件

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
      max_tokens: 10000,
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
    req.setTimeout(120000, () => {
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
 * 为单个场景生成子场景和问答对数据
 * @param {{id: string, name: string, category: string, description: string}} scene
 * @returns {Promise<Object>}
 */
async function generateSubScenesForScene(scene) {
  console.log(`\n[生成] 场景: ${scene.name} (${scene.id})`)

  const prompt = `你是英语口语教学内容设计专家。请为以下英语口语学习场景设计子场景和问答对数据。

场景信息：
- 场景ID: ${scene.id}
- 场景名称: ${scene.name}
- 场景类别: ${scene.category}
- 场景描述: ${scene.description}

请设计 3-5 个子场景，每个子场景包含 3-6 个问答对。

**重要：用户角色定位原则**
- 用户（学习者）应该扮演"消费者"、"使用者"、"顾客"、"求职者"、"学生"等角色
- 用户应该是"接受服务"或"提出需求"的一方
- speakerText 应该是服务提供者说的话（如服务员、店员、医生、面试官等）
- responses 应该是用户作为消费者/使用者的回应
- 例如：在餐厅场景中，speakerText 是服务员说的话，responses 是顾客（用户）的回应

请设计 3-5 个子场景，每个子场景包含 3-6 个问答对。

要求：
1. 子场景要覆盖该场景的核心交流环节（如：问候→询问→确认→道别）
2. 每个问答对包含：
   - speaker_text: 对方（服务提供者）说的话（英文，自然口语）
   - speaker_text_cn: 对方说的话（中文翻译）
   - responses: 用户（消费者/使用者）的2-3种回应方式（正式/非正式/简短）
   - usage_note: 使用说明（中文，20字以内）
   - qa_type: "must_speak"（需要用户开口练习）或 "listen_only"（只需听）
3. 每个子场景至少有 2 个 must_speak 类型的问答对
4. responses 中每条包含：text（英文）、text_cn（中文）、audio_url（留空字符串）

请严格按以下 JSON 格式返回，不要有其他内容：
{
  "subScenes": [
    {
      "name": "子场景名称（中文，8字以内）",
      "description": "子场景描述（中文，30字以内）",
      "order": 1,
      "estimatedMinutes": 5,
      "qaPairs": [
        {
          "speakerText": "对方说的英文",
          "speakerTextCn": "对方说的中文",
          "responses": [
            {"text": "回应英文", "text_cn": "回应中文", "audio_url": ""},
            {"text": "回应英文2", "text_cn": "回应中文2", "audio_url": ""}
          ],
          "usageNote": "使用说明",
          "qaType": "must_speak",
          "order": 1
        }
      ]
    }
  ]
}`

  const content = await callQwen([
    { role: 'system', content: '你是英语口语教学内容设计专家，擅长设计自然、实用的口语练习场景。重要：用户（学习者）必须扮演消费者、使用者、顾客等角色，speakerText应该是服务提供者说的话，responses是用户的回应。请严格按要求的JSON格式返回，不要有其他内容。' },
    { role: 'user', content: prompt },
  ])

  // 提取 JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`场景 ${scene.id} 的 LLM 响应中未找到 JSON`)
  }

  const generated = JSON.parse(jsonMatch[0])

  // 为每个子场景和问答对生成 id
  const result = {
    sceneId: scene.id,
    sceneName: scene.name,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    subScenes: generated.subScenes.map((sub, subIdx) => {
      const subSceneId = `${scene.id}_sub_${subIdx + 1}`
      return {
        id: subSceneId,
        sceneId: scene.id,
        name: sub.name,
        description: sub.description,
        order: sub.order ?? subIdx + 1,
        estimatedMinutes: sub.estimatedMinutes ?? 5,
        qaPairs: (sub.qaPairs || []).map((qa, qaIdx) => {
          const qaId = `${subSceneId}_qa_${qaIdx + 1}`
          // 为每个答案生成音频URL
          const responses = (qa.responses || []).map((resp, respIdx) => ({
            text: resp.text || '',
            text_cn: resp.text_cn || '',
            audio_url: `COS:/qa/responses/${qaId}_response${respIdx}.mp3`
          }))
          
          return {
            id: qaId,
            subSceneId,
            speakerText: qa.speakerText,
            speakerTextCn: qa.speakerTextCn,
            responses,
            usageNote: qa.usageNote || null,
            audioUrl: `COS:/qa/questions/${qaId}.mp3`,
            qaType: qa.qaType || 'must_speak',
            order: qa.order ?? qaIdx + 1,
          }
        }),
      }
    }),
  }

  return result
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log('=== 子场景数据生成脚本 ===')
  console.log(`模型: ${MODEL}`)
  console.log(`模式: ${isDryRun ? 'dry-run（不写入文件）' : '正式生成（强制覆盖）'}`)

  // 确保输出目录存在
  if (!isDryRun) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // 从数据库读取场景列表（通过 API 或直接读取 JSON）
  // 这里从 prepare/scene/data/ 目录读取已有的场景 JSON 文件
  const sceneDataDir = path.resolve(__dirname, '../../scene/data')
  if (!fs.existsSync(sceneDataDir)) {
    console.error(`场景数据目录不存在: ${sceneDataDir}`)
    console.error('请先运行场景数据初始化脚本')
    process.exit(1)
  }

  // 只读取 scenes_final.json，避免读取 scene_tests.json 等其他文件
  const sceneFiles = fs.readdirSync(sceneDataDir).filter(f => f === 'scenes_final.json')
  if (sceneFiles.length === 0) {
    console.error('未找到 scenes_final.json，请先生成场景数据')
    process.exit(1)
  }

  // 收集所有场景
  let scenes = []
  for (const file of sceneFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(sceneDataDir, file), 'utf-8'))
      // 支持单个场景对象或场景数组，兼容 scene_id / id 两种字段名
      if (Array.isArray(data)) {
        scenes.push(...data.map(s => ({ ...s, id: s.id || s.scene_id, name: s.name || s.scene_name })))
      } else if (data.id || data.scene_id) {
        scenes.push({ ...data, id: data.id || data.scene_id, name: data.name || data.scene_name })
      }
    } catch (e) {
      console.warn(`跳过无效文件: ${file}`)
    }
  }

  // 应用场景过滤
  if (sceneFilter) {
    scenes = scenes.filter(s => s.id === sceneFilter)
    if (scenes.length === 0) {
      console.error(`未找到场景 ID: ${sceneFilter}`)
      process.exit(1)
    }
  }

  console.log(`\n共找到 ${scenes.length} 个场景，开始生成子场景数据...\n`)

  let successCount = 0
  let failCount = 0
  let skipCount = 0

  // 并发控制：10 个并发
  const CONCURRENCY = 10
  // 失败重试次数
  const MAX_RETRY = 2

  async function processScene(scene) {
    const outputPath = path.join(OUTPUT_DIR, `${scene.id}.json`)
    // 断点续传：已生成的跳过（除非 --force）
    if (!isForce && fs.existsSync(outputPath)) {
      skipCount++
      console.log(`⏭ 跳过（已存在）: ${scene.id}`)
      return
    }

    let lastErr
    for (let attempt = 1; attempt <= MAX_RETRY + 1; attempt++) {
      try {
        const result = await generateSubScenesForScene(scene)
        if (isDryRun) {
          console.log(`\n[dry-run] ${scene.id} 生成结果预览:`)
          console.log(JSON.stringify(result, null, 2).slice(0, 500) + '...')
        } else {
          fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8')
          const qaTotal = result.subScenes.reduce((sum, s) => sum + s.qaPairs.length, 0)
          console.log(`✓ ${scene.id} (子场景: ${result.subScenes.length}, 问答对: ${qaTotal})`)
        }
        successCount++
        return
      } catch (err) {
        lastErr = err
        if (attempt <= MAX_RETRY) {
          console.warn(`⚠ ${scene.id} 第${attempt}次失败，重试中... (${err.message})`)
          await new Promise(r => setTimeout(r, 2000 * attempt))
        }
      }
    }
    console.error(`✗ ${scene.id} 最终失败: ${lastErr.message}`)
    failCount++
  }

  // 分批并发执行
  let processed = 0
  for (let i = 0; i < scenes.length; i += CONCURRENCY) {
    const batch = scenes.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(processScene))
    processed = Math.min(i + CONCURRENCY, scenes.length)
    console.log(`\n--- 进度: ${processed}/${scenes.length} (成功:${successCount} 跳过:${skipCount} 失败:${failCount}) ---\n`)
  }

  console.log(`\n=== 生成完成 ===`)
  console.log(`成功: ${successCount}，跳过: ${skipCount}，失败: ${failCount}`)
  if (!isDryRun && successCount > 0) {
    console.log(`\n输出目录: ${OUTPUT_DIR}`)
    console.log('下一步：运行 import-sub-scenes.ts 将数据导入数据库')
    console.log('  npx ts-node prepare/new_scene/scripts/import-sub-scenes.ts')
  }
}

main().catch(err => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})
