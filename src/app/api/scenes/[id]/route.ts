/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// 禁用 Next.js 数据缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: { id: string }
  }
) {
  const { id } = params

  try {
    // 使用 neon 客户端执行原始 SQL 查询
    const neonSql = neon(process.env.DATABASE_URL || '')
    const result = await neonSql`SELECT * FROM scenes WHERE id = ${id}`
    const sceneData = result[0]
    
    if (!sceneData) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }
    
    // 解析 JSONB 字段（如果是字符串）
    let dialogue = sceneData.dialogue
    let vocabulary = sceneData.vocabulary
    let tags = sceneData.tags
    
    if (typeof dialogue === 'string') {
      dialogue = JSON.parse(dialogue)
    }
    if (typeof vocabulary === 'string') {
      vocabulary = JSON.parse(vocabulary)
    }
    if (typeof tags === 'string') {
      tags = JSON.parse(tags)
    }
    
    // 新格式：dialogue 已经是扁平数组，直接返回
    // 确保 vocabulary 使用统一的字段名
    const normalizedVocabulary = (vocabulary || []).map((vocab: any) => ({
      vocab_id: vocab.vocab_id || '',
      type: vocab.type || 'word',
      content: vocab.content || '',
      phonetic: vocab.phonetic || '',
      translation: vocab.translation || '',
      audio_url: vocab.audio_url || '',
      example: vocab.example || '',
      example_translation: vocab.example_translation || '',
      example_audio_url: vocab.example_audio_url || '',
      round_number: vocab.round_number || 1,
      difficulty: vocab.difficulty || 'easy'
    }))
    
    // 构建响应数据
    const scene = {
      id: sceneData.id,
      name: sceneData.name,
      category: sceneData.category,  // 中文：日常/职场/留学/旅行/社交
      description: sceneData.description,
      difficulty: sceneData.difficulty,  // 中文：初级/中级/高级
      duration: sceneData.duration,  // 动态计算的学习时长
      tags: tags || [],
      dialogue: dialogue || [],  // 新格式：扁平数组
      vocabulary: normalizedVocabulary,
      createdAt: sceneData.created_at,
      updatedAt: sceneData.updated_at
    }
    
    return NextResponse.json(scene, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Error in GET /api/scenes/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
