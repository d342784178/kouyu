// 类型定义文件

export interface Phrase {
  id: string;
  english: string;
  chinese: string;
  partOfSpeech: string;
  scene: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  pronunciationTips: string;
  audioUrl: string | null;
  phonetic?: string;
}

export interface DialogueContent {
  speaker: string;
  text: string;
  translation: string;
  audio_url?: string;
}

export interface QAAnalysis {
  question: string;
  answer: string;
  alternatives?: string[];
  explanation?: string;
}

export interface DialogueRound {
  round_number: number;
  content: DialogueContent[];
  analysis?: QAAnalysis;
}

export interface Dialogue {
  full_audio_url: string;
  duration: number;
  rounds: DialogueRound[];
}

export interface Vocabulary {
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  audioUrl?: string;
}

export interface Scene {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  dialogue: Dialogue;
  vocabulary: Vocabulary[];
  imageUrl?: string;
}

export interface TestContent {
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
  context?: string;
}

export interface SceneTest {
  id: string;
  sceneId: string;
  type: 'choice' | 'fill_blank' | 'qa' | 'open';
  order: number;
  content: TestContent;
}

export interface TestResult {
  isCorrect: boolean;
  score: number;
  analysis: string;
  suggestion: string;
  userAnswer?: string;
  correctAnswer?: string;
}

export interface UserProgress {
  todayLearned: number;
  todayMinutes: number;
  consecutiveDays: number;
  reviewCount: number;
  totalLearned: number;
}
