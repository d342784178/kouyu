import { sql, relations } from 'drizzle-orm'
import { integer, text, pgTable, serial, primaryKey } from 'drizzle-orm/pg-core'

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



// 导出类型
export type Phrase = typeof phrases.$inferSelect
export type NewPhrase = typeof phrases.$inferInsert
export type PhraseExample = typeof phraseExamples.$inferSelect
export type NewPhraseExample = typeof phraseExamples.$inferInsert