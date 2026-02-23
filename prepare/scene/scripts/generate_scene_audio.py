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

VOICE = "en-US-AriaNeural"
DATA_DIR = Path(__file__).parent.parent / "data"
JSON_FILE = DATA_DIR / "scenes_100.json"
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

    async def generate_audio(self, text: str, output_path: Path) -> bool:
        try:
            if output_path.exists():
                print(f"  ⏭️  跳过已存在: {output_path.name}")
                self.stats["skipped"] += 1
                return True

            communicate = edge_tts.Communicate(text, VOICE)
            await communicate.save(str(output_path))
            print(f"  ✅ 生成成功: {output_path.name}")
            self.stats["success"] += 1
            return True
        except Exception as e:
            print(f"  ❌ 生成失败: {output_path.name} - {str(e)}")
            self.stats["failed"] += 1
            self.failed_items.append(f"{output_path.name}: {text}")
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
                        self.stats["total"] += 1
                        tasks.append(self.generate_audio(text, audio_path))

            vocabulary = scene.get("vocabulary", [])
            for idx, vocab in enumerate(vocabulary, 1):
                word = vocab.get("content", "")
                example = vocab.get("example_sentence", "")
                
                if word:
                    word_path = VOCABULARY_DIR / f"{scene_id}_vocab{idx}_word.mp3"
                    self.stats["total"] += 1
                    tasks.append(self.generate_audio(word, word_path))
                
                if example:
                    example_path = VOCABULARY_DIR / f"{scene_id}_vocab{idx}_example.mp3"
                    self.stats["total"] += 1
                    tasks.append(self.generate_audio(example, example_path))

        batch_size = 20
        total_tasks = len(tasks)
        for i in range(0, total_tasks, batch_size):
            batch = tasks[i:i+batch_size]
            await asyncio.gather(*batch, return_exceptions=True)
            progress = min(i+batch_size, total_tasks)
            print(f"\n  📊 进度: {progress}/{total_tasks} ({progress*100//total_tasks}%)")
            await asyncio.sleep(0.3)

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
    print(f"🎙️  使用语音: {VOICE}")
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
