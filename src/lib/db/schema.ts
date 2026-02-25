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