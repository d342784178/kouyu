// Scene types
export interface Scene {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  tags: string[];
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
