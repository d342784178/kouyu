// 定义消息类型
export interface Message {
  role: 'assistant' | 'user'
  content: string
  audioUrl?: string
  timestamp: number
}

// 定义测试状态类型
export type TestStatus = 'idle' | 'analyzing' | 'role-selection' | 'initializing' | 'active' | 'completed'

// 难度等级
export type DifficultyLevel = 'easy' | 'medium' | 'hard'

// 角色定义
export interface Role {
  id: string
  name: string
  description: string
  emoji: string
}

// 定义题目分析结果类型 - 匹配原型图
export interface QuestionAnalysis {
  sceneType: string
  sceneDescription: string
  aiRole: Role
  userRoles: Role[]
  dialogueGoal: string
  suggestedTopics: string[]
}

// 难度配置
export interface DifficultyConfig {
  label: string
  desc: string
  color: string
  bg: string
}

// 开放式对话内容（来自数据库）
export interface OpenDialogueContent {
  topic: string
  description: string
  roles: {
    name: string
    description: string
    is_user: boolean
  }[]
  scenario_context: string
  suggested_opening: string
  analysis: string
}

// OpenTestDialog 组件 Props
export interface OpenTestDialogProps {
  sceneId: string
  testId: string
  testContent: OpenDialogueContent
  currentIndex?: number
  totalTests?: number
  onComplete: () => void
  autoStart?: boolean
}

// 子组件共享的 Props 类型
export interface ViewProps {
  onBack?: () => void
}

export interface AnalyzingViewProps extends ViewProps {
  message?: string
  subMessage?: string
}

export interface RoleSelectionViewProps extends ViewProps {
  questionAnalysis: QuestionAnalysis | null
  selectedRole: string
  difficultyLevel: DifficultyLevel
  voiceEnabled: boolean
  error: string
  sceneName: string
  onSelectRole: (role: string) => void
  onSelectDifficulty: (level: DifficultyLevel) => void
  onToggleVoice: () => void
  onConfirm: () => void
}

export interface InitializingViewProps extends ViewProps {
  message?: string
  subMessage?: string
}

export interface ActiveChatViewProps extends ViewProps {
  messages: Message[]
  currentRound: number
  maxRounds: number
  isRecording: boolean
  isGeneratingResponse: boolean
  playingMessageIndex: number | null
  error: string
  isRoundLimitReached: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onPlayAudio: (audioUrl: string, index: number) => void
  onSendText: (text: string) => void
  onSubmitEvaluation: () => void
  messagesEndRef: React.RefObject<HTMLDivElement>
}

export interface CompletedViewProps extends ViewProps {
  currentRound: number
  sceneId: string
  testId: string
  messages: Message[]
  onViewAnalysis: () => void
  onComplete: () => void
}
