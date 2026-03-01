import { sql } from 'drizzle-orm'
import { text, pgTable, serial, integer, jsonb } from 'drizzle-orm/pg-core'

// 短语表
export const phrases = pgTable('phrases', {
  id: text('id').primaryKey(),
  english: text('english').notNull(),
  chinese: text('chinese').notNull(),
  partOfSpeech: text('part_of_speech').notNull(),
  scene: text('scene').notNull(),
  difficulty: text('difficulty').notNull(),
  pronunciationTips: text('pronunciation_tips').notNull(),
  audioUrl: text('audio_url'), // 语音链接字段
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
})


// 短语示例表
export const phraseExamples = pgTable('phrase_examples', {
  id: serial('id').primaryKey(),
  phraseId: text('phrase_id').notNull().references(() => phrases.id),
  title: text('title').notNull(),
  desc: text('desc').notNull(),
  english: text('english').notNull(),
  chinese: text('chinese').notNull(),
  usage: text('usage').notNull(),
  audioUrl: text('audio_url'), // 语音链接字段
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
})


// 场景表（包含解析/对话/高频词汇）
export const scenes = pgTable('scenes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  difficulty: text('difficulty').notNull(),
  duration: integer('duration').default(10), // 学习时长（分钟）
  tags: jsonb('tags'), // 关键词标签
  dialogue: jsonb('dialogue'), // 对话内容
  vocabulary: jsonb('vocabulary'), // 高频单词/短语
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
})


// 场景测试表（通过场景详情id关联到场景详情表）
export const sceneTests = pgTable('scene_tests', {
  id: text('id').primaryKey(),
  sceneId: text('scene_id').notNull().references(() => scenes.id),
  type: text('type').notNull(), // 测试类型（choice/qa/open_dialogue）
  order: integer('order').notNull(), // 题目顺序
  content: jsonb('content').notNull(), // 题目内容
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
})


// 导出类型
export type Phrase = typeof phrases.$inferSelect
export type NewPhrase = typeof phrases.$inferInsert
export type PhraseExample = typeof phraseExamples.$inferSelect
export type NewPhraseExample = typeof phraseExamples.$inferInsert
export type Scene = typeof scenes.$inferSelect
export type NewScene = typeof scenes.$inferInsert
export type SceneTest = typeof sceneTests.$inferSelect
export type NewSceneTest = typeof sceneTests.$inferInsert


// 子场景表（新增）
export const subScenes = pgTable('sub_scenes', {
  id: text('id').primaryKey(),                                    // 格式: {scene_id}_sub_{n}
  sceneId: text('scene_id').notNull().references(() => scenes.id),
  name: text('name').notNull(),                                   // 子场景名称，如"托运行李"
  description: text('description').notNull(),
  order: integer('order').notNull(),                              // 在场景中的排序（1-based）
  estimatedMinutes: integer('estimated_minutes').default(5),      // 预计学习时长（分钟）
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})


// 问答对表（新增）
export const qaPairs = pgTable('qa_pairs', {
  id: text('id').primaryKey(),                                    // 格式: {sub_scene_id}_qa_{n}
  subSceneId: text('sub_scene_id').notNull().references(() => subScenes.id),
  speakerText: text('speaker_text').notNull(),                    // 对方说的话（英文）
  speakerTextCn: text('speaker_text_cn').notNull(),               // 对方说的话（中文）
  responses: jsonb('responses').notNull(),                        // QAResponse[]
  usageNote: text('usage_note'),                                  // 使用说明
  audioUrl: text('audio_url'),                                    // speaker_text 的真人音频（COS:/...）
  qaType: text('qa_type').notNull(),                              // 'listen_only' | 'must_speak'
  order: integer('order').notNull(),                              // 在子场景中的排序（1-based）
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})


// 导出新增类型
export type SubScene = typeof subScenes.$inferSelect
export type NewSubScene = typeof subScenes.$inferInsert
export type QAPair = typeof qaPairs.$inferSelect
export type NewQAPair = typeof qaPairs.$inferInsert
