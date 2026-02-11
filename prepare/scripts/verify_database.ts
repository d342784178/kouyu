/**
 * 验证数据库数据
 * 检查 audio_url 是否为 Vercel Blob URL
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🔍 验证数据库数据...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 未设置');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // 查询短语
  const phrases = await sql`SELECT id, english, audio_url FROM phrases LIMIT 5`;
  console.log('📚 短语数据 (前5条):');
  phrases.forEach((p: any) => {
    const isBlobUrl = p.audio_url?.includes('vercel-storage.com');
    console.log(`  ${p.id}: ${p.english}`);
    console.log(`    audio_url: ${p.audio_url?.substring(0, 60)}... ${isBlobUrl ? '✅' : '❌'}`);
  });

  // 查询示例
  const examples = await sql`SELECT id, phrase_id, english, audio_url FROM phrase_examples LIMIT 5`;
  console.log('\n📖 示例数据 (前5条):');
  examples.forEach((e: any) => {
    const isBlobUrl = e.audio_url?.includes('vercel-storage.com');
    console.log(`  ${e.id}: ${e.english?.substring(0, 40)}...`);
    console.log(`    audio_url: ${e.audio_url?.substring(0, 60)}... ${isBlobUrl ? '✅' : '❌'}`);
  });

  // 统计
  const phraseCount = await sql`SELECT COUNT(*) as count FROM phrases`;
  const exampleCount = await sql`SELECT COUNT(*) as count FROM phrase_examples`;
  const blobUrlCount = await sql`
    SELECT COUNT(*) as count FROM phrases 
    WHERE audio_url LIKE '%vercel-storage.com%'
  `;

  console.log('\n📊 统计:');
  console.log(`  短语总数: ${phraseCount[0].count}`);
  console.log(`  示例总数: ${exampleCount[0].count}`);
  console.log(`  使用 Blob URL 的短语: ${blobUrlCount[0].count}`);

  if (blobUrlCount[0].count === phraseCount[0].count) {
    console.log('\n✅ 所有数据都使用了 Vercel Blob URL！');
  } else {
    console.log('\n⚠️ 部分数据未使用 Blob URL');
  }
}

main().catch(console.error);
