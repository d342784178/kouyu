# 对话难度分类系统

## 概述

本系统根据视觉规范对开放式对话测试中的对话文本和音频语速进行系统化分类，确保三个难度等级（入门、标准、挑战）的一致性和准确性。

## 难度等级定义

| 等级 | 标签 | 描述 | 语速配置 | 词汇特征 |
|------|------|------|----------|----------|
| easy | 入门 | AI语速慢，词汇简单 | 1.0倍速 (WPM: 130) | 基础词汇、常用词、避免俚语 |
| medium | 标准 | 正常语速，日常词汇 | 1.15倍速 (WPM: 150) | 日常词汇、适量习语、自然表达 |
| hard | 挑战 | 语速较快，地道表达 | 1.3倍速 (WPM: 170) | 高级词汇、地道俚语、隐含意图 |

## 核心功能

### 1. 文本分类 (`classifyText`)

分析对话文本的复杂度，从以下维度进行评估：

- **词汇复杂度**：基于音节数、词长、词汇库匹配
- **句子复杂度**：分析从句数量和连接词使用
- **习语检测**：识别常用英语习语
- **俚语检测**：识别地道俚语表达

### 2. 语速分类 (`classifySpeechRate`)

根据难度等级配置SSML语速参数：

```typescript
const SPEECH_RATE_CONFIG = {
  easy: { rate: 1.0, label: '慢速', wpm: 130 },
  medium: { rate: 1.15, label: '正常', wpm: 150 },
  hard: { rate: 1.3, label: '较快', wpm: 170 }
}
```

### 3. 综合分类 (`classifyConversation`)

结合文本分析和语速配置，输出完整的分类结果：

```typescript
interface ClassificationResult {
  text: TextClassificationResult      // 文本分析结果
  speech: SpeechRateClassificationResult // 语速配置
  overallLevel: DifficultyLevel       // 综合难度等级
  timestamp: number                   // 分类时间戳
}
```

### 4. SSML生成 (`generateSSML`)

根据难度等级生成SSML标记语言，用于Azure语音合成：

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
    <voice name="en-US-AriaNeural">
        <prosody rate="0.85">
            <!-- 文本内容 -->
        </prosody>
    </voice>
</speak>
```

## 使用示例

### 基本用法

```typescript
import { classifyConversation, generateSSML } from '@/lib/conversation/difficulty-classifier'

// 分类对话
const result = classifyConversation(
  'Welcome to our restaurant!',
  'medium'
)

console.log(result.text.level)      // 'medium'
console.log(result.speech.rateValue) // 1.0

// 生成SSML
const ssml = generateSSML('Hello!', 'easy')
// 输出: <speak ...><prosody rate="0.85">Hello!</prosody>...</speak>
```

### 在语音生成中使用

```typescript
import { generateSpeech } from '@/app/api/open-test/utils/speechGenerator'

const result = await generateSpeech({
  text: 'Welcome to our restaurant!',
  voice: 'en-US-AriaNeural',
  difficultyLevel: 'medium'  // 自动应用相应的语速配置
})
```

## 分类标准

### 词汇复杂度指标

| 等级 | 最大平均词长 | 最大音节数 | 特征 |
|------|-------------|-----------|------|
| easy | 5 | 2 | 基础词汇，无复杂词 |
| medium | 6 | 3 | 日常词汇，最多3个复杂词 |
| hard | 8 | 4 | 高级词汇，无限制 |

### 句子复杂度指标

| 等级 | 最大从句数 | 特征 |
|------|-----------|------|
| easy | 1 | 简单句，短句，直接表达 |
| medium | 2 | 复合句，连接词使用 |
| hard | 4 | 复杂句，多重从句 |

## 验证测试

运行验证脚本：

```bash
node src/lib/conversation/__tests__/validate-classification.mjs
```

验证内容包括：
- 文本分类准确性测试
- 语速配置一致性验证
- 分类结果一致性检查
- 边界情况处理验证

当前验证结果：**准确率 80%** (8/10 测试通过)

## 文件结构

```
src/lib/conversation/
├── difficulty-classifier.ts          # 核心分类系统
├── __tests__/
│   ├── difficulty-classifier.test.ts # Jest单元测试
│   └── validate-classification.mjs   # 验证脚本
└── README.md                         # 本文档
```

## 集成点

### 1. 语音生成器 (`speechGenerator.ts`)

已集成难度等级参数，根据选择的难度自动调整语速：

```typescript
const speechResult = await generateSpeech({
  text: assistantMessage,
  voice: 'en-US-AriaNeural',
  difficultyLevel: difficultyLevel  // 'easy' | 'medium' | 'hard'
})
```

### 2. 对话初始化API (`initiate/route.ts`)

传递难度等级到语音生成：

```typescript
const speechResult = await generateSpeech({
  text: assistantMessage,
  voice: 'en-US-AriaNeural',
  difficultyLevel: difficultyLevel
})
```

### 3. 对话继续API (`continue/route.ts`)

同样支持难度等级配置：

```typescript
const speechResult = await generateSpeech({
  text: assistantMessage,
  voice: 'en-US-AriaNeural',
  difficultyLevel: difficultyLevel
})
```

## 注意事项

1. **入门级别语速**：使用1.0倍速 (WPM: 130)
2. **标准级别语速**：使用1.15倍速 (WPM: 150)
3. **挑战级别语速**：使用1.3倍速 (WPM: 170)
3. **文本分析置信度**：系统会返回置信度分数，低置信度时会进行校准
4. **边界情况**：空文本、纯标点、中文文本等会被正确处理

## 扩展建议

1. **词汇库扩展**：可以继续扩充SIMPLE_VOCABULARY、DAILY_VOCABULARY、ADVANCED_VOCABULARY
2. **习语库扩展**：添加更多场景相关的习语
3. **机器学习**：未来可以引入ML模型进行更精准的分类
4. **用户反馈**：收集用户反馈来优化分类标准
