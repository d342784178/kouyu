#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将问答对音频上传到腾讯云COS（仅上传，不更新数据库）

功能：
1. 扫描本地音频文件
2. 并发上传到腾讯云COS

使用方法:
python prepare/qa_audio/2_upload_to_cos.py
python prepare/qa_audio/2_upload_to_cos.py --scenes daily_002 travel_055
"""

import argparse
import os
import sys
from pathlib import Path
from typing import List
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# 加载环境变量
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(env_path)

# 腾讯云COS SDK
try:
    from qcloud_cos import CosConfig
    from qcloud_cos import CosS3Client
except ImportError:
    print("请先安装腾讯云COS SDK: pip install cos-python-sdk-v5")
    sys.exit(1)

import psycopg2
from psycopg2.extras import RealDictCursor

# ============================================================
# 配置
# ============================================================

# 音频目录
AUDIO_DIR = Path(__file__).parent / "audio"
QUESTIONS_DIR = AUDIO_DIR / "questions"
RESPONSES_DIR = AUDIO_DIR / "responses"

# COS 配置
COS_SECRET_ID = os.getenv("COS_SECRET_ID", "")
COS_SECRET_KEY = os.getenv("COS_SECRET_KEY", "")
COS_REGION = os.getenv("COS_REGION", "ap-guangzhou")
COS_BUCKET = "kouyu-scene-1300762139"

# 数据库配置
DATABASE_URL = os.getenv("DATABASE_URL", "")

# 并发数
MAX_WORKERS = 20

# 统计信息（线程安全）
stats_lock = threading.Lock()
stats = {
    "questions_uploaded": 0,
    "questions_skipped": 0,
    "questions_failed": 0,
    "responses_uploaded": 0,
    "responses_skipped": 0,
    "responses_failed": 0,
}

# ============================================================
# COS 客户端
# ============================================================

def init_cos_client() -> CosS3Client:
    """初始化腾讯云COS客户端"""
    if not COS_SECRET_ID or not COS_SECRET_KEY:
        print("❌ 错误: 请设置 COS_SECRET_ID 和 COS_SECRET_KEY 环境变量")
        sys.exit(1)
    
    config = CosConfig(
        Region=COS_REGION,
        SecretId=COS_SECRET_ID,
        SecretKey=COS_SECRET_KEY,
    )
    return CosS3Client(config)

# ============================================================
# 数据库操作
# ============================================================

def get_db_connection():
    """获取数据库连接"""
    if not DATABASE_URL:
        print("❌ 错误: 请设置 DATABASE_URL 环境变量")
        sys.exit(1)
    return psycopg2.connect(DATABASE_URL)

def fetch_qa_pairs(scene_ids: List[str] = None) -> List[dict]:
    """从数据库获取问答对"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if scene_ids:
        placeholders = ','.join(['%s'] * len(scene_ids))
        cursor.execute(f"""
            SELECT qp.id, qp.responses, ss.scene_id
            FROM qa_pairs qp
            JOIN sub_scenes ss ON qp.sub_scene_id = ss.id
            WHERE ss.scene_id IN ({placeholders})
            ORDER BY ss.scene_id, qp."order"
        """, scene_ids)
    else:
        cursor.execute("""
            SELECT id, responses
            FROM qa_pairs
            ORDER BY sub_scene_id, "order"
        """)
    
    qa_pairs = [dict(row) for row in cursor.fetchall()]
    cursor.close()
    conn.close()
    
    return qa_pairs

# ============================================================
# COS 上传
# ============================================================

def upload_to_cos(client: CosS3Client, local_path: Path, cos_path: str) -> bool:
    """上传文件到腾讯云COS"""
    try:
        with open(local_path, 'rb') as fp:
            client.put_object(
                Bucket=COS_BUCKET,
                Body=fp,
                Key=cos_path,
                EnableMD5=False
            )
        return True
    except Exception as e:
        with stats_lock:
            print(f"  ❌ 上传失败 {local_path.name}: {e}")
        return False

# ============================================================
# 处理单个问答对
# ============================================================

def process_qa_pair(client: CosS3Client, qa: dict):
    """处理单个问答对，上传音频到COS"""
    qa_id = qa["id"]
    responses = qa["responses"] or []
    
    # 1. 上传问题音频
    question_audio_path = QUESTIONS_DIR / f"{qa_id}.mp3"
    
    if question_audio_path.exists() and question_audio_path.stat().st_size > 1024:
        cos_path = f"qa/questions/{qa_id}.mp3"
        
        if upload_to_cos(client, question_audio_path, cos_path):
            with stats_lock:
                stats["questions_uploaded"] += 1
        else:
            with stats_lock:
                stats["questions_failed"] += 1
    else:
        with stats_lock:
            stats["questions_skipped"] += 1
    
    # 2. 上传答案音频
    for idx, response in enumerate(responses):
        response_audio_path = RESPONSES_DIR / f"{qa_id}_response{idx}.mp3"
        
        if response_audio_path.exists() and response_audio_path.stat().st_size > 1024:
            cos_path = f"qa/responses/{qa_id}_response{idx}.mp3"
            
            if upload_to_cos(client, response_audio_path, cos_path):
                with stats_lock:
                    stats["responses_uploaded"] += 1
            else:
                with stats_lock:
                    stats["responses_failed"] += 1
        else:
            with stats_lock:
                stats["responses_skipped"] += 1

# ============================================================
# 主函数
# ============================================================

def main():
    parser = argparse.ArgumentParser(description='上传音频到COS（不更新数据库）')
    parser.add_argument('--scenes', nargs='+', help='指定场景ID列表（可选）')
    args = parser.parse_args()
    
    print("☁️ 问答对音频上传工具")
    print("=" * 60)
    if args.scenes:
        print(f"目标场景: {', '.join(args.scenes)}")
    
    # 检查音频目录
    if not AUDIO_DIR.exists():
        print(f"❌ 错误: 音频目录不存在: {AUDIO_DIR}")
        print("   请先运行: python prepare/qa_audio/1_generate_audio.py")
        sys.exit(1)
    
    # 初始化COS客户端
    print("\n☁️ 初始化腾讯云COS客户端...")
    client = init_cos_client()
    print("   ✅ COS客户端初始化成功")
    
    # 获取问答对数据
    print("\n📖 从数据库获取问答对数据...")
    qa_pairs = fetch_qa_pairs(args.scenes)
    print(f"   ✅ 获取到 {len(qa_pairs)} 个问答对")
    
    # 并发处理
    print(f"\n🚀 开始并发上传音频（并发数: {MAX_WORKERS}）...")
    print("=" * 60)
    
    completed = 0
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(process_qa_pair, client, qa): qa["id"] 
            for qa in qa_pairs
        }
        
        for future in as_completed(futures):
            qa_id = futures[future]
            try:
                future.result()
                completed += 1
                if completed % 50 == 0 or completed == len(qa_pairs):
                    print(f"  📊 进度: {completed}/{len(qa_pairs)} ({completed*100//len(qa_pairs)}%)")
            except Exception as e:
                print(f"  ❌ 处理失败 {qa_id}: {e}")
    
    # 打印统计信息
    print("\n" + "=" * 60)
    print("📊 上传统计")
    print("=" * 60)
    print(f"   问题音频:")
    print(f"      上传: {stats['questions_uploaded']}")
    print(f"      跳过: {stats['questions_skipped']}")
    print(f"      失败: {stats['questions_failed']}")
    print(f"   答案音频:")
    print(f"      上传: {stats['responses_uploaded']}")
    print(f"      跳过: {stats['responses_skipped']}")
    print(f"      失败: {stats['responses_failed']}")
    
    if stats["questions_failed"] > 0 or stats["responses_failed"] > 0:
        print("\n⚠️ 部分上传失败，请检查日志")
        sys.exit(1)
    else:
        print("\n✨ 所有音频上传完成！")

if __name__ == "__main__":
    main()
