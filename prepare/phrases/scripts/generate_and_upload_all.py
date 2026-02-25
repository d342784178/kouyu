#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一键生成音频并上传到 Vercel Blob
1. 使用 edge-tts 生成所有音频
2. 调用 TypeScript 脚本上传到 Vercel Blob
3. 更新 JSON 文件中的 audioUrl
"""

import subprocess
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPTS_DIR.parent.parent


def run_command(cmd: list[str], cwd: Path = None, description: str = "") -> bool:
    """运行命令并打印输出"""
    if description:
        print(f"\n{'='*50}")
        print(f"🔄 {description}")
        print(f"{'='*50}\n")

    try:
        result = subprocess.run(
            cmd,
            cwd=cwd or PROJECT_DIR,
            capture_output=False,
            text=True,
            check=True
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ 命令执行失败: {e}")
        return False


def main():
    print("🚀 开始一键生成音频并上传到 Vercel Blob\n")

    # 步骤 1: 生成音频
    print("\n📌 步骤 1/2: 使用 edge-tts 生成音频文件")
    if not run_command(
        [sys.executable, str(SCRIPTS_DIR / "generate_audio_edge_tts.py")],
        description="生成音频文件"
    ):
        print("\n❌ 音频生成失败，停止执行")
        sys.exit(1)

    # 步骤 2: 上传到 Vercel Blob
    print("\n📌 步骤 2/2: 上传音频到 Vercel Blob 并更新 JSON")
    if not run_command(
        ["npx", "ts-node", str(SCRIPTS_DIR / "upload_audio_and_update_json.ts")],
        description="上传音频并更新 JSON"
    ):
        print("\n❌ 上传失败")
        sys.exit(1)

    print("\n" + "="*50)
    print("✨ 全部完成！音频已生成并上传到 Vercel Blob")
    print("="*50)


if __name__ == "__main__":
    main()
