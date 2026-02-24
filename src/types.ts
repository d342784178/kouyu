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
