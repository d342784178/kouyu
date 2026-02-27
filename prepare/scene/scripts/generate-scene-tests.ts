/**
 * 场景测试数据生成脚本（统一版）
 *
 * 支持生成全部6种题型：
 *   原始题型（从数据库读取场景）：
 *     - choice       (order 1-3) 选择题
 *     - qa           (order 4-5) 问答题
 *   新题型（从本地 JSON 读取场景）：
 *     - fill_blank        (order 6) 填空题
 *     - guided_roleplay   (order 7) 情景再现
 *     - vocab_activation  (order 8) 词汇激活
 *     - open_dialogue     (order 9) 开放式对话
 *
 * 使用方法:
 *   npx ts-node prepare/scene/scripts/generate-scene-tests.ts <command> [--types <types>]
 *
 * 命令:
 *   generate              生成测试数据并保存到 JSON
 *   import                将 JSON 数据导入数据库
 *   generate-and-import   生成并导入
 *   export                从数据库导出当前数据到 JSON（备份）
 *
 * 选项:
 *   --types <types>  指定要生成的题型，逗号分隔，默认全部
 *                    可选值: choice,qa,fill_blank,guided_roleplay,vocab_activation,open_dialogue
 *
 * 示例:
 *   npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate
 *   npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate --types fill_blank,vocab_activation
 *   npx ts-node prepare/scene/scripts/generate-scene-tests.ts import
 *   npx ts-node prepare/scene/scripts/generate-scene-tests.ts export
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// ============================================================
// 配置
// ============================================================
const CONFIG = {
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY || '',
  NVIDIA_API_URL: 'https://integrate.api.nvidia.com/v1/chat/completions',
  // 原始题型用 GLM4.7，新题型用 llama-3.1-70b
  MODEL_ORIGINAL: 'z-ai/glm4.7',
  MODEL_NEW: process.env.NVIDIA_MODEL_QUALITY || 'meta/llama-3.1-70b-instruct',
  CONCURRENCY: 5,
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  DATA_DIR: path.resolve(process.cwd(), 'prepare/scene/data'),
  OUTPUT_FILE: path.resolve(process.cwd(), 'prepare/scene/data/scene_tests.json'),
  PROGRESS_FILE: path.resolve(process.cwd(), 'prepare/scene/data/scene_tests_progress.json'),
};

// 所有题型及其 order
const TEST_TYPES = ['choice', 'qa', 'fill_blank', 'guided_roleplay', 'vocab_activation', 'open_dialogue'] as const;
type TestType = typeof TEST_TYPES[number];

const TYPE_ORDER: Record<TestType, number[]> = {
  choice: [1, 2, 3],
  qa: [4, 5],
  fill_blank: [6],
  guided_roleplay: [7],
  vocab_activation: [8],
  open_dialogue: [9],
};


// ============================================================
// 类型定义
// ============================================================
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
  difficulty?: string;
}

interface SceneData {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: string;
  tags?: string[];
  dialogue: DialogueRound[];
  vocabulary: VocabularyItem[];
}

// 题型 content 定义
interface ChoiceQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  analysis: string;
}

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

interface FillBlankContent {
  template: string;
  scenarioHint: string;
  referenceAnswer: string;
  keywords: string[];
}

interface GuidedRoleplayContent {
  situationDescription: string;
  dialogueGoal: string;
  keywordHints: string[];
  evaluationDimensions: string[];
}

interface VocabActivationContent {
  chineseHint: string;
  targetWord: string;
  partOfSpeech: string;
  sceneId: string;
  exampleSentence: string;
  exampleTranslation: string;
  phonetic?: string;
  exampleAudioUrl?: string;
}

interface SceneTest {
  id: string;
  sceneId: string;
  type: TestType;
  order: number;
  content: ChoiceQuestion | QAQuestion | OpenDialogue | FillBlankContent | GuidedRoleplayContent | VocabActivationContent;
}


// ============================================================
// 并发控制
// ============================================================
class ConcurrencyController {
  private concurrency: number;
  private running = 0;
  private queue: (() => void)[] = [];

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  async acquire(): Promise<void> {
    if (this.running < this.concurrency) {
      this.running++;
      return;
    }
    return new Promise(resolve => this.queue.push(resolve));
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

// ============================================================
// API 调用
// ============================================================
async function callAPI(
  messages: { role: string; content: string }[],
  model: string,
  retryCount = 0
): Promise<string> {
  const MAX_RETRIES = 3;
  try {
    const response = await fetch(CONFIG.NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: CONFIG.TEMPERATURE,
        max_tokens: CONFIG.MAX_TOKENS,
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`API ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = 5000 * Math.pow(2, retryCount);
      console.log(`   ⚠️ 重试 ${retryCount + 1}/${MAX_RETRIES}，等待 ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
      return callAPI(messages, model, retryCount + 1);
    }
    throw error;
  }
}

// ============================================================
// JSON 解析
// ============================================================
function parseJSON(content: string): any {
  let clean = content
    .replace(/^\s*```json\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '')
    .trim();

  const start = clean.indexOf('{');
  if (start === -1) throw new Error('未找到 JSON 起始符 {');
  clean = clean.substring(start);

  let braceCount = 0;
  let endPos = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (c === '\\') { escapeNext = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (!inString) {
      if (c === '{') braceCount++;
      if (c === '}') {
        braceCount--;
        if (braceCount === 0) { endPos = i; break; }
      }
    }
  }

  if (endPos === -1) throw new Error('JSON 不完整');
  return JSON.parse(clean.substring(0, endPos + 1));
}


// ============================================================
// 数据加载
// ============================================================

/** 从数据库读取场景（原始题型使用） */
async function loadScenesFromDB(): Promise<SceneData[]> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL 未设置');
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT id, name, category, description, difficulty, tags, dialogue, vocabulary
    FROM scenes ORDER BY id
  `;
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    description: r.description,
    difficulty: r.difficulty,
    tags: r.tags as string[],
    dialogue: r.dialogue as DialogueRound[],
    vocabulary: (r.vocabulary as VocabularyItem[]) || [],
  }));
}

/** 从本地 JSON 读取场景（新题型使用，避免冷启动延迟） */
function loadScenesFromFile(): SceneData[] {
  const filePath = path.resolve(process.cwd(), 'prepare/scene/data/scenes_final.json');
  if (!fs.existsSync(filePath)) throw new Error(`找不到场景数据文件: ${filePath}`);
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return raw.map((r: any) => ({
    id: r.scene_id || r.id,
    name: r.scene_name || r.name,
    category: r.category,
    description: r.description,
    difficulty: r.difficulty,
    dialogue: (r.dialogue as DialogueRound[]) || [],
    vocabulary: (r.vocabulary as VocabularyItem[]) || [],
  }));
}

// ============================================================
// 进度管理
// ============================================================
function loadProgress(): Set<string> {
  if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
    try {
      const p = JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf-8'));
      return new Set(p.completed || []);
    } catch { return new Set(); }
  }
  return new Set();
}

function saveProgress(key: string): void {
  const completed = loadProgress();
  completed.add(key);
  fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify({ completed: Array.from(completed) }, null, 2));
}

// ============================================================
// Prompt 构建 - 原始题型
// ============================================================

function buildChoicePrompt(scene: SceneData): string {
  const dialogueText = scene.dialogue.map(round => {
    const lines = round.content.map(c => `${c.speaker_name}: ${c.text} (${c.translation})`).join('\n');
    return `第${round.round_number}轮:\n${lines}\n关键回答: ${round.analysis?.standard_answer?.text || ''}`;
  }).join('\n\n');

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
}`;
}

function buildQAPrompt(scene: SceneData): string {
  const dialogueText = scene.dialogue
    .filter(round => round.analysis?.standard_answer)
    .map(round => {
      const lines = round.content.map(c => `${c.speaker_name}: ${c.text}`).join('\n');
      const std = round.analysis.standard_answer;
      const alts = round.analysis.alternative_answers || [];
      let answerText = `标准回答: ${std.text} (${std.formality})`;
      if (alts.length > 0) {
        answerText += '\n备选回答:\n' + alts.map(a => `- ${a.text} (${a.formality})`).join('\n');
      }
      return `第${round.round_number}轮:\n${lines}\n${answerText}`;
    }).join('\n\n');

  return `基于以下场景对话生成2道问答题。

场景信息:
- 场景名称: ${scene.name}
- 场景分类: ${scene.category}
- 难度: ${scene.difficulty}

对话内容及参考答案:
${dialogueText}

要求：
1. 题目描述场景和需要回答的问题（中文）
2. 参考答案包含不同正式程度的表达（casual/neutral/formal）
3. 每个问题至少提供2-3个不同风格的参考答案
4. 必须生成2道问答题

输出格式（必须是合法JSON）：
{
  "questions": [
    {
      "question": "场景描述和需要回答的问题（中文）",
      "reference_answers": [
        { "text": "参考答案英文", "style": "neutral", "description": "说明（中文）" }
      ],
      "analysis": "解析说明（中文）"
    }
  ]
}`;
}

function buildOpenDialoguePrompt(scene: SceneData): string {
  const dialogueText = scene.dialogue
    .map(round => round.content.map(c => `${c.speaker_name}: ${c.text}`).join('\n'))
    .join('\n\n');
  const speakers = Array.from(new Set(
    scene.dialogue.flatMap(r => r.content.map(c => c.speaker_name))
  ));

  return `基于以下场景生成1道开放式对话题。

场景信息:
- 场景名称: ${scene.name}
- 场景分类: ${scene.category}
- 难度: ${scene.difficulty}
- 场景描述: ${scene.description}

对话内容:
${dialogueText}

参与角色: ${speakers.join(', ')}

要求：
1. topic: 对话主题（中文，10字以内）
2. description: 对话描述（中文，50字以内）
3. roles: 所有角色，is_user 都设为 true，suggest 对用户视角角色（顾客/患者/学生等）设为 true
4. scenario_context: 对话背景（中文）
5. suggested_opening: 建议开场白（英文）
6. analysis: 对话要点（中文）

输出格式（必须是合法JSON）：
{
  "open_dialogue": {
    "topic": "对话主题（中文）",
    "description": "对话描述（中文）",
    "roles": [
      { "name": "中文角色名", "description": "角色描述（中文）", "is_user": true, "suggest": true }
    ],
    "scenario_context": "对话背景（中文）",
    "suggested_opening": "开场白（英文）",
    "analysis": "要点分析（中文）"
  }
}`;
}

// ============================================================
// Prompt 构建 - 新题型
// ============================================================

function buildFillBlankPrompt(scene: SceneData): string {
  const keyLines = scene.dialogue
    .flatMap(r => r.content.filter(c => c.is_key_qa))
    .slice(0, 3)
    .map(c => `${c.speaker_name}: ${c.text} (${c.translation})`)
    .join('\n');
  const allLines = scene.dialogue
    .flatMap(r => r.content).slice(0, 6)
    .map(c => `${c.speaker_name}: ${c.text}`).join('\n');

  return `基于以下英语口语场景，生成1道填空题（Pattern Drill）。

场景信息:
- 场景名称: ${scene.name}
- 场景分类: ${scene.category}
- 难度: ${scene.difficulty}
- 场景描述: ${scene.description}

对话关键句型:
${keyLines || allLines}

要求：
1. template: 从对话提取1个关键句型，核心词汇替换为 ___ （1-2个空，最多3个）
2. scenarioHint: 场景提示（中文，10-20字），具体说明语境
3. referenceAnswer: 每个空格2-3个备选，用 " / " 分隔
4. keywords: 4-5个关键词提示（英文）

输出格式（合法JSON）:
{
  "fill_blank": {
    "template": "句型模板，用 ___ 作占位符",
    "scenarioHint": "场景提示（中文，10-20字）",
    "referenceAnswer": "答案1 / 答案2 / 答案3",
    "keywords": ["word1", "word2", "word3", "word4"]
  }
}`;
}

function buildGuidedRoleplayPrompt(scene: SceneData): string {
  const dialogueText = scene.dialogue
    .map(r => r.content.map(c => `${c.speaker_name}: ${c.text}`).join('\n'))
    .join('\n\n');

  return `基于以下英语口语场景，生成1道情景再现题（Guided Role-play）。

场景信息:
- 场景名称: ${scene.name}
- 场景分类: ${scene.category}
- 难度: ${scene.difficulty}
- 场景描述: ${scene.description}

对话内容:
${dialogueText.substring(0, 800)}

要求：
1. situationDescription: 情景描述（中文，25-50字），包含地点、角色、事件
2. dialogueGoal: 对话目标（中文，20-35字），明确沟通任务
3. keywordHints: 4-5个关键词（英文单词/短语）
4. evaluationDimensions: 固定为 ["意图达成度", "语言自然度", "词汇使用"]

输出格式（合法JSON）:
{
  "guided_roleplay": {
    "situationDescription": "情景描述（中文，25-50字）",
    "dialogueGoal": "对话目标（中文，20-35字）",
    "keywordHints": ["word1", "word2", "word3", "word4"],
    "evaluationDimensions": ["意图达成度", "语言自然度", "词汇使用"]
  }
}`;
}

function buildVocabActivationPrompt(scene: SceneData): string {
  const vocabList = (scene.vocabulary || [])
    .filter(v => v.type === 'word' || v.type === 'phrase')
    .slice(0, 5)
    .map(v => `${v.content} (${v.translation}) - ${v.phonetic || ''} - 例句: ${v.example}`)
    .join('\n');
  const dialogueWords = scene.dialogue
    .flatMap(r => r.content.filter(c => c.is_key_qa))
    .slice(0, 3).map(c => c.text).join('\n');

  return `基于以下英语口语场景，生成1道词汇激活题（Vocabulary Activation）。

场景信息:
- 场景名称: ${scene.name}
- 场景分类: ${scene.category}
- 难度: ${scene.difficulty}

场景词汇（优先从此列表选词）:
${vocabList || '（从对话中提取）'}

关键对话:
${dialogueWords}

要求：
1. chineseHint: 中文提示（5-10字），引导用户回忆英文词汇
2. targetWord: 目标英文词汇（单词或短语，不含标点）
3. partOfSpeech: noun/verb/adjective/adverb/phrase 之一
4. exampleSentence: 例句（英文，来自场景对话）
5. exampleTranslation: 例句翻译（中文）
6. phonetic: 标准IPA音标（必填，格式 /音标/）

输出格式（合法JSON）:
{
  "vocab_activation": {
    "chineseHint": "中文提示（5-10字）",
    "targetWord": "英文词汇",
    "partOfSpeech": "noun",
    "exampleSentence": "例句（英文）",
    "exampleTranslation": "例句翻译（中文）",
    "phonetic": "/标准IPA音标/"
  }
}`;
}


// ============================================================
// 生成函数 - 原始题型
// ============================================================

async function generateChoiceQuestions(scene: SceneData): Promise<ChoiceQuestion[]> {
  const raw = await callAPI(
    [
      { role: 'system', content: '你是专业的英语口语教学专家，请生成高质量的英语测试选择题。' },
      { role: 'user', content: buildChoicePrompt(scene) },
    ],
    CONFIG.MODEL_ORIGINAL,
    0
  );
  const data = parseJSON(raw);
  if (!data.questions || !Array.isArray(data.questions)) throw new Error('选择题格式不正确');
  return data.questions.map((q: any) => ({
    question: q.question,
    options: q.options,
    correct_answer: q.correct_answer,
    analysis: q.analysis,
  }));
}

async function generateQAQuestions(scene: SceneData): Promise<QAQuestion[]> {
  const raw = await callAPI(
    [
      { role: 'system', content: '你是专业的英语口语教学专家，请生成高质量的英语测试问答题。' },
      { role: 'user', content: buildQAPrompt(scene) },
    ],
    CONFIG.MODEL_ORIGINAL,
    0
  );
  const data = parseJSON(raw);
  if (!data.questions || !Array.isArray(data.questions)) throw new Error('问答题格式不正确');
  return data.questions.map((q: any) => ({
    question: q.question,
    reference_answers: q.reference_answers,
    analysis: q.analysis,
  }));
}

async function generateOpenDialogue(scene: SceneData): Promise<OpenDialogue> {
  const raw = await callAPI(
    [
      { role: 'system', content: '你是专业的英语口语教学专家，请生成高质量的开放式对话题目。' },
      { role: 'user', content: buildOpenDialoguePrompt(scene) },
    ],
    CONFIG.MODEL_ORIGINAL,
    0
  );
  const data = parseJSON(raw);
  if (!data.open_dialogue) throw new Error('开放式对话格式不正确');
  return {
    topic: data.open_dialogue.topic,
    description: data.open_dialogue.description,
    roles: data.open_dialogue.roles,
    scenario_context: data.open_dialogue.scenario_context,
    suggested_opening: data.open_dialogue.suggested_opening,
    analysis: data.open_dialogue.analysis,
  };
}

// ============================================================
// 生成函数 - 新题型
// ============================================================

async function generateFillBlank(scene: SceneData): Promise<FillBlankContent> {
  const raw = await callAPI(
    [
      { role: 'system', content: '你是专业的英语口语教学专家，擅长设计填空练习题。' },
      { role: 'user', content: buildFillBlankPrompt(scene) },
    ],
    CONFIG.MODEL_NEW,
    0
  );
  const data = parseJSON(raw);
  if (!data.fill_blank?.template) throw new Error('填空题格式不正确');
  return {
    template: data.fill_blank.template,
    scenarioHint: data.fill_blank.scenarioHint || '',
    referenceAnswer: data.fill_blank.referenceAnswer || '',
    keywords: data.fill_blank.keywords || [],
  };
}

async function generateGuidedRoleplay(scene: SceneData): Promise<GuidedRoleplayContent> {
  const raw = await callAPI(
    [
      { role: 'system', content: '你是专业的英语口语教学专家，擅长设计情景对话练习。' },
      { role: 'user', content: buildGuidedRoleplayPrompt(scene) },
    ],
    CONFIG.MODEL_NEW,
    0
  );
  const data = parseJSON(raw);
  if (!data.guided_roleplay?.situationDescription) throw new Error('情景再现格式不正确');
  return {
    situationDescription: data.guided_roleplay.situationDescription,
    dialogueGoal: data.guided_roleplay.dialogueGoal || '',
    keywordHints: data.guided_roleplay.keywordHints || [],
    evaluationDimensions: data.guided_roleplay.evaluationDimensions || ['意图达成度', '语言自然度', '词汇使用'],
  };
}

async function generateVocabActivation(scene: SceneData): Promise<VocabActivationContent> {
  const raw = await callAPI(
    [
      { role: 'system', content: '你是专业的英语口语教学专家，擅长设计词汇记忆练习。' },
      { role: 'user', content: buildVocabActivationPrompt(scene) },
    ],
    CONFIG.MODEL_NEW,
    0
  );
  const data = parseJSON(raw);
  if (!data.vocab_activation?.targetWord) throw new Error('词汇激活格式不正确');
  return {
    chineseHint: data.vocab_activation.chineseHint || '',
    targetWord: data.vocab_activation.targetWord,
    partOfSpeech: data.vocab_activation.partOfSpeech || 'word',
    sceneId: scene.id,
    exampleSentence: data.vocab_activation.exampleSentence || '',
    exampleTranslation: data.vocab_activation.exampleTranslation || '',
    phonetic: data.vocab_activation.phonetic,
  };
}

// ============================================================
// 生成单个场景的所有指定题型
// ============================================================
async function generateSceneTests(
  scene: SceneData,
  types: TestType[],
  index: number,
  total: number
): Promise<SceneTest[]> {
  console.log(`\n📋 [${index}/${total}] ${scene.id} - ${scene.name}`);
  const tests: SceneTest[] = [];

  for (const type of types) {
    try {
      console.log(`   📝 生成 ${type}...`);
      switch (type) {
        case 'choice': {
          const questions = await generateChoiceQuestions(scene);
          questions.slice(0, 3).forEach((q, i) => {
            tests.push({ id: `${scene.id}_choice_${String(i + 1).padStart(2, '0')}`, sceneId: scene.id, type: 'choice', order: i + 1, content: q });
          });
          break;
        }
        case 'qa': {
          const questions = await generateQAQuestions(scene);
          questions.slice(0, 2).forEach((q, i) => {
            tests.push({ id: `${scene.id}_qa_${String(i + 1).padStart(2, '0')}`, sceneId: scene.id, type: 'qa', order: i + 4, content: q });
          });
          break;
        }
        case 'fill_blank': {
          const content = await generateFillBlank(scene);
          tests.push({ id: `${scene.id}_fill_blank_01`, sceneId: scene.id, type: 'fill_blank', order: 6, content });
          break;
        }
        case 'guided_roleplay': {
          const content = await generateGuidedRoleplay(scene);
          tests.push({ id: `${scene.id}_guided_roleplay_01`, sceneId: scene.id, type: 'guided_roleplay', order: 7, content });
          break;
        }
        case 'vocab_activation': {
          const content = await generateVocabActivation(scene);
          tests.push({ id: `${scene.id}_vocab_activation_01`, sceneId: scene.id, type: 'vocab_activation', order: 8, content });
          break;
        }
        case 'open_dialogue': {
          const content = await generateOpenDialogue(scene);
          tests.push({ id: `${scene.id}_open_01`, sceneId: scene.id, type: 'open_dialogue', order: 9, content });
          break;
        }
      }
      console.log(`   ✅ ${type} 完成`);
    } catch (e) {
      console.error(`   ❌ ${type} 失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  return tests;
}


// ============================================================
// 主命令：generate
// ============================================================
async function cmdGenerate(types: TestType[]): Promise<void> {
  console.log('========================================');
  console.log('场景测试数据生成脚本（统一版）');
  console.log(`生成题型: ${types.join(', ')}`);
  console.log('========================================');

  if (!CONFIG.NVIDIA_API_KEY) {
    console.error('❌ 请设置 NVIDIA_API_KEY 环境变量');
    process.exit(1);
  }

  // 原始题型从数据库读取，新题型从本地文件读取
  const originalTypes: TestType[] = ['choice', 'qa', 'open_dialogue'];
  const newTypes: TestType[] = ['fill_blank', 'guided_roleplay', 'vocab_activation'];
  const needsDB = types.some(t => originalTypes.includes(t));
  const needsFile = types.some(t => newTypes.includes(t));

  let scenes: SceneData[];
  if (needsDB) {
    console.log('📖 从数据库读取场景...');
    scenes = await loadScenesFromDB();
  } else {
    console.log('📖 从本地 JSON 读取场景...');
    scenes = loadScenesFromFile();
  }
  console.log(`✅ 共 ${scenes.length} 个场景\n`);

  if (!fs.existsSync(CONFIG.DATA_DIR)) fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });

  const completed = loadProgress();
  // 进度 key 格式：sceneId:type1+type2+...
  const typesKey = types.sort().join('+');
  const toGenerate = scenes.filter(s => !completed.has(`${s.id}:${typesKey}`));

  if (toGenerate.length === 0) {
    console.log('✅ 所有场景已生成，无需重复');
    return;
  }

  console.log(`🎯 需要生成 ${toGenerate.length} 个场景（已完成 ${scenes.length - toGenerate.length} 个）\n`);

  // 初始化输出文件
  const isFirstRun = !fs.existsSync(CONFIG.OUTPUT_FILE) || fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf-8').trim() === '[]';
  if (isFirstRun) {
    fs.writeFileSync(CONFIG.OUTPUT_FILE, '[\n', 'utf-8');
  } else {
    // 追加模式：移除末尾的 ]，准备追加
    let content = fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf-8').trimEnd();
    if (content.endsWith(']')) {
      content = content.slice(0, -1).trimEnd();
      fs.writeFileSync(CONFIG.OUTPUT_FILE, content + ',\n', 'utf-8');
    }
  }

  const controller = new ConcurrencyController(CONFIG.CONCURRENCY);
  const failed: string[] = [];
  let doneCount = 0;
  let totalTests = 0;
  let isFirstWrite = isFirstRun;

  const tasks = toGenerate.map((scene, i) => async () => {
    await controller.acquire();
    try {
      const tests = await generateSceneTests(scene, types, i + 1, toGenerate.length);

      if (tests.length > 0) {
        const json = tests.map(t => JSON.stringify(t, null, 2)).join(',\n');
        if (!isFirstWrite) {
          fs.appendFileSync(CONFIG.OUTPUT_FILE, ',\n' + json, 'utf-8');
        } else {
          fs.appendFileSync(CONFIG.OUTPUT_FILE, json, 'utf-8');
          isFirstWrite = false;
        }
        totalTests += tests.length;
      }

      saveProgress(`${scene.id}:${typesKey}`);
      doneCount++;

      if (doneCount % 10 === 0 || doneCount === toGenerate.length) {
        console.log(`\n📊 进度: ${doneCount}/${toGenerate.length}，已生成 ${totalTests} 道题`);
      }
    } catch (e) {
      failed.push(scene.id);
      console.error(`❌ ${scene.id} 失败:`, e);
    } finally {
      controller.release();
    }
  });

  await Promise.all(tasks.map(t => t()));

  // 关闭 JSON 数组
  const content = fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf-8');
  if (!content.trimEnd().endsWith(']')) {
    fs.appendFileSync(CONFIG.OUTPUT_FILE, '\n]', 'utf-8');
  }

  if (failed.length > 0) {
    fs.writeFileSync(
      path.join(CONFIG.DATA_DIR, 'scene_tests_failed.json'),
      JSON.stringify(failed, null, 2)
    );
  }

  console.log('\n========================================');
  console.log('生成完成！');
  console.log(`完成: ${doneCount} 个场景，${totalTests} 道题`);
  console.log(`失败: ${failed.length} 个场景`);
  console.log(`输出: ${CONFIG.OUTPUT_FILE}`);
  console.log('========================================');
}

// ============================================================
// 主命令：import
// ============================================================
async function cmdImport(types?: TestType[]): Promise<void> {
  console.log('🚀 导入测试数据到数据库...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 未设置');
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG.OUTPUT_FILE)) {
    console.error(`❌ 找不到文件 ${CONFIG.OUTPUT_FILE}`);
    process.exit(1);
  }

  let tests: SceneTest[] = JSON.parse(fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf-8'));

  // 如果指定了题型，只导入指定题型
  if (types && types.length > 0) {
    tests = tests.filter(t => types.includes(t.type));
    console.log(`📖 筛选题型 [${types.join(', ')}]，共 ${tests.length} 道\n`);
  } else {
    console.log(`📖 读取了 ${tests.length} 道测试题\n`);
  }

  const sql = neon(process.env.DATABASE_URL!);

  if (types && types.length > 0) {
    // 只清除指定题型
    console.log(`🧹 清除已有 [${types.join(', ')}] 数据...`);
    for (const type of types) {
      await sql`DELETE FROM scene_tests WHERE type = ${type}`;
    }
  } else {
    console.log('🧹 清空 scene_tests 表...');
    await sql`DELETE FROM scene_tests`;
  }
  console.log('   ✅ 已清除\n');

  const BATCH_SIZE = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < tests.length; i += BATCH_SIZE) {
    const batch = tests.slice(i, i + BATCH_SIZE);
    try {
      const ids = batch.map(t => t.id);
      const sceneIds = batch.map(t => t.sceneId);
      const batchTypes = batch.map(t => t.type);
      const orders = batch.map(t => t.order);
      const contents = batch.map(t => JSON.stringify(t.content));

      await sql`
        INSERT INTO scene_tests (id, scene_id, type, "order", content, created_at, updated_at)
        SELECT
          unnest(${ids}::text[]),
          unnest(${sceneIds}::text[]),
          unnest(${batchTypes}::text[]),
          unnest(${orders}::int[]),
          unnest(${contents}::jsonb[]),
          NOW(),
          NOW()
      `;
      inserted += batch.length;
      console.log(`  ✅ 已导入 ${inserted}/${tests.length}`);
    } catch (e) {
      console.error(`  ❌ 批次 ${Math.floor(i / BATCH_SIZE) + 1} 失败:`, e);
      errors += batch.length;
    }
  }

  console.log('\n========================================');
  console.log(`插入成功: ${inserted}，错误: ${errors}`);
  if (errors === 0) console.log('✨ 导入完成！');
  else process.exit(1);
}

// ============================================================
// 主命令：export（从数据库导出备份）
// ============================================================
async function cmdExport(): Promise<void> {
  console.log('📤 从数据库导出 scene_tests 数据...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 未设置');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT id, scene_id, type, "order", content
    FROM scene_tests
    ORDER BY scene_id, "order"
  `;

  console.log(`共读取 ${rows.length} 条记录`);

  const tests = rows.map(r => ({
    id: r.id,
    sceneId: r.scene_id,
    type: r.type,
    order: r.order,
    content: r.content,
  }));

  fs.writeFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(tests, null, 2), 'utf-8');
  console.log(`✅ 已写入: ${CONFIG.OUTPUT_FILE}`);

  // 统计各题型数量
  const typeCounts: Record<string, number> = {};
  tests.forEach(t => { typeCounts[t.type] = (typeCounts[t.type] || 0) + 1; });
  console.log('题型统计:', typeCounts);
}

// ============================================================
// 入口
// ============================================================
function printUsage(): void {
  console.log(`
场景测试数据生成脚本（统一版）

命令:
  generate              生成所有题型数据并保存到 JSON
  import                将 JSON 数据导入数据库（全量）
  generate-and-import   生成并导入
  export                从数据库导出当前数据到 JSON（备份）

选项:
  --types <types>  指定题型，逗号分隔（默认全部）
                   可选: choice,qa,fill_blank,guided_roleplay,vocab_activation,open_dialogue

示例:
  npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate
  npx ts-node prepare/scene/scripts/generate-scene-tests.ts generate --types fill_blank,vocab_activation
  npx ts-node prepare/scene/scripts/generate-scene-tests.ts import
  npx ts-node prepare/scene/scripts/generate-scene-tests.ts import --types fill_blank
  npx ts-node prepare/scene/scripts/generate-scene-tests.ts export
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];

  // 解析 --types 参数
  const typesIdx = args.indexOf('--types');
  let types: TestType[] = [...TEST_TYPES];
  if (typesIdx !== -1 && args[typesIdx + 1]) {
    const requested = args[typesIdx + 1].split(',').map(t => t.trim()) as TestType[];
    const invalid = requested.filter(t => !TEST_TYPES.includes(t));
    if (invalid.length > 0) {
      console.error(`❌ 无效的题型: ${invalid.join(', ')}`);
      console.error(`   有效题型: ${TEST_TYPES.join(', ')}`);
      process.exit(1);
    }
    types = requested;
  }

  switch (cmd) {
    case 'generate':
      await cmdGenerate(types);
      break;
    case 'import':
      await cmdImport(typesIdx !== -1 ? types : undefined);
      break;
    case 'generate-and-import':
      await cmdGenerate(types);
      await cmdImport(typesIdx !== -1 ? types : undefined);
      break;
    case 'export':
      await cmdExport();
      break;
    default:
      printUsage();
      process.exit(cmd ? 1 : 0);
  }
}

main().catch(e => {
  console.error('\n❌ 执行失败:', e);
  process.exit(1);
});
