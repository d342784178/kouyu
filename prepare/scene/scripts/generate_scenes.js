/**
 * 统一的场景生成脚本
 * 
 * 功能：
 * 1. 调用 GLM 大模型生成场景数据（scene_name/description/analysis 等为中文）
 * 2. 使用 Edge-TTS 生成音频（speaker1女声，speaker2男声）
 * 3. 保存到本地，音频路径使用相对路径格式
 * 
 * 使用方法：
 * node generate_scenes.js --count 10 --concurrency 5
 */

const fs = require('fs');
const path = require('path');
const msedgeTTS = require('msedge-tts');

// 配置
const CONFIG = {
  // GLM API 配置
  GLM_API_KEY: process.env.GLM_API_KEY || '',
  GLM_API_URL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  GLM_MODEL: 'glm-4-flash',
  
  // 生成配置
  SCENE_COUNT: parseInt(process.argv.find(arg => arg.startsWith('--count='))?.split('=')[1] || '10'),
  CONCURRENCY: parseInt(process.argv.find(arg => arg.startsWith('--concurrency='))?.split('=')[1] || '5'),
  
  // 路径配置
  OUTPUT_DIR: path.join(__dirname, '../data'),
  AUDIO_DIR: path.join(__dirname, '../data/audio'),
  
  // 音色配置
  VOICES: {
    female: 'en-US-AriaNeural',  // speaker1, customer等用户角色
    male: 'en-US-GuyNeural'      // speaker2, waiter等服务角色
  }
};

// 场景类别模板
const SCENE_TEMPLATES = [
  { category: 'daily', difficulty: 'beginner', name: '餐厅点餐' },
  { category: 'daily', difficulty: 'beginner', name: '购物' },
  { category: 'daily', difficulty: 'intermediate', name: '酒店入住' },
  { category: 'daily', difficulty: 'intermediate', name: '机场值机' },
  { category: 'daily', difficulty: 'beginner', name: '问路' },
  { category: 'daily', difficulty: 'beginner', name: '打车' },
  { category: 'daily', difficulty: 'intermediate', name: '看医生' },
  { category: 'daily', difficulty: 'beginner', name: '银行办事' },
  { category: 'workplace', difficulty: 'advanced', name: '工作面试' },
  { category: 'workplace', difficulty: 'intermediate', name: '商务会议' },
  { category: 'workplace', difficulty: 'intermediate', name: '电话沟通' },
  { category: 'workplace', difficulty: 'advanced', name: '项目汇报' },
  { category: 'travel', difficulty: 'intermediate', name: '预订机票' },
  { category: 'travel', difficulty: 'beginner', name: '酒店预订' },
  { category: 'travel', difficulty: 'intermediate', name: '租车' },
  { category: 'social', difficulty: 'beginner', name: '自我介绍' },
  { category: 'social', difficulty: 'beginner', name: '闲聊' },
  { category: 'social', difficulty: 'intermediate', name: '讨论爱好' },
];

// 并发控制函数
async function asyncPool(concurrency, iterable, iteratorFn) {
  const ret = [];
  const executing = new Set();

  for (const item of iterable) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    executing.add(p);

    const clean = () => executing.delete(p);
    p.then(clean).catch(clean);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  return Promise.all(ret);
}

// 调用 GLM API 生成场景数据
async function generateSceneWithGLM(template, index) {
  const sceneId = `${template.category}_${String(index).padStart(3, '0')}`;
  
  const prompt = `请生成一个英语学习场景，以JSON格式返回。

场景主题：${template.name}
类别：${template.category}
难度：${template.difficulty}

要求：
1. scene_name: 场景名称（中文，2-6个字）
2. description: 场景描述（中文，说明学习目标，30-50字）
3. dialogue: 包含2-3个回合的对话
   - 每个回合有2个发言（speaker1和speaker2交替）
   - speaker1为用户角色（customer/passenger等），使用女声
   - speaker2为服务角色（waiter/agent等），使用男声
   - 英文对话内容要自然、实用
   - 提供中文翻译
4. vocabulary: 5个高频词汇/短语，格式如下：
   {
     "type": "word" | "phrase",
     "content": "英文单词或短语",
     "phonetic": "音标，如 /ˈɔːrdər/",
     "translation": "中文翻译",
     "example_sentence": "英文例句",
     "example_translation": "例句中文翻译"
   }
5. analysis: 每个回合的分析，格式如下：
   {
     "analysis_detail": "中文详细分析，说明对话场景、语言要点等（100-150字）",
     "standard_answer": {
       "text": "标准回答的英文",
       "translation": "标准回答的中文翻译"
     },
     "alternative_answers": [
       {
         "text": "备选回答1英文",
         "translation": "备选回答1中文"
       },
       {
         "text": "备选回答2英文",
         "translation": "备选回答2中文"
       }
     ],
     "usage_notes": "使用说明（中文），包含语法要点、常用表达等（50-80字）"
   }

返回格式示例：
{
  "scene_id": "daily_001",
  "scene_name": "餐厅点餐",
  "category": "daily",
  "difficulty": "beginner",
  "description": "学习在餐厅点餐的常用表达",
  "dialogue": {
    "rounds": [
      {
        "round_number": 1,
        "content": [
          {
            "index": 1,
            "speaker": "speaker1",
            "speaker_name": "Customer",
            "text": "英文对话",
            "translation": "中文翻译",
            "is_key_qa": true
          },
          {
            "index": 2,
            "speaker": "speaker2",
            "speaker_name": "Waiter",
            "text": "英文对话",
            "translation": "中文翻译",
            "is_key_qa": false
          }
        ],
        "analysis": {
          "analysis_detail": "在这一轮对话中，顾客向服务员询问...",
          "standard_answer": {
            "text": "I'd like to order a steak.",
            "translation": "我想要点一份牛排。"
          },
          "alternative_answers": [
            {
              "text": "Can I have a steak, please?",
              "translation": "请给我来一份牛排好吗？"
            },
            {
              "text": "I'll take the steak.",
              "translation": "我要牛排。"
            }
          ],
          "usage_notes": "使用'I'd like to...'表达礼貌的请求，这是餐厅点餐中最常用的句式。也可以用'Can I have...?'或'I'll take...'来表达。"
        }
      }
    ]
  },
  "vocabulary": [
    {
      "type": "word",
      "content": "order",
      "phonetic": "/ˈɔːrdər/",
      "translation": "点餐，订购",
      "example_sentence": "Are you ready to order?",
      "example_translation": "您准备好点餐了吗？"
    }
  ]
}`;

  try {
    console.log(`[GLM] 生成场景: ${sceneId} - ${template.name}`);
    
    const response = await fetch(CONFIG.GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.GLM_API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.GLM_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`API 错误: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('API 返回内容为空');
    }

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法从响应中提取 JSON');
    }

    // 修复可能的 JSON 格式问题（音标等未加引号的情况）
    let jsonStr = jsonMatch[0];
    // 修复音标格式：将 "phonetic": /xxx/ 改为 "phonetic": "/xxx/"
    jsonStr = jsonStr.replace(/"phonetic":\s*\/([^\/]+)\//g, '"phonetic": "/$1/"');
    
    const sceneData = JSON.parse(jsonStr);
    sceneData.scene_id = sceneId;
    
    console.log(`[GLM] ✓ 场景生成成功: ${sceneId}`);
    return sceneData;
    
  } catch (error) {
    console.error(`[GLM] ✗ 场景生成失败: ${sceneId}`, error.message);
    return null;
  }
}

// 判断使用哪种音色
function getVoiceConfig(speaker) {
  const femaleSpeakers = ['speaker1', 'customer', 'passenger', 'patient', 'guest', 'A'];
  const maleSpeakers = ['speaker2', 'waiter', 'agent', 'clerk', 'doctor', 'staff', 'B'];
  
  if (femaleSpeakers.includes(speaker.toLowerCase())) {
    return { voice: CONFIG.VOICES.female, gender: 'Female' };
  }
  return { voice: CONFIG.VOICES.male, gender: 'Male' };
}

// 生成对话音频
async function generateDialogueAudio(sceneData) {
  const audioUrls = [];
  
  if (!sceneData.dialogue?.rounds) return audioUrls;

  for (const round of sceneData.dialogue.rounds) {
    for (const content of round.content) {
      if (!content.text) continue;

      const audioFileName = `${sceneData.scene_id}_round${round.round_number}_speaker${content.index}.mp3`;
      const audioFilePath = path.join(CONFIG.AUDIO_DIR, 'dialogues', audioFileName);

      // 检查文件是否已存在
      if (fs.existsSync(audioFilePath)) {
        console.log(`[TTS] 跳过已存在: ${audioFileName}`);
        audioUrls.push({
          round: round.round_number,
          index: content.index,
          audio_url: `COS:/scene/dialogues/${audioFileName}`,
          filePath: audioFilePath
        });
        continue;
      }

      try {
        const voiceConfig = getVoiceConfig(content.speaker);
        console.log(`[TTS] 生成: ${audioFileName} (${voiceConfig.gender})`);

        const tts = new msedgeTTS.MsEdgeTTS({
          proxy: { host: 'localhost', port: 7890 }
        });

        await tts.setMetadata(voiceConfig.voice, 'audio-24khz-48kbitrate-mono-mp3');

        await new Promise((resolve, reject) => {
          const stream = fs.createWriteStream(audioFilePath);
          const { audioStream } = tts.toStream(content.text);

          audioStream.pipe(stream);
          stream.on('finish', resolve);
          stream.on('error', reject);
          audioStream.on('error', reject);
        });

        const stats = fs.statSync(audioFilePath);
        console.log(`[TTS] ✓ 完成: ${audioFileName} (${(stats.size / 1024).toFixed(2)} KB)`);

        audioUrls.push({
          round: round.round_number,
          index: content.index,
          audio_url: `COS:/scene/dialogues/${audioFileName}`,
          filePath: audioFilePath
        });

      } catch (error) {
        console.error(`[TTS] ✗ 失败: ${audioFileName}`, error.message);
      }
    }
  }

  return audioUrls;
}

// 生成词汇音频
async function generateVocabularyAudio(sceneData) {
  const audioUrls = [];
  
  if (!sceneData.vocabulary) return audioUrls;

  for (let i = 0; i < sceneData.vocabulary.length; i++) {
    const vocab = sceneData.vocabulary[i];
    
    // 生成单词音频
    const wordFileName = `${sceneData.scene_id}_vocab${i + 1}_word.mp3`;
    const wordFilePath = path.join(CONFIG.AUDIO_DIR, 'vocabulary', wordFileName);

    // 生成例句音频
    const exampleFileName = `${sceneData.scene_id}_vocab${i + 1}_example.mp3`;
    const exampleFilePath = path.join(CONFIG.AUDIO_DIR, 'vocabulary', exampleFileName);

    try {
      // 单词音频（女声）
      if (!fs.existsSync(wordFilePath) && vocab.content) {
        console.log(`[TTS] 生成词汇: ${wordFileName}`);
        const tts = new msedgeTTS.MsEdgeTTS({ proxy: { host: 'localhost', port: 7890 } });
        await tts.setMetadata(CONFIG.VOICES.female, 'audio-24khz-48kbitrate-mono-mp3');
        
        await new Promise((resolve, reject) => {
          const stream = fs.createWriteStream(wordFilePath);
          const { audioStream } = tts.toStream(vocab.content);
          audioStream.pipe(stream);
          stream.on('finish', resolve);
          stream.on('error', reject);
        });
      }

      // 例句音频（女声）
      if (!fs.existsSync(exampleFilePath) && vocab.example_sentence) {
        console.log(`[TTS] 生成例句: ${exampleFileName}`);
        const tts = new msedgeTTS.MsEdgeTTS({ proxy: { host: 'localhost', port: 7890 } });
        await tts.setMetadata(CONFIG.VOICES.female, 'audio-24khz-48kbitrate-mono-mp3');
        
        await new Promise((resolve, reject) => {
          const stream = fs.createWriteStream(exampleFilePath);
          const { audioStream } = tts.toStream(vocab.example_sentence);
          audioStream.pipe(stream);
          stream.on('finish', resolve);
          stream.on('error', reject);
        });
      }

      audioUrls.push({
        vocab_index: i,
        word_audio: `COS:/scene/vocabulary/${wordFileName}`,
        example_audio: `COS:/scene/vocabulary/${exampleFileName}`
      });

    } catch (error) {
      console.error(`[TTS] ✗ 词汇音频失败: ${vocab.content}`, error.message);
    }
  }

  return audioUrls;
}

// 更新场景数据中的音频URL
function updateSceneAudioUrls(sceneData, dialogueAudioUrls, vocabAudioUrls) {
  // 更新对话音频URL
  if (sceneData.dialogue?.rounds) {
    for (const round of sceneData.dialogue.rounds) {
      for (const content of round.content) {
        const audioInfo = dialogueAudioUrls.find(
          a => a.round === round.round_number && a.index === content.index
        );
        if (audioInfo) {
          content.audio_url = audioInfo.audio_url;
        }
      }
    }
  }

  // 更新词汇音频URL
  if (sceneData.vocabulary) {
    for (let i = 0; i < sceneData.vocabulary.length; i++) {
      const vocab = sceneData.vocabulary[i];
      const audioInfo = vocabAudioUrls.find(a => a.vocab_index === i);
      if (audioInfo) {
        vocab.audio_url = audioInfo.word_audio;
        vocab.example_audio_url = audioInfo.example_audio;
      }
    }
  }

  return sceneData;
}

// 保存进度（用于断点续传）
function saveProgress(scenes, currentIndex) {
  const progressFile = path.join(CONFIG.OUTPUT_DIR, 'generation_progress.json');
  fs.writeFileSync(progressFile, JSON.stringify({
    total: CONFIG.SCENE_COUNT,
    completed: currentIndex,
    timestamp: new Date().toISOString()
  }, null, 2));
}

// 加载已有进度
function loadProgress() {
  const progressFile = path.join(CONFIG.OUTPUT_DIR, 'generation_progress.json');
  if (fs.existsSync(progressFile)) {
    return JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
  }
  return null;
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('场景生成脚本启动');
  console.log('========================================');
  console.log(`生成数量: ${CONFIG.SCENE_COUNT}`);
  console.log(`并发数: ${CONFIG.CONCURRENCY}`);
  console.log(`GLM API Key: ${CONFIG.GLM_API_KEY ? '已设置' : '未设置'}`);
  console.log('');

  // 检查 API Key
  if (!CONFIG.GLM_API_KEY) {
    console.error('错误: 请设置 GLM_API_KEY 环境变量');
    process.exit(1);
  }

  // 创建输出目录
  if (!fs.existsSync(CONFIG.AUDIO_DIR)) {
    fs.mkdirSync(CONFIG.AUDIO_DIR, { recursive: true });
  }
  if (!fs.existsSync(path.join(CONFIG.AUDIO_DIR, 'dialogues'))) {
    fs.mkdirSync(path.join(CONFIG.AUDIO_DIR, 'dialogues'), { recursive: true });
  }
  if (!fs.existsSync(path.join(CONFIG.AUDIO_DIR, 'vocabulary'))) {
    fs.mkdirSync(path.join(CONFIG.AUDIO_DIR, 'vocabulary'), { recursive: true });
  }

  // 加载已有数据（断点续传）
  const outputFile = path.join(CONFIG.OUTPUT_DIR, 'scenes.json');
  let allScenes = [];
  if (fs.existsSync(outputFile)) {
    allScenes = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
    console.log(`已加载已有数据: ${allScenes.length} 个场景`);
  }

  // 生成场景任务列表
  const tasks = [];
  for (let i = 0; i < CONFIG.SCENE_COUNT; i++) {
    const template = SCENE_TEMPLATES[i % SCENE_TEMPLATES.length];
    const sceneId = `${template.category}_${String(i + 1).padStart(3, '0')}`;
    
    // 检查是否已存在
    if (allScenes.find(s => s.scene_id === sceneId)) {
      console.log(`跳过已存在: ${sceneId}`);
      continue;
    }
    
    tasks.push({ template, index: i + 1, sceneId });
  }

  console.log(`需要生成: ${tasks.length} 个场景`);
  console.log('');

  // 并发生成场景
  let completed = 0;
  
  await asyncPool(CONFIG.CONCURRENCY, tasks, async (task) => {
    try {
      // 1. 生成场景数据
      const sceneData = await generateSceneWithGLM(task.template, task.index);
      if (!sceneData) {
        console.error(`跳过失败场景: ${task.sceneId}`);
        return;
      }

      // 2. 生成对话音频
      console.log(`[${task.sceneId}] 生成对话音频...`);
      const dialogueAudioUrls = await generateDialogueAudio(sceneData);

      // 3. 生成词汇音频
      console.log(`[${task.sceneId}] 生成词汇音频...`);
      const vocabAudioUrls = await generateVocabularyAudio(sceneData);

      // 4. 更新音频URL
      const updatedScene = updateSceneAudioUrls(sceneData, dialogueAudioUrls, vocabAudioUrls);

      // 5. 保存到列表
      allScenes.push(updatedScene);
      
      // 6. 保存进度
      fs.writeFileSync(outputFile, JSON.stringify(allScenes, null, 2));
      saveProgress(allScenes, allScenes.length);

      completed++;
      console.log(`[${task.sceneId}] ✓ 完成 (${completed}/${tasks.length})`);
      console.log('');

    } catch (error) {
      console.error(`[${task.sceneId}] ✗ 错误:`, error.message);
    }
  });

  console.log('========================================');
  console.log('生成完成!');
  console.log(`总计: ${allScenes.length} 个场景`);
  console.log(`数据文件: ${outputFile}`);
  console.log(`音频目录: ${CONFIG.AUDIO_DIR}`);
  console.log('========================================');
}

// 运行
main().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
