import { test, expect } from '@playwright/test'
import { setLocalStorage, clearLocalStorage } from '../utils/test-helpers'

// ============================================================
// Mock 数据
// ============================================================

const MOCK_SCENE_ID = 'daily_001'

const MOCK_SUB_SCENES_RESPONSE = {
  scene: {
    id: MOCK_SCENE_ID,
    name: '初次见面',
    description: '学习如何用英语进行初次见面的问候和自我介绍',
    category: '日常',
    difficulty: '初级',
  },
  subScenes: [
    {
      id: 'sub_001',
      sceneId: MOCK_SCENE_ID,
      name: '打招呼',
      description: '学习基本问候语',
      order: 1,
      estimatedMinutes: 5,
    },
    {
      id: 'sub_002',
      sceneId: MOCK_SCENE_ID,
      name: '自我介绍',
      description: '学习如何介绍自己',
      order: 2,
      estimatedMinutes: 8,
    },
    {
      id: 'sub_003',
      sceneId: MOCK_SCENE_ID,
      name: '询问对方信息',
      description: '学习如何礼貌询问',
      order: 3,
      estimatedMinutes: 6,
    },
  ],
}

const MOCK_EMPTY_SUB_SCENES_RESPONSE = {
  scene: MOCK_SUB_SCENES_RESPONSE.scene,
  subScenes: [],
}

// ============================================================
// 辅助函数：注册 API mock
// ============================================================

async function mockSubScenesApi(page: import('@playwright/test').Page, response = MOCK_SUB_SCENES_RESPONSE) {
  await page.route(`**/api/scenes/${MOCK_SCENE_ID}/sub-scenes`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
}

async function mockSubScenesApiError(page: import('@playwright/test').Page, status = 500) {
  await page.route(`**/api/scenes/${MOCK_SCENE_ID}/sub-scenes`, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: '服务器错误' }),
    })
  })
}

// ============================================================
// 测试套件：场景大纲列表页
// ============================================================

test.describe('场景大纲列表页 (scene-overview)', () => {

  test.beforeEach(async ({ page }) => {
    await clearLocalStorage(page)
  })

  // ----------------------------------------------------------
  // 14.1 页面正常加载
  // ----------------------------------------------------------

  test('应正常加载并展示场景信息', async ({ page }) => {
    await mockSubScenesApi(page)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    // 等待场景名称出现
    await expect(page.getByText('初次见面')).toBeVisible()
    // 场景描述
    await expect(page.getByText('学习如何用英语进行初次见面的问候和自我介绍')).toBeVisible()
    // 分类和难度标签
    await expect(page.getByText('日常')).toBeVisible()
    await expect(page.getByText('初级')).toBeVisible()
    // 子场景数量
    await expect(page.getByText('共 3 个子场景')).toBeVisible()
  })

  test('应展示子场景卡片列表', async ({ page }) => {
    await mockSubScenesApi(page)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    // 等待列表加载
    await expect(page.getByText('打招呼')).toBeVisible()
    await expect(page.getByText('自我介绍')).toBeVisible()
    await expect(page.getByText('询问对方信息')).toBeVisible()

    // 验证预计时长显示
    await expect(page.getByText('约 5 分钟')).toBeVisible()
    await expect(page.getByText('约 8 分钟')).toBeVisible()
  })

  test('应展示"按顺序学习"按钮', async ({ page }) => {
    await mockSubScenesApi(page)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    await expect(page.getByText('按顺序学习')).toBeVisible()
  })

  test('点击"按顺序学习"应跳转到第一个子场景', async ({ page }) => {
    await mockSubScenesApi(page)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    // 拦截导航
    const navigationPromise = page.waitForURL('**/scene-learning/sub_001')
    await page.getByText('按顺序学习').click()
    await navigationPromise
  })

  test('点击子场景卡片应跳转到对应学习页', async ({ page }) => {
    await mockSubScenesApi(page)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    await expect(page.getByText('自我介绍')).toBeVisible()

    const navigationPromise = page.waitForURL('**/scene-learning/sub_002')
    // 点击第二个子场景卡片
    await page.getByText('自我介绍').click()
    await navigationPromise
  })

  // ----------------------------------------------------------
  // 14.1 从 localStorage 读取进度状态
  // ----------------------------------------------------------

  test('应从 localStorage 读取并展示"已完成"状态', async ({ page }) => {
    // 先设置 localStorage，再 mock API，再导航
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)
    await setLocalStorage(page, 'scene-learning-progress-sub_001', {
      status: 'completed',
      currentStage: 4,
      failedQaIds: [],
      lastUpdated: new Date().toISOString(),
    })

    await mockSubScenesApi(page)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    // 等待页面加载完成
    await expect(page.getByText('打招呼')).toBeVisible()
    // 已完成状态徽章
    await expect(page.getByText('已完成')).toBeVisible()
  })

  test('应从 localStorage 读取并展示"进行中"状态', async ({ page }) => {
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)
    await setLocalStorage(page, 'scene-learning-progress-sub_002', {
      status: 'in_progress',
      currentStage: 2,
      failedQaIds: [],
      lastUpdated: new Date().toISOString(),
    })

    await mockSubScenesApi(page)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    await expect(page.getByText('自我介绍')).toBeVisible()
    await expect(page.getByText('进行中')).toBeVisible()
  })

  test('未设置进度时应展示"未开始"状态', async ({ page }) => {
    await mockSubScenesApi(page)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    await expect(page.getByText('打招呼')).toBeVisible()
    // 所有子场景均为未开始
    const notStartedBadges = page.getByText('未开始')
    await expect(notStartedBadges.first()).toBeVisible()
  })

  test('全部完成时"按顺序学习"应变为"重新学习"', async ({ page }) => {
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)
    // 设置所有子场景为已完成
    for (const id of ['sub_001', 'sub_002', 'sub_003']) {
      await setLocalStorage(page, `scene-learning-progress-${id}`, {
        status: 'completed',
        currentStage: 4,
        failedQaIds: [],
        lastUpdated: new Date().toISOString(),
      })
    }

    await mockSubScenesApi(page)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    await expect(page.getByText('重新学习')).toBeVisible()
  })

  // ----------------------------------------------------------
  // 错误状态
  // ----------------------------------------------------------

  test('API 返回 404 时应展示"场景不存在"', async ({ page }) => {
    await mockSubScenesApiError(page, 404)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    await expect(page.getByText('场景不存在')).toBeVisible()
  })

  test('API 返回 500 时应展示"加载失败"', async ({ page }) => {
    await mockSubScenesApiError(page, 500)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    await expect(page.getByText('加载失败，请重试')).toBeVisible()
  })

  test('无子场景时应展示"内容准备中"', async ({ page }) => {
    await mockSubScenesApi(page, MOCK_EMPTY_SUB_SCENES_RESPONSE)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    await expect(page.getByText('内容准备中')).toBeVisible()
    // 不应展示"按顺序学习"按钮
    await expect(page.getByText('按顺序学习')).not.toBeVisible()
  })

  // ----------------------------------------------------------
  // 导航
  // ----------------------------------------------------------

  test('点击返回按钮应返回上一页', async ({ page }) => {
    // 先访问一个页面，再进入大纲页，确保有历史记录
    await page.goto('/scene-learning')
    await mockSubScenesApi(page)
    await page.goto(`/scene-overview/${MOCK_SCENE_ID}`)

    await expect(page.getByText('场景大纲')).toBeVisible()

    // 点击返回按钮
    await page.getByRole('button', { name: '返回' }).click()
    // 应返回到 scene-learning
    await expect(page).toHaveURL(/scene-learning/)
  })
})
