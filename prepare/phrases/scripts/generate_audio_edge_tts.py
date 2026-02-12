#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用 edge-tts 生成音频文件
1. 读取 phrases_100_quality.json
2. 为每个短语和示例生成音频
3. 保存到本地目录
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any
import edge_tts

# 配置
VOICE = "en-US-AriaNeural"  # 美式英语女声，发音清晰
DATA_DIR = Path(__file__).parent.parent / "data"
AUDIO_DIR = DATA_DIR / "audio"
JSON_FILE = DATA_DIR / "phrases_100_quality.json"

# 确保音频目录存在
PHRASES_DIR = AUDIO_DIR / "phrases"
EXAMPLES_DIR = AUDIO_DIR / "examples"
PHRASES_DIR.mkdir(parents=True, exist_ok=True)
EXAMPLES_DIR.mkdir(parents=True, exist_ok=True)


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
        """生成单个音频文件"""
        try:
            # 如果文件已存在，跳过
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

    async def process_phrases(self, phrases: List[Dict[str, Any]]):
        """处理所有短语和示例"""
        tasks = []

        for phrase in phrases:
            phrase_id = phrase["id"]
            phrase_text = phrase["english"]

            # 短语音频
            phrase_audio_path = PHRASES_DIR / f"{phrase_id}.mp3"
            self.stats["total"] += 1
            tasks.append(self.generate_audio(phrase_text, phrase_audio_path))

            # 示例音频
            if "examples" in phrase and phrase["examples"]:
                for i, example in enumerate(phrase["examples"]):
                    example_text = example["english"]
                    example_audio_path = EXAMPLES_DIR / f"{phrase_id}_ex{i+1}.mp3"
                    self.stats["total"] += 1
                    tasks.append(self.generate_audio(example_text, example_audio_path))

        # 批量执行，限制并发数
        batch_size = 5
        for i in range(0, len(tasks), batch_size):
            batch = tasks[i:i+batch_size]
            await asyncio.gather(*batch, return_exceptions=True)
            print(f"  进度: {min(i+batch_size, len(tasks))}/{len(tasks)}")
            # 小延迟避免请求过快
            await asyncio.sleep(0.5)

    def print_summary(self):
        """打印统计信息"""
        print("\n" + "="*50)
        print("📊 音频生成统计")
        print("="*50)
        print(f"   总计: {self.stats['total']}")
        print(f"   成功: {self.stats['success']}")
        print(f"   跳过: {self.stats['skipped']}")
        print(f"   失败: {self.stats['failed']}")

        if self.failed_items:
            print("\n❌ 失败的项目:")
            for item in self.failed_items:
                print(f"   - {item}")


async def main():
    print("🎵 开始使用 edge-tts 生成音频文件\n")
    print(f"🎙️  使用语音: {VOICE}")
    print("="*50)

    # 读取JSON文件
    if not JSON_FILE.exists():
        print(f"❌ 错误: 找不到文件 {JSON_FILE}")
        sys.exit(1)

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    phrases = data.get("phrases", [])
    print(f"\n📖 读取了 {len(phrases)} 个短语")

    # 统计音频数量
    total_examples = sum(len(p.get("examples", [])) for p in phrases)
    print(f"   短语音频: {len(phrases)} 个")
    print(f"   示例音频: {total_examples} 个")
    print(f"   总计: {len(phrases) + total_examples} 个\n")

    # 生成音频
    generator = AudioGenerator()
    await generator.process_phrases(phrases)
    generator.print_summary()

    if generator.stats["failed"] > 0:
        sys.exit(1)
    else:
        print("\n✨ 所有音频生成成功！")


if __name__ == "__main__":
    asyncio.run(main())
