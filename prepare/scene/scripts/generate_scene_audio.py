#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用 edge-tts 为场景数据生成音频文件
1. 读取 scenes_final.json
2. 为对话内容生成音频（根据角色自动分配音色）
3. 为词汇内容生成音频

使用方法:
python prepare/scene/scripts/generate_scene_audio.py
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Set
import edge_tts

# 可用音色列表（女声和男声交替分配）
AVAILABLE_VOICES = [
    # 女声
    "en-US-AriaNeural",
    "en-US-JennyNeural",
    "en-GB-SoniaNeural",
    "en-AU-NatashaNeural",
    "en-CA-ClaraNeural",
    # 男声
    "en-US-GuyNeural",
    "en-US-DavisNeural",
    "en-GB-RyanNeural",
    "en-AU-WilliamNeural",
    "en-CA-LiamNeural",
]

DATA_DIR = Path(__file__).parent.parent / "data"
JSON_FILE = DATA_DIR / "scenes_final.json"
AUDIO_DIR = DATA_DIR / "audio"

DIALOGUES_DIR = AUDIO_DIR / "dialogues"
VOCABULARY_DIR = AUDIO_DIR / "vocabulary"


def get_scene_id(scene: Dict[str, Any]) -> str:
    """获取场景ID，兼容 scene_id 和 id 字段"""
    return scene.get("scene_id") or scene.get("id", "")


def get_scene_name(scene: Dict[str, Any]) -> str:
    """获取场景名称，兼容 scene_name 和 name 字段"""
    return scene.get("scene_name") or scene.get("name", "")


class VoiceAssigner:
    """为场景中的角色分配音色"""
    
    def __init__(self):
        # 每个场景独立的角色到音色的映射
        self.scene_voice_maps: Dict[str, Dict[str, str]] = {}
    
    def get_speakers_in_scene(self, scene: Dict[str, Any]) -> List[str]:
        """获取场景中所有的 speaker 列表（按出现顺序）"""
        speakers = []
        seen = set()
        
        dialogue = scene.get("dialogue", {})
        rounds = dialogue.get("rounds", [])
        
        for round_data in rounds:
            for content in round_data.get("content", []):
                speaker = content.get("speaker", "")
                if speaker and speaker not in seen:
                    speakers.append(speaker)
                    seen.add(speaker)
        
        return speakers
    
    def assign_voices_for_scene(self, scene_id: str, speakers: List[str]) -> Dict[str, str]:
        """为场景中的角色分配音色"""
        if scene_id in self.scene_voice_maps:
            return self.scene_voice_maps[scene_id]
        
        voice_map = {}
        for i, speaker in enumerate(speakers):
            # 轮流使用可用音色列表
            voice_map[speaker] = AVAILABLE_VOICES[i % len(AVAILABLE_VOICES)]
        
        self.scene_voice_maps[scene_id] = voice_map
        return voice_map
    
    def get_voice_for_speaker(self, scene_id: str, speaker: str) -> str:
        """获取指定场景中角色的音色"""
        voice_map = self.scene_voice_maps.get(scene_id, {})
        return voice_map.get(speaker, AVAILABLE_VOICES[0])
    
    def print_scene_voice_assignment(self, scene_id: str, scene_name: str):
        """打印场景的音色分配情况"""
        voice_map = self.scene_voice_maps.get(scene_id, {})
        if voice_map:
            print(f"\n  🎭 场景: {scene_id} - {scene_name}")
            for speaker, voice in voice_map.items():
                voice_type = "女声" if "Aria" in voice or "Jenny" in voice or "Sonia" in voice or "Natasha" in voice or "Clara" in voice else "男声"
                print(f"     {speaker}: {voice} ({voice_type})")


class AudioGenerator:
    def __init__(self):
        self.stats = {
            "total": 0,
            "success": 0,
            "failed": 0,
            "skipped": 0
        }
        self.failed_items: List[str] = []
        self.voice_assigner = VoiceAssigner()

    async def generate_audio(self, text: str, output_path: Path, voice: str = None, max_retries: int = 3) -> bool:
        """生成单个音频文件"""
        voice_to_use = voice or AVAILABLE_VOICES[0]

        for attempt in range(max_retries):
            try:
                # 检查文件是否存在且非空（大于1KB认为有效）
                if output_path.exists() and output_path.stat().st_size > 1024:
                    print(f"  ⏭️  跳过已存在: {output_path.name} ({output_path.stat().st_size} bytes)")
                    self.stats["skipped"] += 1
                    return True
                elif output_path.exists() and output_path.stat().st_size <= 1024:
                    print(f"  🔄 重新生成空文件: {output_path.name} (原大小: {output_path.stat().st_size} bytes)")

                # 使用 +20% 语速
                communicate = edge_tts.Communicate(text, voice_to_use, rate="+20%")
                await communicate.save(str(output_path))
                print(f"  ✅ 生成成功: {output_path.name}")
                self.stats["success"] += 1
                return True
            except Exception as e:
                error_msg = str(e)
                if attempt == max_retries - 1:
                    print(f"  ❌ 生成失败: {output_path.name} - {error_msg}")
                    self.stats["failed"] += 1
                    self.failed_items.append(f"{output_path.name}: {text}")
                    return False
                else:
                    wait_time = (attempt + 1) * 2
                    print(f"  ⚠️  重试 {attempt + 1}/{max_retries}: {output_path.name} - 等待{wait_time}s")
                    await asyncio.sleep(wait_time)
        return False

    def prepare_scene_voices(self, scenes: List[Dict[str, Any]]):
        """为所有场景预分配音色"""
        print("\n🎙️  分析场景角色并分配音色...\n")
        
        for scene in scenes:
            scene_id = get_scene_id(scene)
            scene_name = get_scene_name(scene)
            
            if not scene_id:
                continue
            
            # 获取场景中的所有角色
            speakers = self.voice_assigner.get_speakers_in_scene(scene)
            
            # 为角色分配音色
            self.voice_assigner.assign_voices_for_scene(scene_id, speakers)
            
            # 打印分配结果
            self.voice_assigner.print_scene_voice_assignment(scene_id, scene_name)
        
        print()

    async def process_scenes(self, scenes: List[Dict[str, Any]]):
        """处理所有场景的音频生成"""
        tasks = []

        for scene in scenes:
            scene_id = get_scene_id(scene)
            if not scene_id:
                print(f"  ⚠️  跳过: 场景缺少 id 字段")
                continue

            dialogue = scene.get("dialogue", {})
            rounds = dialogue.get("rounds", [])

            # 处理对话音频
            for round_data in rounds:
                round_number = round_data.get("round_number", 1)
                contents = round_data.get("content", [])

                for content in contents:
                    text = content.get("text", "")
                    speaker = content.get("speaker", "")
                    
                    if text and speaker:
                        audio_path = DIALOGUES_DIR / f"{scene_id}_round{round_number}_{speaker}.mp3"
                        # 从预分配的音色中获取
                        voice = self.voice_assigner.get_voice_for_speaker(scene_id, speaker)
                        self.stats["total"] += 1
                        tasks.append(self.generate_audio(text, audio_path, voice))

            # 处理词汇音频（使用默认音色）
            vocabulary = scene.get("vocabulary", [])
            for vocab_index, vocab in enumerate(vocabulary, start=1):
                # 单词音频
                word_text = vocab.get("content", "")
                if word_text:
                    word_audio_path = VOCABULARY_DIR / f"{scene_id}_vocab{vocab_index}_word.mp3"
                    self.stats["total"] += 1
                    tasks.append(self.generate_audio(word_text, word_audio_path, AVAILABLE_VOICES[0]))
                
                # 例句音频
                example_text = vocab.get("example", "") or vocab.get("example_sentence", "")
                if example_text:
                    example_audio_path = VOCABULARY_DIR / f"{scene_id}_vocab{vocab_index}_example.mp3"
                    self.stats["total"] += 1
                    tasks.append(self.generate_audio(example_text, example_audio_path, AVAILABLE_VOICES[0]))

        # 使用信号量控制并发数为15
        semaphore = asyncio.Semaphore(15)
        
        async def generate_with_semaphore(task):
            async with semaphore:
                return await task
        
        semaphore_tasks = [generate_with_semaphore(task) for task in tasks]
        total_tasks = len(semaphore_tasks)
        completed = 0
        
        results = await asyncio.gather(*semaphore_tasks, return_exceptions=True)
        
        for i, result in enumerate(results):
            completed += 1
            if completed % 50 == 0 or completed == total_tasks:
                print(f"\n  📊 进度: {completed}/{total_tasks} ({completed*100//total_tasks}%)")

    def print_summary(self):
        """打印统计信息"""
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
    print("🎵 开始为场景数据生成音频文件")
    print("=" * 50)

    if not JSON_FILE.exists():
        print(f"❌ 错误: 找不到文件 {JSON_FILE}")
        sys.exit(1)

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        scenes = json.load(f)

    print(f"📖 读取了 {len(scenes)} 个场景")

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
    print(f"   总计: {dialogue_count + vocab_count} 个")

    generator = AudioGenerator()
    
    # 预分配音色
    generator.prepare_scene_voices(scenes)
    
    # 生成音频
    await generator.process_scenes(scenes)
    generator.print_summary()

    if generator.stats["failed"] > 0:
        sys.exit(1)
    else:
        print("\n✨ 所有音频生成成功！")


if __name__ == "__main__":
    asyncio.run(main())
