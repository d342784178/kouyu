/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import fs from 'fs'
import path from 'path'

// 禁用 Next.js 数据缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 从文件中读取场景数据
function getSceneDataFromFile(id: string) {
  try {
    // 读取场景数据文件
    const scenesDataPath = path.join(process.cwd(), 'prepare', 'scene', 'data', 'final_100_scenes.json')
    const scenesData = JSON.parse(fs.readFileSync(scenesDataPath, 'utf-8'))
    
    // 查找匹配的场景
    const scene = scenesData.find((s: any) => s.scene_id === id)
    
    if (scene) {
      // 转换为API响应格式
      return {
        id: scene.scene_id,
        name: scene.scene_name,
        category: scene.category,
        description: scene.description,
        difficulty: scene.difficulty,
        duration: 10, // 默认值
        tags: scene.tags,
        dialogue: {
          dialogue_id: `dlg_${scene.scene_id}`,
          scene_id: scene.scene_id,
          full_audio_url: `https://cdn.example.com/audio/${scene.scene_id}_full.mp3`,
          duration: 30, // 默认值
          rounds: scene.dialogue.rounds.map((round: any) => ({
            round_number: round.round_number,
            content: round.content.map((speech: any) => ({
              index: speech.index,
              speaker: speech.speaker,
              speaker_name: speech.speaker_name,
              text: speech.text,
              translation: speech.translation,
              audio_url: speech.audio_url || `https://cdn.example.com/audio/${scene.scene_id}_r${round.round_number}_${speech.index}.mp3`,
              is_key_qa: speech.is_key_qa
            })),
            analysis: round.analysis
          }))
        },
        vocabulary: scene.vocabulary.map((vocab: any) => ({
          vocab_id: `vocab_${scene.scene_id}_${vocab.content.toLowerCase().replace(/\s+/g, '_')}`,
          scene_id: scene.scene_id,
          type: vocab.type,
          content: vocab.content,
          phonetic: vocab.phonetic,
          translation: vocab.translation,
          example_sentence: vocab.example_sentence,
          example_translation: vocab.example_translation,
          audio_url: vocab.audio_url || `https://cdn.example.com/audio/vocab_${vocab.content.toLowerCase().replace(/\s+/g, '_')}.mp3`,
          round_number: vocab.round_number
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
    
    return null
  } catch (error) {
    console.error('Error reading scene data from file:', error)
    return null
  }
}

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
    // 首先尝试从数据库获取
    try {
      // 使用 neon 客户端执行原始 SQL 查询
      const neonSql = neon(process.env.DATABASE_URL || '')
      const result = await neonSql`SELECT * FROM scenes WHERE id = ${id}`
      const sceneData = result[0]
      
      if (sceneData) {
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
        
        // 转换数据库格式为API响应格式
        const scene = {
          id: sceneData.id,
          name: sceneData.name,
          category: sceneData.category,
          description: sceneData.description,
          difficulty: sceneData.difficulty,
          duration: sceneData.duration,
          tags: tags,
          dialogue: dialogue,
          vocabulary: vocabulary,
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
      }
    } catch (error) {
      console.error('Error fetching scene from database:', error)
    }
    
    // 如果数据库中没有找到，尝试从文件中读取场景数据
    const sceneFromFile = getSceneDataFromFile(id)
    if (sceneFromFile) {
      return NextResponse.json(sceneFromFile, { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      })
    }
    
    // 如果都没有找到，返回 404
    return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
  } catch (error) {
    console.error('Error in GET /api/scenes/[id]:', error)
    // 服务器错误，返回 500
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
