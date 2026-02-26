/**
 * 场景测试数据生成脚本
 *
 * 功能:
 * 1. generate - 生成测试数据并保存到 JSON
 * 2. import - 将 JSON 数据导入数据库
 * 3. generate-and-import - 生成并导入
 *
 * 使用方法:
 * npx ts-node prepare/scene/scripts/generate-scene-tests.ts <command>
 *
 * 示例:
 * npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate
 * npx ts-node prepare/scene/scripts/generate-scene-tests.ts import
 * npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate-and-import
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 配置
const CONFIG = {
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY || '',
  NVIDIA_API_URL: 'https://integrate.api.nvidia.com/v1/chat/completions',
  NVIDIA_MODEL: 'z-ai/glm4.7',
  CONCURRENCY: 10,
  MAX_TOKENS: 100000,
  TEMPERATURE: 0.7,
  DATA_DIR: path.resolve(process.cwd(), 'prepare/scene/data'),
  OUTPUT_FILE: path.resolve(process.cwd(), 'prepare/scene/data/scene_tests.json'),
};

// 类型定义
interface DialogueContent {
  index: number;
  speaker: string;
  speaker_name: string;
  text: string;
  translation: string;
  is_key_qa: boolean;
  audio_url?: string;
}

interface StandardAnswer {
  text: string;
  translation: string;
  scenario: string;
  formality: 'casual' | 'neutral' | 'formal';
}

interface AlternativeAnswer {
  text: string;
  translation: string;
  scenario: string;
  formality: 'casual' | 'neutral' | 'formal';
}

interface Analysis {
  analysis_detail: string;
  standard_answer: StandardAnswer;
  alternative_answers: AlternativeAnswer[];
  usage_notes: string;
}

interface DialogueRound {
  round_number: number;
  content: DialogueContent[];
  analysis: Analysis;
}

interface VocabularyItem {
  vocab_id: string;
  type: string;
  content: string;
  phonetic: string;
  translation: string;
  audio_url?: string;
  example: string;
  example_translation: string;
  example_audio_url?: string;
  round_number: number;
  difficulty: string;
}

interface SceneData {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: string;
  tags: string[];
  dialogue: DialogueRound[];
  vocabulary: VocabularyItem[];
}

// 选择题类型
interface ChoiceQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  analysis: string;
}

// 问答题类型
interface ReferenceAnswer {
  text: string;
  style: 'casual' | 'neutral' | 'formal';
  description: string;
}

interface QAQuestion {
  question: string;
  reference_answers: ReferenceAnswer[];
  analysis: string;
}

// 开放式对话类型
interface Role {
  name: string;
  description: string;
  is_user: boolean;
  suggest: boolean;
}

interface OpenDialogue {
  topic: string;
  description: string;
  roles: Role[];
  scenario_context: string;
  suggested_opening: string;
  analysis: string;
}

// 测试题类型
interface SceneTest {
  id: string;
  sceneId: string;
  type: 'choice' | 'qa' | 'open_dialogue';
  order: number;
  content: ChoiceQuestion | QAQuestion | OpenDialogue;
}

// 并发控制器
class ConcurrencyController {
  private concurrency: number;
  private running: number;
  private queue: (() => void)[];

  constructor(concurrency: number) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async acquire(): Promise<void> {
    if (this.running < this.concurrency) {
      this.running++;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.running--;
    }
  }
}

// 解析 JSON
function parseJSON(content: string): any {
  try {
    let cleanContent = content
      .replace(/^\s*```json\s*\n?/i, '')
      .replace(/\n?\s*```\s*$/i, '')
      .trim();

    const startPos = cleanContent.indexOf('{');
    if (startPos === -1) {
      throw new Error('未找到JSON起始符{');
    }

    const jsonStart = cleanContent.substring(startPos);

    let braceCount = 0;
    let endPos = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < jsonStart.length; i++) {
      const char = jsonStart[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endPos = i;
            break;
          }
        }
      }
    }

    if (endPos === -1) {
      throw new Error('JSON不完整 - 未找到闭合的}');
    }

    const jsonStr = jsonStart.substring(0, endPos + 1);
    return JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`JSON解析失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 调用 NVIDIA GLM4.7 API
async function callGLM4(
  messages: { role: string; content: string }[],
  maxTokens: number = CONFIG.MAX_TOKENS,
  retryCount: number = 0
): Promise<{ content: string; usage?: any }> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000;

  try {
    const response = await fetch(CONFIG.NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.NVIDIA_MODEL,
        messages,
        temperature: CONFIG.TEMPERATURE,
        max_tokens: maxTokens,
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`API调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 指数退避重试
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`   ⚠️ 调用失败，${delay / 1000}秒后重试 (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callGLM4(messages, maxTokens, retryCount + 1);
    }

    throw error;
  }
}

// 生成选择题 Prompt
function buildChoicePrompt(scene: SceneData): string {
  const dialogueText = scene.dialogue
    .map((round) => {
      const contentText = round.content
        .map((item) => `${item.speaker_name}: ${item.text} (${item.translation})`)
        .join('\n');
      return `第${round.round_number}轮:\n${contentText}\n关键回答: ${round.analysis?.standard_answer?.text || ''}`;
    })
    .join('\n\n');

  return `基于以下场景对话生成3道选择题。

场景信息:
- 场景名称: ${scene.name}
- 场景分类: ${scene.category}
- 难度: ${scene.difficulty}

对话内容:
${dialogueText}

考察重点：学习者对"如何回答"的理解，而非"说了什么"。
题目形式：给定场景问题，选择最佳回答。

要求：
1. 题目描述场景和问题（中文）
2. 4个选项都是英文回答方式
3. 只有1个最佳回答，其他选项是常见错误
4. 错误类型包括：语法错误、答非所问、不礼貌、过于冗长等
5. 解析说明为什么最佳，以及其他选项的问题
6. 必须生成3道选择题

输出格式（必须是合法JSON）：
{
  "questions": [
    {
      "question": "场景描述和问题（中文）",
      "options": ["选项A英文", "选项B英文", "选项C英文", "选项D英文"],
      "correct_answer": 0,
      "analysis": "解析说明（中文）"
    }
  ]
}

注意：
- 所有字符串必须使用英文双引号"
- correct_answer是选项的索引（0-3）
- 确保JSON格式完整，不要截断`;
}

// 生成问答题 Prompt
function buildQAPrompt(scene: SceneData): string {
  const dialogueText = scene.dialogue
    .filter((round) => round.analysis?.standard_answer)
    .map((round) => {
      const contentText = round.content
        .map((item) => `${item.speaker_name}: ${item.text}`)
        .join('\n');
      const standard = round.analysis.standard_answer;
      const alternatives = round.analysis.alternative_answers || [];

      let answerText = `标准回答: ${standard.text} (${standard.formality})`;
      if (alternatives.length > 0) {
        answerText +=
          '\n备选回答:\n' +
          alternatives.map((a) => `- ${a.text} (${a.formality})`).join('\n');
      }

      return `第${round.round_number}轮:\n${contentText}\n${answerText}`;
    })
    .join('\n\n');

  return `基于以下场景对话生成2道问答题。

场景信息:
- 场景名称: ${scene.name}
- 场景分类: ${scene.category}
- 难度: ${scene.difficulty}

对话内容及参考答案:
${dialogueText}

考察重点：同一个问题的多种回答方式。
题目形式：给定场景和问题，由用户回答。

要求：
1. 题目描述场景和需要回答的问题（中文）
2. 从场景的 analysis 中提取 standard_answer 和 alternative_answers 作为参考答案
3. 参考答案包含不同正式程度的表达（casual/neutral/formal）
4. 解析说明不同场合可以选择的不同回答风格
5. 必须生成2道问答题

输出格式（必须是合法JSON）：
{
  "questions": [
    {
      "question": "场景描述和需要回答的问题（中文）",
      "reference_answers": [
        {
          "text": "参考答案英文",
          "style": "neutral",
          "description": "说明（中文）"
        }
      ],
      "analysis": "解析说明（中文）"
    }
  ]
}

注意：
- 所有字符串必须使用英文双引号"
- style只能是 casual/neutral/formal 之一
- 每个问题至少提供2-3个不同风格的参考答案
- 确保JSON格式完整，不要截断`;
}

// 生成开放式对话 Prompt
function buildOpenDialoguePrompt(scene: SceneData): string {
  const dialogueText = scene.dialogue
    .map((round) => {
      return round.content
        .map((item) => `${item.speaker_name}: ${item.text}`)
        .join('\n');
    })
    .join('\n\n');

  const speakers = new Set<string>();
  scene.dialogue.forEach((round) => {
    round.content.forEach((item) => {
      speakers.add(item.speaker_name);
    });
  });
  const speakerList = Array.from(speakers);

  return `基于以下场景生成1道开放式对话题。

场景信息:
- 场景名称: ${scene.name}
- 场景分类: ${scene.category}
- 难度: ${scene.difficulty}
- 场景描述: ${scene.description}

对话内容:
${dialogueText}

参与角色: ${speakerList.join(', ')}

考察重点：多轮对话能力，角色扮演。
题目形式：设定主题和角色，用户选择角色进行对话。

要求：
1. topic: 对话主题（中文，10字以内，简洁明了）
2. description: 对话描述（中文，50字以内，说明练习目标）
3. roles: 列出所有角色，每个角色包含：
   - name: 角色名（中文，如"顾客"、"服务员"、"医生"、"患者"等）
   - description: 角色描述（中文）
   - is_user: 用户是否可扮演（都设为true）
   - suggest: 是否推荐作为默认角色（boolean）
     * 对于常见日常角色（如"顾客"、"患者"、"客户"、"学生"、"求职者"等用户视角的角色），设置为 true
     * 对于服务提供方角色（如"店员"、"服务员"、"医生"、"护士"、"老师"等），设置为 false
4. scenario_context: 对话发生的背景（中文）
5. suggested_opening: 建议的开场白（英文）
6. analysis: 对话要点和注意事项（中文）

输出格式（必须是合法JSON）：
{
  "open_dialogue": {
    "topic": "对话主题（中文）",
    "description": "对话描述（中文）",
    "roles": [
      {
        "name": "中文角色名",
        "description": "角色描述（中文）",
        "is_user": true,
        "suggest": true
      }
    ],
    "scenario_context": "对话背景（中文）",
    "suggested_opening": "开场白（英文）",
    "analysis": "要点分析（中文）"
  }
}

注意：
- 所有字符串必须使用英文双引号"
- topic、description 必须是中文
- roles[].name 必须是中文（如"顾客"、"服务员"）
- roles[].description 必须是中文
- 所有角色都设置 is_user 为 true，让用户可以选择扮演任意角色
- suggest 字段必须设置，用于前端自动选择默认角色
- 确保JSON格式完整，不要截断`;
}

// 生成选择题
async function generateChoiceQuestions(scene: SceneData): Promise<ChoiceQuestion[]> {
  const prompt = buildChoicePrompt(scene);

  const result = await callGLM4([
    {
      role: 'system',
      content:
        '你是一个专业的英语口语教学专家。请生成高质量的英语测试选择题，考察学习者对"如何回答"的理解。',
    },
    { role: 'user', content: prompt },
  ]);

  const data = parseJSON(result.content);

  if (!data.questions || !Array.isArray(data.questions)) {
    throw new Error('生成的选择题格式不正确');
  }

  return data.questions.map((q: any) => ({
    question: q.question,
    options: q.options,
    correct_answer: q.correct_answer,
    analysis: q.analysis,
  }));
}

// 生成问答题
async function generateQAQuestions(scene: SceneData): Promise<QAQuestion[]> {
  const prompt = buildQAPrompt(scene);

  const result = await callGLM4([
    {
      role: 'system',
      content:
        '你是一个专业的英语口语教学专家。请生成高质量的英语测试问答题，考察学习者对同一个问题的多种回答方式。',
    },
    { role: 'user', content: prompt },
  ]);

  const data = parseJSON(result.content);

  if (!data.questions || !Array.isArray(data.questions)) {
    throw new Error('生成的问答题格式不正确');
  }

  return data.questions.map((q: any) => ({
    question: q.question,
    reference_answers: q.reference_answers,
    analysis: q.analysis,
  }));
}

// 生成开放式对话
async function generateOpenDialogue(scene: SceneData): Promise<OpenDialogue> {
  const prompt = buildOpenDialoguePrompt(scene);

  const result = await callGLM4([
    {
      role: 'system',
      content:
        '你是一个专业的英语口语教学专家。请生成高质量的开放式对话题目，用于角色扮演练习。',
    },
    { role: 'user', content: prompt },
  ]);

  const data = parseJSON(result.content);

  if (!data.open_dialogue) {
    throw new Error('生成的开放式对话格式不正确');
  }

  return {
    topic: data.open_dialogue.topic,
    description: data.open_dialogue.description,
    roles: data.open_dialogue.roles,
    scenario_context: data.open_dialogue.scenario_context,
    suggested_opening: data.open_dialogue.suggested_opening,
    analysis: data.open_dialogue.analysis,
  };
}

// 生成单个场景的所有测试题
async function generateSceneTests(
  scene: SceneData,
  index: number,
  total: number
): Promise<SceneTest[]> {
  const tests: SceneTest[] = [];
  const sceneId = scene.id;

  console.log(`\n📋 [${index}/${total}] 生成测试: ${sceneId} - ${scene.name}`);

  try {
    // 生成3道选择题
    console.log('   📝 生成选择题...');
    const choiceQuestions = await generateChoiceQuestions(scene);
    choiceQuestions.slice(0, 3).forEach((q, i) => {
      tests.push({
        id: `${sceneId}_choice_${String(i + 1).padStart(2, '0')}`,
        sceneId: sceneId,
        type: 'choice',
        order: i + 1,
        content: q,
      });
    });
    console.log(`   ✅ 选择题生成完成 (${Math.min(choiceQuestions.length, 3)}道)`);

    // 生成2道问答题
    console.log('   📝 生成问答题...');
    const qaQuestions = await generateQAQuestions(scene);
    qaQuestions.slice(0, 2).forEach((q, i) => {
      tests.push({
        id: `${sceneId}_qa_${String(i + 1).padStart(2, '0')}`,
        sceneId: sceneId,
        type: 'qa',
        order: i + 4,
        content: q,
      });
    });
    console.log(`   ✅ 问答题生成完成 (${Math.min(qaQuestions.length, 2)}道)`);

    // 生成1道开放式对话
    console.log('   📝 生成开放式对话...');
    const openDialogue = await generateOpenDialogue(scene);
    tests.push({
      id: `${sceneId}_open_01`,
      sceneId: sceneId,
      type: 'open_dialogue',
      order: 6,
      content: openDialogue,
    });
    console.log(`   ✅ 开放式对话生成完成 (1道)`);

    return tests;
  } catch (error) {
    console.error(
      `   ❌ 生成失败: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

// 从数据库读取场景数据
async function loadScenesFromDB(): Promise<SceneData[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 环境变量未设置');
  }

  const sql = neon(process.env.DATABASE_URL);

  const scenes = await sql`
    SELECT id, name, category, description, difficulty, tags, dialogue, vocabulary
    FROM scenes
    ORDER BY id
  `;

  return scenes.map((scene) => ({
    id: scene.id,
    name: scene.name,
    category: scene.category,
    description: scene.description,
    difficulty: scene.difficulty,
    tags: scene.tags as string[],
    dialogue: scene.dialogue as DialogueRound[],
    vocabulary: (scene.vocabulary as VocabularyItem[]) || [],
  }));
}

// 已生成场景的跟踪文件
const PROGRESS_FILE = path.join(CONFIG.DATA_DIR, 'scene_tests_progress.json');

// 加载已生成的场景ID
function loadCompletedScenes(): Set<string> {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
      return new Set(progress.completedScenes || []);
    } catch {
      return new Set();
    }
  }
  return new Set();
}

// 保存已生成的场景ID
function saveCompletedScene(sceneId: string): void {
  const completed = loadCompletedScenes();
  completed.add(sceneId);
  fs.writeFileSync(
    PROGRESS_FILE,
    JSON.stringify({ completedScenes: Array.from(completed) }, null, 2),
    'utf-8'
  );
}

// 追加写入文件的辅助函数
function appendTestsToFile(tests: SceneTest[], isFirst: boolean, isLast: boolean): void {
  const filePath = CONFIG.OUTPUT_FILE;
  
  if (isFirst) {
    // 第一次写入，创建文件并写入开头
    fs.writeFileSync(filePath, '[\n', 'utf-8');
  }
  
  // 写入测试数据
  const jsonLines = tests.map((test, index) => {
    const json = JSON.stringify(test, null, 2);
    // 如果不是最后一个场景的最后一条，添加逗号
    return json;
  }).join(',\n');
  
  if (tests.length > 0) {
    fs.appendFileSync(filePath, jsonLines, 'utf-8');
  }
  
  if (isLast) {
    // 最后一次写入，关闭数组
    fs.appendFileSync(filePath, '\n]', 'utf-8');
  } else if (tests.length > 0) {
    // 不是最后一次，添加逗号分隔
    fs.appendFileSync(filePath, ',', 'utf-8');
  }
}

// 生成所有场景的测试数据（实时写入文件，支持断点续传）
async function generateTests(): Promise<void> {
  console.log('========================================');
  console.log('场景测试数据生成脚本');
  console.log('========================================');
  console.log(`并发数: ${CONFIG.CONCURRENCY}`);
  console.log(`Max Tokens: ${CONFIG.MAX_TOKENS}`);
  console.log(`NVIDIA API Key: ${CONFIG.NVIDIA_API_KEY ? '已设置' : '未设置'}`);
  console.log('');

  if (!CONFIG.NVIDIA_API_KEY) {
    console.error('❌ 错误: 请设置 NVIDIA_API_KEY 环境变量');
    process.exit(1);
  }

  // 读取场景数据
  console.log('📖 从数据库读取场景数据...');
  const scenes = await loadScenesFromDB();
  console.log(`✅ 读取了 ${scenes.length} 个场景\n`);

  // 创建输出目录
  if (!fs.existsSync(CONFIG.DATA_DIR)) {
    fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
  }

  // 加载已生成的场景
  const completedScenes = loadCompletedScenes();
  if (completedScenes.size > 0) {
    console.log(`📝 发现 ${completedScenes.size} 个场景已生成，将跳过这些场景\n`);
  }

  // 过滤出需要生成的场景
  const scenesToGenerate = scenes.filter(scene => !completedScenes.has(scene.id));
  
  if (scenesToGenerate.length === 0) {
    console.log('✅ 所有场景测试数据已生成，无需重复生成');
    return;
  }

  console.log(`🎯 需要生成 ${scenesToGenerate.length} 个场景的测试数据\n`);

  const controller = new ConcurrencyController(CONFIG.CONCURRENCY);
  const failedScenes: { scene: SceneData; error: string }[] = [];
  const startTime = Date.now();
  let completedCount = 0;
  let totalTests = 0;

  console.log('开始生成测试数据（实时写入文件，支持断点续传）...\n');

  // 初始化文件（如果文件不存在或为空）
  const isFirstWrite = completedScenes.size === 0;
  if (isFirstWrite) {
    fs.writeFileSync(CONFIG.OUTPUT_FILE, '[\n', 'utf-8');
  }

  // 创建任务
  const tasks = scenesToGenerate.map((scene, i) => async () => {
    await controller.acquire();
    try {
      const tests = await generateSceneTests(scene, i + 1, scenesToGenerate.length);
      
      // 实时写入文件
      const isLast = i === scenesToGenerate.length - 1;
      appendTestsToFile(tests, isFirstWrite && i === 0, isLast);
      
      // 保存进度
      saveCompletedScene(scene.id);
      
      completedCount++;
      totalTests += tests.length;
      
      // 每10个场景显示一次进度
      if (completedCount % 10 === 0 || completedCount === scenesToGenerate.length) {
        console.log(`\n📊 进度: ${completedCount}/${scenesToGenerate.length} 场景完成，已生成 ${totalTests} 道测试题`);
      }
    } catch (error) {
      failedScenes.push({
        scene,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`   ❌ 场景 ${scene.id} 生成失败:`, error);
    } finally {
      controller.release();
    }
  });

  // 执行所有任务
  await Promise.all(tasks.map((t) => t()));

  // 确保文件正确关闭
  if (completedCount > 0) {
    fs.appendFileSync(CONFIG.OUTPUT_FILE, '\n]', 'utf-8');
  } else if (isFirstWrite) {
    fs.writeFileSync(CONFIG.OUTPUT_FILE, '[]', 'utf-8');
  }

  // 保存失败记录
  if (failedScenes.length > 0) {
    const failedFile = path.join(CONFIG.DATA_DIR, 'scene_tests_failed.json');
    fs.writeFileSync(
      failedFile,
      JSON.stringify(
        failedScenes.map((f) => ({ sceneId: f.scene.id, error: f.error })),
        null,
        2
      )
    );
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n========================================');
  console.log('生成完成!');
  console.log('========================================');
  console.log(`场景总数: ${scenes.length}`);
  console.log(`本次生成: ${completedCount} 个场景`);
  console.log(`已跳过: ${completedScenes.size} 个场景`);
  console.log(`失败: ${failedScenes.length} 个场景`);
  console.log(`测试题总数: ${totalTests}`);
  console.log(`耗时: ${duration} 分钟`);
  console.log(`输出文件: ${CONFIG.OUTPUT_FILE}`);
  if (failedScenes.length > 0) {
    console.log(`失败记录: ${path.join(CONFIG.DATA_DIR, 'scene_tests_failed.json')}`);
  }
  console.log('========================================');
}

// 批量导入测试数据到数据库
async function importTests(): Promise<void> {
  console.log('🚀 开始批量导入测试数据到数据库...\n');
  console.log('='.repeat(50));

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: DATABASE_URL 环境变量未设置');
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG.OUTPUT_FILE)) {
    console.error(`❌ 错误: 找不到文件 ${CONFIG.OUTPUT_FILE}`);
    console.log('   请先运行: npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate');
    process.exit(1);
  }

  const tests: SceneTest[] = JSON.parse(fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf-8'));
  console.log(`📖 读取了 ${tests.length} 道测试题\n`);

  const sql = neon(process.env.DATABASE_URL);

  console.log('🧹 清空 scene_tests 表...');
  await sql`DELETE FROM scene_tests`;
  console.log('   ✅ 已清空 scene_tests 表\n');

  // 批量插入，每批50条（使用 unnest 进行高效批量插入）
  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  console.log('📥 开始批量导入...\n');

  for (let i = 0; i < tests.length; i += BATCH_SIZE) {
    const batch = tests.slice(i, i + BATCH_SIZE);
    
    try {
      // 使用 unnest 进行批量插入
      const ids = batch.map(t => t.id);
      const sceneIds = batch.map(t => t.sceneId);
      const types = batch.map(t => t.type);
      const orders = batch.map(t => t.order);
      const contents = batch.map(t => JSON.stringify(t.content));

      await sql`
        INSERT INTO scene_tests (id, scene_id, type, "order", content, created_at, updated_at)
        SELECT 
          unnest(${ids}::text[]),
          unnest(${sceneIds}::text[]),
          unnest(${types}::text[]),
          unnest(${orders}::int[]),
          unnest(${contents}::jsonb[]),
          NOW(),
          NOW()
      `;
      
      inserted += batch.length;
      console.log(`  ✅ 已导入 ${inserted}/${tests.length} 道测试题`);
    } catch (error) {
      console.error(`  ❌ 批量插入失败 (批次 ${i / BATCH_SIZE + 1}):`, error);
      errors += batch.length;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 导入统计');
  console.log('='.repeat(50));
  console.log(`   插入成功: ${inserted}`);
  console.log(`   错误数量: ${errors}`);

  if (errors === 0) {
    console.log('\n✨ 测试数据批量导入完成！');
  } else {
    console.log(`\n⚠️ 有 ${errors} 个错误`);
    process.exit(1);
  }
}

// 生成并导入
async function generateAndImport(): Promise<void> {
  await generateTests();
  await importTests();
}

// 打印使用说明
function printUsage(): void {
  console.log(`
场景测试数据生成脚本

使用方法:
  npx ts-node prepare/scene/scripts/generate-scene-tests.ts <command>

命令:
  generate          生成测试数据并保存到 JSON
  import            将 JSON 数据导入数据库
  generate-and-import  生成并导入

示例:
  npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate
  npx ts-node prepare/scene/scripts/generate-scene-tests.ts import
  npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate-and-import
`);
}

// 主函数
async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'generate':
      await generateTests();
      break;
    case 'import':
      await importTests();
      break;
    case 'generate-and-import':
      await generateAndImport();
      break;
    default:
      printUsage();
      process.exit(command ? 1 : 0);
  }
}

main().catch((error) => {
  console.error('\n❌ 程序执行失败:', error);
  process.exit(1);
});
