// Scene types
export interface Scene {
  id: string;
  name: string;
  description: string;
  category: string;  // 中文: 日常/职场/留学/旅行/社交
  difficulty: string; // 中文: 初级/中级/高级
  duration: number;  // 学习时长（分钟），根据内容动态计算
  tags: string[];
  dialogue: DialogueItem[];
  vocabulary: VocabularyItem[];
}

// 对话项
export interface DialogueItem {
  round_number: number;
  speaker: string;
  speaker_name: string;
  text: string;
  translation: string;
  audio_url: string;  // 统一使用 audio_url
  is_key_qa: boolean;
  index: number;
}

// 词汇项
export interface VocabularyItem {
  vocab_id: string;
  type: string;
  content: string;
  phonetic: string;
  translation: string;
  difficulty: string;
  round_number: number;
  audio_url: string;  // 统一使用 audio_url（原 word_audio_url）
  example: string;    // 统一使用 example（原 example_sentence）
  example_translation: string;
  example_audio_url: string;
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
  role: 'ai' | 'user';
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
