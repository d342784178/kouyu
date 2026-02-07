/**
 * 初始化数据库和音频文件
 * 1. 上传音频文件到Vercel Blob
 * 2. 将数据插入数据库（使用Blob URL替换本地路径）
 */
const { put, list } = require('@vercel/blob');
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// 配置
const DATA_DIR = path.join(__dirname, '../data');
const AUDIO_DIR = path.join(DATA_DIR, 'audio');
const JSON_FILE = path.join(DATA_DIR, 'phrases_100_quality.json');

// 统计数据
const stats = {
  audio: {
    total: 0,
    uploaded: 0,
    skipped: 0,
    failed: 0
  },
  database: {
    phrasesInserted: 0,
    examplesInserted: 0,
    errors: 0
  }
};

// 音频URL映射表（本地路径 -> Blob URL）
const audioUrlMap = new Map<string, string>();

/**
 * 检查音频文件是否已存在于Blob
 */
async function checkAudioExists(filename: string): Promise<string | null> {
  try {
    const { blobs } = await list({ prefix: `audio/${filename}` });
    if (blobs.length > 0) {
      return blobs[0].url;
    }
  } catch (error) {
    console.error('检查音频存在性失败:', error);
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
    stats.audio.uploaded++;
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
async function uploadAllAudioFiles(phrases: any[]): Promise<void> {
  console.log('\n📤 开始上传音频文件到Vercel Blob...\n');
  
  const audioTasks: Promise<void>[] = [];
  
  for (const phrase of phrases) {
    // 短语音频
    const phraseId = phrase.id;
    const phraseAudioPath = path.join(AUDIO_DIR, 'phrases', `${phraseId}.wav`);
    const phraseBlobPath = `audio/phrases/${phraseId}.wav`;
    
    stats.audio.total++;
    audioTasks.push(
      uploadAudioFile(phraseAudioPath, phraseBlobPath).then((url: string | null) => {
        if (url) {
          audioUrlMap.set(phrase.audioUrl, url);
        }
      })
    );
    
    // 示例音频
    if (phrase.examples && Array.isArray(phrase.examples)) {
      for (let i = 0; i < phrase.examples.length; i++) {
        const example = phrase.examples[i];
        const exampleAudioPath = path.join(AUDIO_DIR, 'examples', `${phraseId}_ex${i + 1}.wav`);
        const exampleBlobPath = `audio/examples/${phraseId}_ex${i + 1}.wav`;
        
        stats.audio.total++;
        audioTasks.push(
          uploadAudioFile(exampleAudioPath, exampleBlobPath).then((url: string | null) => {
            if (url) {
              audioUrlMap.set(example.audioUrl, url);
            }
          })
        );
      }
    }
  }
  
  // 并发上传（限制并发数）
  const batchSize = 5;
  for (let i = 0; i < audioTasks.length; i += batchSize) {
    const batch = audioTasks.slice(i, i + batchSize);
    await Promise.all(batch);
    console.log(`  进度: ${Math.min(i + batchSize, audioTasks.length)}/${audioTasks.length}`);
  }
  
  console.log('\n📊 音频上传统计:');
  console.log(`  总计: ${stats.audio.total}`);
  console.log(`  上传成功: ${stats.audio.uploaded}`);
  console.log(`  跳过(已存在): ${stats.audio.skipped}`);
  console.log(`  失败: ${stats.audio.failed}`);
}

/**
 * 将数据插入数据库
 */
async function insertDataToDatabase(phrases: any[]): Promise<void> {
  console.log('\n💾 开始插入数据到数据库...\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 环境变量未设置');
  }
  
  const sql = neon(databaseUrl);
  
  try {
    // 清空现有数据（可选，如果需要重新初始化）
    console.log('  🧹 清空现有数据...');
    await sql`DELETE FROM phrase_examples`;
    await sql`DELETE FROM phrases`;
    console.log('  ✅ 已清空现有数据');
    
    for (const phrase of phrases) {
      try {
        // 获取Blob URL（如果已上传）
        const audioUrl = audioUrlMap.get(phrase.audioUrl) || phrase.audioUrl;
        
        // 插入短语
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
            ${audioUrl},
            NOW(), 
            NOW()
          )
        `;
        stats.database.phrasesInserted++;
        
        // 插入示例
        if (phrase.examples && Array.isArray(phrase.examples)) {
          for (let i = 0; i < phrase.examples.length; i++) {
            const example = phrase.examples[i];
            const exampleAudioUrl = audioUrlMap.get(example.audioUrl) || example.audioUrl;
            const exampleId = `${phrase.id}_ex${i + 1}`;
            
            await sql`
              INSERT INTO phrase_examples (
                id, phrase_id, title, "desc", english, 
                chinese, usage, audio_url, 
                created_at, updated_at
              ) VALUES (
                ${exampleId},
                ${phrase.id},
                ${example.title},
                ${example.desc},
                ${example.english},
                ${example.chinese},
                ${example.usage},
                ${exampleAudioUrl},
                NOW(),
                NOW()
              )
            `;
            stats.database.examplesInserted++;
          }
        }
        
        console.log(`  ✅ 插入短语: ${phrase.id} - ${phrase.english}`);
      } catch (error) {
        console.error(`  ❌ 插入失败: ${phrase.id}`, error);
        stats.database.errors++;
      }
    }
    
    console.log('\n📊 数据库插入统计:');
    console.log(`  短语插入: ${stats.database.phrasesInserted}`);
    console.log(`  示例插入: ${stats.database.examplesInserted}`);
    console.log(`  错误: ${stats.database.errors}`);
    
  } catch (error) {
    console.error('数据库操作失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始初始化数据库和音频文件...\n');
  
  try {
    // 检查环境变量
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL 环境变量未设置');
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN 环境变量未设置');
    }
    
    // 读取JSON数据
    console.log('📖 读取数据文件...');
    if (!fs.existsSync(JSON_FILE)) {
      throw new Error(`数据文件不存在: ${JSON_FILE}`);
    }
    
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
    const phrases = data.phrases;
    console.log(`  ✅ 读取了 ${phrases.length} 个短语\n`);
    
    // 上传音频文件
    await uploadAllAudioFiles(phrases);
    
    // 插入数据到数据库
    await insertDataToDatabase(phrases);
    
    console.log('\n✨ 初始化完成！');
    console.log('\n📋 总结:');
    console.log(`  音频文件: ${stats.audio.uploaded} 个上传, ${stats.audio.skipped} 个已存在`);
    console.log(`  数据库: ${stats.database.phrasesInserted} 个短语, ${stats.database.examplesInserted} 个示例`);
    
  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    process.exit(1);
  }
}

// 运行
main();
