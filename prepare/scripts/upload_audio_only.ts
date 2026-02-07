/**
 * 仅上传音频文件到Vercel Blob
 * 不上传数据库数据
 *
 * 使用方法:
 * 1. 确保已设置环境变量: BLOB_READ_WRITE_TOKEN
 * 2. 运行: npx ts-node prepare/scripts/upload_audio_only.ts
 */

import { put, list } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 上传统计
interface UploadStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
}

const stats: UploadStats = {
  total: 0,
  success: 0,
  failed: 0,
  skipped: 0,
};

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
    // 忽略错误
  }
  return null;
}

/**
 * 上传单个音频文件
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
      contentType: 'audio/wav',
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
 * 获取目录下所有音频文件
 */
function getAudioFiles(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAudioFiles(fullPath));
    } else if (item.endsWith('.wav')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('🎵 开始上传音频文件到Vercel Blob\n');
  console.log('=' .repeat(50));

  const audioBasePath = path.resolve(process.cwd(), 'prepare/data/audio');

  // 获取所有音频文件
  const audioFiles = getAudioFiles(audioBasePath);
  stats.total = audioFiles.length;

  console.log(`\n📁 找到 ${audioFiles.length} 个音频文件\n`);

  // 分类统计
  const phraseAudios = audioFiles.filter(f => f.includes('phrases'));
  const exampleAudios = audioFiles.filter(f => f.includes('examples'));

  console.log(`   短语音频: ${phraseAudios.length} 个`);
  console.log(`   示例音频: ${exampleAudios.length} 个\n`);

  // 批量上传
  const batchSize = 5;
  for (let i = 0; i < audioFiles.length; i += batchSize) {
    const batch = audioFiles.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(audioFiles.length / batchSize);

    console.log(`📦 批次 ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, audioFiles.length)})`);

    await Promise.all(
      batch.map(async (localPath) => {
        // 计算相对路径作为blob路径
        const relativePath = path.relative(audioBasePath, localPath);
        const blobPath = `audio/${relativePath.replace(/\\/g, '/')}`;
        await uploadAudioFile(localPath, blobPath);
      })
    );

    // 小延迟
    if (i + batchSize < audioFiles.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 最终统计
  console.log('\n' + '='.repeat(50));
  console.log('📈 上传统计');
  console.log('='.repeat(50));
  console.log(`   总计: ${stats.total}`);
  console.log(`   成功: ${stats.success}`);
  console.log(`   跳过: ${stats.skipped}`);
  console.log(`   失败: ${stats.failed}`);

  if (stats.failed === 0) {
    console.log('\n✨ 所有音频上传成功！');
  } else {
    console.log(`\n⚠️ 有 ${stats.failed} 个音频上传失败`);
    process.exit(1);
  }
}

// 运行主函数
main();
