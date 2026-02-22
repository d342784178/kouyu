/**
 * 测试场景生成脚本 - 生成1个场景验证数据格式
 */

const fs = require('fs');
const path = require('path');

// 加载 .env.local 文件
function loadEnvFile() {
  const envPath = path.join(__dirname, '../../../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_]+)="(.+)"$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    });
  }
}
loadEnvFile();

// 配置
const CONFIG = {
  GLM_API_KEY: process.env.GLM_API_KEY || '',
  GLM_API_URL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  GLM_MODEL: 'glm-4-flash',
  OUTPUT_DIR: path.join(__dirname, '../data'),
};

// 测试模板
const TEST_TEMPLATE = {
  category: 'daily',
  difficulty: 'intermediate',
  name: '酒店入住',
  description: '学习酒店入住和退房的完整流程'
};

async function testGenerate() {
  console.log('========================================');
  console.log('测试场景生成');
  console.log('========================================');
  
  if (!CONFIG.GLM_API_KEY) {
    console.error('错误: 请设置 GLM_API_KEY 环境变量');
    process.exit(1);
  }

  const sceneId = 'test_001';
  
  const prompt = `请生成一个高质量的英语学习场景，以JSON格式返回。

场景主题：${TEST_TEMPLATE.name}
类别：${TEST_TEMPLATE.category}
难度：${TEST_TEMPLATE.difficulty}
学习目标：${TEST_TEMPLATE.description}

必须严格按照以下JSON格式返回：

{
  "scene_name": "场景名称（中文，2-6个字）",
  "description": "场景描述（中文，40-60字）",
  "tags": ["标签1", "标签2", "标签3"],
  "dialogue": {
    "rounds": [
      {
        "round_number": 1,
        "content": [
          {
            "index": 1,
            "speaker": "speaker1",
            "speaker_name": "Guest",
            "text": "英文对话内容",
            "translation": "中文翻译",
            "is_key_qa": true
          },
          {
            "index": 2,
            "speaker": "speaker2",
            "speaker_name": "Receptionist",
            "text": "英文对话内容",
            "translation": "中文翻译",
            "is_key_qa": false
          }
        ],
        "analysis": {
          "analysis_detail": "详细分析（中文，120-180字）",
          "standard_answer": {
            "text": "标准回答英文",
            "translation": "标准回答中文",
            "scenario": "使用场景",
            "formality": "formal/neutral/casual"
          },
          "alternative_answers": [
            {
              "text": "备选回答1英文",
              "translation": "备选回答1中文",
              "scenario": "备选场景1",
              "formality": "formal/neutral/casual"
            },
            {
              "text": "备选回答2英文",
              "translation": "备选回答2中文",
              "scenario": "备选场景2",
              "formality": "formal/neutral/casual"
            }
          ],
          "usage_notes": "使用说明（中文，60-100字）"
        }
      }
    ]
  },
  "vocabulary": [
    {
      "type": "word",
      "content": "单词",
      "phonetic": "/音标/",
      "translation": "中文翻译",
      "example_sentence": "英文例句",
      "example_translation": "例句中文翻译",
      "difficulty": "easy/medium/hard",
      "round_number": 1
    }
  ]
}

要求：
1. 对话必须有4个回合（intermediate难度）
2. 每个回合有2个发言（speaker1和speaker2交替）
3. 每轮第一个发言 is_key_qa 设为 true
4. 词汇6-8个，必须包含 difficulty 字段
5. 音标使用标准IPA格式，如 /ˈtʃɛk.ɪn/
6. analysis 必须包含所有字段

只返回JSON，不要包含任何其他文字。`;

  try {
    console.log('[GLM] 发送请求...');
    
    const response = await fetch(CONFIG.GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.GLM_API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.GLM_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 6000
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

    let jsonStr = jsonMatch[0];
    // 修复音标格式
    jsonStr = jsonStr.replace(/"phonetic":\s*\/([^\/]+)\//g, '"phonetic": "/$1/"');
    
    const sceneData = JSON.parse(jsonStr);
    sceneData.scene_id = sceneId;
    sceneData.category = TEST_TEMPLATE.category;
    sceneData.difficulty = TEST_TEMPLATE.difficulty;

    // 添加 vocab_id
    if (sceneData.vocabulary) {
      sceneData.vocabulary.forEach((vocab, idx) => {
        vocab.vocab_id = `${sceneId}_vocab_${String(idx + 1).padStart(2, '0')}`;
      });
    }

    // 验证数据
    console.log('\n========================================');
    console.log('数据验证结果');
    console.log('========================================');
    
    // 1. 基本信息
    console.log('\n【基本信息】');
    console.log('场景ID:', sceneData.scene_id);
    console.log('场景名称:', sceneData.scene_name);
    console.log('类别:', sceneData.category);
    console.log('难度:', sceneData.difficulty);
    console.log('描述:', sceneData.description);
    console.log('标签:', sceneData.tags?.join(', ') || '无');
    
    // 2. 对话
    console.log('\n【对话】');
    const rounds = sceneData.dialogue?.rounds || [];
    console.log('对话轮数:', rounds.length);
    rounds.forEach((round, idx) => {
      console.log(`\n  回合 ${round.round_number}:`);
      console.log(`    发言数: ${round.content?.length || 0}`);
      if (round.content?.[0]) {
        console.log(`    示例: ${round.content[0].text?.substring(0, 50)}...`);
      }
      const hasAnalysis = !!round.analysis;
      const hasStandardAnswer = !!round.analysis?.standard_answer;
      const hasAlternativeAnswers = !!round.analysis?.alternative_answers && round.analysis.alternative_answers.length > 0;
      console.log(`    分析: ${hasAnalysis ? '✓' : '✗'} | 标准答案: ${hasStandardAnswer ? '✓' : '✗'} | 备选答案: ${hasAlternativeAnswers ? '✓' : '✗'}`);
    });
    
    // 3. 词汇
    console.log('\n【词汇】');
    const vocab = sceneData.vocabulary || [];
    console.log('词汇数量:', vocab.length);
    vocab.forEach((v, idx) => {
      const hasDifficulty = !!v.difficulty;
      const hasVocabId = !!v.vocab_id;
      console.log(`  ${idx + 1}. ${v.content} | 难度: ${v.difficulty || '未设置'} ${hasDifficulty ? '✓' : '✗'} | ID: ${hasVocabId ? '✓' : '✗'}`);
    });
    
    // 4. 保存测试文件
    const testFile = path.join(CONFIG.OUTPUT_DIR, 'test_scene.json');
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
      fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    fs.writeFileSync(testFile, JSON.stringify(sceneData, null, 2));
    console.log('\n【输出文件】');
    console.log('测试场景已保存:', testFile);
    
    // 5. 检查问题
    console.log('\n【问题检查】');
    const issues = [];
    if (!sceneData.scene_name) issues.push('缺少场景名称');
    if (!sceneData.description) issues.push('缺少描述');
    if (!sceneData.tags || sceneData.tags.length === 0) issues.push('缺少标签');
    if (rounds.length < 3) issues.push(`对话轮数不足: ${rounds.length}轮`);
    if (vocab.length < 5) issues.push(`词汇数量不足: ${vocab.length}个`);
    
    const vocabWithoutDifficulty = vocab.filter(v => !v.difficulty);
    if (vocabWithoutDifficulty.length > 0) {
      issues.push(`${vocabWithoutDifficulty.length}个词汇缺少难度字段`);
    }
    
    if (issues.length === 0) {
      console.log('✓ 数据格式正确，无问题');
    } else {
      issues.forEach(issue => console.log('✗ ' + issue));
    }
    
    console.log('\n========================================');
    console.log('测试完成');
    console.log('========================================');
    
    return issues.length === 0;
    
  } catch (error) {
    console.error('\n[错误]', error.message);
    return false;
  }
}

testGenerate().then(success => {
  process.exit(success ? 0 : 1);
});
