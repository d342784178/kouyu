#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
备份历史音频文件
将现有音频文件移动到备份文件夹

使用方法:
python prepare/scene/scripts/backup_audio.py
"""

import os
import shutil
from pathlib import Path
from datetime import datetime

AUDIO_DIR = Path(__file__).parent.parent / "data" / "audio"
BACKUP_DIR_NAME = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

def backup_audio():
    print("📦 开始备份历史音频文件...\n")
    print("=" * 50)
    
    if not AUDIO_DIR.exists():
        print(f"⚠️  音频目录不存在: {AUDIO_DIR}")
        return None
    
    subdirs = ["dialogues", "vocabulary"]
    backup_path = AUDIO_DIR / BACKUP_DIR_NAME
    
    moved_count = 0
    
    for subdir in subdirs:
        subdir_path = AUDIO_DIR / subdir
        if subdir_path.exists() and subdir_path.is_dir():
            files = list(subdir_path.glob("*.mp3"))
            if files:
                backup_subdir = backup_path / subdir
                backup_subdir.mkdir(parents=True, exist_ok=True)
                
                for file in files:
                    dest = backup_subdir / file.name
                    shutil.move(str(file), str(dest))
                    moved_count += 1
                    print(f"  📁 移动: {file.name} -> backup/{subdir}/")
                
                shutil.rmtree(subdir_path)
                print(f"  ✅ 已备份 {len(files)} 个文件到 backup/{subdir}/")
            else:
                print(f"  ⏭️  {subdir} 目录为空，跳过")
                shutil.rmtree(subdir_path)
        else:
            print(f"  ⏭️  {subdir} 目录不存在，跳过")
    
    if moved_count > 0:
        print(f"\n✅ 备份完成！共移动 {moved_count} 个文件")
        print(f"   备份位置: {backup_path}")
    else:
        print("\n⚠️  没有需要备份的文件")
        if backup_path.exists():
            shutil.rmtree(backup_path)
    
    return backup_path if moved_count > 0 else None


if __name__ == "__main__":
    backup_audio()
