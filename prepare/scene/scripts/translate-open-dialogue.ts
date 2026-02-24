/**
 * Open Dialogue 翻译脚本
 *
 * 功能:
 * 1. 从数据库读取所有 type=open_dialogue 的测试数据
 * 2. 使用 GLM-4-Flash 翻译 topic、description、roles[].description
 * 3. 更新数据库和 JSON 文件
 *
 * 使用方法:
 * npx ts-node prepare/scene/scripts/translate-open-dialogue.ts
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 配置
const CONFIG = {
  GLM_API_KEY: process.env.GLM_API_KEY || '',
  GLM_API_URL: process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  GLM_MODEL: 'glm-4-flash',
  CONCURRENCY: 10,
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.3,
  DATA_DIR: path.resolve(process.cwd(), 'prepare/scene/data'),
  JSON_FILE: path.resolve(process.cwd(), 'prepare/scene/data/scene_tests.json'),
  PROGRESS_FILE: path.resolve(process.cwd(), 'prepare/scene/data/translate_progress.json'),
};

// 类型定义
interface Role {
  name: string;
  description: string;
  is_user: boolean;
}

interface OpenDialogueContent {
  topic: string;
  description: string;
  roles: Role[];
  scenario_context: string;
  suggested_opening: string;
  analysis: string;
}

interface SceneTest {
  id: string;
  sceneId: string;
  type: 'choice' | 'qa' | 'open_dialogue';
  order: number;
  content: OpenDialogueContent | any;
}

interface TranslationResult {
  topic: string;
  description: string;
  roles: Role[];
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

// 调用 GLM-4-Flash API
async function callGLM4Flash(
  messages: { role: string; content: string }[],
  retryCount: number = 0
): Promise<string> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 10000; // 10秒

  try {
    const response = await fetch(CONFIG.GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.GLM_MODEL,
        messages,
        temperature: CONFIG.TEMPERATURE,
        max_tokens: CONFIG.MAX_TOKENS,
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`API调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 检查是否是限速错误
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      console.log(`   ⚠️ 触发限速，等待 ${RETRY_DELAY_MS / 1000} 秒后重试...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return callGLM4Flash(messages, retryCount);
    }

    // 指数退避重试
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`   ⚠️ 调用失败，${delay / 1000}秒后重试 (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callGLM4Flash(messages, retryCount + 1);
    }

    throw error;
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

// 翻译单个 open_dialogue
async function translateOpenDialogue(test: SceneTest): Promise<TranslationResult> {
  const content = test.content as OpenDialogueContent;

  const prompt = `请将以下英语口语练习场景的相关字段从英文翻译为中文：

原始数据:
- topic: ${content.topic}
- description: ${content.description}
- roles: ${JSON.stringify(content.roles, null, 2)}

要求：
1. topic: 简洁明了的中文主题（10字以内），如"餐厅点餐"、"银行开户"等
2. description: 中文描述（50字以内），说明练习目标
3. roles[].name: 翻译为中文角色名（如 "Customer" -> "顾客"，"Waiter" -> "服务员"）
4. roles[].description: 翻译为中文角色描述
5. roles[].is_user: 保持不变

输出格式（必须是合法JSON）：
{
  "topic": "中文主题",
  "description": "中文描述",
  "roles": [
    {"name": "中文角色名", "description": "角色中文描述", "is_user": true}
  ]
}

注意：
- 所有字符串必须使用英文双引号"
- 确保JSON格式完整，不要截断`;

  const result = await callGLM4Flash([
    {
      role: 'system',
      content: '你是一个专业的翻译助手，擅长将英语口语练习场景描述翻译为简洁准确的中文。',
    },
    { role: 'user', content: prompt },
  ]);

  const data = parseJSON(result);

  if (!data.topic || !data.description || !data.roles) {
    throw new Error('翻译结果格式不正确');
  }

  return {
    topic: data.topic,
    description: data.description,
    roles: data.roles,
  };
}

// 从数据库读取 open_dialogue 数据
async function loadOpenDialoguesFromDB(): Promise<SceneTest[]> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 环境变量未设置');
  }

  const sql = neon(process.env.DATABASE_URL);

  const tests = await sql`
    SELECT id, scene_id, type, "order", content
    FROM scene_tests
    WHERE type = 'open_dialogue'
    ORDER BY id
  `;

  return tests.map((test) => ({
    id: test.id,
    sceneId: test.scene_id,
    type: test.type,
    order: test.order,
    content: test.content as OpenDialogueContent,
  }));
}

// 加载已翻译的测试ID
function loadCompletedTests(): Set<string> {
  if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
    try {
      const progress = JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf-8'));
      return new Set(progress.completedTests || []);
    } catch {
      return new Set();
    }
  }
  return new Set();
}

// 保存已翻译的测试ID
function saveCompletedTest(testId: string): void {
  const completed = loadCompletedTests();
  completed.add(testId);
  fs.writeFileSync(
    CONFIG.PROGRESS_FILE,
    JSON.stringify({ completedTests: Array.from(completed) }, null, 2),
    'utf-8'
  );
}

// 批量更新数据库
async function updateDatabaseBatch(updates: { id: string; content: OpenDialogueContent }[]): Promise<void> {
  if (!process.env.DATABASE_URL || updates.length === 0) return;

  const sql = neon(process.env.DATABASE_URL);

  // 使用 unnest 进行批量更新
  const ids = updates.map((u) => u.id);
  const contents = updates.map((u) => JSON.stringify(u.content));

  await sql`
    UPDATE scene_tests
    SET content = data.content::jsonb, updated_at = NOW()
    FROM (
      SELECT unnest(${ids}::text[]) as id, unnest(${contents}::text[]) as content
    ) AS data
    WHERE scene_tests.id = data.id
  `;
}

// 更新 JSON 文件
async function updateJsonFile(translatedTests: Map<string, OpenDialogueContent>): Promise<void> {
  console.log('\n📝 更新 JSON 文件...');

  const tests: SceneTest[] = JSON.parse(fs.readFileSync(CONFIG.JSON_FILE, 'utf-8'));

  let updatedCount = 0;
  for (const test of tests) {
    if (test.type === 'open_dialogue' && translatedTests.has(test.id)) {
      test.content = translatedTests.get(test.id);
      updatedCount++;
    }
  }

  fs.writeFileSync(CONFIG.JSON_FILE, JSON.stringify(tests, null, 2), 'utf-8');
  console.log(`   ✅ 已更新 ${updatedCount} 条数据到 JSON 文件`);
}

// 主函数
async function main(): Promise<void> {
  console.log('========================================');
  console.log('Open Dialogue 翻译脚本');
  console.log('========================================');
  console.log(`并发数: ${CONFIG.CONCURRENCY}`);
  console.log(`GLM API Key: ${CONFIG.GLM_API_KEY ? '已设置' : '未设置'}`);
  console.log('');

  if (!CONFIG.GLM_API_KEY) {
    console.error('❌ 错误: 请设置 GLM_API_KEY 环境变量');
    process.exit(1);
  }

  // 读取数据
  console.log('📖 从数据库读取 open_dialogue 数据...');
  const tests = await loadOpenDialoguesFromDB();
  console.log(`✅ 读取了 ${tests.length} 条 open_dialogue 数据\n`);

  // 加载已翻译的测试
  const completedTests = loadCompletedTests();
  if (completedTests.size > 0) {
    console.log(`📝 发现 ${completedTests.size} 条已翻译，将跳过\n`);
  }

  // 过滤出需要翻译的测试
  const testsToTranslate = tests.filter((test) => !completedTests.has(test.id));

  if (testsToTranslate.length === 0) {
    console.log('✅ 所有数据已翻译，无需重复翻译');
    return;
  }

  console.log(`🎯 需要翻译 ${testsToTranslate.length} 条数据\n`);

  const controller = new ConcurrencyController(CONFIG.CONCURRENCY);
  const failedTests: { test: SceneTest; error: string }[] = [];
  const translatedTests = new Map<string, OpenDialogueContent>();
  const dbUpdates: { id: string; content: OpenDialogueContent }[] = [];

  const startTime = Date.now();
  let completedCount = 0;

  console.log('开始翻译...\n');

  // 创建任务
  const tasks = testsToTranslate.map((test, i) => async () => {
    await controller.acquire();
    try {
      console.log(`[${i + 1}/${testsToTranslate.length}] 翻译: ${test.id}`);
      console.log(`   原文: ${(test.content as OpenDialogueContent).topic}`);

      const result = await translateOpenDialogue(test);

      // 更新 content
      const updatedContent: OpenDialogueContent = {
        ...test.content as OpenDialogueContent,
        topic: result.topic,
        description: result.description,
        roles: result.roles,
      };

      console.log(`   译文: ${result.topic}`);

      // 保存到内存
      translatedTests.set(test.id, updatedContent);
      dbUpdates.push({ id: test.id, content: updatedContent });

      // 保存进度
      saveCompletedTest(test.id);

      completedCount++;

      // 每10条批量更新数据库
      if (dbUpdates.length >= 10) {
        console.log('   💾 批量更新数据库...');
        await updateDatabaseBatch([...dbUpdates]);
        dbUpdates.length = 0;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      failedTests.push({ test, error: errorMsg });
      console.error(`   ❌ 翻译失败: ${errorMsg}`);
    } finally {
      controller.release();
    }
  });

  // 执行所有任务
  await Promise.all(tasks.map((t) => t()));

  // 更新剩余的数据库记录
  if (dbUpdates.length > 0) {
    console.log('   💾 批量更新数据库（剩余）...');
    await updateDatabaseBatch([...dbUpdates]);
  }

  // 更新 JSON 文件
  await updateJsonFile(translatedTests);

  // 保存失败记录
  if (failedTests.length > 0) {
    const failedFile = path.join(CONFIG.DATA_DIR, 'translate_failed.json');
    fs.writeFileSync(
      failedFile,
      JSON.stringify(
        failedTests.map((f) => ({ testId: f.test.id, error: f.error })),
        null,
        2
      )
    );
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n========================================');
  console.log('翻译完成!');
  console.log('========================================');
  console.log(`总数: ${tests.length}`);
  console.log(`本次翻译: ${completedCount}`);
  console.log(`已跳过: ${completedTests.size}`);
  console.log(`失败: ${failedTests.length}`);
  console.log(`耗时: ${duration} 秒`);
  if (failedTests.length > 0) {
    console.log(`失败记录: ${path.join(CONFIG.DATA_DIR, 'translate_failed.json')}`);
  }
  console.log('========================================');
}

main().catch((error) => {
  console.error('\n❌ 程序执行失败:', error);
  process.exit(1);
});
