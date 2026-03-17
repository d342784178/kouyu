#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用 edge-tts 为问答对数据生成音频文件
1. 读取 prepare/scene/data/sub-scenes/*.json
2. 为每个问答对的 triggerText 和 followUps 生成音频
3. 保存到 prepare/scene/data/audio/ 目录
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
SUB_SCENES_DIR = DATA_DIR / "sub-scenes"
AUDIO_DIR = DATA_DIR / "audio"

QUESTIONS_DIR = AUDIO_DIR / "questions"
RESPONSES_DIR = AUDIO_DIR / "responses"


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

    async def process_qa_pairs(self):
        json_files = list(SUB_SCENES_DIR.glob("*.json"))
        print(f"找到 {len(json_files)} 个场景文件\n")
        
        tasks = []
        
        for json_file in json_files:
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            sub_scenes = data.get("subScenes", [])
            
            for sub_scene in sub_scenes:
                qa_pairs = sub_scene.get("qaPairs", [])
                
                for qa in qa_pairs:
                    qa_id = qa.get("id", "")
                    trigger_text = qa.get("triggerText", "")
                    follow_ups = qa.get("followUps", [])
                    
                    if trigger_text and qa_id:
                        question_audio = QUESTIONS_DIR / f"{qa_id}.mp3"
                        self.stats["total"] += 1
                        tasks.append(self.generate_audio(trigger_text, question_audio))
                    
                    for i, follow_up in enumerate(follow_ups):
                        response_text = follow_up.get("text", "")
                        if response_text and qa_id:
                            response_audio = RESPONSES_DIR / f"{qa_id}_response{i}.mp3"
                            self.stats["total"] += 1
                            tasks.append(self.generate_audio(response_text, response_audio))
        
        print(f"总计需要生成 {len(tasks)} 个音频文件\n")
        
        batch_size = 13
        for i in range(0, len(tasks), batch_size):
            batch = tasks[i:i+batch_size]
            await asyncio.gather(*batch, return_exceptions=True)
            print(f"  进度: {min(i+batch_size, len(tasks))}/{len(tasks)}")
            await asyncio.sleep(0.3)

    def print_summary(self):
        print("\n" + "="*50)
        print("📊 音频生成统计")
        print("="*50)
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
    print("🎵 开始使用 edge-tts 为问答对生成音频文件\n")
    print(f"🎙️  使用语音: {VOICE}")
    print(f"📁 数据目录: {SUB_SCENES_DIR}")
    print(f"📁 音频输出: {AUDIO_DIR}")
    print("="*50)

    if not SUB_SCENES_DIR.exists():
        print(f"❌ 错误: 找不到目录 {SUB_SCENES_DIR}")
        sys.exit(1)

    QUESTIONS_DIR.mkdir(parents=True, exist_ok=True)
    RESPONSES_DIR.mkdir(parents=True, exist_ok=True)

    generator = AudioGenerator()
    await generator.process_qa_pairs()
    generator.print_summary()

    if generator.stats["failed"] > 0:
        sys.exit(1)
    else:
        print("\n✨ 所有音频生成成功！")


if __name__ == "__main__":
    asyncio.run(main())
