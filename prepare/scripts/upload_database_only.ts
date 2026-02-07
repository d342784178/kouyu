/**
 * 仅上传数据到数据库
 * 使用JSON文件中的数据，音频URL保持原样或手动指定
 *
 * 使用方法:
 * 1. 确保已设置环境变量: DATABASE_URL
 * 2. 运行: npx ts-node prepare/scripts/upload_database_only.ts
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 数据库连接
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('错误: 未设置 DATABASE_URL 环境变量');
  process.exit(1);
}

const sql = neon(databaseUrl);

// 类型定义
interface PhraseExample {
  title: string;
  desc: string;
  english: string;
  chinese: string;
  usage: string;
  audioUrl: string;
}

interface Phrase {
  id: string;
  english: string;
  chinese: string;
  partOfSpeech: string;
  scene: string;
  difficulty: string;
  pronunciationTips: string;
  audioUrl: string;
  examples: PhraseExample[];
}

interface PhraseData {
  phrases: Phrase[];
}

// 上传统计
interface UploadStats {
  phrases: { total: number; success: number; failed: number };
  examples: { total: number; success: number; failed: number };
}

const stats: UploadStats = {
  phrases: { total: 0, success: 0, failed: 0 },
  examples: { total: 0, success: 0, failed: 0 },
};

/**
 * 清空现有数据
 */
async function clearExistingData(): Promise<void> {
  console.log('\n🗑️  清空现有数据...');
  try {
    await sql`DELETE FROM phrase_examples`;
    await sql`DELETE FROM phrases`;
    console.log('✅ 已清空现有数据\n');
  } catch (error) {
    console.error('❌ 清空数据失败:', error);
    throw error;
  }
}

/**
 * 插入短语数据
 */
async function insertPhrases(phrases: Phrase[]): Promise<void> {
  console.log('\n📝 开始插入短语数据...\n');

  stats.phrases.total = phrases.length;

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    const progress = `[${i + 1}/${phrases.length}]`;

    try {
      await sql`
        INSERT INTO phrases (
          id, english, chinese, part_of_speech, scene, difficulty,
          pronunciation_tips, audio_url, created_at, updated_at
        ) VALUES (
          ${phrase.id},
          ${phrase.english},
          ${phrase.chinese},
          ${phrase.partOfSpeech},
          ${phrase.scene},
          ${phrase.difficulty},
          ${phrase.pronunciationTips},
          ${phrase.audioUrl},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;

      console.log(`${progress} ✅ 插入短语: ${phrase.english}`);
      stats.phrases.success++;
    } catch (error) {
      console.error(`${progress} ❌ 插入失败: ${phrase.english}`, error);
      stats.phrases.failed++;
    }
  }

  console.log('\n📊 短语插入统计:');
  console.log(`   总计: ${stats.phrases.total}`);
  console.log(`   成功: ${stats.phrases.success}`);
  console.log(`   失败: ${stats.phrases.failed}`);
}

/**
 * 插入示例数据
 */
async function insertExamples(phrases: Phrase[]): Promise<void> {
  console.log('\n📝 开始插入示例数据...\n');

  let exampleCount = 0;
  for (const phrase of phrases) {
    exampleCount += phrase.examples.length;
  }
  stats.examples.total = exampleCount;

  let current = 0;
  for (const phrase of phrases) {
    for (const example of phrase.examples) {
      current++;
      const progress = `[${current}/${exampleCount}]`;

      try {
        await sql`
          INSERT INTO phrase_examples (
            phrase_id, title, "desc", english, chinese, usage,
            audio_url, created_at, updated_at
          ) VALUES (
            ${phrase.id},
            ${example.title},
            ${example.desc},
            ${example.english},
            ${example.chinese},
            ${example.usage},
            ${example.audioUrl},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `;

        console.log(`${progress} ✅ 插入示例: ${example.title}`);
        stats.examples.success++;
      } catch (error) {
        console.error(`${progress} ❌ 插入失败: ${example.title}`, error);
        stats.examples.failed++;
      }
    }
  }

  console.log('\n📊 示例插入统计:');
  console.log(`   总计: ${stats.examples.total}`);
  console.log(`   成功: ${stats.examples.success}`);
  console.log(`   失败: ${stats.examples.failed}`);
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('🚀 开始数据库数据上传\n');
  console.log('=' .repeat(50));

  try {
    // 读取JSON数据
    const jsonPath = path.resolve(process.cwd(), 'prepare/data/phrases_100_quality.json');
    console.log(`\n📖 读取数据文件: ${jsonPath}`);

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`数据文件不存在: ${jsonPath}`);
    }

    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const data: PhraseData = JSON.parse(rawData);
    console.log(`✅ 读取成功，共 ${data.phrases.length} 个短语\n`);

    // 清空现有数据
    await clearExistingData();

    // 插入短语数据
    await insertPhrases(data.phrases);

    // 插入示例数据
    await insertExamples(data.phrases);

    // 最终统计
    console.log('\n' + '='.repeat(50));
    console.log('📈 最终统计报告');
    console.log('='.repeat(50));
    console.log(`\n📝 短语数据:`);
    console.log(`   总计: ${stats.phrases.total}`);
    console.log(`   成功: ${stats.phrases.success}`);
    console.log(`   失败: ${stats.phrases.failed}`);
    console.log(`\n💬 示例数据:`);
    console.log(`   总计: ${stats.examples.total}`);
    console.log(`   成功: ${stats.examples.success}`);
    console.log(`   失败: ${stats.examples.failed}`);

    const totalFailed = stats.phrases.failed + stats.examples.failed;
    if (totalFailed === 0) {
      console.log('\n✨ 所有数据上传成功！');
    } else {
      console.log(`\n⚠️ 有 ${totalFailed} 项上传失败，请检查日志`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ 上传过程出错:', error);
    process.exit(1);
  }
}

// 运行主函数
main();
