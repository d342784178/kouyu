import { NextResponse } from 'next/server'
import { list } from '@vercel/blob'

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

    // 如果路径已经是完整的 URL（以 http:// 或 https:// 开头）
    // 且不是 vercel blob 的 URL，则直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
      // 如果不是 vercel blob 的 URL，直接返回原 URL
      if (!path.includes('blob.vercel-storage.com')) {
        return NextResponse.json({
          url: path,
          contentType: 'audio/mpeg',
          size: 0,
          uploadedAt: new Date().toISOString(),
        }, { status: 200 })
      }
      
      // 如果是 vercel blob 的完整 URL，直接使用
      const blobUrl = path
      
      return NextResponse.json({
        url: blobUrl,
        contentType: 'audio/wav',
        size: 0,
        uploadedAt: new Date().toISOString(),
      }, { status: 200 })
    }

    // 处理以 / 开头的路径（如 /audio/phrases/xxx.mp3）
    // 去掉开头的 /，得到 blob pathname
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
      console.log('Blob not found:', blobPath)
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
    console.error('Error fetching audio from blob:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audio file' },
      { status: 500 }
    )
  }
}
