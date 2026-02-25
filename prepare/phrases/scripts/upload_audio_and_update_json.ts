/**
 * 上传音频到 Vercel Blob 并更新 JSON 文件中的 audioUrl
 * 1. 上传所有生成的 MP3 音频到 Vercel Blob
 * 2. 更新 phrases_100_quality.json 中的 audioUrl 为 Blob URL
 * 3. 可选择同时更新数据库
 *
 * 使用方法:
 * 1. 确保已设置环境变量: BLOB_READ_WRITE_TOKEN
 * 2. 运行: npx ts-node prepare/scripts/upload_audio_and_update_json.ts
 */

import { put, list, del } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 配置
const DATA_DIR = path.resolve(process.cwd(), 'prepare/data');
const AUDIO_DIR = path.join(DATA_DIR, 'audio');
const JSON_FILE = path.join(DATA_DIR, 'phrases_100_quality.json');

// 统计
interface Stats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

const stats: Stats = {
  total: 0,
  success: 0,
  failed: 0,
  skipped: 0,
};

// URL 映射表
const urlMap = new Map<string, string>();

/**
 * 检查音频文件是否已存在于 Blob
 */
async function checkAudioExists(filename: string): Promise<string | null> {
  try {
    const { blobs } = await list({ prefix: `audio/${filename}` });
    if (blobs.length > 0) {
      return blobs[0].url;
    }
  } catch (error) {
    // 忽略错误
  }
  return null;
}

/**
 * 上传单个音频文件到 Vercel Blob
 */
async function uploadAudioFile(localPath: string, blobPath: string): Promise<string | null> {
  const filename = path.basename(blobPath);

  // 检查是否已上传
  const existingUrl = await checkAudioExists(filename);
  if (existingUrl) {
    console.log(`  ⏭️  跳过已存在: ${filename}`);
    stats.skipped++;
    return existingUrl;
  }

  try {
    if (!fs.existsSync(localPath)) {
      console.warn(`  ⚠️  文件不存在: ${localPath}`);
      stats.failed++;
      return null;
    }

    const fileBuffer = fs.readFileSync(localPath);
    const blob = await put(blobPath, fileBuffer, {
      access: 'public',
      contentType: 'audio/mpeg',
    });

    console.log(`  ✅ 上传成功: ${filename}`);
    stats.success++;
    return blob.url;
  } catch (error) {
    console.error(`  ❌ 上传失败: ${filename}`, error);
    stats.failed++;
    return null;
  }
}

/**
 * 上传所有音频文件
 */
async function uploadAllAudioFiles(phrases: any[]): Promise<void> {
  console.log('\n📤 开始上传音频文件到 Vercel Blob...\n');

  const tasks: Promise<void>[] = [];

  for (const phrase of phrases) {
    const phraseId = phrase.id;

    // 短语音频
    const phraseAudioPath = path.join(AUDIO_DIR, 'phrases', `${phraseId}.mp3`);
    const phraseBlobPath = `audio/phrases/${phraseId}.mp3`;

    stats.total++;
    tasks.push(
      uploadAudioFile(phraseAudioPath, phraseBlobPath).then((url) => {
        if (url) {
          urlMap.set(phrase.audioUrl, url);
        }
      })
    );

    // 示例音频
    if (phrase.examples && Array.isArray(phrase.examples)) {
      for (let i = 0; i < phrase.examples.length; i++) {
        const example = phrase.examples[i];
        const exampleAudioPath = path.join(AUDIO_DIR, 'examples', `${phraseId}_ex${i + 1}.mp3`);
        const exampleBlobPath = `audio/examples/${phraseId}_ex${i + 1}.mp3`;

        stats.total++;
        tasks.push(
          uploadAudioFile(exampleAudioPath, exampleBlobPath).then((url) => {
            if (url) {
              urlMap.set(example.audioUrl, url);
            }
          })
        );
      }
    }
  }

  // 批量上传（限制并发数）
  const batchSize = 5;
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    await Promise.all(batch);
    console.log(`  进度: ${Math.min(i + batchSize, tasks.length)}/${tasks.length}`);
  }
}

/**
 * 更新 JSON 文件中的 audioUrl
 */
function updateJsonFile(phrases: any[]): any[] {
  console.log('\n📝 开始更新 JSON 文件中的 audioUrl...\n');

  const updatedPhrases = phrases.map((phrase) => {
    const updatedPhrase = { ...phrase };

    // 更新短语音频 URL
    if (urlMap.has(phrase.audioUrl)) {
      updatedPhrase.audioUrl = urlMap.get(phrase.audioUrl);
    }

    // 更新示例音频 URL
    if (phrase.examples && Array.isArray(phrase.examples)) {
      updatedPhrase.examples = phrase.examples.map((example: any) => {
        const updatedExample = { ...example };
        if (urlMap.has(example.audioUrl)) {
          updatedExample.audioUrl = urlMap.get(example.audioUrl);
        }
        return updatedExample;
      });
    }

    return updatedPhrase;
  });

  // 保存更新后的 JSON 文件
  const updatedData = {
    phrases: updatedPhrases,
  };

  // 备份原文件
  const backupPath = `${JSON_FILE}.backup.${Date.now()}`;
  fs.copyFileSync(JSON_FILE, backupPath);
  console.log(`  💾 已备份原文件到: ${path.basename(backupPath)}`);

  // 写入新文件
  fs.writeFileSync(JSON_FILE, JSON.stringify(updatedData, null, 2), 'utf-8');
  console.log(`  ✅ 已更新 JSON 文件: ${path.basename(JSON_FILE)}`);

  return updatedPhrases;
}

/**
 * 打印统计信息
 */
function printStats() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 上传统计');
  console.log('='.repeat(50));
  console.log(`   总计: ${stats.total}`);
  console.log(`   成功: ${stats.success}`);
  console.log(`   跳过: ${stats.skipped}`);
  console.log(`   失败: ${stats.failed}`);
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('🚀 开始上传音频并更新 JSON 文件\n');
  console.log('='.repeat(50));

  // 检查环境变量
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ 错误: BLOB_READ_WRITE_TOKEN 环境变量未设置');
    console.error('   请确保 .env.local 文件中包含 BLOB_READ_WRITE_TOKEN');
    process.exit(1);
  }

  // 读取 JSON 文件
  if (!fs.existsSync(JSON_FILE)) {
    console.error(`❌ 错误: 找不到文件 ${JSON_FILE}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  const phrases = data.phrases;

  console.log(`\n📖 读取了 ${phrases.length} 个短语`);

  // 统计音频数量
  const totalExamples = phrases.reduce((sum: number, p: any) => sum + (p.examples?.length || 0), 0);
  console.log(`   短语音频: ${phrases.length} 个`);
  console.log(`   示例音频: ${totalExamples} 个`);
  console.log(`   总计: ${phrases.length + totalExamples} 个\n`);

  // 上传音频文件
  await uploadAllAudioFiles(phrases);

  // 更新 JSON 文件
  updateJsonFile(phrases);

  // 打印统计
  printStats();

  if (stats.failed === 0) {
    console.log('\n✨ 所有音频上传成功！JSON 文件已更新。');
  } else {
    console.log(`\n⚠️ 有 ${stats.failed} 个音频上传失败`);
    process.exit(1);
  }
}

// 运行主函数
main().catch((error) => {
  console.error('\n❌ 程序执行失败:', error);
  process.exit(1);
});
