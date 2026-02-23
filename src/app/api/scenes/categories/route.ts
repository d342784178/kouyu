import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    const result = await neonSql`
      SELECT category, COUNT(*) as count
      FROM scenes 
      GROUP BY category
      ORDER BY category
    `
    
    const categories = result.map((row: { category: string; count: string }) => row.category)
    const categoryCounts: Record<string, number> = {}
    result.forEach((row: { category: string; count: string }) => {
      categoryCounts[row.category] = parseInt(row.count, 10)
    })
    
    return NextResponse.json({
      categories,
      categoryCounts
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
