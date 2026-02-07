/**
 * 只插入示例数据（修复desc关键字问题）
 */
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// 配置
const DATA_DIR = path.join(__dirname, '../data');
const JSON_FILE = path.join(DATA_DIR, 'phrases_100_quality.json');

// 统计数据
const stats = {
  examplesInserted: 0,
  errors: 0
};

/**
 * 将示例数据插入数据库
 */
async function insertExamplesToDatabase(phrases: any[]): Promise<void> {
  console.log('\n💾 开始插入示例数据到数据库...\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 环境变量未设置');
  }
  
  const sql = neon(databaseUrl);
  
  try {
    // 先清空示例表
    console.log('  🧹 清空现有示例数据...');
    await sql`DELETE FROM phrase_examples`;
    console.log('  ✅ 已清空现有示例数据');
    
    for (const phrase of phrases) {
      try {
        // 插入示例
        if (phrase.examples && Array.isArray(phrase.examples)) {
          for (let i = 0; i < phrase.examples.length; i++) {
            const example = phrase.examples[i];
            // 获取Blob URL（从已上传的音频映射）
            const exampleAudioUrl = `https://qp8juy4owkwxem5e.public.blob.vercel-storage.com/audio/examples/${phrase.id}_ex${i + 1}.wav`;
            
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
                ${exampleAudioUrl},
                NOW(),
                NOW()
              )
            `;
            stats.examplesInserted++;
          }
        }
        
        console.log(`  ✅ 插入示例: ${phrase.id} - ${phrase.examples?.length || 0} 个示例`);
      } catch (error) {
        console.error(`  ❌ 插入失败: ${phrase.id}`, error);
        stats.errors++;
      }
    }
    
    console.log('\n📊 数据库插入统计:');
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
async function main() {
  console.log('🚀 开始插入示例数据...\n');
  
  try {
    // 检查环境变量
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL 环境变量未设置');
    }
    
    // 读取JSON数据
    console.log('📖 读取数据文件...');
    if (!fs.existsSync(JSON_FILE)) {
      throw new Error(`数据文件不存在: ${JSON_FILE}`);
    }
    
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
    const phrases = data.phrases;
    console.log(`  ✅ 读取了 ${phrases.length} 个短语\n`);
    
    // 插入示例数据
    await insertExamplesToDatabase(phrases);
    
    console.log('\n✨ 示例数据插入完成！');
    console.log(`\n📋 总结: ${stats.examplesInserted} 个示例已插入`);
    
  } catch (error) {
    console.error('\n❌ 插入失败:', error);
    process.exit(1);
  }
}

// 运行
main();
