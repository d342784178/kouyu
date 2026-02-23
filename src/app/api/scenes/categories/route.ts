import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    const result = await neonSql`
      SELECT DISTINCT category 
      FROM scenes 
      ORDER BY category
    `
    
    const categories = result.map((row: { category: string }) => row.category)
    
    return NextResponse.json({
      categories
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
