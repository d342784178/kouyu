import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSceneById, getSceneMetadata } from '@/lib/db/scenes'
import SceneDetailClient from './components/SceneDetailClient'

// 禁用缓存，确保每次请求都获取最新数据
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 生成页面元数据（SEO优化）
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const metadata = await getSceneMetadata(id)
  
  if (!metadata) {
    return {
      title: '场景未找到 - 语习集',
      description: '抱歉，您访问的场景不存在或已被删除。',
    }
  }
  
  const title = `${metadata.title} - ${metadata.category}英语口语学习 - 语习集`
  const description = `${metadata.description} 难度：${metadata.difficulty}。通过语习集AI驱动的英语口语学习平台，掌握实用的${metadata.category}场景对话。`
  const keywords = [...metadata.tags, '英语口语', metadata.category, metadata.difficulty, '场景学习', 'AI英语学习']
  
  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: 'article',
      locale: 'zh_CN',
      siteName: '语习集',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/scene-detail/${id}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

// 场景详情页（服务端渲染）
export default async function SceneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // 服务端获取场景数据
  const scene = await getSceneById(id)
  
  // 场景不存在时返回404
  if (!scene) {
    notFound()
  }
  
  // 将服务端获取的数据传递给客户端组件
  return <SceneDetailClient scene={scene} />
}
