/**
 * 重新初始化数据库
 * 使用 phrases_100_quality.json 中的最新数据（包含 Vercel Blob URL）
 * 1. 清空现有数据
 * 2. 重新插入所有短语和示例
 *
 * 使用方法:
 * npx ts-node prepare/scripts/reinit_database.ts
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 配置
const DATA_DIR = path.resolve(process.cwd(), 'prepare/data');
const JSON_FILE = path.join(DATA_DIR, 'phrases_100_quality.json');

// 统计
interface Stats {
  phrasesInserted: number;
  examplesInserted: number;
  errors: number;
}

const stats: Stats = {
  phrasesInserted: 0,
  examplesInserted: 0,
  errors: 0,
};

/**
 * 清空数据库
 */
async function clearDatabase(sql: any): Promise<void> {
  console.log('\n🧹 清空现有数据...');
  try {
    await sql`DELETE FROM phrase_examples`;
    await sql`DELETE FROM phrases`;
    console.log('  ✅ 已清空现有数据\n');
  } catch (error) {
    console.error('  ❌ 清空数据失败:', error);
    throw error;
  }
}

/**
 * 插入数据到数据库
 */
async function insertDataToDatabase(phrases: any[]): Promise<void> {
  console.log('💾 开始插入数据到数据库...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 环境变量未设置');
  }

  const sql = neon(databaseUrl);

  try {
    // 清空现有数据
    await clearDatabase(sql);

    for (const phrase of phrases) {
      try {
        // 插入短语 - 使用 JSON 中已有的 Blob URL
        await sql`
          INSERT INTO phrases (
            id, english, chinese, part_of_speech, scene, 
            difficulty, pronunciation_tips, audio_url, 
            created_at, updated_at
          ) VALUES (
            ${phrase.id}, 
            ${phrase.english}, 
            ${phrase.chinese}, 
            ${phrase.partOfSpeech}, 
            ${phrase.scene},
            ${phrase.difficulty}, 
            ${phrase.pronunciationTips}, 
            ${phrase.audioUrl},
            NOW(), 
            NOW()
          )
        `;
        stats.phrasesInserted++;

        // 插入示例
        if (phrase.examples && Array.isArray(phrase.examples)) {
          for (let i = 0; i < phrase.examples.length; i++) {
            const example = phrase.examples[i];
            const exampleId = `${phrase.id}_ex${i + 1}`;

            await sql`
              INSERT INTO phrase_examples (
                phrase_id, title, "desc", english, 
                chinese, usage, audio_url, 
                created_at, updated_at
              ) VALUES (
                ${phrase.id},
                ${example.title},
                ${example.desc},
                ${example.english},
                ${example.chinese},
                ${example.usage},
                ${example.audioUrl},
                NOW(),
                NOW()
              )
            `;
            stats.examplesInserted++;
          }
        }

        console.log(`  ✅ 插入: ${phrase.id} - ${phrase.english}`);
      } catch (error) {
        console.error(`  ❌ 插入失败: ${phrase.id}`, error);
        stats.errors++;
      }
    }

    console.log('\n📊 数据库插入统计:');
    console.log(`  短语插入: ${stats.phrasesInserted}`);
    console.log(`  示例插入: ${stats.examplesInserted}`);
    console.log(`  错误: ${stats.errors}`);

  } catch (error) {
    console.error('数据库操作失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('🚀 开始重新初始化数据库...\n');
  console.log('='.repeat(50));

  // 检查环境变量
  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: DATABASE_URL 环境变量未设置');
    process.exit(1);
  }

  // 读取 JSON 数据
  if (!fs.existsSync(JSON_FILE)) {
    console.error(`❌ 错误: 找不到文件 ${JSON_FILE}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  const phrases = data.phrases;

  console.log(`\n📖 读取了 ${phrases.length} 个短语`);
  const totalExamples = phrases.reduce((sum: number, p: any) => sum + (p.examples?.length || 0), 0);
  console.log(`   示例数量: ${totalExamples} 个\n`);

  // 插入数据到数据库
  await insertDataToDatabase(phrases);

  if (stats.errors === 0) {
    console.log('\n✨ 数据库重新初始化完成！');
    console.log(`   共插入 ${stats.phrasesInserted} 个短语, ${stats.examplesInserted} 个示例`);
  } else {
    console.log(`\n⚠️ 有 ${stats.errors} 个错误`);
    process.exit(1);
  }
}

// 运行主函数
main().catch((error) => {
  console.error('\n❌ 程序执行失败:', error);
  process.exit(1);
});
