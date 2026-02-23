#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用 edge-tts 为场景数据生成音频文件
1. 读取 scenes_100.json
2. 为对话内容生成音频
3. 为词汇内容生成音频

使用方法:
python prepare/scene/scripts/generate_scene_audio.py
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any
import edge_tts

# 角色音色配置
# speaker1 使用女声，speaker2 使用男声
VOICE_CONFIG = {
    "speaker1": "en-US-AriaNeural",      # 女声 - 主角/用户角色
    "speaker2": "en-US-GuyNeural",       # 男声 - 配角/系统角色
    "default": "en-US-AriaNeural",       # 默认女声
}

DATA_DIR = Path(__file__).parent.parent / "data"
JSON_FILE = DATA_DIR / "scenes_final.json"
AUDIO_DIR = DATA_DIR / "audio"

DIALOGUES_DIR = AUDIO_DIR / "dialogues"
VOCABULARY_DIR = AUDIO_DIR / "vocabulary"


class AudioGenerator:
    def __init__(self):
        self.stats = {
            "total": 0,
            "success": 0,
            "failed": 0,
            "skipped": 0
        }
        self.failed_items: List[str] = []

    async def generate_audio(self, text: str, output_path: Path, voice: str = None, max_retries: int = 3) -> bool:
        # 使用指定的音色或默认音色
        voice_to_use = voice or VOICE_CONFIG["default"]
        
        for attempt in range(max_retries):
            try:
                if output_path.exists():
                    print(f"  ⏭️  跳过已存在: {output_path.name}")
                    self.stats["skipped"] += 1
                    return True

                # 使用 +20% 语速（rate="+20%" 表示比正常快20%）
                communicate = edge_tts.Communicate(text, voice_to_use, rate="+20%")
                await communicate.save(str(output_path))
                print(f"  ✅ 生成成功: {output_path.name} ({voice_to_use}, +20%语速)")
                self.stats["success"] += 1
                return True
            except Exception as e:
                error_msg = str(e)
                # 如果是最后一次尝试，记录失败
                if attempt == max_retries - 1:
                    print(f"  ❌ 生成失败: {output_path.name} - {error_msg}")
                    self.stats["failed"] += 1
                    self.failed_items.append(f"{output_path.name}: {text}")
                    return False
                # 否则等待后重试
                else:
                    wait_time = (attempt + 1) * 2  # 2s, 4s, 6s
                    print(f"  ⚠️  重试 {attempt + 1}/{max_retries}: {output_path.name} - 等待{wait_time}s")
                    await asyncio.sleep(wait_time)
        return False

    async def process_scenes(self, scenes: List[Dict[str, Any]]):
        tasks = []

        for scene in scenes:
            scene_id = scene.get("scene_id", "")
            if not scene_id:
                continue

            dialogue = scene.get("dialogue", {})
            rounds = dialogue.get("rounds", [])

            for round_data in rounds:
                round_number = round_data.get("round_number", 1)
                contents = round_data.get("content", [])

                for content in contents:
                    text = content.get("text", "")
                    speaker = content.get("speaker", "")
                    
                    if text and speaker:
                        audio_path = DIALOGUES_DIR / f"{scene_id}_round{round_number}_{speaker}.mp3"
                        # 根据 speaker 选择音色
                        voice = VOICE_CONFIG.get(speaker, VOICE_CONFIG["default"])
                        self.stats["total"] += 1
                        tasks.append(self.generate_audio(text, audio_path, voice))

            # 不生成词汇音频，只生成对话音频

        # 使用信号量控制并发数为15
        semaphore = asyncio.Semaphore(15)
        
        async def generate_with_semaphore(task):
            async with semaphore:
                return await task
        
        # 包装所有任务，添加信号量控制
        semaphore_tasks = [generate_with_semaphore(task) for task in tasks]
        
        total_tasks = len(semaphore_tasks)
        completed = 0
        
        for coro in asyncio.as_completed(semaphore_tasks):
            await coro
            completed += 1
            if completed % 50 == 0 or completed == total_tasks:
                print(f"\n  📊 进度: {completed}/{total_tasks} ({completed*100//total_tasks}%)")

    def print_summary(self):
        print("\n" + "=" * 50)
        print("📊 音频生成统计")
        print("=" * 50)
        print(f"   总计: {self.stats['total']}")
        print(f"   成功: {self.stats['success']}")
        print(f"   跳过: {self.stats['skipped']}")
        print(f"   失败: {self.stats['failed']}")

        if self.failed_items:
            print("\n❌ 失败的项目:")
            for item in self.failed_items[:10]:
                print(f"   - {item}")
            if len(self.failed_items) > 10:
                print(f"   ... 还有 {len(self.failed_items) - 10} 个")


async def main():
    print("🎵 开始为场景数据生成音频文件\n")
    print("🎙️  音色配置:")
    print(f"   Speaker1 (主角/用户): {VOICE_CONFIG['speaker1']}")
    print(f"   Speaker2 (配角/系统): {VOICE_CONFIG['speaker2']}")
    print("=" * 50)

    if not JSON_FILE.exists():
        print(f"❌ 错误: 找不到文件 {JSON_FILE}")
        sys.exit(1)

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        scenes = json.load(f)

    print(f"\n📖 读取了 {len(scenes)} 个场景")

    DIALOGUES_DIR.mkdir(parents=True, exist_ok=True)
    VOCABULARY_DIR.mkdir(parents=True, exist_ok=True)

    dialogue_count = sum(
        len(round_data.get("content", []))
        for scene in scenes
        for round_data in scene.get("dialogue", {}).get("rounds", [])
    )
    vocab_count = sum(len(scene.get("vocabulary", [])) * 2 for scene in scenes)
    
    print(f"   对话音频: {dialogue_count} 个")
    print(f"   词汇音频: {vocab_count} 个")
    print(f"   总计: {dialogue_count + vocab_count} 个\n")

    generator = AudioGenerator()
    await generator.process_scenes(scenes)
    generator.print_summary()

    if generator.stats["failed"] > 0:
        sys.exit(1)
    else:
        print("\n✨ 所有音频生成成功！")


if __name__ == "__main__":
    asyncio.run(main())
