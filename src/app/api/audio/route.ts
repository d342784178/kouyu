import { NextResponse } from 'next/server'
import { list } from '@vercel/blob'

// 腾讯云 COS 配置
const COS_BASE_URL = process.env.COS_BASE_URL || ''

// 缓存 blob 列表
let blobCache: Map<string, string> | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

async function getBlobUrl(pathname: string): Promise<string | null> {
  // 检查缓存
  if (blobCache && Date.now() - cacheTime < CACHE_TTL) {
    return blobCache.get(pathname) || null
  }
  
  // 重新加载缓存
  const { blobs } = await list()
  blobCache = new Map()
  blobs.forEach(blob => {
    blobCache!.set(blob.pathname, blob.url)
  })
  cacheTime = Date.now()
  
  return blobCache.get(pathname) || null
}

/**
 * 解析音频路径，支持多种存储方式
 * - COS:path/to/audio.mp3 -> 腾讯云 COS
 * - http://... 或 https://... -> 直接返回
 * - /audio/... -> Vercel Blob
 */
function resolveAudioUrl(path: string): string | null {
  // 1. 处理 COS: 协议头 (腾讯云 COS)
  if (path.startsWith('COS:')) {
    const cosPath = path.slice(4) // 去掉 'COS:' 前缀
    if (COS_BASE_URL) {
      // 确保路径以 / 开头
      const normalizedPath = cosPath.startsWith('/') ? cosPath : `/${cosPath}`
      return `${COS_BASE_URL}${normalizedPath}`
    }
    console.error('COS_BASE_URL not configured')
    return null
  }
  
  // 2. 如果路径已经是完整的 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // 3. 其他情况返回 null，让后续逻辑处理（Vercel Blob 等）
  return null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      )
    }

    console.log('Audio request path:', path)

    // 尝试解析音频 URL（支持 COS: 协议头等）
    const resolvedUrl = resolveAudioUrl(path)
    
    if (resolvedUrl) {
      console.log('Resolved audio URL:', resolvedUrl)
      return NextResponse.json({
        url: resolvedUrl,
        contentType: 'audio/mpeg',
        size: 0,
        uploadedAt: new Date().toISOString(),
      }, { status: 200 })
    }

    // 处理以 / 开头的路径（如 /audio/phrases/xxx.mp3）- Vercel Blob
    const blobPath = path.startsWith('/') ? path.slice(1) : path
    
    console.log('Looking for blob:', blobPath)
    
    // 从缓存中获取 blob URL
    let blobUrl = await getBlobUrl(blobPath)
    
    // 如果没找到，尝试替换扩展名（.mp3 -> .wav）
    if (!blobUrl && blobPath.endsWith('.mp3')) {
      const wavPath = blobPath.replace('.mp3', '.wav')
      console.log('Trying with .wav extension:', wavPath)
      blobUrl = await getBlobUrl(wavPath)
    }
    
    // 如果没找到，尝试替换扩展名（.wav -> .mp3）
    if (!blobUrl && blobPath.endsWith('.wav')) {
      const mp3Path = blobPath.replace('.wav', '.mp3')
      console.log('Trying with .mp3 extension:', mp3Path)
      blobUrl = await getBlobUrl(mp3Path)
    }
    
    if (!blobUrl) {
      console.log('Audio not found:', blobPath)
      return NextResponse.json(
        { error: 'Audio file not found', path: blobPath },
        { status: 404 }
      )
    }
    
    console.log('Found blob URL:', blobUrl)

    return NextResponse.json({
      url: blobUrl,
      contentType: 'audio/wav',
      size: 0,
      uploadedAt: new Date().toISOString(),
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching audio:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audio file' },
      { status: 500 }
    )
  }
}
