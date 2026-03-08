import { NextResponse } from 'next/server'

// 禁用静态生成，强制动态渲染
export const dynamic = 'force-dynamic'

// 腾讯云 COS 配置
const COS_BASE_URL = process.env.COS_BASE_URL || process.env.NEXT_PUBLIC_COS_BASE_URL || ''

/**
 * 解析音频路径，获取真实的音频URL
 * - COS:/path/to/audio.mp3 -> 腾讯云 COS
 * - http://... 或 https://... -> 直接返回
 */
function resolveAudioUrl(path: string): string | null {
  // 处理 COS: 或 COS:/ 协议头 (腾讯云 COS)
  if (path.startsWith('COS:')) {
    const cosPath = path.slice(4) // 去掉 'COS:' 前缀
    // 去掉可能的前导斜杠，避免双斜杠
    const normalizedPath = cosPath.startsWith('/') ? cosPath.slice(1) : cosPath
    if (COS_BASE_URL) {
      return `${COS_BASE_URL}/${normalizedPath}`
    }
    console.error('COS_BASE_URL not configured')
    return null
  }

  // 如果路径已经是完整的 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

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

    console.log('[Audio Proxy] Request path:', path)

    // 解析音频URL
    const audioUrl = resolveAudioUrl(path)

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Invalid audio path or storage not configured', path },
        { status: 400 }
      )
    }

    console.log('[Audio Proxy] Resolved URL:', audioUrl)

    // 从源站获取音频文件
    const response = await fetch(audioUrl, {
      method: 'GET',
      headers: {
        // 转发一些常用的请求头
        'Accept': 'audio/*,*/*',
      },
    })

    if (!response.ok) {
      console.error('[Audio Proxy] Failed to fetch audio:', response.status, response.statusText)
      
      // 根据状态码返回不同的错误信息
      if (response.status === 404) {
        return NextResponse.json(
          { error: '音频不存在', code: 'AUDIO_NOT_FOUND', path },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: '获取音频失败', code: 'AUDIO_FETCH_ERROR', status: response.status },
        { status: 502 }
      )
    }

    // 获取响应内容类型
    const contentType = response.headers.get('content-type') || 'audio/mpeg'
    const contentLength = response.headers.get('content-length')

    // 获取响应体作为流
    const body = response.body

    if (!body) {
      return NextResponse.json(
        { error: 'Empty response from source' },
        { status: 502 }
      )
    }

    // 构建响应头
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=3600') // 1小时缓存
    headers.set('Access-Control-Allow-Origin', '*')

    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    // 返回流式响应
    return new NextResponse(body, {
      status: 200,
      headers,
    })

  } catch (error) {
    console.error('[Audio Proxy] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
