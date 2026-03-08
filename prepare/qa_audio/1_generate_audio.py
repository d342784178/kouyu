#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为问答对生成音频文件

功能：
1. 从数据库获取问答对
2. 使用 edge-tts 为问题和答案生成音频
3. 保存到本地目录

使用方法:
  # 生成所有问答对的音频
  python prepare/qa_audio/1_generate_audio.py
  
  # 只生成指定场景的音频
  python prepare/qa_audio/1_generate_audio.py --scenes daily_002 travel_055
  
  # 强制重新生成（覆盖已有文件）
  python prepare/qa_audio/1_generate_audio.py --force
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

# 加载环境变量
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(env_path)

import edge_tts
import psycopg2
from psycopg2.extras import RealDictCursor

# ============================================================
# 配置
# ============================================================

# 输出目录
OUTPUT_DIR = Path(__file__).parent / "audio"
QUESTIONS_DIR = OUTPUT_DIR / "questions"
RESPONSES_DIR = OUTPUT_DIR / "responses"

# 音色配置
QUESTION_VOICE = "en-US-AriaNeural"
ANSWER_VOICES = ["en-US-JennyNeural", "en-GB-SoniaNeural", "en-US-DavisNeural"]

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "")

# ============================================================
# 数据库操作
# ============================================================

def fetch_qa_pairs(scene_ids: List[str] = None) -> List[Dict[str, Any]]:
    """从数据库获取问答对"""
    if not DATABASE_URL:
        print("❌ 错误: 请设置 DATABASE_URL 环境变量")
        sys.exit(1)
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if scene_ids:
        placeholders = ','.join(['%s'] * len(scene_ids))
        cursor.execute(f"""
            SELECT 
                qp.id, 
                qp.sub_scene_id, 
                qp.speaker_text, 
                qp.speaker_text_cn,
                qp.responses,
                qp.audio_url,
                qp.qa_type,
                ss.scene_id
            FROM qa_pairs qp
            JOIN sub_scenes ss ON qp.sub_scene_id = ss.id
            WHERE ss.scene_id IN ({placeholders})
            ORDER BY ss.scene_id, qp."order"
        """, scene_ids)
    else:
        cursor.execute("""
            SELECT 
                id, 
                sub_scene_id, 
                speaker_text, 
                speaker_text_cn,
                responses,
                audio_url,
                qa_type
            FROM qa_pairs
            ORDER BY sub_scene_id, "order"
        """)
    
    qa_pairs = [dict(row) for row in cursor.fetchall()]
    cursor.close()
    conn.close()
    
    return qa_pairs

# ============================================================
# 音频生成
# ============================================================

async def generate_audio(text: str, output_path: Path, voice: str, max_retries: int = 3) -> bool:
    """使用edge-tts生成音频文件"""
    for attempt in range(max_retries):
        try:
            communicate = edge_tts.Communicate(text, voice, rate="+20%")
            await communicate.save(str(output_path))
            
            if output_path.exists() and output_path.stat().st_size > 1024:
                return True
            else:
                print(f"  ⚠️ 生成的文件太小或为空")
                if output_path.exists():
                    output_path.unlink()
                
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"  ❌ 生成失败: {e}")
                return False
            else:
                wait_time = (attempt + 1) * 2
                print(f"  ⚠️ 重试 {attempt + 1}/{max_retries}，等待{wait_time}s")
                await asyncio.sleep(wait_time)
    
    return False

# ============================================================
# 主处理逻辑
# ============================================================

async def process_qa_pair(qa: Dict[str, Any], stats: Dict[str, int], force: bool = False) -> None:
    """处理单个问答对"""
    qa_id = qa["id"]
    speaker_text = qa["speaker_text"]
    responses = qa["responses"] or []
    
    print(f"\n📝 处理问答对: {qa_id}")
    print(f"   问题: {speaker_text[:50]}...")
    
    # 1. 生成问题音频
    question_audio_path = QUESTIONS_DIR / f"{qa_id}.mp3"
    
    should_generate = force or not question_audio_path.exists() or question_audio_path.stat().st_size <= 1024
    
    if should_generate:
        print(f"  🎙️ 生成问题音频...")
        if await generate_audio(speaker_text, question_audio_path, QUESTION_VOICE):
            stats["questions_success"] += 1
            print(f"  ✅ 问题音频完成: {question_audio_path.name}")
        else:
            stats["questions_failed"] += 1
    else:
        print(f"  ⏭️ 问题音频已存在: {question_audio_path.name}")
        stats["questions_skipped"] += 1
    
    # 2. 生成答案音频
    for idx, response in enumerate(responses):
        response_text = response.get("text", "")
        if not response_text:
            continue
        
        response_audio_path = RESPONSES_DIR / f"{qa_id}_response{idx}.mp3"
        
        should_generate = force or not response_audio_path.exists() or response_audio_path.stat().st_size <= 1024
        
        if should_generate:
            answer_voice = ANSWER_VOICES[idx % len(ANSWER_VOICES)]
            print(f"  🎙️ 生成答案 {idx + 1} 音频...")
            if await generate_audio(response_text, response_audio_path, answer_voice):
                stats["responses_success"] += 1
                print(f"  ✅ 答案音频完成: {response_audio_path.name}")
            else:
                stats["responses_failed"] += 1
        else:
            stats["responses_skipped"] += 1

async def main():
    parser = argparse.ArgumentParser(description='为问答对生成音频文件')
    parser.add_argument('--scenes', nargs='+', help='指定场景ID列表（可选，不传则处理所有）')
    parser.add_argument('--force', action='store_true', help='强制重新生成（覆盖已有文件）')
    args = parser.parse_args()
    
    print("🎵 问答对音频生成工具")
    print("=" * 60)
    if args.scenes:
        print(f"目标场景: {', '.join(args.scenes)}")
    if args.force:
        print("模式: 强制重新生成")
    
    # 创建输出目录
    QUESTIONS_DIR.mkdir(parents=True, exist_ok=True)
    RESPONSES_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\n📁 输出目录:")
    print(f"   问题: {QUESTIONS_DIR}")
    print(f"   答案: {RESPONSES_DIR}")
    
    # 获取问答对数据
    print("\n📖 从数据库获取问答对数据...")
    qa_pairs = fetch_qa_pairs(args.scenes)
    print(f"   ✅ 获取到 {len(qa_pairs)} 个问答对")
    
    # 统计信息
    stats = {
        "questions_success": 0,
        "questions_failed": 0,
        "questions_skipped": 0,
        "responses_success": 0,
        "responses_failed": 0,
        "responses_skipped": 0,
    }
    
    # 处理每个问答对
    print("\n" + "=" * 60)
    print("🚀 开始生成音频...")
    print("=" * 60)
    
    for qa in qa_pairs:
        await process_qa_pair(qa, stats, args.force)
    
    # 打印统计信息
    print("\n" + "=" * 60)
    print("📊 生成统计")
    print("=" * 60)
    print(f"   问题音频:")
    print(f"      成功: {stats['questions_success']}")
    print(f"      失败: {stats['questions_failed']}")
    print(f"      跳过: {stats['questions_skipped']}")
    print(f"   答案音频:")
    print(f"      成功: {stats['responses_success']}")
    print(f"      失败: {stats['responses_failed']}")
    print(f"      跳过: {stats['responses_skipped']}")
    
    print(f"\n📁 音频文件保存在: {OUTPUT_DIR}")
    print(f"   下一步: 运行 python prepare/qa_audio/2_upload_to_cos.py 上传到COS")

if __name__ == "__main__":
    asyncio.run(main())
