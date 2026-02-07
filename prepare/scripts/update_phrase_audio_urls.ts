/**
 * 更新短语表中的音频URL为Blob URL
 */
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始更新短语音频URL...\n');
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL 环境变量未设置');
    }
    
    const sql = neon(databaseUrl);
    
    // 读取JSON数据获取所有短语ID
    const JSON_FILE = path.join(__dirname, '../data/phrases_100_quality.json');
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
    const phrases = data.phrases;
    
    console.log(`📖 读取了 ${phrases.length} 个短语\n`);
    console.log('🔄 更新音频URL...\n');
    
    let updated = 0;
    let errors = 0;
    
    for (const phrase of phrases) {
      try {
        // 构建Blob URL
        const blobUrl = `https://qp8juy4owkwxem5e.public.blob.vercel-storage.com/audio/phrases/${phrase.id}.wav`;
        
        // 更新数据库
        await sql`
          UPDATE phrases 
          SET audio_url = ${blobUrl}
          WHERE id = ${phrase.id}
        `;
        
        console.log(`  ✅ 更新: ${phrase.id} -> ${blobUrl}`);
        updated++;
      } catch (error) {
        console.error(`  ❌ 更新失败: ${phrase.id}`, error);
        errors++;
      }
    }
    
    console.log('\n📊 更新统计:');
    console.log(`  成功: ${updated}`);
    console.log(`  失败: ${errors}`);
    
    // 验证更新结果
    console.log('\n🔍 验证数据库中的音频URL...');
    const result = await sql`SELECT id, english, audio_url FROM phrases LIMIT 5`;
    console.log('\n  前5条记录:');
    result.forEach((row: any) => {
      console.log(`    ${row.id}: ${row.english}`);
      console.log(`      URL: ${row.audio_url?.substring(0, 80)}...`);
    });
    
    console.log('\n✨ 更新完成！');
    
  } catch (error) {
    console.error('\n❌ 更新失败:', error);
    process.exit(1);
  }
}

// 运行
main();
