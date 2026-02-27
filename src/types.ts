// Scene types
export interface Scene {
  id: string;
  name: string;
  description: string;
  category: string;  // 中文: 日常/职场/留学/旅行/社交
  difficulty: string; // 中文: 初级/中级/高级
  duration: number;  // 学习时长（分钟）
  tags: string[];
  dialogue: DialogueRound[];  // 按轮次分组的对话数组
  vocabulary: VocabularyItem[];
  createdAt?: string;  // 创建时间
  updatedAt?: string;  // 更新时间
}

// 对话内容项
export interface DialogueContent {
  index: number;
  speaker: string;
  speaker_name: string;
  text: string;
  translation: string;
  audio_url: string;
  is_key_qa: boolean;
}

// 对话分析
export interface DialogueAnalysis {
  analysis_detail: string;
  standard_answer: {
    text: string;
    translation: string;
    scenario: string;
    formality: 'casual' | 'neutral' | 'formal';
  };
  alternative_answers: Array<{
    text: string;
    translation: string;
    scenario: string;
    formality: 'casual' | 'neutral' | 'formal';
  }>;
  usage_notes: string;
}

// 对话轮次
export interface DialogueRound {
  round_number: number;
  content: DialogueContent[];
  analysis?: DialogueAnalysis;
}

// 词汇项
export interface VocabularyItem {
  vocab_id: string;
  type: string;
  content: string;
  phonetic: string;
  translation: string;
  round_number: number;
  audio_url: string;
  example: string;
  example_translation: string;
  example_audio_url: string;
  difficulty?: string;
}

// Test types
export interface TestResult {
  isCorrect: boolean;
  score: number;
  analysis: string;
  suggestion: string;
  userAnswer?: string;
  correctAnswer?: string;
}

// Open test types
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Role {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export interface AnalysisResult {
  sceneType: string;
  sceneDescription: string;
  aiRole: Role;
  userRoles: Role[];
  dialogueGoal: string;
  suggestedTopics: string[];
}

export interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  timestamp: number;
}

export interface PerformanceAnalysis {
  score: number;
  fluency: number;
  vocabulary: number;
  accuracy: number;
  summary: string;
  strengths: string[];
  suggestions: string[];
}

// ============================================================
// 场景测试题型 content 结构定义（新增题型）
// ============================================================

/**
 * 填空题（Pattern Drill）content 结构
 * 基于对话关键句型的填空式替换练习
 */
export interface FillBlankContent {
  /** 句型模板，使用 ___ 作为空格占位符，例如 "I'd like to ___." */
  template: string;
  /** 场景提示文字，引导用户理解填写意图 */
  scenarioHint: string;
  /** 参考答案（可能有多个合理答案，取第一个为主要参考） */
  referenceAnswer: string;
  /** 关键词列表，提示用户可使用的词汇 */
  keywords: string[];
}

/**
 * 情景再现题型（Guided Role-play）content 结构
 * 指定情景意图让用户自主组织语言的题型
 */
export interface GuidedRoleplayContent {
  /** 情景描述，说明当前对话背景 */
  situationDescription: string;
  /** 对话目标，明确用户需要达成的沟通意图 */
  dialogueGoal: string;
  /** 关键词提示列表（仅含名词、动词等，不含完整句子） */
  keywordHints: string[];
  /** 评测维度列表，如 ["意图达成度", "语言自然度", "词汇使用"] */
  evaluationDimensions: string[];
}

/**
 * 词汇激活题型（Vocabulary Activation）content 结构
 * 帮助词汇从"认识"到"会用"转化的题型
 */
export interface VocabActivationContent {
  /** 中文提示，引导用户回忆对应英文词汇 */
  chineseHint: string;
  /** 目标英文词汇（正确答案） */
  targetWord: string;
  /** 词性，如 "noun"、"verb"、"adjective" */
  partOfSpeech: string;
  /** 所属场景 ID */
  sceneId: string;
  /** 例句（英文） */
  exampleSentence: string;
  /** 例句翻译（中文） */
  exampleTranslation: string;
  /** 音标，如 "/ˈwelkəm/" */
  phonetic?: string;
  /** 例句音频 URL */
  exampleAudioUrl?: string;
}

/**
 * 跟读评测结果接口
 * 由 Microsoft Cognitive Services Speech SDK 返回
 */
export interface ShadowingResult {
  /** 总分（0-100） */
  score: number;
  /** 发音准确度评分（0-100） */
  accuracyScore: number;
  /** 语调评分（0-100） */
  intonationScore: number;
  /** 逐词反馈数组 */
  wordFeedback: Array<{
    /** 单词文本 */
    word: string;
    /** 是否发音正确 */
    isCorrect: boolean;
    /** 该词得分（0-100） */
    score: number;
  }>;
}

/**
 * 场景测试题目联合类型（扩展现有题型，新增 fill_blank、guided_roleplay、vocab_activation）
 * 与数据库 scene_tests 表对应，type 字段标识题型
 */
export interface SceneTest {
  id: string;
  sceneId: string;
  /** 题目类型：现有题型 + 新增题型 */
  type: 'choice' | 'qa' | 'open_dialogue' | 'fill_blank' | 'guided_roleplay' | 'vocab_activation';
  /** 题目顺序 */
  order: number;
  /** 题目内容，根据 type 对应不同的 content 结构 */
  content: unknown;
}
