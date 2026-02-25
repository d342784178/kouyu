/**
 * 对话难度分类验证脚本 (ES Module版本)
 * 用于验证分类系统的准确性和一致性
 */

// ==================== 分类函数实现 ====================

const SIMPLE_VOCABULARY = new Set([
  'hello', 'hi', 'good', 'bad', 'yes', 'no', 'please', 'thank', 'sorry',
  'eat', 'drink', 'go', 'come', 'see', 'look', 'want', 'need', 'like',
  'big', 'small', 'hot', 'cold', 'new', 'old', 'happy', 'sad',
  'time', 'day', 'week', 'month', 'year', 'today', 'tomorrow',
  'water', 'food', 'book', 'pen', 'car', 'house', 'school'
]);

const DAILY_VOCABULARY = new Set([
  'restaurant', 'hotel', 'airport', 'hospital', 'supermarket',
  'conversation', 'appointment', 'reservation', 'recommendation',
  'delicious', 'comfortable', 'convenient', 'available', 'expensive',
  'breakfast', 'lunch', 'dinner', 'menu', 'order', 'bill', 'tip',
  'check-in', 'check-out', 'room', 'reception', 'elevator'
]);

const ADVANCED_VOCABULARY = new Set([
  'intriguing', 'fascinating', 'exceptional', 'remarkable', 'stunning',
  'exquisite', 'magnificent', 'breathtaking', 'phenomenal', 'spectacular'
]);

const IDIOMS = new Set([
  'break the ice', 'piece of cake', 'hit the road', 'call it a day',
  'under the weather', 'once in a blue moon', 'bite the bullet',
  'cut corners', 'hit the nail on the head', 'let the cat out of the bag'
]);

const SLANG = new Set([
  'gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'dunno',
  'cool', 'awesome', 'lit', 'chill', 'hang out', 'catch up',
  'no biggie', 'my bad', 'you bet', 'fair enough', 'spot on'
]);

const SPEECH_RATE_CONFIG = {
  easy: { rate: 1.0, label: '慢速', description: 'AI语速慢，便于初学者理解', wpm: 140 },
  medium: { rate: 1.15, label: '正常', description: '正常语速，日常对话速度', wpm: 160 },
  hard: { rate: 1.3, label: '较快', description: '语速较快，地道表达', wpm: 180 }
};

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const match = word.match(/[aeiouy]{1,2}/g);
  return match ? match.length : 1;
}

function analyzeSentenceComplexity(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 'simple';

  let totalClauses = 0;
  const conjunctions = ['and', 'but', 'or', 'so', 'because', 'although', 'while', 'if', 'when', 'that', 'which', 'who'];

  for (const sentence of sentences) {
    let clauseCount = 1;
    const words = sentence.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (conjunctions.includes(word)) {
        clauseCount++;
      }
    }
    totalClauses += clauseCount;
  }

  const avgClauses = totalClauses / sentences.length;
  if (avgClauses >= 2.5) return 'complex';
  if (avgClauses >= 1.5) return 'compound';
  return 'simple';
}

function detectIdioms(text) {
  const lowerText = text.toLowerCase();
  for (const idiom of IDIOMS) {
    if (lowerText.includes(idiom)) return true;
  }
  return false;
}

function detectSlang(text) {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  for (const word of words) {
    if (SLANG.has(word)) return true;
  }
  for (const slang of SLANG) {
    if (slang.includes(' ') && lowerText.includes(slang)) return true;
  }
  return false;
}

function calculateVocabularyScore(text) {
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  if (words.length === 0) return { score: 0, level: 'simple' };

  let advancedCount = 0;
  let dailyCount = 0;
  let totalSyllables = 0;
  let totalLength = 0;

  for (const word of words) {
    totalSyllables += countSyllables(word);
    totalLength += word.length;

    if (DAILY_VOCABULARY.has(word)) {
      dailyCount++;
    } else if (ADVANCED_VOCABULARY.has(word)) {
      advancedCount++;
    }
  }

  const avgSyllables = totalSyllables / words.length;
  const avgLength = totalLength / words.length;

  let score = 0;
  if (avgSyllables > 2.5) score += 30;
  else if (avgSyllables > 1.8) score += 15;

  if (avgLength > 6) score += 30;
  else if (avgLength > 4.5) score += 15;

  if (advancedCount > 0) score += 25;
  if (dailyCount > words.length * 0.1) score += 15;

  let level;
  if (score >= 60) level = 'advanced';
  else if (score >= 30) level = 'daily';
  else level = 'simple';

  return { score: Math.min(score, 100), level };
}

function classifyText(text) {
  const words = text.match(/\b[a-zA-Z]+\b/g) || [];
  const wordCount = words.length;

  if (wordCount === 0) {
    return {
      level: 'easy',
      vocabularyLevel: 'simple',
      sentenceComplexity: 'simple',
      hasIdioms: false,
      hasSlang: false,
      wordCount: 0,
      avgWordLength: 0,
      confidence: 0
    };
  }

  const totalLength = words.reduce((sum, word) => sum + word.length, 0);
  const avgWordLength = totalLength / wordCount;
  const vocabResult = calculateVocabularyScore(text);
  const sentenceComplexity = analyzeSentenceComplexity(text);
  const hasIdioms = detectIdioms(text);
  const hasSlang = detectSlang(text);

  let level;
  let confidence = 0.8;

  if (vocabResult.level === 'advanced' || hasIdioms || hasSlang || sentenceComplexity === 'complex') {
    level = 'hard';
    confidence = 0.9;
  } else if (vocabResult.level === 'daily' || sentenceComplexity === 'compound') {
    level = 'medium';
    confidence = 0.85;
  } else {
    level = 'easy';
    confidence = 0.9;
  }

  if (avgWordLength < 4 && wordCount < 10 && !hasIdioms && !hasSlang) {
    level = 'easy';
    confidence = 0.95;
  }

  return {
    level,
    vocabularyLevel: vocabResult.level,
    sentenceComplexity,
    hasIdioms,
    hasSlang,
    wordCount,
    avgWordLength: Math.round(avgWordLength * 100) / 100,
    confidence: Math.round(confidence * 100) / 100
  };
}

function classifySpeechRate(difficultyLevel, wordsPerMinute) {
  const config = SPEECH_RATE_CONFIG[difficultyLevel];

  // 使用配置的WPM值或传入的自定义值
  const calculatedWPM = wordsPerMinute ?? config.wpm;

  let speechRate;
  if (calculatedWPM < 140) {
    speechRate = 'slow';
  } else if (calculatedWPM <= 160) {
    speechRate = 'normal';
  } else {
    speechRate = 'fast';
  }

  return {
    level: difficultyLevel,
    speechRate,
    rateValue: config.rate,
    wordsPerMinute: calculatedWPM,
    confidence: 0.9
  };
}

function classifyConversation(text, difficultyLevel, wordsPerMinute) {
  const textClassification = classifyText(text);
  const speechClassification = classifySpeechRate(difficultyLevel, wordsPerMinute);

  let overallLevel = difficultyLevel;

  if (difficultyLevel === 'easy' && textClassification.level === 'hard') {
    overallLevel = 'medium';
  } else if (difficultyLevel === 'hard' && textClassification.level === 'easy') {
    overallLevel = 'medium';
  }

  return {
    text: textClassification,
    speech: speechClassification,
    overallLevel,
    timestamp: Date.now()
  };
}

function getDifficultyDescription(level) {
  const descriptions = {
    easy: {
      label: '入门',
      description: 'AI语速慢，词汇简单',
      textCharacteristics: ['基础词汇', '常用词', '避免俚语'],
      speechCharacteristics: '语速较慢 (WPM: 140)，清晰发音，适当停顿'
    },
    medium: {
      label: '标准',
      description: '正常语速，日常词汇',
      textCharacteristics: ['日常词汇', '适量习语', '自然表达'],
      speechCharacteristics: '正常语速 (WPM: 160)，自然流畅，标准发音'
    },
    hard: {
      label: '挑战',
      description: '语速较快，地道表达',
      textCharacteristics: ['高级词汇', '地道俚语', '隐含意图'],
      speechCharacteristics: '语速较快 (WPM: 180)，地道俚语，隐含表达'
    }
  };

  return descriptions[level];
}

// ==================== 测试用例 ====================

const TEST_CASES = [
  { text: 'Hello! How are you?', expectedLevel: 'easy', description: '简单问候语' },
  { text: 'I want to eat food. Thank you!', expectedLevel: 'easy', description: '基础表达' },
  { text: 'Please help me. I need water.', expectedLevel: 'easy', description: '简单请求' },
  { text: 'Welcome to our restaurant! What would you like to order today?', expectedLevel: 'medium', description: '餐厅场景开场' },
  { text: 'I would like to make a reservation for dinner tonight.', expectedLevel: 'medium', description: '预订表达' },
  { text: 'Could you please recommend something delicious from the menu?', expectedLevel: 'medium', description: '礼貌询问' },
  { text: 'This is absolutely fascinating! The ambiance here is truly exquisite.', expectedLevel: 'hard', description: '高级词汇表达' },
  { text: 'I gotta say, this place is lit! Wanna hang out later?', expectedLevel: 'hard', description: '俚语使用' },
  { text: 'It is once in a blue moon that you find such exceptional cuisine.', expectedLevel: 'hard', description: '习语使用' },
  { text: 'No biggie, but I think we should hit the road soon.', expectedLevel: 'hard', description: '地道俚语' }
];

// ==================== 验证函数 ====================

function runValidationTests() {
  const details = [];
  let passedCount = 0;

  console.log('========================================');
  console.log('   对话难度分类系统验证测试');
  console.log('========================================\n');

  for (const testCase of TEST_CASES) {
    const classification = classifyConversation(testCase.text, testCase.expectedLevel);
    const textClassification = classification.text;

    const passed = textClassification.level === testCase.expectedLevel;
    if (passed) passedCount++;

    details.push({
      testCase,
      actualLevel: textClassification.level,
      passed,
      classification
    });

    console.log(`测试: ${testCase.description}`);
    console.log(`文本: "${testCase.text}"`);
    console.log(`期望级别: ${testCase.expectedLevel}`);
    console.log(`实际级别: ${textClassification.level}`);
    console.log(`词汇复杂度: ${textClassification.vocabularyLevel}`);
    console.log(`句子复杂度: ${textClassification.sentenceComplexity}`);
    console.log(`包含习语: ${textClassification.hasIdioms}`);
    console.log(`包含俚语: ${textClassification.hasSlang}`);
    console.log(`置信度: ${textClassification.confidence}`);
    console.log(`结果: ${passed ? '✅ 通过' : '❌ 失败'}`);
    console.log('----------------------------------------\n');
  }

  return {
    totalTests: TEST_CASES.length,
    passedTests: passedCount,
    failedTests: TEST_CASES.length - passedCount,
    accuracy: Math.round((passedCount / TEST_CASES.length) * 100),
    details
  };
}

function validateSpeechRateConfig() {
  console.log('========================================');
  console.log('   语速配置验证');
  console.log('========================================\n');

  const levels = ['easy', 'medium', 'hard'];

  for (const level of levels) {
    const speechResult = classifySpeechRate(level);
    const description = getDifficultyDescription(level);

    console.log(`难度级别: ${level} (${description.label})`);
    console.log(`描述: ${description.description}`);
    console.log(`语速等级: ${speechResult.speechRate}`);
    console.log(`SSML Rate值: ${speechResult.rateValue}`);
    console.log(`预估WPM: ${speechResult.wordsPerMinute}`);
    console.log(`语音特征: ${description.speechCharacteristics}`);
    console.log(`文本特征: ${description.textCharacteristics.join(', ')}`);
    console.log('----------------------------------------\n');
  }
}

function validateConsistency() {
  console.log('========================================');
  console.log('   分类一致性验证');
  console.log('========================================\n');

  const testText = 'Welcome to our restaurant!';
  const results = [];

  for (let i = 0; i < 5; i++) {
    const result = classifyText(testText);
    results.push(result.level);
  }

  const allSame = results.every(r => r === results[0]);
  console.log(`测试文本: "${testText}"`);
  console.log(`5次分类结果: ${results.join(', ')}`);
  console.log(`一致性: ${allSame ? '✅ 一致' : '❌ 不一致'}`);
  console.log('----------------------------------------\n');
}

function validateEdgeCases() {
  console.log('========================================');
  console.log('   边界情况验证');
  console.log('========================================\n');

  const edgeCases = [
    { text: '', description: '空文本' },
    { text: '!!!???', description: '只有标点' },
    { text: '你好世界', description: '中文文本' },
    { text: 'Hi', description: '极短文本' },
    { text: 'a b c d e', description: '单字母单词' }
  ];

  for (const testCase of edgeCases) {
    const result = classifyText(testCase.text);

    console.log(`边界情况: ${testCase.description}`);
    console.log(`文本: "${testCase.text}"`);
    console.log(`分类结果: ${result.level}`);
    console.log(`词数: ${result.wordCount}`);
    console.log(`验证状态: ${result.wordCount > 0 ? '✅ 有效' : '⚠️ 警告'}`);
    console.log('----------------------------------------\n');
  }
}

function generateReport(report) {
  console.log('========================================');
  console.log('   验证报告汇总');
  console.log('========================================\n');
  console.log(`总测试数: ${report.totalTests}`);
  console.log(`通过数: ${report.passedTests}`);
  console.log(`失败数: ${report.failedTests}`);
  console.log(`准确率: ${report.accuracy}%`);
  console.log('\n========================================');

  if (report.failedTests > 0) {
    console.log('\n失败的测试:');
    report.details
      .filter(d => !d.passed)
      .forEach(d => {
        console.log(`  - ${d.testCase.description}: 期望 ${d.testCase.expectedLevel}, 实际 ${d.actualLevel}`);
      });
  }
}

// ==================== 主函数 ====================

function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     对话难度分类系统 - 完整验证测试                    ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\n');

  const report = runValidationTests();
  validateSpeechRateConfig();
  validateConsistency();
  validateEdgeCases();
  generateReport(report);

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  if (report.accuracy >= 80) {
    console.log('║  ✅ 验证通过 - 分类系统工作正常                        ║');
  } else if (report.accuracy >= 60) {
    console.log('║  ⚠️ 验证警告 - 分类系统需要优化                        ║');
  } else {
    console.log('║  ❌ 验证失败 - 分类系统需要修复                        ║');
  }
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\n');
}

main();
