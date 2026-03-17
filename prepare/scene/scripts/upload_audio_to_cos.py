#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
清理腾讯云COS上的现有音频文件并上传新的音频文件

功能：
1. 清理 qa/questions/ 和 qa/responses/ 目录下的所有文件
2. 上传本地音频文件到腾讯云COS

使用方法：
python prepare/scene/scripts/upload_audio_to_cos.py
"""

import argparse
import os
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

from dotenv import load_dotenv
env_path = Path(__file__).parent.parent.parent / ".env.local"
load_dotenv(env_path)

try:
    from qcloud_cos import CosConfig
    from qcloud_cos import CosS3Client
except ImportError:
    print("请先安装腾讯云COS SDK: pip install cos-python-sdk-v5")
    sys.exit(1)

COS_SECRET_ID = os.getenv("COS_SECRET_ID")
COS_SECRET_KEY = os.getenv("COS_SECRET_KEY")
COS_REGION = os.getenv("COS_REGION", "ap-guangzhou")
COS_BUCKET = os.getenv("COS_BUCKET", "kouyu-scene-1300762139")

DATA_DIR = Path(__file__).parent.parent / "data"
AUDIO_DIR = DATA_DIR / "audio"
QUESTIONS_DIR = AUDIO_DIR / "questions"
RESPONSES_DIR = AUDIO_DIR / "responses"

MAX_WORKERS = 10

stats = {
    "deleted_questions": 0,
    "deleted_responses": 0,
    "uploaded_questions": 0,
    "uploaded_responses": 0,
    "failed": 0,
    "skipped": 0
}
stats_lock = threading.Lock()


def init_cos_client():
    if not COS_SECRET_ID or not COS_SECRET_KEY:
        print("错误: 请设置 COS_SECRET_ID 和 COS_SECRET_KEY 环境变量")
        sys.exit(1)
    
    config = CosConfig(
        Region=COS_REGION,
        SecretId=COS_SECRET_ID,
        SecretKey=COS_SECRET_KEY,
    )
    return CosS3Client(config)


def delete_cos_files(client, prefix):
    try:
        response = client.list_objects(
            Bucket=COS_BUCKET,
            Prefix=prefix
        )
        
        if 'Contents' in response:
            files_to_delete = [obj['Key'] for obj in response['Contents']]
            if files_to_delete:
                client.delete_objects(
                    Bucket=COS_BUCKET,
                    Objects=[{'Key': key} for key in files_to_delete]
                )
                return len(files_to_delete)
        return 0
    except Exception as e:
        print(f"  删除失败: {e}")
        return 0


def upload_file(client, local_path, cos_key):
    try:
        if not local_path.exists():
            with stats_lock:
                stats["skipped"] += 1
            return False
        
        with open(local_path, 'rb') as f:
            client.put_object(
                Bucket=COS_BUCKET,
                Body=f,
                Key=cos_key,
                EnableMD5=False
            )
        return True
    except Exception as e:
        print(f"  上传失败 {local_path.name}: {e}")
        return False


def process_upload(client, audio_path, cos_prefix):
    cos_key = f"{cos_prefix}{audio_path.name}"
    
    if upload_file(client, audio_path, cos_key):
        if "questions" in cos_prefix:
            with stats_lock:
                stats["uploaded_questions"] += 1
        else:
            with stats_lock:
                stats["uploaded_responses"] += 1
        return True
    return False


def main():
    print("=" * 60)
    print("腾讯云COS音频文件清理与上传")
    print("=" * 60)
    
    client = init_cos_client()
    
    print("\n步骤1: 清理现有音频文件...")
    
    deleted_questions = delete_cos_files(client, "qa/questions/")
    deleted_responses = delete_cos_files(client, "qa/responses/")
    
    print(f"  删除 questions: {deleted_questions} 个文件")
    print(f"  删除 responses: {deleted_responses} 个文件")
    
    print("\n步骤2: 上传新音频文件...")
    
    if not AUDIO_DIR.exists():
        print(f"错误: 音频目录不存在 {AUDIO_DIR}")
        sys.exit(1)
    
    question_files = list(QUESTIONS_DIR.glob("*.mp3")) if QUESTIONS_DIR.exists() else []
    response_files = list(RESPONSES_DIR.glob("*.mp3")) if RESPONSES_DIR.exists() else []
    
    print(f"  问题音频: {len(question_files)} 个")
    print(f"  回答音频: {len(response_files)} 个")
    print(f"  总计: {len(question_files) + len(response_files)} 个")
    
    all_files = []
    for f in question_files:
        all_files.append((f, "qa/questions/"))
    for f in response_files:
        all_files.append((f, "qa/responses/"))
    
    completed = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(process_upload, client, audio_path, cos_prefix): audio_path
            for audio_path, cos_prefix in all_files
        }
        
        for future in as_completed(futures):
            completed += 1
            if completed % 100 == 0 or completed == len(all_files):
                print(f"  进度: {completed}/{len(all_files)} ({completed*100//len(all_files)}%)")
    
    print("\n" + "=" * 60)
    print("上传统计")
    print("=" * 60)
    print(f"   问题音频上传: {stats['uploaded_questions']}")
    print(f"   回答音频上传: {stats['uploaded_responses']}")
    print(f"   跳过: {stats['skipped']}")
    print(f"   失败: {stats['failed']}")
    
    total_uploaded = stats['uploaded_questions'] + stats['uploaded_responses']
    print(f"\n总计上传: {total_uploaded} 个文件")
    
    if total_uploaded == len(all_files):
        print("\n所有音频文件上传成功!")


if __name__ == "__main__":
    main()
