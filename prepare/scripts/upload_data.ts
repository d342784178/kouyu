/**
 * 数据上传脚本
 * 将短语数据和音频文件上传到数据库和Vercel Blob
 *
 * 使用方法:
 * 1. 确保已设置环境变量: DATABASE_URL, BLOB_READ_WRITE_TOKEN
 * 2. 运行: npx ts-node prepare/scripts/upload_data.ts
 */

import { neon } from '@neondatabase/serverless';
import { put, list, del } from '@vercel/blob';
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
  audio: { total: number; success: number; failed: number; skipped: number };
}

const stats: UploadStats = {
  phrases: { total: 0, success: 0, failed: 0 },
  examples: { total: 0, success: 0, failed: 0 },
  audio: { total: 0, success: 0, failed: 0, skipped: 0 },
};

// 已上传的音频URL映射（本地路径 -> Blob URL）
const audioUrlMap = new Map<string, string>();

/**
 * 检查音频文件是否已存在
 */
async function checkAudioExists(filename: string): Promise<string | null> {
  try {
    const { blobs } = await list({ prefix: `audio/${filename}` });
    if (blobs.length > 0) {
      return blobs[0].url;
    }
  } catch (error) {
    // 忽略错误，继续上传
  }
  return null;
}

/**
 * 上传单个音频文件到Vercel Blob
 */
async function uploadAudioFile(localPath: string, blobPath: string): Promise<string | null> {
  const filename = path.basename(blobPath);

  // 检查是否已上传
  const existingUrl = await checkAudioExists(filename);
  if (existingUrl) {
    console.log(`  ⏭️  跳过已存在的音频: ${filename}`);
    stats.audio.skipped++;
    return existingUrl;
  }

  try {
    if (!fs.existsSync(localPath)) {
      console.warn(`  ⚠️  音频文件不存在: ${localPath}`);
      stats.audio.failed++;
      return null;
    }

    const fileBuffer = fs.readFileSync(localPath);
    const blob = await put(blobPath, fileBuffer, {
      access: 'public',
      contentType: 'audio/wav',
    });

    console.log(`  ✅ 上传音频成功: ${filename}`);
    stats.audio.success++;
    return blob.url;
  } catch (error) {
    console.error(`  ❌ 上传音频失败: ${filename}`, error);
    stats.audio.failed++;
    return null;
  }
}

/**
 * 上传所有音频文件
 */
async function uploadAllAudioFiles(phrases: Phrase[]): Promise<void> {
  console.log('\n🎵 开始上传音频文件...\n');

  const audioBasePath = path.resolve(process.cwd(), 'prepare/data/audio');

  // 收集所有需要上传的音频
  const audioFiles: { localPath: string; blobPath: string; originalUrl: string }[] = [];

  for (const phrase of phrases) {
    // 短语音频
    const phraseWavName = path.basename(phrase.audioUrl, '.mp3') + '.wav';
    const phraseLocalPath = path.join(audioBasePath, 'phrases', phraseWavName);
    const phraseBlobPath = `audio/phrases/${phraseWavName}`;
    audioFiles.push({
      localPath: phraseLocalPath,
      blobPath: phraseBlobPath,
      originalUrl: phrase.audioUrl,
    });

    // 示例音频
    for (const example of phrase.examples) {
      const exampleWavName = path.basename(example.audioUrl, '.mp3') + '.wav';
      const exampleLocalPath = path.join(audioBasePath, 'examples', exampleWavName);
      const exampleBlobPath = `audio/examples/${exampleWavName}`;
      audioFiles.push({
        localPath: exampleLocalPath,
        blobPath: exampleBlobPath,
        originalUrl: example.audioUrl,
      });
    }
  }

  stats.audio.total = audioFiles.length;
  console.log(`共找到 ${audioFiles.length} 个音频文件\n`);

  // 批量上传（每批5个，避免并发过高）
  const batchSize = 5;
  for (let i = 0; i < audioFiles.length; i += batchSize) {
    const batch = audioFiles.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(audioFiles.length / batchSize);

    console.log(`📦 批次 ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, audioFiles.length)})`);

    const results = await Promise.all(
      batch.map(async ({ localPath, blobPath, originalUrl }) => {
        const url = await uploadAudioFile(localPath, blobPath);
        return { originalUrl, url };
      })
    );

    // 保存URL映射
    for (const { originalUrl, url } of results) {
      if (url) {
        audioUrlMap.set(originalUrl, url);
      }
    }

    // 小延迟，避免请求过快
    if (i + batchSize < audioFiles.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n📊 音频上传统计:');
  console.log(`   总计: ${stats.audio.total}`);
  console.log(`   成功: ${stats.audio.success}`);
  console.log(`   跳过: ${stats.audio.skipped}`);
  console.log(`   失败: ${stats.audio.failed}`);
}

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
      // 获取新的音频URL
      const phraseWavName = path.basename(phrase.audioUrl, '.mp3') + '.wav';
      const newAudioUrl = audioUrlMap.get(phrase.audioUrl) || `audio/phrases/${phraseWavName}`;

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
          ${newAudioUrl},
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
        // 获取新的音频URL
        const exampleWavName = path.basename(example.audioUrl, '.mp3') + '.wav';
        const newAudioUrl = audioUrlMap.get(example.audioUrl) || `audio/examples/${exampleWavName}`;

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
            ${newAudioUrl},
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
  console.log('🚀 开始数据上传流程\n');
  console.log('=' .repeat(50));

  try {
    // 1. 读取JSON数据
    const jsonPath = path.resolve(process.cwd(), 'prepare/data/phrases_100_quality.json');
    console.log(`\n📖 读取数据文件: ${jsonPath}`);

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`数据文件不存在: ${jsonPath}`);
    }

    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const data: PhraseData = JSON.parse(rawData);
    console.log(`✅ 读取成功，共 ${data.phrases.length} 个短语\n`);

    // 2. 上传音频文件
    await uploadAllAudioFiles(data.phrases);

    // 3. 清空现有数据
    await clearExistingData();

    // 4. 插入短语数据
    await insertPhrases(data.phrases);

    // 5. 插入示例数据
    await insertExamples(data.phrases);

    // 6. 最终统计
    console.log('\n' + '='.repeat(50));
    console.log('📈 最终统计报告');
    console.log('='.repeat(50));
    console.log(`\n🎵 音频文件:`);
    console.log(`   总计: ${stats.audio.total}`);
    console.log(`   成功: ${stats.audio.success}`);
    console.log(`   跳过: ${stats.audio.skipped}`);
    console.log(`   失败: ${stats.audio.failed}`);
    console.log(`\n📝 短语数据:`);
    console.log(`   总计: ${stats.phrases.total}`);
    console.log(`   成功: ${stats.phrases.success}`);
    console.log(`   失败: ${stats.phrases.failed}`);
    console.log(`\n💬 示例数据:`);
    console.log(`   总计: ${stats.examples.total}`);
    console.log(`   成功: ${stats.examples.success}`);
    console.log(`   失败: ${stats.examples.failed}`);

    const totalFailed = stats.audio.failed + stats.phrases.failed + stats.examples.failed;
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
