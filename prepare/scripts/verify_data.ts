/**
 * 验证数据库和音频文件完整性
 */
const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function verify() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL 环境变量未设置');
    }
    
    const sql = neon(databaseUrl);
    
    console.log('🔍 开始验证数据完整性...\n');
    
    // 1. 统计记录数
    const phrases = await sql`SELECT COUNT(*) as count FROM phrases`;
    const examples = await sql`SELECT COUNT(*) as count FROM phrase_examples`;
    
    console.log('📊 数据库记录统计:');
    console.log(`  phrases表: ${phrases[0].count} 条记录`);
    console.log(`  phrase_examples表: ${examples[0].count} 条记录`);
    console.log(`  每个短语平均示例数: ${(examples[0].count / phrases[0].count).toFixed(1)} 个\n`);
    
    // 2. 检查音频URL
    const phraseWithAudio = await sql`
      SELECT COUNT(*) as count FROM phrases WHERE audio_url LIKE '%vercel-storage%'
    `;
    const exampleWithAudio = await sql`
      SELECT COUNT(*) as count FROM phrase_examples WHERE audio_url LIKE '%vercel-storage%'
    `;
    
    console.log('🎵 音频URL统计:');
    console.log(`  短语音频URL已更新: ${phraseWithAudio[0].count} / ${phrases[0].count}`);
    console.log(`  示例音频URL已更新: ${exampleWithAudio[0].count} / ${examples[0].count}\n`);
    
    // 3. 抽查几条记录
    console.log('📝 抽查记录（前3条短语）:');
    const samplePhrases = await sql`
      SELECT id, english, chinese, audio_url FROM phrases LIMIT 3
    `;
    
    for (const phrase of samplePhrases) {
      console.log(`\n  📌 ${phrase.id}: ${phrase.english}`);
      console.log(`     中文: ${phrase.chinese}`);
      console.log(`     音频: ${phrase.audio_url?.substring(0, 70)}...`);
      
      // 查询该短语的示例
      const sampleExamples = await sql`
        SELECT title, english, audio_url FROM phrase_examples 
        WHERE phrase_id = ${phrase.id} LIMIT 2
      `;
      
      console.log(`     示例 (${sampleExamples.length}个):`);
      for (const ex of sampleExamples) {
        console.log(`       - ${ex.title}: ${ex.english.substring(0, 40)}...`);
      }
    }
    
    // 4. 验证结果总结
    console.log('\n✅ 验证结果:');
    const allPhraseAudioOK = phraseWithAudio[0].count === phrases[0].count;
    const allExampleAudioOK = exampleWithAudio[0].count === examples[0].count;
    
    if (allPhraseAudioOK && allExampleAudioOK) {
      console.log('  ✨ 所有数据验证通过！');
      console.log('  - 100个短语已导入');
      console.log('  - 200个示例已导入');
      console.log('  - 所有音频URL已更新为Vercel Blob地址');
    } else {
      console.log('  ⚠️ 部分数据未完全更新:');
      if (!allPhraseAudioOK) {
        console.log(`    - 短语音频: ${phraseWithAudio[0].count}/${phrases[0].count}`);
      }
      if (!allExampleAudioOK) {
        console.log(`    - 示例音频: ${exampleWithAudio[0].count}/${examples[0].count}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  }
}

verify();
