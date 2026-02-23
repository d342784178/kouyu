/**
 * 110个场景生成脚本 - 使用 NVIDIA GLM4.7
 * 
 * 使用方法：
 * node generate_scenes_110.js
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
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY || '',
  NVIDIA_API_URL: 'https://integrate.api.nvidia.com/v1/chat/completions',
  NVIDIA_MODEL: 'z-ai/glm4.7',
  SCENE_COUNT: 110,
  CONCURRENCY: 30,
  MAX_TOKENS: 100000,
  OUTPUT_DIR: path.join(__dirname, '../data'),
};

// 110个场景模板（与之前生成的一致）
const SCENE_TEMPLATES = [
  // ===== 日常场景 (30个) =====
  { category: 'daily', difficulty: '初级', name: '餐厅点餐' },
  { category: 'daily', difficulty: '初级', name: '超市购物' },
  { category: 'daily', difficulty: '初级', name: '咖啡店点单' },
  { category: 'daily', difficulty: '初级', name: '问路' },
  { category: 'daily', difficulty: '中级', name: '看医生' },
  { category: 'daily', difficulty: '中级', name: '银行办理业务' },
  { category: 'daily', difficulty: '初级', name: '理发店预约' },
  { category: 'daily', difficulty: '初级', name: '寄快递' },
  { category: 'daily', difficulty: '初级', name: '加油站加油' },
  { category: 'daily', difficulty: '初级', name: '洗衣店取衣' },
  { category: 'daily', difficulty: '中级', name: '药店买药' },
  { category: 'daily', difficulty: '中级', name: '健身房咨询' },
  { category: 'daily', difficulty: '初级', name: '图书馆借书' },
  { category: 'daily', difficulty: '初级', name: '电影院购票' },
  { category: 'daily', difficulty: '初级', name: '快餐店取餐' },
  { category: 'daily', difficulty: '初级', name: '便利店购物' },
  { category: 'daily', difficulty: '初级', name: '水果店买水果' },
  { category: 'daily', difficulty: '初级', name: '面包店买面包' },
  { category: 'daily', difficulty: '中级', name: '花店买花' },
  { category: 'daily', difficulty: '中级', name: '眼镜店配眼镜' },
  { category: 'daily', difficulty: '中级', name: '修手机' },
  { category: 'daily', difficulty: '中级', name: '宠物店咨询' },
  { category: 'daily', difficulty: '初级', name: '照相馆拍照' },
  { category: 'daily', difficulty: '初级', name: '干洗店送衣' },
  { category: 'daily', difficulty: '初级', name: '报刊亭买杂志' },
  { category: 'daily', difficulty: '初级', name: '菜市场买菜' },
  { category: 'daily', difficulty: '中级', name: '五金店买工具' },
  { category: 'daily', difficulty: '初级', name: '文具店买文具' },
  { category: 'daily', difficulty: '初级', name: '玩具店买玩具' },
  { category: 'daily', difficulty: '初级', name: '鞋店买鞋' },

  // ===== 职场场景 (25个) =====
  { category: 'workplace', difficulty: '中级', name: '面试自我介绍' },
  { category: 'workplace', difficulty: '中级', name: '会议讨论' },
  { category: 'workplace', difficulty: '中级', name: '邮件沟通' },
  { category: 'workplace', difficulty: '高级', name: '项目汇报' },
  { category: 'workplace', difficulty: '初级', name: '请假申请' },
  { category: 'workplace', difficulty: '初级', name: '同事闲聊' },
  { category: 'workplace', difficulty: '中级', name: '电话会议' },
  { category: 'workplace', difficulty: '中级', name: '客户接待' },
  { category: 'workplace', difficulty: '高级', name: '商务谈判' },
  { category: 'workplace', difficulty: '中级', name: '工作汇报' },
  { category: 'workplace', difficulty: '中级', name: '团队协作' },
  { category: 'workplace', difficulty: '中级', name: '绩效面谈' },
  { category: 'workplace', difficulty: '中级', name: '离职谈话' },
  { category: 'workplace', difficulty: '初级', name: '入职培训' },
  { category: 'workplace', difficulty: '初级', name: '办公室求助' },
  { category: 'workplace', difficulty: '初级', name: '加班申请' },
  { category: 'workplace', difficulty: '初级', name: '调休申请' },
  { category: 'workplace', difficulty: '中级', name: '报销流程' },
  { category: 'workplace', difficulty: '中级', name: '出差申请' },
  { category: 'workplace', difficulty: '初级', name: '设备报修' },
  { category: 'workplace', difficulty: '初级', name: '会议室预订' },
  { category: 'workplace', difficulty: '初级', name: '文件复印' },
  { category: 'workplace', difficulty: '初级', name: '快递收发' },
  { category: 'workplace', difficulty: '初级', name: '办公用品申领' },
  { category: 'workplace', difficulty: '中级', name: '名片交换' },

  // ===== 旅行场景 (20个) =====
  { category: 'travel', difficulty: '初级', name: '酒店入住' },
  { category: 'travel', difficulty: '初级', name: '机场登机' },
  { category: 'travel', difficulty: '中级', name: '租车' },
  { category: 'travel', difficulty: '初级', name: '购买门票' },
  { category: 'travel', difficulty: '初级', name: '问路导航' },
  { category: 'travel', difficulty: '中级', name: '餐厅预订' },
  { category: 'travel', difficulty: '中级', name: '景点咨询' },
  { category: 'travel', difficulty: '中级', name: '购物退税' },
  { category: 'travel', difficulty: '初级', name: '行李寄存' },
  { category: 'travel', difficulty: '中级', name: '紧急求助' },
  { category: 'travel', difficulty: '中级', name: '货币兑换' },
  { category: 'travel', difficulty: '中级', name: '旅游保险' },
  { category: 'travel', difficulty: '中级', name: '导游服务' },
  { category: 'travel', difficulty: '中级', name: '租车还车' },
  { category: 'travel', difficulty: '中级', name: '航班改签' },
  { category: 'travel', difficulty: '初级', name: '酒店退房' },
  { category: 'travel', difficulty: '初级', name: '叫出租车' },
  { category: 'travel', difficulty: '初级', name: '地铁问路' },
  { category: 'travel', difficulty: '中级', name: '火车站购票' },
  { category: 'travel', difficulty: '中级', name: '长途巴士' },

  // ===== 社交场景 (20个) =====
  { category: 'social', difficulty: '初级', name: '自我介绍' },
  { category: 'social', difficulty: '中级', name: '约会聊天' },
  { category: 'social', difficulty: '初级', name: '朋友聚会' },
  { category: 'social', difficulty: '初级', name: '生日祝福' },
  { category: 'social', difficulty: '初级', name: '节日问候' },
  { category: 'social', difficulty: '中级', name: '道歉解释' },
  { category: 'social', difficulty: '初级', name: '感谢表达' },
  { category: 'social', difficulty: '中级', name: '邀请参加' },
  { category: 'social', difficulty: '中级', name: '拒绝邀请' },
  { category: 'social', difficulty: '初级', name: '赞美他人' },
  { category: 'social', difficulty: '中级', name: '安慰朋友' },
  { category: 'social', difficulty: '初级', name: '祝贺成功' },
  { category: 'social', difficulty: '初级', name: '道别告别' },
  { category: 'social', difficulty: '中级', name: '电话聊天' },
  { category: 'social', difficulty: '中级', name: '视频通话' },
  { category: 'social', difficulty: '初级', name: '社交媒体' },
  { category: 'social', difficulty: '初级', name: '邻里交流' },
  { category: 'social', difficulty: '中级', name: '陌生人搭讪' },
  { category: 'social', difficulty: '中级', name: '破冰聊天' },
  { category: 'social', difficulty: '中级', name: '维持对话' },

  // ===== 留学场景 (15个) =====
  { category: 'study_abroad', difficulty: '高级', name: '课堂讨论' },
  { category: 'study_abroad', difficulty: '高级', name: '论文答辩' },
  { category: 'study_abroad', difficulty: '中级', name: '图书馆咨询' },
  { category: 'study_abroad', difficulty: '中级', name: '宿舍申请' },
  { category: 'study_abroad', difficulty: '中级', name: '选课咨询' },
  { category: 'study_abroad', difficulty: '高级', name: '教授约谈' },
  { category: 'study_abroad', difficulty: '中级', name: '小组作业' },
  { category: 'study_abroad', difficulty: '高级', name: '学术报告' },
  { category: 'study_abroad', difficulty: '中级', name: '考试申请' },
  { category: 'study_abroad', difficulty: '高级', name: '奖学金申请' },
  { category: 'study_abroad', difficulty: '高级', name: '签证面试' },
  { category: 'study_abroad', difficulty: '中级', name: '入学注册' },
  { category: 'study_abroad', difficulty: '中级', name: '毕业申请' },
  { category: 'study_abroad', difficulty: '初级', name: '成绩单申请' },
  { category: 'study_abroad', difficulty: '中级', name: '转专业申请' },
];

// 并发控制器
class ConcurrencyController {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.running < this.concurrency) {
      this.running++;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.running--;
    }
  }
}

// 解析JSON
function parseJSON(content) {
  try {
    let cleanContent = content
      .replace(/^\s*```json\s*\n?/i, '')
      .replace(/\n?\s*```\s*$/i, '')
      .trim();

    const startPos = cleanContent.indexOf('{');
    if (startPos === -1) {
      throw new Error('未找到JSON起始符{');
    }

    const jsonStart = cleanContent.substring(startPos);

    let braceCount = 0;
    let endPos = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < jsonStart.length; i++) {
      const char = jsonStart[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endPos = i;
            break;
          }
        }
      }
    }

    if (endPos === -1) {
      throw new Error('JSON不完整 - 未找到闭合的}');
    }

    const jsonStr = jsonStart.substring(0, endPos + 1);
    return JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`JSON解析失败: ${error.message}`);
  }
}

// 调用 NVIDIA GLM4.7 API
async function callGLM4(messages, maxTokens = CONFIG.MAX_TOKENS, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000;

  try {
    const response = await fetch(CONFIG.NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.NVIDIA_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`API调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      const waitTime = 15000;
      console.log(`   ⏳ 触发限速，等待 ${waitTime/1000} 秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return callGLM4(messages, maxTokens, retryCount);
    }

    if (retryCount < MAX_RETRIES) {
      console.log(`   ⚠️ 调用失败，${RETRY_DELAY_MS/1000}秒后重试 (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return callGLM4(messages, maxTokens, retryCount + 1);
    }
    throw error;
  }
}

// 生成单个场景
async function generateScene(template, index) {
  const categoryCode = template.category;
  const sceneId = `${categoryCode}_${String(index).padStart(3, '0')}`;

  const systemPrompt = `你是一个专业的英语口语教学专家。请生成高质量的英语口语练习场景对话。

要求：
1. 对话内容要自然、实用，符合真实场景
2. 所有内容必须是英文和中文对照
3. 对话长度适中，5-7轮对话，每轮2-3句
4. 每轮对话必须包含完整的analysis字段，用于教学分析
5. 确保JSON格式完整，不要截断
6. JSON中的字符串必须使用双引号，不能使用中文引号

输出格式必须是合法的JSON，不要包含任何其他文字。`;

  const userPrompt = `请生成一个英语口语练习场景的对话部分：

场景分类: ${template.category === 'daily' ? '日常' : template.category === 'workplace' ? '职场' : template.category === 'travel' ? '旅行' : template.category === 'social' ? '社交' : '留学'}
场景名称: ${template.name}
难度级别: ${template.difficulty}

请严格按照以下JSON格式输出（确保完整不截断，使用双引号）：

{
  "scene_name": "场景名称（中文）",
  "description": "场景描述，说明适用场景和学习目标（50-100字）",
  "tags": ["标签1", "标签2", "标签3"],
  "dialogue": {
    "rounds": [
      {
        "round_number": 1,
        "content": [
          {
            "index": 1,
            "speaker": "speaker1",
            "speaker_name": "角色1名称",
            "text": "英文对话内容",
            "translation": "中文翻译",
            "is_key_qa": true
          },
          {
            "index": 2,
            "speaker": "speaker2",
            "speaker_name": "角色2名称",
            "text": "英文对话内容",
            "translation": "中文翻译",
            "is_key_qa": false
          }
        ],
        "analysis": {
          "analysis_detail": "对这轮对话的场景分析，说明对话发生的上下文和交际目的（中文）",
          "standard_answer": {
            "text": "标准回答的英文",
            "translation": "标准回答的中文翻译",
            "scenario": "适用场景描述（中文）",
            "formality": "语言正式程度：casual/neutral/formal"
          },
          "alternative_answers": [
            {
              "text": "备选回答1英文",
              "translation": "备选回答1中文",
              "scenario": "备选回答1适用场景（中文）",
              "formality": "casual/neutral/formal"
            },
            {
              "text": "备选回答2英文",
              "translation": "备选回答2中文",
              "scenario": "备选回答2适用场景（中文）",
              "formality": "casual/neutral/formal"
            }
          ],
          "usage_notes": "使用提示和注意事项（中文）"
        }
      }
    ]
  },
  "category": "${template.category === 'daily' ? '日常' : template.category === 'workplace' ? '职场' : template.category === 'travel' ? '旅行' : template.category === 'social' ? '社交' : '留学'}",
  "difficulty": "${template.difficulty}"
}

注意：
1. 每轮对话的is_key_qa标记为true的应该是学习者需要重点掌握的关键句
2. analysis字段用于教学分析，帮助学习者理解对话场景
3. standard_answer是被标记为is_key_qa=true的那句话的标准回答
4. alternative_answers提供2个备选回答，覆盖不同情境
5. 所有字符串必须使用英文双引号"，不能使用中文引号""`;

  try {
    const result = await callGLM4([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const sceneData = parseJSON(result.content);

    // 添加元数据
    sceneData.id = sceneId;
    sceneData.vocabulary = [];

    // 构建音频URL
    if (sceneData.dialogue?.rounds) {
      sceneData.dialogue.rounds = sceneData.dialogue.rounds.map((round) => {
        round.content = round.content.map((item) => ({
          ...item,
          audio_url: `COS:/scene/dialogues/${sceneId}_round${round.round_number}_${item.speaker}.mp3`
        }));
        return round;
      });
    }

    console.log(`✓ [${index}/${CONFIG.SCENE_COUNT}] ${sceneId} - ${sceneData.name}`);
    return { success: true, data: sceneData, index };

  } catch (error) {
    console.error(`✗ [${index}/${CONFIG.SCENE_COUNT}] ${sceneId} - ${error.message}`);
    return { success: false, error: error.message, index };
  }
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('110个场景生成脚本 (NVIDIA GLM4.7)');
  console.log('========================================');
  console.log(`生成数量: ${CONFIG.SCENE_COUNT}`);
  console.log(`并发数: ${CONFIG.CONCURRENCY}`);
  console.log(`Max Tokens: ${CONFIG.MAX_TOKENS}`);
  console.log(`NVIDIA API Key: ${CONFIG.NVIDIA_API_KEY ? '已设置' : '未设置'}`);
  console.log('');

  if (!CONFIG.NVIDIA_API_KEY) {
    console.error('错误: 请设置 NVIDIA_API_KEY 环境变量');
    process.exit(1);
  }

  // 创建输出目录
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  const controller = new ConcurrencyController(CONFIG.CONCURRENCY);
  const results = [];
  const failedTasks = [];
  const startTime = Date.now();

  console.log('开始生成场景...\n');

  // 创建任务
  const tasks = SCENE_TEMPLATES.map((template, i) => async () => {
    await controller.acquire();
    try {
      const result = await generateScene(template, i + 1);
      if (result.success) {
        results.push(result.data);
      } else {
        failedTasks.push({ template, index: i + 1, error: result.error });
      }
    } finally {
      controller.release();
    }
  });

  // 执行所有任务
  await Promise.all(tasks.map(t => t()));

  // 按 id 排序
  results.sort((a, b) => a.id.localeCompare(b.id));

  // 保存最终文件
  const finalFile = path.join(CONFIG.OUTPUT_DIR, 'scenes_110_generated.json');
  fs.writeFileSync(finalFile, JSON.stringify(results, null, 2), 'utf-8');

  // 如果有失败的，保存失败列表
  if (failedTasks.length > 0) {
    const failedFile = path.join(CONFIG.OUTPUT_DIR, 'scenes_failed.json');
    fs.writeFileSync(failedFile, JSON.stringify(failedTasks, null, 2));
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n========================================');
  console.log('生成完成!');
  console.log('========================================');
  console.log(`成功: ${results.length} 个场景`);
  console.log(`失败: ${failedTasks.length} 个场景`);
  console.log(`耗时: ${duration} 分钟`);
  console.log(`数据文件: ${finalFile}`);
  if (failedTasks.length > 0) {
    console.log(`失败记录: ${path.join(CONFIG.OUTPUT_DIR, 'scenes_failed.json')}`);
  }
  console.log('========================================');
}

main().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
