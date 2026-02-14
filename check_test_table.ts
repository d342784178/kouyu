import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('🔍 检查scene_tests表结构...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 未设置');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    // 查询表结构
    const columns = await sql`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'scene_tests'
      ORDER BY ordinal_position
    `;
    console.log('📋 表结构:');
    columns.forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type}${col.character_maximum_length ? ` (${col.character_maximum_length})` : ''}`);
    });

    // 查询数据示例
    const tests = await sql`SELECT * FROM scene_tests LIMIT 3`;
    console.log('\n📊 数据示例 (前3条):');
    tests.forEach((test: any, index: number) => {
      console.log(`\n测试 ${index + 1}:`);
      console.log(`  id: ${test.id}`);
      console.log(`  scene_id: ${test.scene_id}`);
      console.log(`  type: ${test.type}`);
      console.log(`  order: ${test.order}`);
      console.log(`  content: ${test.content ? JSON.stringify(test.content, null, 2) : '空'}`);
      console.log(`  created_at: ${test.created_at}`);
    });

  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

main().catch(console.error);