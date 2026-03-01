// Scene types
export interface Scene {
  id: string;
  name: string;
  description: string;
  category: string;  // 中文: 日常/职场/留学/旅行/社交
  difficulty: string; // 中文: 初级/中级/高级
  duration: number;  // 学习时长（分钟）
  tags: string[];
  createdAt?: string;  // 创建时间
  updatedAt?: string;  // 更新时间
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

// ============================================================
// 场景学习增强模块 - 新增接口定义
// ============================================================

// 从数据库 schema 导入子场景和问答对类型
import type { SubScene, QAPair } from '@/lib/db/schema'
export type { SubScene, QAPair }

/**
 * QAPair.responses 字段中每条回应的结构
 */
export interface QAResponse {
  /** 英文表达，如 "Hot, please." */
  text: string
  /** 中文翻译，如 "要热的。" */
  text_cn: string
  /** COS:/ 协议音频路径 */
  audio_url: string
}

/**
 * 子场景详情 API 响应结构
 * GET /api/sub-scenes/[subSceneId]
 */
export interface SubSceneDetailResponse {
  subScene: SubScene
  qaPairs: QAPair[]
  /** 该场景下子场景总数 */
  totalSubScenes: number
  /** 当前子场景在场景中的位置（1-based） */
  currentIndex: number
}

/**
 * 选择题选项
 */
export interface ChoiceOption {
  id: string
  text: string
  isCorrect: boolean
}

/**
 * 填空题空格项
 */
export interface BlankItem {
  index: number
  /** 正确答案（用于前端对比） */
  answer: string
}

/**
 * 练习题联合类型（选择题 / 填空题 / 问答题）
 */
export type PracticeQuestion =
  | { type: 'choice'; qaId: string; audioUrl: string; options: ChoiceOption[] }
  | { type: 'fill_blank'; qaId: string; template: string; blanks: BlankItem[] }
  | { type: 'speaking'; qaId: string; speakerText: string; speakerTextCn: string }

/**
 * AI 模拟对话 API 请求体
 * POST /api/sub-scenes/[subSceneId]/ai-dialogue
 */
export interface AIDialogueRequest {
  /** 用户本轮输入的文字 */
  userMessage: string
  /** 当前正在处理的 QA_Pair 索引（0-based） */
  currentQaIndex: number
  /** 本轮对话历史 */
  conversationHistory: { role: 'ai' | 'user'; text: string }[]
}

/**
 * AI 模拟对话 API 响应体
 */
export interface AIDialogueResponse {
  /** 本轮用户回应是否通过语义匹配 */
  pass: boolean
  /** 下一个待处理的 QA_Pair 索引（0-based） */
  nextQaIndex: number
  /** 下一条 speaker_text 或提示语 */
  aiMessage?: string
  /** 是否所有 QA_Pair 都已完成 */
  isComplete: boolean
  /** 回应不匹配时的具体提示信息（中文） */
  hint?: string
  /** 判断用户回应是否通过的理由（中文） */
  reason?: string
}

/**
 * 对话后处理（Review）API 请求体
 * POST /api/sub-scenes/[subSceneId]/review
 */
export interface ReviewRequest {
  /** 流畅度得分（0-100） */
  fluencyScore: number
  /** 本次对话历史记录 */
  dialogueHistory: { qaId: string; userText: string; passed: boolean }[]
}

/**
 * 对话后处理（Review）API 响应体
 */
export interface ReviewResponse {
  /** 需要高亮标注的条目列表 */
  highlights: ReviewHighlight[]
}

/**
 * 单条高亮标注项
 */
export interface ReviewHighlight {
  qaId: string
  /** 用户原始表达 */
  userText: string
  /** 问题描述 */
  issue: string
  /** 更地道的表达建议 */
  betterExpression: string
}
