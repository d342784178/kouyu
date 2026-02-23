/**
 * 场景数据管理脚本
 * 
 * 功能:
 * 1. reset - 重置数据库场景数据（从JSON文件导入）
 * 2. update-audio - 更新JSON文件中的音频URL
 * 3. update-db - 更新数据库中的音频URL
 * 4. verify - 验证数据库中的音频URL
 * 5. test - 测试腾讯云COS音频URL是否可访问
 * 
 * 使用方法:
 * npx ts-node prepare/scene/scripts/scene-manager.ts <command>
 * 
 * 示例:
 * npx ts-node prepare/scene/scripts/scene-manager.ts reset
 * npx ts-node prepare/scene/scripts/scene-manager.ts update-audio
 * npx ts-node prepare/scene/scripts/scene-manager.ts update-db
 * npx ts-node prepare/scene/scripts/scene-manager.ts verify
 * npx ts-node prepare/scene/scripts/scene-manager.ts test
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DATA_DIR = path.resolve(process.cwd(), 'prepare/scene/data');
const SCENES_FILE = path.join(DATA_DIR, 'scenes_100.json');
const SCENES_WITH_AUDIO_FILE = path.join(DATA_DIR, 'scenes_100_with_audio.json');
const COS_BASE_URL = 'https://kouyu-scene-1300762139.cos.ap-guangzhou.myqcloud.com';

interface DialogueContent {
  index: number;
  speaker: string;
  speaker_name: string;
  text: string;
  translation: string;
  is_key_qa: boolean;
  audio_url?: string;
}

interface DialogueRound {
  round_number: number;
  content: DialogueContent[];
  analysis?: any;
}

interface VocabularyItem {
  type: string;
  content: string;
  phonetic: string;
  translation: string;
  example_sentence: string;
  example_translation: string;
  difficulty: string;
  round_number: number;
  vocab_id: string;
  word_audio_url?: string;
  example_audio_url?: string;
}

interface SceneData {
  scene_id: string;
  scene_name: string;
  description: string;
  tags: string[];
  dialogue: {
    rounds: DialogueRound[];
  };
  vocabulary: VocabularyItem[];
  category: string;
  difficulty: string;
}

function buildDialogueAudioUrl(sceneId: string, roundNumber: number, speaker: string): string {
  const speakerNum = speaker === 'speaker1' ? '1' : '2';
  return `COS:/scene/dialogues/${sceneId}_round${roundNumber}_speaker${speakerNum}.mp3`;
}

function buildVocabularyAudioUrl(sceneId: string, vocabIndex: number, type: 'word' | 'example'): string {
  return `COS:/scene/vocabulary/${sceneId}_vocab${vocabIndex}_${type}.mp3`;
}

function updateSceneAudioUrls(scene: SceneData): SceneData {
  const updatedScene = { ...scene };

  if (updatedScene.dialogue?.rounds) {
    updatedScene.dialogue.rounds = updatedScene.dialogue.rounds.map(round => {
      const updatedRound = { ...round };
      updatedRound.content = round.content.map(item => ({
        ...item,
        audio_url: buildDialogueAudioUrl(scene.scene_id, round.round_number, item.speaker)
      }));
      return updatedRound;
    });
  }

  if (updatedScene.vocabulary) {
    const vocabIndexMap = new Map<string, number>();
    let currentVocabIndex = 1;
    
    updatedScene.vocabulary = updatedScene.vocabulary.map(vocab => {
      if (!vocabIndexMap.has(vocab.vocab_id)) {
        vocabIndexMap.set(vocab.vocab_id, currentVocabIndex);
        currentVocabIndex++;
      }
      
      const vocabIndex = vocabIndexMap.get(vocab.vocab_id)!;
      
      return {
        ...vocab,
        word_audio_url: buildVocabularyAudioUrl(scene.scene_id, vocabIndex, 'word'),
        example_audio_url: buildVocabularyAudioUrl(scene.scene_id, vocabIndex, 'example')
      };
    });
  }

  return updatedScene;
}

async function testAudioUrls(): Promise<void> {
  console.log('🧪 测试音频URL访问...\n');
  console.log('='.repeat(60));

  const testUrls = [
    '/scene/dialogues/daily_001_round1_speaker1.mp3',
    '/scene/dialogues/daily_001_round1_speaker2.mp3',
    '/scene/vocabulary/daily_001_vocab1_word.mp3',
    '/scene/vocabulary/daily_001_vocab1_example.mp3',
  ];

  for (const relativePath of testUrls) {
    const fullUrl = `${COS_BASE_URL}${relativePath}`;
    
    try {
      const response = await fetch(fullUrl, { method: 'HEAD' });
      
      if (response.ok) {
        const contentLength = response.headers.get('content-length');
        const sizeInfo = contentLength ? ` (${(parseInt(contentLength) / 1024).toFixed(1)} KB)` : '';
        console.log(`✅ 可访问${sizeInfo}`);
      } else {
        console.log(`❌ HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ 请求失败: ${error}`);
    }
    console.log(`   URL: ${fullUrl}\n`);
  }

  console.log('='.repeat(60));
}

async function updateAudioUrls(): Promise<void> {
  console.log('🚀 开始更新音频URL...\n');
  console.log('='.repeat(50));

  if (!fs.existsSync(SCENES_FILE)) {
    console.error(`❌ 错误: 找不到文件 ${SCENES_FILE}`);
    process.exit(1);
  }

  const scenes: SceneData[] = JSON.parse(fs.readFileSync(SCENES_FILE, 'utf-8'));
  console.log(`📖 读取了 ${scenes.length} 个场景\n`);

  let dialogueAudioCount = 0;
  let vocabularyAudioCount = 0;

  const updatedScenes = scenes.map((scene, index) => {
    const updatedScene = updateSceneAudioUrls(scene);
    
    if (updatedScene.dialogue?.rounds) {
      updatedScene.dialogue.rounds.forEach(round => {
        dialogueAudioCount += round.content.length;
      });
    }
    
    if (updatedScene.vocabulary) {
      vocabularyAudioCount += updatedScene.vocabulary.length * 2;
    }

    console.log(`✅ [${index + 1}/${scenes.length}] ${scene.scene_id} - ${scene.scene_name}`);
    return updatedScene;
  });

  fs.writeFileSync(SCENES_WITH_AUDIO_FILE, JSON.stringify(updatedScenes, null, 2), 'utf-8');

  console.log('\n' + '='.repeat(50));
  console.log('📊 更新统计');
  console.log('='.repeat(50));
  console.log(`   场景数量: ${scenes.length}`);
  console.log(`   对话音频URL: ${dialogueAudioCount}`);
  console.log(`   词汇音频URL: ${vocabularyAudioCount}`);
  console.log(`   输出文件: ${SCENES_WITH_AUDIO_FILE}`);
  console.log('\n✨ 音频URL更新完成！');
}

async function resetDatabase(): Promise<void> {
  console.log('🚀 开始重置场景数据...\n');
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
          ${scene.category},
          ${scene.description},
          ${scene.difficulty},
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

async function updateDatabaseAudioUrls(): Promise<void> {
  console.log('🚀 开始更新数据库音频URL...\n');
  console.log('='.repeat(50));

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: DATABASE_URL 环境变量未设置');
    process.exit(1);
  }

  if (!fs.existsSync(SCENES_WITH_AUDIO_FILE)) {
    console.error(`❌ 错误: 找不到文件 ${SCENES_WITH_AUDIO_FILE}`);
    console.log('   请先运行: npx ts-node prepare/scene/scripts/scene-manager.ts update-audio');
    process.exit(1);
  }

  const scenes: SceneData[] = JSON.parse(fs.readFileSync(SCENES_WITH_AUDIO_FILE, 'utf-8'));
  console.log(`📖 读取了 ${scenes.length} 个场景\n`);

  const sql = neon(process.env.DATABASE_URL);

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const scene of scenes) {
    try {
      const existingScene = await sql`
        SELECT id FROM scenes WHERE id = ${scene.scene_id}
      `;

      if (existingScene.length === 0) {
        console.log(`  ⚠️ 未找到: ${scene.scene_id} - ${scene.scene_name}`);
        notFound++;
        continue;
      }

      await sql`
        UPDATE scenes 
        SET 
          dialogue = ${JSON.stringify(scene.dialogue)}::jsonb,
          vocabulary = ${JSON.stringify(scene.vocabulary)}::jsonb,
          updated_at = NOW()
        WHERE id = ${scene.scene_id}
      `;

      updated++;
      console.log(`  ✅ 更新: ${scene.scene_id} - ${scene.scene_name}`);
    } catch (error) {
      console.error(`  ❌ 更新失败: ${scene.scene_id}`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 更新统计');
  console.log('='.repeat(50));
  console.log(`   更新成功: ${updated}`);
  console.log(`   未找到: ${notFound}`);
  console.log(`   错误: ${errors}`);

  if (errors === 0) {
    console.log('\n✨ 数据库音频URL更新完成！');
  } else {
    console.log(`\n⚠️ 有 ${errors} 个错误`);
    process.exit(1);
  }
}

async function verifyAudioUrls(): Promise<void> {
  console.log('🔍 验证数据库音频URL...\n');
  console.log('='.repeat(60));

  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: DATABASE_URL 环境变量未设置');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  const scenes = await sql`
    SELECT id, name, dialogue, vocabulary 
    FROM scenes 
    WHERE id IN ('daily_001', 'daily_002', 'workplace_031')
    ORDER BY id
  `;

  for (const scene of scenes) {
    console.log(`\n📋 场景: ${scene.id} - ${scene.name}`);
    console.log('-'.repeat(50));

    const dialogue = scene.dialogue as any;
    if (dialogue?.rounds?.[0]?.content?.[0]) {
      const firstContent = dialogue.rounds[0].content[0];
      console.log(`   对话音频URL: ${firstContent.audio_url || '❌ 未设置'}`);
      
      if (firstContent.audio_url) {
        const fullUrl = `${COS_BASE_URL}/${firstContent.audio_url.replace('COS:/', '')}`;
        try {
          const response = await fetch(fullUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log(`   ✅ 音频可访问`);
          } else {
            console.log(`   ❌ HTTP ${response.status}`);
          }
        } catch (e) {
          console.log(`   ❌ 请求失败`);
        }
      }
    }

    const vocabulary = scene.vocabulary as any[];
    if (vocabulary?.[0]) {
      const firstVocab = vocabulary[0];
      console.log(`   词汇音频URL: ${firstVocab.word_audio_url || '❌ 未设置'}`);
      
      if (firstVocab.word_audio_url) {
        const fullUrl = `${COS_BASE_URL}/${firstVocab.word_audio_url.replace('COS:/', '')}`;
        try {
          const response = await fetch(fullUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log(`   ✅ 音频可访问`);
          } else {
            console.log(`   ❌ HTTP ${response.status}`);
          }
        } catch (e) {
          console.log(`   ❌ 请求失败`);
        }
      }
    }
  }

  const statsResult = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN dialogue::text LIKE '%audio_url%' THEN 1 END) as has_dialogue_audio,
      COUNT(CASE WHEN vocabulary::text LIKE '%word_audio_url%' THEN 1 END) as has_vocab_audio
    FROM scenes
  `;

  console.log('\n' + '='.repeat(60));
  console.log('📊 统计信息');
  console.log('='.repeat(60));
  console.log(`   总场景数: ${statsResult[0].total}`);
  console.log(`   有对话音频: ${statsResult[0].has_dialogue_audio}`);
  console.log(`   有词汇音频: ${statsResult[0].has_vocab_audio}`);
  console.log('\n✨ 验证完成！');
}

function printUsage(): void {
  console.log(`
场景数据管理脚本

使用方法:
  npx ts-node prepare/scene/scripts/scene-manager.ts <command>

命令:
  test         测试腾讯云COS音频URL是否可访问
  update-audio 更新JSON文件中的音频URL
  reset        重置数据库场景数据（从JSON文件导入）
  update-db    更新数据库中的音频URL
  verify       验证数据库中的音频URL

示例:
  npx ts-node prepare/scene/scripts/scene-manager.ts test
  npx ts-node prepare/scene/scripts/scene-manager.ts update-audio
  npx ts-node prepare/scene/scripts/scene-manager.ts reset
  npx ts-node prepare/scene/scripts/scene-manager.ts update-db
  npx ts-node prepare/scene/scripts/scene-manager.ts verify
`);
}

async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'test':
      await testAudioUrls();
      break;
    case 'update-audio':
      await updateAudioUrls();
      break;
    case 'reset':
      await resetDatabase();
      break;
    case 'update-db':
      await updateDatabaseAudioUrls();
      break;
    case 'verify':
      await verifyAudioUrls();
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
