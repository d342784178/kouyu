/**
 * 100个高频场景生成脚本 - 5并发
 * 
 * 使用方法：
 * node generate_scenes_100.js
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
  SCENE_COUNT: 100,
  CONCURRENCY: 8,
  OUTPUT_DIR: path.join(__dirname, '../data'),
};

// 100个高频场景模板
const SCENE_TEMPLATES = [
  // ===== 日常场景 (30个) =====
  // Beginner - 日常基础
  { category: 'daily', difficulty: 'beginner', name: '餐厅点餐', description: '学习在餐厅点餐的基本用语' },
  { category: 'daily', difficulty: 'beginner', name: '咖啡店点单', description: '练习在咖啡店点咖啡和糕点' },
  { category: 'daily', difficulty: 'beginner', name: '超市购物', description: '学习在超市询问价格和位置' },
  { category: 'daily', difficulty: 'beginner', name: '问路', description: '学习如何向他人询问方向' },
  { category: 'daily', difficulty: 'beginner', name: '打车', description: '练习乘坐出租车时的对话' },
  { category: 'daily', difficulty: 'beginner', name: '问候与自我介绍', description: '学习基本的问候和自我介绍' },
  { category: 'daily', difficulty: 'beginner', name: '询问时间', description: '学习询问时间和日期的表达' },
  { category: 'daily', difficulty: 'beginner', name: '购物付款', description: '练习付款和找零的对话' },
  { category: 'daily', difficulty: 'beginner', name: '餐厅预订', description: '学习电话预订餐厅座位' },
  { category: 'daily', difficulty: 'beginner', name: '快餐点餐', description: '练习在快餐店快速点餐' },
  
  // Intermediate - 日常进阶
  { category: 'daily', difficulty: 'intermediate', name: '酒店入住', description: '学习酒店入住和退房的完整流程' },
  { category: 'daily', difficulty: 'intermediate', name: '机场值机', description: '练习机场值机和安检对话' },
  { category: 'daily', difficulty: 'intermediate', name: '看医生', description: '学习描述症状和预约医生' },
  { category: 'daily', difficulty: 'intermediate', name: '银行办事', description: '练习银行业务办理对话' },
  { category: 'daily', difficulty: 'intermediate', name: '邮局寄件', description: '学习邮寄包裹和购买邮票' },
  { category: 'daily', difficulty: 'intermediate', name: '理发店预约', description: '练习预约理发和描述发型' },
  { category: 'daily', difficulty: 'intermediate', name: '健身房咨询', description: '学习健身房会员咨询' },
  { category: 'daily', difficulty: 'intermediate', name: '洗衣店服务', description: '练习洗衣店取送衣物' },
  { category: 'daily', difficulty: 'intermediate', name: '手机维修', description: '学习维修店咨询和报价' },
  { category: 'daily', difficulty: 'intermediate', name: '宠物店咨询', description: '练习宠物用品购买咨询' },
  
  // Advanced - 日常高级
  { category: 'daily', difficulty: 'advanced', name: '租房看房', description: '学习租房看房和签约流程' },
  { category: 'daily', difficulty: 'advanced', name: '买房咨询', description: '练习房产中介咨询' },
  { category: 'daily', difficulty: 'advanced', name: '保险理赔', description: '学习保险理赔流程' },
  { category: 'daily', difficulty: 'advanced', name: '法律咨诉', description: '练习律师咨询和法律术语' },
  { category: 'daily', difficulty: 'advanced', name: '税务申报', description: '学习税务相关咨询' },
  { category: 'daily', difficulty: 'advanced', name: '车辆维修', description: '练习汽车维修店沟通' },
  { category: 'daily', difficulty: 'advanced', name: '投诉处理', description: '学习正式投诉和维权' },
  { category: 'daily', difficulty: 'advanced', name: '紧急求助', description: '练习紧急情况求助' },
  { category: 'daily', difficulty: 'advanced', name: '失物招领', description: '学习失物招领流程' },
  { category: 'daily', difficulty: 'advanced', name: '证件办理', description: '练习证件申请和补办' },
  
  // ===== 职场场景 (25个) =====
  // Beginner - 职场基础
  { category: 'workplace', difficulty: 'beginner', name: '入职介绍', description: '学习新员工入职自我介绍' },
  { category: 'workplace', difficulty: 'beginner', name: '请假申请', description: '练习向上级请假' },
  { category: 'workplace', difficulty: 'beginner', name: '加班安排', description: '学习讨论加班时间' },
  { category: 'workplace', difficulty: 'beginner', name: '办公用品', description: '练习申请办公用品' },
  { category: 'workplace', difficulty: 'beginner', name: '会议室预订', description: '学习预订会议室' },
  
  // Intermediate - 职场进阶
  { category: 'workplace', difficulty: 'intermediate', name: '商务会议', description: '学习会议中的表达和讨论' },
  { category: 'workplace', difficulty: 'intermediate', name: '电话沟通', description: '练习商务电话沟通技巧' },
  { category: 'workplace', difficulty: 'intermediate', name: '邮件写作', description: '学习撰写正式商务邮件' },
  { category: 'workplace', difficulty: 'intermediate', name: '团队协作', description: '练习与同事协作沟通' },
  { category: 'workplace', difficulty: 'intermediate', name: '客户接待', description: '学习接待来访客户' },
  { category: 'workplace', difficulty: 'intermediate', name: '出差安排', description: '练习商务出差预订' },
  { category: 'workplace', difficulty: 'intermediate', name: '报销流程', description: '学习费用报销申请' },
  { category: 'workplace', difficulty: 'intermediate', name: '项目跟进', description: '练习项目进度汇报' },
  { category: 'workplace', difficulty: 'intermediate', name: '跨部门沟通', description: '学习跨部门协调' },
  { category: 'workplace', difficulty: 'intermediate', name: '培训学习', description: '练习培训安排和反馈' },
  
  // Advanced - 职场高级
  { category: 'workplace', difficulty: 'advanced', name: '工作面试', description: '学习面试中的自我介绍和回答问题' },
  { category: 'workplace', difficulty: 'advanced', name: '项目汇报', description: '练习项目进展汇报和演示' },
  { category: 'workplace', difficulty: 'advanced', name: '谈判技巧', description: '学习商务谈判中的表达' },
  { category: 'workplace', difficulty: 'advanced', name: '绩效评估', description: '练习绩效评估对话' },
  { category: 'workplace', difficulty: 'advanced', name: '薪资谈判', description: '学习薪资和福利谈判' },
  { category: 'workplace', difficulty: 'advanced', name: '离职交接', description: '练习离职流程和交接' },
  { category: 'workplace', difficulty: 'advanced', name: '危机处理', description: '学习工作危机应对' },
  { category: 'workplace', difficulty: 'advanced', name: '演讲展示', description: '练习公开演讲和演示' },
  { category: 'workplace', difficulty: 'advanced', name: '团队管理', description: '学习团队管理沟通' },
  
  // ===== 留学场景 (20个) =====
  // Beginner - 留学基础
  { category: 'study_abroad', difficulty: 'beginner', name: '校园问路', description: '学习在校园内询问方向' },
  { category: 'study_abroad', difficulty: 'beginner', name: '图书馆借书', description: '练习图书馆借还书流程' },
  { category: 'study_abroad', difficulty: 'beginner', name: '食堂就餐', description: '学习学校食堂点餐' },
  { category: 'study_abroad', difficulty: 'beginner', name: '宿舍报修', description: '练习宿舍设施报修' },
  { category: 'study_abroad', difficulty: 'beginner', name: '校园卡办理', description: '学习校园卡申请和充值' },
  { category: 'study_abroad', difficulty: 'beginner', name: '社团咨询', description: '练习社团加入咨询' },
  
  // Intermediate - 留学进阶
  { category: 'study_abroad', difficulty: 'intermediate', name: '选课咨询', description: '学习咨询课程和教授' },
  { category: 'study_abroad', difficulty: 'intermediate', name: '宿舍申请', description: '练习申请宿舍和报修' },
  { category: 'study_abroad', difficulty: 'intermediate', name: '签证咨询', description: '学习签证相关咨询对话' },
  { category: 'study_abroad', difficulty: 'intermediate', name: '奖学金申请', description: '练习奖学金申请流程' },
  { category: 'study_abroad', difficulty: 'intermediate', name: '转学咨询', description: '学习转学流程咨询' },
  { category: 'study_abroad', difficulty: 'intermediate', name: '实习申请', description: '练习实习机会申请' },
  { category: 'study_abroad', difficulty: 'intermediate', name: '论文指导', description: '学习论文导师沟通' },
  
  // Advanced - 留学高级
  { category: 'study_abroad', difficulty: 'advanced', name: '学术讨论', description: '练习学术研讨会表达' },
  { category: 'study_abroad', difficulty: 'advanced', name: '论文答辩', description: '学习论文答辩中的表达' },
  { category: 'study_abroad', difficulty: 'advanced', name: '学术会议', description: '练习学术会议发言' },
  { category: 'study_abroad', difficulty: 'advanced', name: '研究申请', description: '学习研究项目申请' },
  { category: 'study_abroad', difficulty: 'advanced', name: '毕业流程', description: '练习毕业手续办理' },
  { category: 'study_abroad', difficulty: 'advanced', name: '学历认证', description: '学习学历学位认证' },
  { category: 'study_abroad', difficulty: 'advanced', name: '留服咨询', description: '练习留学服务中心咨询' },
  
  // ===== 旅行场景 (15个) =====
  // Beginner - 旅行基础
  { category: 'travel', difficulty: 'beginner', name: '酒店预订', description: '学习预订酒店房间' },
  { category: 'travel', difficulty: 'beginner', name: '餐厅预订', description: '练习预订餐厅座位' },
  { category: 'travel', difficulty: 'beginner', name: '购买门票', description: '学习景点门票购买' },
  { category: 'travel', difficulty: 'beginner', name: '行李托运', description: '练习机场行李托运' },
  { category: 'travel', difficulty: 'beginner', name: '海关申报', description: '学习海关入境申报' },
  
  // Intermediate - 旅行进阶
  { category: 'travel', difficulty: 'intermediate', name: '预订机票', description: '学习预订和改签机票' },
  { category: 'travel', difficulty: 'intermediate', name: '租车服务', description: '练习租车和保险咨询' },
  { category: 'travel', difficulty: 'intermediate', name: '景点咨询', description: '学习询问景点信息' },
  { category: 'travel', difficulty: 'intermediate', name: '投诉建议', description: '练习旅行中投诉和反馈' },
  { category: 'travel', difficulty: 'intermediate', name: '旅游团咨询', description: '学习跟团旅游咨询' },
  { category: 'travel', difficulty: 'intermediate', name: '导游服务', description: '练习导游服务和讲解' },
  
  // Advanced - 旅行高级
  { category: 'travel', difficulty: 'advanced', name: '行程变更', description: '学习旅行计划变更' },
  { category: 'travel', difficulty: 'advanced', name: '紧急救援', description: '练习旅行紧急求助' },
  { category: 'travel', difficulty: 'advanced', name: '保险理赔', description: '学习旅行保险理赔' },
  { category: 'travel', difficulty: 'advanced', name: '签证面试', description: '练习签证面试问答' },
  
  // ===== 社交场景 (10个) =====
  // Beginner - 社交基础
  { category: 'social', difficulty: 'beginner', name: '闲聊', description: '学习日常闲聊话题' },
  { category: 'social', difficulty: 'beginner', name: '邀请朋友', description: '练习邀请和接受邀请' },
  { category: 'social', difficulty: 'beginner', name: '道别', description: '学习各种道别表达' },
  { category: 'social', difficulty: 'beginner', name: '感谢道歉', description: '练习感谢和道歉' },
  
  // Intermediate - 社交进阶
  { category: 'social', difficulty: 'intermediate', name: '讨论爱好', description: '学习讨论兴趣和爱好' },
  { category: 'social', difficulty: 'intermediate', name: '派对社交', description: '练习派对上的社交对话' },
  { category: 'social', difficulty: 'intermediate', name: '约会安排', description: '学习约会邀请和安排' },
  
  // Advanced - 社交高级
  { category: 'social', difficulty: 'advanced', name: '深度对话', description: '学习有深度的社交对话' },
  { category: 'social', difficulty: 'advanced', name: '文化讨论', description: '练习跨文化交流对话' },
  { category: 'social', difficulty: 'advanced', name: '辩论表达', description: '学习礼貌地表达不同意见' },
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
async function generateScene(template, index) {
  const sceneId = `${template.category}_${String(index).padStart(3, '0')}`;
  const roundCount = template.difficulty === 'beginner' ? 3 : template.difficulty === 'intermediate' ? 4 : 5;
  
  const prompt = `请生成一个高质量的英语学习场景，以JSON格式返回。

场景主题：${template.name}
类别：${template.category}
难度：${template.difficulty}
学习目标：${template.description}

必须严格按照以下JSON格式返回（不要添加任何注释）：

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
            "speaker_name": "用户角色名",
            "text": "英文对话内容",
            "translation": "中文翻译",
            "is_key_qa": true
          },
          {
            "index": 2,
            "speaker": "speaker2",
            "speaker_name": "服务角色名",
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

具体要求：
1. 对话必须有${roundCount}个回合（${template.difficulty}难度）
2. 每个回合有2个发言（speaker1和speaker2交替）
3. 每轮第一个发言 is_key_qa 设为 true
4. 词汇6-8个，必须包含 difficulty 字段
5. 音标使用标准IPA格式，如 /ˈtʃɛk.ɪn/
6. analysis 必须包含所有字段

只返回JSON，不要包含任何其他文字。`;

  try {
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
    sceneData.category = template.category;
    sceneData.difficulty = template.difficulty;
    
    // 验证词汇难度字段
    if (sceneData.vocabulary) {
      sceneData.vocabulary.forEach((vocab, idx) => {
        if (!vocab.difficulty) {
          // 根据场景难度自动分配
          const difficulties = template.difficulty === 'beginner' 
            ? ['easy', 'easy', 'easy', 'easy', 'medium', 'medium', 'hard']
            : template.difficulty === 'intermediate'
            ? ['easy', 'easy', 'medium', 'medium', 'medium', 'hard', 'hard']
            : ['easy', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard'];
          vocab.difficulty = difficulties[idx % difficulties.length];
        }
        // 确保有vocab_id
        vocab.vocab_id = `${sceneId}_vocab_${String(idx + 1).padStart(2, '0')}`;
      });
    }
    
    console.log(`✓ [${index}/${CONFIG.SCENE_COUNT}] ${sceneId} - ${template.name}`);
    return { success: true, data: sceneData, index };
    
  } catch (error) {
    console.error(`✗ [${index}/${CONFIG.SCENE_COUNT}] ${sceneId} - ${error.message}`);
    return { success: false, error: error.message, index };
  }
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('100个高频场景生成脚本');
  console.log('========================================');
  console.log(`生成数量: ${CONFIG.SCENE_COUNT}`);
  console.log(`并发数: ${CONFIG.CONCURRENCY}`);
  console.log(`GLM API Key: ${CONFIG.GLM_API_KEY ? '已设置' : '未设置'}`);
  console.log('');

  if (!CONFIG.GLM_API_KEY) {
    console.error('错误: 请设置 GLM_API_KEY 环境变量');
    process.exit(1);
  }

  // 创建输出目录
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  // 检查已有进度
  let startIndex = 0;
  let existingScenes = [];
  
  // 查找最新的检查点文件
  for (let i = 100; i >= 10; i -= 10) {
    const checkpointFile = path.join(CONFIG.OUTPUT_DIR, `scenes_checkpoint_${i}.json`);
    if (fs.existsSync(checkpointFile)) {
      try {
        existingScenes = JSON.parse(fs.readFileSync(checkpointFile, 'utf-8'));
        startIndex = existingScenes.length;
        console.log(`找到检查点: 已生成 ${startIndex} 个场景，继续生成剩余 ${CONFIG.SCENE_COUNT - startIndex} 个\n`);
        break;
      } catch {
        // 忽略损坏的检查点
      }
    }
  }

  // 准备任务列表（从上次中断的地方开始）
  const tasks = [];
  for (let i = startIndex; i < CONFIG.SCENE_COUNT; i++) {
    const template = SCENE_TEMPLATES[i % SCENE_TEMPLATES.length];
    tasks.push({ template, index: i + 1 });
  }

  if (tasks.length === 0) {
    console.log('所有场景已生成完成！');
    return;
  }

  // 并发生成场景
  const allScenes = [...existingScenes];
  const failedTasks = [];
  const startTime = Date.now();

  console.log('开始生成场景...\n');

  await asyncPool(CONFIG.CONCURRENCY, tasks, async (task) => {
    const result = await generateScene(task.template, task.index);
    
    if (result.success) {
      allScenes.push(result.data);
    } else {
      failedTasks.push({ ...task, error: result.error });
    }
    
    // 每生成10个保存一次
    const totalCount = allScenes.length;
    if (totalCount % 10 === 0 && totalCount > 0) {
      const checkpointFile = path.join(CONFIG.OUTPUT_DIR, `scenes_checkpoint_${totalCount}.json`);
      fs.writeFileSync(checkpointFile, JSON.stringify(allScenes, null, 2));
    }
  });

  // 保存最终文件
  const finalFile = path.join(CONFIG.OUTPUT_DIR, 'scenes_100.json');
  fs.writeFileSync(finalFile, JSON.stringify(allScenes, null, 2));

  // 如果有失败的，保存失败列表
  if (failedTasks.length > 0) {
    const failedFile = path.join(CONFIG.OUTPUT_DIR, 'scenes_failed.json');
    fs.writeFileSync(failedFile, JSON.stringify(failedTasks, null, 2));
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n========================================');
  console.log('生成完成!');
  console.log('========================================');
  console.log(`成功: ${allScenes.length} 个场景`);
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
