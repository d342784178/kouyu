/**
 * 角色扮演标准化测试用例
 * 用于验证AI角色模拟的准确性和一致性
 *
 * 测试覆盖维度：
 * 1. 角色身份认知准确性
 * 2. 语言风格与角色匹配度
 * 3. 互动响应中角色一致性
 * 4. 极端/模糊场景下的角色坚持度
 */

// 测试结果接口
export interface RolePlayTestResult {
  testId: string
  testName: string
  scene: string
  aiRole: string
  userRole: string
  passed: boolean
  score: number
  details: {
    promptValid: boolean
    promptIssues: string[]
    responseValid: boolean
    responseIssues: string[]
    roleConsistency: number
  }
  timestamp: string
}

// 测试用例定义
export interface RolePlayTestCase {
  id: string
  name: string
  description: string
  scene: string
  aiRole: string
  userRole: string
  dialogueGoal: string
  difficultyLevel: 'easy' | 'medium' | 'hard'
  expectedBehavior: {
    openingIndicators: string[]
    forbiddenIndicators: string[]
    expectedStyle: 'formal' | 'casual' | 'professional' | 'friendly'
  }
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
  isEdgeCase?: boolean
}

// ==================== 5种核心场景测试用例 ====================

export const rolePlayTestCases: RolePlayTestCase[] = [
  // 场景1: 餐厅 - AI作为顾客
  {
    id: 'RESTAURANT_CUSTOMER_001',
    name: '餐厅场景 - AI作为顾客',
    description: '验证AI在餐厅场景中准确扮演顾客角色，而非服务员',
    scene: '餐厅',
    aiRole: '顾客',
    userRole: '服务员',
    dialogueGoal: '点餐',
    difficultyLevel: 'medium',
    expectedBehavior: {
      openingIndicators: ['menu', 'table', 'reservation', 'order', 'hungry', 'like to', 'would like', 'could i', 'can i'],
      forbiddenIndicators: ['welcome to our restaurant', 'what can i get for you', 'how can i help you', 'are you ready to order'],
      expectedStyle: 'casual'
    }
  },

  // 场景2: 酒店 - AI作为客人
  {
    id: 'HOTEL_GUEST_001',
    name: '酒店场景 - AI作为客人',
    description: '验证AI在酒店场景中准确扮演客人角色，而非接待员',
    scene: '酒店',
    aiRole: '客人',
    userRole: '接待员',
    dialogueGoal: '办理入住',
    difficultyLevel: 'medium',
    expectedBehavior: {
      openingIndicators: ['reservation', 'check in', 'room', 'booked', 'name is', 'have a reservation', 'would like to check'],
      forbiddenIndicators: ['welcome to our hotel', 'may i help you', 'do you have a reservation', 'how was your stay'],
      expectedStyle: 'casual'
    }
  },

  // 场景3: 商店 - AI作为顾客
  {
    id: 'SHOPPING_CUSTOMER_001',
    name: '购物场景 - AI作为顾客',
    description: '验证AI在购物场景中准确扮演顾客角色，而非店员',
    scene: '商店',
    aiRole: '顾客',
    userRole: '店员',
    dialogueGoal: '选购商品',
    difficultyLevel: 'medium',
    expectedBehavior: {
      openingIndicators: ['looking for', 'help me find', 'do you have', 'size', 'color', 'price', 'interested in'],
      forbiddenIndicators: ['welcome to our store', 'how can i help you', 'are you looking for', 'can i help you find'],
      expectedStyle: 'casual'
    }
  },

  // 场景4: 机场 - AI作为旅客
  {
    id: 'AIRPORT_PASSENGER_001',
    name: '机场场景 - AI作为旅客',
    description: '验证AI在机场场景中准确扮演旅客角色，而非地勤人员',
    scene: '机场',
    aiRole: '旅客',
    userRole: '地勤人员',
    dialogueGoal: '办理值机',
    difficultyLevel: 'medium',
    expectedBehavior: {
      openingIndicators: ['check in', 'flight', 'passport', 'luggage', 'boarding pass', 'would like to check', 'my flight is'],
      forbiddenIndicators: ['may i see your passport', 'do you have any checked baggage', 'your flight is boarding', 'please proceed to'],
      expectedStyle: 'casual'
    }
  },

  // 场景5: 办公室 - AI作为员工
  {
    id: 'WORKPLACE_EMPLOYEE_001',
    name: '职场场景 - AI作为员工',
    description: '验证AI在办公室场景中准确扮演员工角色，而非经理',
    scene: '办公室',
    aiRole: '员工',
    userRole: '经理',
    dialogueGoal: '工作汇报',
    difficultyLevel: 'medium',
    expectedBehavior: {
      openingIndicators: ['completed', 'finished', 'report', 'task', 'project', 'wanted to update', 'have completed', 'would like to discuss'],
      forbiddenIndicators: ['let us discuss your progress', 'i need you to finish', 'your presentation was', 'do you have any questions about'],
      expectedStyle: 'professional'
    }
  },

  // 极端场景1: 角色坚持度测试
  {
    id: 'EDGE_ROLE_PERSISTENCE_001',
    name: '角色坚持度测试 - 餐厅顾客',
    description: '测试AI在多轮对话中是否能坚持顾客角色',
    scene: '餐厅',
    aiRole: '顾客',
    userRole: '服务员',
    dialogueGoal: '点餐',
    difficultyLevel: 'medium',
    conversationHistory: [
      { role: 'assistant', content: 'Hi, could I see the menu please?' },
      { role: 'user', content: 'Welcome! What would you like to drink?' }
    ],
    expectedBehavior: {
      openingIndicators: ['i would like', 'can i have', 'what do you recommend'],
      forbiddenIndicators: ['what can i get for you', 'would you like to see', 'are you ready'],
      expectedStyle: 'casual'
    },
    isEdgeCase: true
  },

  // 极端场景2: 模糊场景测试
  {
    id: 'EDGE_AMBIGUOUS_001',
    name: '模糊场景测试 - 社交会面',
    description: '测试AI在角色边界模糊的场景中是否能保持一致性',
    scene: '咖啡厅',
    aiRole: '顾客',
    userRole: '顾客',
    dialogueGoal: '社交对话',
    difficultyLevel: 'medium',
    expectedBehavior: {
      openingIndicators: ['hi', 'hello', 'nice to meet', 'how are you'],
      forbiddenIndicators: ['welcome to', 'what can i get', 'may i help you'],
      expectedStyle: 'casual'
    },
    isEdgeCase: true
  },

  // 极端场景3: 高难度角色扮演
  {
    id: 'EDGE_ADVANCED_001',
    name: '高难度角色扮演 - 餐厅顾客(Advanced)',
    description: '测试AI在高难度设置下是否能保持角色并展现复杂语言结构',
    scene: '餐厅',
    aiRole: '顾客',
    userRole: '服务员',
    dialogueGoal: '点餐',
    difficultyLevel: 'hard',
    expectedBehavior: {
      openingIndicators: ['wondering if', 'was hoping', 'do you happen to have'],
      forbiddenIndicators: ['welcome to our restaurant', 'what can i get for you'],
      expectedStyle: 'casual'
    },
    isEdgeCase: true
  }
]

// 模型验证配置
export interface ModelValidationConfig {
  modelName: string
  provider: string
  requiredPassRate: number
  requiredTests: string[]
}

export const DEFAULT_VALIDATION_CONFIG: ModelValidationConfig = {
  modelName: '当前模型',
  provider: 'nvidia',
  requiredPassRate: 70,
  requiredTests: [
    'RESTAURANT_CUSTOMER_001',
    'HOTEL_GUEST_001',
    'SHOPPING_CUSTOMER_001',
    'AIRPORT_PASSENGER_001',
    'WORKPLACE_EMPLOYEE_001'
  ]
}
