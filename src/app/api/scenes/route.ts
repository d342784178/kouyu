/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const neonSql = neon(process.env.DATABASE_URL || '')
    
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)))
    const offset = (page - 1) * pageSize
    
    let totalCount = 0
    try {
      const countResult = await neonSql`SELECT COUNT(*) as count FROM scenes`
      totalCount = parseInt(countResult[0]?.count || '0', 10)
    } catch (error) {
      console.error('Error fetching scenes count:', error)
      return NextResponse.json({ error: 'Failed to fetch count' }, { status: 500 })
    }
    
    let rawScenes
    try {
      rawScenes = await neonSql`
        SELECT * FROM scenes 
        ORDER BY category, name 
        LIMIT ${pageSize} OFFSET ${offset}
      `
    } catch (error) {
      console.error('Error fetching scenes from database:', error)
      return NextResponse.json({ error: 'Failed to fetch scenes' }, { status: 500 })
    }
    
    const scenes = rawScenes.map((scene: any) => ({
      id: scene.id,
      name: scene.name,
      category: scene.category,
      description: scene.description,
      difficulty: scene.difficulty,
      duration: scene.duration,
      tags: scene.tags,
      dialogue: scene.dialogue,
      vocabulary: scene.vocabulary,
      createdAt: scene.created_at,
      updatedAt: scene.updated_at
    }))
    
    const totalPages = Math.ceil(totalCount / pageSize)
    
    return NextResponse.json({
      data: scenes,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages
      }
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Error fetching scenes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
