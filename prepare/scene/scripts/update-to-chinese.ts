/**
 * 场景数据字段中文化脚本
 *
 * 功能:
 * 1. 更新JSON文件中的category/difficulty字段为中文
 * 2. 更新数据库中的category/difficulty字段为中文
 *
 * 使用方法:
 * npx ts-node prepare/scene/scripts/update-to-chinese.ts <command>
 *
 * 命令:
 *   update-json  - 更新JSON文件中的字段为中文
 *   update-db    - 更新数据库中的字段为中文
 *   reset        - 重置数据库（使用更新后的JSON文件）
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DATA_DIR = path.resolve(process.cwd(), 'prepare/scene/data');
const SCENES_FILE = path.join(DATA_DIR, 'scenes_100.json');
const SCENES_WITH_AUDIO_FILE = path.join(DATA_DIR, 'scenes_100_with_audio.json');

// 字段映射关系
const CATEGORY_MAP: Record<string, string> = {
  'daily': '日常',
  'workplace': '职场',
  'study_abroad': '留学',
  'travel': '旅行',
  'social': '社交'
};

const DIFFICULTY_MAP: Record<string, string> = {
  'beginner': '初级',
  'intermediate': '中级',
  'advanced': '高级'
};

interface SceneData {
  scene_id: string;
  scene_name: string;
  description: string;
  tags: string[];
  dialogue: any;
  vocabulary: any[];
  category: string;
  difficulty: string;
}

function translateCategory(category: string): string {
  return CATEGORY_MAP[category] || category;
}

function translateDifficulty(difficulty: string): string {
  return DIFFICULTY_MAP[difficulty] || difficulty;
}

async function updateJsonFiles(): Promise<void> {
  console.log('🚀 开始更新JSON文件中的字段为中文...\n');
  console.log('='.repeat(50));

  if (!fs.existsSync(SCENES_FILE)) {
    console.error(`❌ 错误: 找不到文件 ${SCENES_FILE}`);
    process.exit(1);
  }

  const scenes: SceneData[] = JSON.parse(fs.readFileSync(SCENES_FILE, 'utf-8'));
  console.log(`📖 读取了 ${scenes.length} 个场景\n`);

  // 统计原始值
  const originalCategories = new Set<string>();
  const originalDifficulties = new Set<string>();
  scenes.forEach(scene => {
    originalCategories.add(scene.category);
    originalDifficulties.add(scene.difficulty);
  });

  console.log('📊 原始字段值统计:');
  console.log(`   category: ${Array.from(originalCategories).join(', ')}`);
  console.log(`   difficulty: ${Array.from(originalDifficulties).join(', ')}\n`);

  // 更新字段值
  const updatedScenes = scenes.map(scene => ({
    ...scene,
    category: translateCategory(scene.category),
    difficulty: translateDifficulty(scene.difficulty)
  }));

  // 保存更新后的文件
  fs.writeFileSync(SCENES_FILE, JSON.stringify(updatedScenes, null, 2), 'utf-8');

  // 如果存在带音频的文件也更新
  if (fs.existsSync(SCENES_WITH_AUDIO_FILE)) {
    const scenesWithAudio: SceneData[] = JSON.parse(fs.readFileSync(SCENES_WITH_AUDIO_FILE, 'utf-8'));
    const updatedScenesWithAudio = scenesWithAudio.map(scene => ({
      ...scene,
      category: translateCategory(scene.category),
      difficulty: translateDifficulty(scene.difficulty)
    }));
    fs.writeFileSync(SCENES_WITH_AUDIO_FILE, JSON.stringify(updatedScenesWithAudio, null, 2), 'utf-8');
    console.log(`✅ 已更新: ${SCENES_WITH_AUDIO_FILE}`);
  }

  console.log(`✅ 已更新: ${SCENES_FILE}`);

  // 统计新值
  const newCategories = new Set<string>();
  const newDifficulties = new Set<string>();
  updatedScenes.forEach(scene => {
    newCategories.add(scene.category);
    newDifficulties.add(scene.difficulty);
  });

  console.log('\n' + '='.repeat(50));
  console.log('📊 更新后字段值统计:');
  console.log(`   category: ${Array.from(newCategories).join(', ')}`);
  console.log(`   difficulty: ${Array.from(newDifficulties).join(', ')}`);
  console.log('\n✨ JSON文件更新完成！');
}

async function updateDatabase(): Promise<void> {
  console.log('🚀 开始更新数据库中的字段为中文...\n');
  console.log('='.repeat(50));

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: DATABASE_URL 环境变量未设置');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  // 获取当前所有场景
  const scenes = await sql`SELECT id, category, difficulty FROM scenes ORDER BY id`;
  console.log(`📖 数据库中有 ${scenes.length} 个场景\n`);

  // 统计原始值
  const originalCategories = new Set<string>();
  const originalDifficulties = new Set<string>();
  scenes.forEach((scene: any) => {
    originalCategories.add(scene.category);
    originalDifficulties.add(scene.difficulty);
  });

  console.log('📊 原始字段值统计:');
  console.log(`   category: ${Array.from(originalCategories).join(', ')}`);
  console.log(`   difficulty: ${Array.from(originalDifficulties).join(', ')}\n`);

  let updated = 0;
  let errors = 0;

  for (const scene of scenes) {
    try {
      const newCategory = translateCategory(scene.category);
      const newDifficulty = translateDifficulty(scene.difficulty);

      await sql`
        UPDATE scenes 
        SET 
          category = ${newCategory},
          difficulty = ${newDifficulty},
          updated_at = NOW()
        WHERE id = ${scene.id}
      `;

      updated++;
      console.log(`  ✅ 更新: ${scene.id} | ${scene.category} → ${newCategory} | ${scene.difficulty} → ${newDifficulty}`);
    } catch (error) {
      console.error(`  ❌ 更新失败: ${scene.id}`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 更新统计');
  console.log('='.repeat(50));
  console.log(`   更新成功: ${updated}`);
  console.log(`   错误数量: ${errors}`);

  if (errors === 0) {
    console.log('\n✨ 数据库更新完成！');
  } else {
    console.log(`\n⚠️ 有 ${errors} 个错误`);
    process.exit(1);
  }
}

async function resetDatabase(): Promise<void> {
  console.log('🚀 开始重置场景数据（使用中文字段）...\n');
  console.log('='.repeat(50));

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: DATABASE_URL 环境变量未设置');
    process.exit(1);
  }

  if (!fs.existsSync(SCENES_FILE)) {
    console.error(`❌ 错误: 找不到文件 ${SCENES_FILE}`);
    process.exit(1);
  }

  const scenes: SceneData[] = JSON.parse(fs.readFileSync(SCENES_FILE, 'utf-8'));
  console.log(`📖 读取了 ${scenes.length} 个场景\n`);

  const sql = neon(process.env.DATABASE_URL);

  console.log('🧹 清空数据表...');
  await sql`DELETE FROM scene_tests`;
  await sql`DELETE FROM scenes`;
  console.log('   ✅ 已清空 scenes 和 scene_tests 表\n');

  let inserted = 0;
  let errors = 0;

  for (const scene of scenes) {
    try {
      await sql`
        INSERT INTO scenes (
          id, name, category, description, difficulty,
          duration, tags, dialogue, vocabulary,
          created_at, updated_at
        ) VALUES (
          ${scene.scene_id},
          ${scene.scene_name},
          ${translateCategory(scene.category)},
          ${scene.description},
          ${translateDifficulty(scene.difficulty)},
          10,
          ${JSON.stringify(scene.tags)}::jsonb,
          ${JSON.stringify(scene.dialogue)}::jsonb,
          ${JSON.stringify(scene.vocabulary)}::jsonb,
          NOW(),
          NOW()
        )
      `;
      inserted++;
      console.log(`  ✅ 插入: ${scene.scene_id} - ${scene.scene_name}`);
    } catch (error) {
      console.error(`  ❌ 插入失败: ${scene.scene_id}`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 重置统计');
  console.log('='.repeat(50));
  console.log(`   插入成功: ${inserted}`);
  console.log(`   错误数量: ${errors}`);

  if (errors === 0) {
    console.log('\n✨ 场景数据重置完成！');
  } else {
    console.log(`\n⚠️ 有 ${errors} 个错误`);
    process.exit(1);
  }
}

function printUsage(): void {
  console.log(`
场景数据字段中文化脚本

使用方法:
  npx ts-node prepare/scene/scripts/update-to-chinese.ts <command>

命令:
  update-json  更新JSON文件中的category/difficulty字段为中文
  update-db    更新数据库中的category/difficulty字段为中文
  reset        重置数据库（使用更新后的JSON文件）

映射关系:
  category:
    daily        → 日常
    workplace    → 职场
    study_abroad → 留学
    travel       → 旅行
    social       → 社交

  difficulty:
    beginner     → 初级
    intermediate → 中级
    advanced     → 高级

示例:
  npx ts-node prepare/scene/scripts/update-to-chinese.ts update-json
  npx ts-node prepare/scene/scripts/update-to-chinese.ts update-db
  npx ts-node prepare/scene/scripts/update-to-chinese.ts reset
`);
}

async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'update-json':
      await updateJsonFiles();
      break;
    case 'update-db':
      await updateDatabase();
      break;
    case 'reset':
      await resetDatabase();
      break;
    default:
      printUsage();
      process.exit(command ? 1 : 0);
  }
}

main().catch((error) => {
  console.error('\n❌ 程序执行失败:', error);
  process.exit(1);
});
