import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// 获取数据库连接字符串
const sql = neon(process.env.DATABASE_URL || '')

// 创建数据库客户端
export const db = drizzle(sql, { schema })

// 导出 schema
export * from './schema'