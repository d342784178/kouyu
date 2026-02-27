/**
 * 场景学习增强功能 E2E 测试
 * 覆盖：填空题、情景再现、词汇激活、跟读练习
 *
 * 测试策略：使用 route 拦截 mock API，不依赖真实数据库
 */
import { test, expect, Page } from '@playwright/test'
import {
  TEST_SCENES,
  SELECTORS,
  MOCK_SCENE_DETAIL,
  MOCK_FILL_BLANK_TEST,
  MOCK_GUIDED_ROLEPLAY_TEST,
  MOCK_VOCAB_ACTIVATION_TEST,
  MOCK_FILL_BLANK_EVALUATE_RESPONSE,
  MOCK_GUIDED_ROLEPLAY_EVALUATE_RESPONSE,
} from '../fixtures/test-data'
import { waitForLoadingComplete } from '../utils/test-helpers'

const SCENE_ID = TEST_SCENES.daily.id

// ============================================================
// 通用 mock 工具
// ============================================================

/** mock 场景详情 API */
async function mockSceneDetail(page: Page) {
  await page.route(`**/api/scenes/${SCENE_ID}`, async (route) => {
    await route.fulfill({ json: MOCK_SCENE_DETAIL })
  })
}

/** mock 场景测试列表 API，返回指定题型 */
async function mockSceneTests(page: Page, tests: object[]) {
  await page.route(`**/api/scenes/${SCENE_ID}/tests`, async (route) => {
    await route.fulfill({ json: tests })
  })
}

/** mock 填空题评测 API */
async function mockFillBlankEvaluate(page: Page, response = MOCK_FILL_BLANK_EVALUATE_RESPONSE) {
  await page.route('**/api/fill-blank/evaluate-pattern', async (route) => {
    await route.fulfill({ json: response })
  })
}

/** mock 情景再现评测 API */
async function mockGuidedRoleplayEvaluate(page: Page, response = MOCK_GUIDED_ROLEPLAY_EVALUATE_RESPONSE) {
  await page.route('**/api/guided-roleplay/evaluate', async (route) => {
    await route.fulfill({ json: response })
  })
}

/** 导航到指定测试题目页面 */
async function navigateToTest(page: Page, testId: string) {
  await page.goto(`/scene-test/${SCENE_ID}/${testId}`)
  // 清除 localStorage 缓存，确保 mock API 数据生效
  await page.evaluate(() => {
    try { localStorage.clear() } catch {}
  })
  // 重新加载让 mock 生效
  await page.reload()
  await waitForLoadingComplete(page)
  await page.waitForTimeout(500)
}

// ============================================================
// 填空题（Pattern Drill）测试
// ============================================================

test.describe('填空题（Pattern Drill）', () => {
  test.beforeEach(async ({ page }) => {
    await mockSceneDetail(page)
    await mockSceneTests(page, [MOCK_FILL_BLANK_TEST])
  })

  test('应显示填空题标签', async ({ page }) => {
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)
    const label = page.locator('span:has-text("填空题")')
    await expect(label).toBeVisible()
  })

  test('应显示场景提示文字', async ({ page }) => {
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)
    await expect(page.locator(`text=${MOCK_FILL_BLANK_TEST.content.scenarioHint}`)).toBeVisible()
  })

  test('应渲染句型模板和输入框', async ({ page }) => {
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)
    // 模板有 2 个 ___，应有 2 个输入框
    const inputs = page.locator(SELECTORS.sceneTest.fillBlankInput)
    await expect(inputs).toHaveCount(2)
  })

  test('应显示关键词提示标签', async ({ page }) => {
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)
    for (const kw of MOCK_FILL_BLANK_TEST.content.keywords) {
      await expect(page.locator(`text=${kw}`).first()).toBeVisible()
    }
  })

  test('空白提交应显示校验提示', async ({ page }) => {
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)
    const submitBtn = page.locator(SELECTORS.sceneTest.fillBlankSubmit)
    await submitBtn.click()
    await expect(page.locator('text=请填写所有空格后再提交')).toBeVisible()
  })

  test('填写答案后提交应调用评测 API 并显示结果', async ({ page }) => {
    await mockFillBlankEvaluate(page)
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)

    const inputs = page.locator(SELECTORS.sceneTest.fillBlankInput)
    await inputs.nth(0).fill('meet')
    await inputs.nth(1).fill('is')

    await page.locator(SELECTORS.sceneTest.fillBlankSubmit).click()

    // 等待评测结果
    await expect(page.locator(SELECTORS.sceneTest.fillBlankResult)).toBeVisible({ timeout: 8000 })
  })

  test('评测正确时应显示参考答案', async ({ page }) => {
    await mockFillBlankEvaluate(page)
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)

    const inputs = page.locator(SELECTORS.sceneTest.fillBlankInput)
    await inputs.nth(0).fill('meet')
    await inputs.nth(1).fill('is')
    await page.locator(SELECTORS.sceneTest.fillBlankSubmit).click()

    await expect(page.locator(`text=${MOCK_FILL_BLANK_EVALUATE_RESPONSE.referenceAnswer}`)).toBeVisible({ timeout: 8000 })
  })

  test('评测完成后应显示下一题按钮', async ({ page }) => {
    await mockFillBlankEvaluate(page)
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)

    const inputs = page.locator(SELECTORS.sceneTest.fillBlankInput)
    await inputs.nth(0).fill('meet')
    await inputs.nth(1).fill('is')
    await page.locator(SELECTORS.sceneTest.fillBlankSubmit).click()

    // 等待结果出现后，下一题/返回场景按钮应可见
    await expect(page.locator('button:has-text("返回场景"), button:has-text("下一题")')).toBeVisible({ timeout: 8000 })
  })

  test('评测失败时应显示错误反馈', async ({ page }) => {
    await mockFillBlankEvaluate(page, {
      isCorrect: false,
      referenceAnswer: 'meet / is',
      semanticAnalysis: '答案不符合场景语境。',
      feedback: '请注意动词的正确形式。',
    })
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)

    const inputs = page.locator(SELECTORS.sceneTest.fillBlankInput)
    await inputs.nth(0).fill('see')
    await inputs.nth(1).fill('am')
    await page.locator(SELECTORS.sceneTest.fillBlankSubmit).click()

    await expect(page.locator('text=回答有误')).toBeVisible({ timeout: 8000 })
  })

  test('content 格式异常时应显示降级提示', async ({ page }) => {
    // mock 返回格式错误的 content
    await mockSceneTests(page, [{
      ...MOCK_FILL_BLANK_TEST,
      content: { invalid: true },
    }])
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)
    await expect(page.locator('text=题目加载失败')).toBeVisible()
  })
})

// ============================================================
// 情景再现（Guided Role-play）测试
// ============================================================

test.describe('情景再现（Guided Role-play）', () => {
  test.beforeEach(async ({ page }) => {
    await mockSceneDetail(page)
    await mockSceneTests(page, [MOCK_GUIDED_ROLEPLAY_TEST])
  })

  test('应显示情景再现标签', async ({ page }) => {
    await navigateToTest(page, MOCK_GUIDED_ROLEPLAY_TEST.id)
    await expect(page.locator('span:has-text("情景再现")')).toBeVisible()
  })

  test('应显示情景描述', async ({ page }) => {
    await navigateToTest(page, MOCK_GUIDED_ROLEPLAY_TEST.id)
    await expect(page.locator(`text=${MOCK_GUIDED_ROLEPLAY_TEST.content.situationDescription}`)).toBeVisible()
  })

  test('应显示对话目标', async ({ page }) => {
    await navigateToTest(page, MOCK_GUIDED_ROLEPLAY_TEST.id)
    await expect(page.locator(`text=${MOCK_GUIDED_ROLEPLAY_TEST.content.dialogueGoal}`)).toBeVisible()
  })

  test('应显示关键词提示', async ({ page }) => {
    await navigateToTest(page, MOCK_GUIDED_ROLEPLAY_TEST.id)
    for (const kw of MOCK_GUIDED_ROLEPLAY_TEST.content.keywordHints) {
      await expect(page.locator(`text=${kw}`).first()).toBeVisible()
    }
  })

  test('应显示文字输入框', async ({ page }) => {
    await navigateToTest(page, MOCK_GUIDED_ROLEPLAY_TEST.id)
    await expect(page.locator(SELECTORS.sceneTest.guidedRoleplayTextarea)).toBeVisible()
  })

  test('空白提交应显示校验提示', async ({ page }) => {
    await navigateToTest(page, MOCK_GUIDED_ROLEPLAY_TEST.id)
    await page.locator(SELECTORS.sceneTest.guidedRoleplaySubmit).click()
    await expect(page.locator('text=请输入您的回答后再提交')).toBeVisible()
  })

  test('提交答案后应调用评测 API 并显示意图达成度', async ({ page }) => {
    await mockGuidedRoleplayEvaluate(page)
    await navigateToTest(page, MOCK_GUIDED_ROLEPLAY_TEST.id)

    await page.locator(SELECTORS.sceneTest.guidedRoleplayTextarea).fill(
      "Hi, I'm Tom. I'm the project manager. Pleased to meet you."
    )
    await page.locator(SELECTORS.sceneTest.guidedRoleplaySubmit).click()

    await expect(page.locator(SELECTORS.sceneTest.guidedRoleplayScore)).toBeVisible({ timeout: 10000 })
  })

  test('评测结果应显示语言自然度', async ({ page }) => {
    await mockGuidedRoleplayEvaluate(page)
    await navigateToTest(page, MOCK_GUIDED_ROLEPLAY_TEST.id)

    await page.locator(SELECTORS.sceneTest.guidedRoleplayTextarea).fill("Hi, I'm Tom.")
    await page.locator(SELECTORS.sceneTest.guidedRoleplaySubmit).click()

    await expect(page.locator(`text=${MOCK_GUIDED_ROLEPLAY_EVALUATE_RESPONSE.naturalness}`)).toBeVisible({ timeout: 10000 })
  })

  test('评测结果应显示参考表达', async ({ page }) => {
    await mockGuidedRoleplayEvaluate(page)
    await navigateToTest(page, MOCK_GUIDED_ROLEPLAY_TEST.id)

    await page.locator(SELECTORS.sceneTest.guidedRoleplayTextarea).fill("Hi, I'm Tom.")
    await page.locator(SELECTORS.sceneTest.guidedRoleplaySubmit).click()

    await expect(page.locator(`text=${MOCK_GUIDED_ROLEPLAY_EVALUATE_RESPONSE.referenceExpression}`)).toBeVisible({ timeout: 10000 })
  })

  test('评测完成后应显示下一题或返回场景按钮', async ({ page }) => {
    await mockGuidedRoleplayEvaluate(page)
    await navigateToTest(page, MOCK_GUIDED_ROLEPLAY_TEST.id)

    await page.locator(SELECTORS.sceneTest.guidedRoleplayTextarea).fill("Hi, I'm Tom.")
    await page.locator(SELECTORS.sceneTest.guidedRoleplaySubmit).click()

    // 等待评测结果出现
    await expect(page.locator(SELECTORS.sceneTest.guidedRoleplayScore)).toBeVisible({ timeout: 10000 })

    // 父组件记录结果后，应显示下一题/返回场景按钮（由父组件 hasResult 控制）
    await expect(page.locator('button:has-text("返回场景"), button:has-text("下一题")')).toBeVisible({ timeout: 5000 })
  })

  test('content 格式异常时应显示降级提示', async ({ page }) => {
    await mockSceneTests(page, [{
      ...MOCK_GUIDED_ROLEPLAY_TEST,
      content: { invalid: true },
    }])
    await navigateToTest(page, MOCK_GUIDED_ROLEPLAY_TEST.id)
    await expect(page.locator('text=题目加载失败')).toBeVisible()
  })
})

// ============================================================
// 词汇激活（Vocabulary Activation）测试
// ============================================================

test.describe('词汇激活（Vocabulary Activation）', () => {
  test.beforeEach(async ({ page }) => {
    await mockSceneDetail(page)
    await mockSceneTests(page, [MOCK_VOCAB_ACTIVATION_TEST])
  })

  test('应显示词汇激活标签', async ({ page }) => {
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)
    await expect(page.locator('span:has-text("词汇激活")')).toBeVisible()
  })

  test('应显示中文提示', async ({ page }) => {
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)
    await expect(page.locator(`text=${MOCK_VOCAB_ACTIVATION_TEST.content.chineseHint}`).first()).toBeVisible()
  })

  test('应显示词性标签', async ({ page }) => {
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)
    // adjective -> 形容词
    await expect(page.locator('text=形容词')).toBeVisible()
  })

  test('应显示文字输入框', async ({ page }) => {
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)
    await expect(page.locator(SELECTORS.sceneTest.vocabInput)).toBeVisible()
  })

  test('输入正确答案应显示回答正确', async ({ page }) => {
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)

    await page.locator(SELECTORS.sceneTest.vocabInput).fill('pleased')
    await page.locator(SELECTORS.sceneTest.vocabSubmit).click()

    await expect(page.locator('text=回答正确！')).toBeVisible()
  })

  test('输入错误答案应显示回答有误', async ({ page }) => {
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)

    await page.locator(SELECTORS.sceneTest.vocabInput).fill('happy')
    await page.locator(SELECTORS.sceneTest.vocabSubmit).click()

    await expect(page.locator('text=回答有误')).toBeVisible()
  })

  test('输入接近正确答案（编辑距离≤2）应显示接近提示', async ({ page }) => {
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)

    // "pleaed" 与 "pleased" 编辑距离为 1
    await page.locator(SELECTORS.sceneTest.vocabInput).fill('pleaed')
    await page.locator(SELECTORS.sceneTest.vocabSubmit).click()

    await expect(page.locator('text=接近正确答案')).toBeVisible()
  })

  test('大小写不敏感：PLEASED 应视为正确', async ({ page }) => {
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)

    await page.locator(SELECTORS.sceneTest.vocabInput).fill('PLEASED')
    await page.locator(SELECTORS.sceneTest.vocabSubmit).click()

    await expect(page.locator('text=回答正确！')).toBeVisible()
  })

  test('答对后应显示音标', async ({ page }) => {
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)

    await page.locator(SELECTORS.sceneTest.vocabInput).fill('pleased')
    await page.locator(SELECTORS.sceneTest.vocabSubmit).click()

    await expect(page.locator(`text=${MOCK_VOCAB_ACTIVATION_TEST.content.phonetic}`)).toBeVisible()
  })

  test('答对后应显示例句', async ({ page }) => {
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)

    await page.locator(SELECTORS.sceneTest.vocabInput).fill('pleased')
    await page.locator(SELECTORS.sceneTest.vocabSubmit).click()

    await expect(page.locator(`text=${MOCK_VOCAB_ACTIVATION_TEST.content.exampleSentence}`)).toBeVisible()
  })

  test('按 Enter 键应触发提交', async ({ page }) => {
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)

    await page.locator(SELECTORS.sceneTest.vocabInput).fill('pleased')
    await page.locator(SELECTORS.sceneTest.vocabInput).press('Enter')

    await expect(page.locator(SELECTORS.sceneTest.vocabResult)).toBeVisible()
  })

  test('content 格式异常时应显示降级提示', async ({ page }) => {
    await mockSceneTests(page, [{
      ...MOCK_VOCAB_ACTIVATION_TEST,
      content: { invalid: true },
    }])
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)
    await expect(page.locator('text=题目加载失败')).toBeVisible()
  })
})

// ============================================================
// 跟读练习（Shadowing）测试
// ============================================================

test.describe('跟读练习（Shadowing）', () => {
  test.beforeEach(async ({ page }) => {
    await mockSceneDetail(page)
    // 跟读练习在场景详情页，不需要 mock tests
  })

  test('场景详情页应显示跟读练习入口按钮', async ({ page }) => {
    // 先注册 waitForResponse，再 goto，避免 API 已响应后才注册导致超时
    const responsePromise = page.waitForResponse(`**/api/scenes/${SCENE_ID}`, { timeout: 10000 }).catch(() => null)
    await page.goto(`/scene-detail/${SCENE_ID}`)
    await waitForLoadingComplete(page)
    await responsePromise

    const btn = page.locator('button:has-text("跟读练习")')
    await expect(btn).toBeVisible()
  })

  test('点击跟读练习按钮应展开模块', async ({ page }) => {
    const responsePromise = page.waitForResponse(`**/api/scenes/${SCENE_ID}`, { timeout: 10000 }).catch(() => null)
    await page.goto(`/scene-detail/${SCENE_ID}`)
    await waitForLoadingComplete(page)
    await responsePromise

    await page.locator('button:has-text("跟读练习")').click()
    await page.waitForTimeout(500)

    // 展开后应显示跟读相关内容（第1句 / 开始按钮）
    const shadowingContent = page.locator('text=/第 1 句|开始跟读|播放原声/')
    await expect(shadowingContent).toBeVisible({ timeout: 3000 })
  })

  test('再次点击跟读练习按钮应折叠模块', async ({ page }) => {
    const responsePromise = page.waitForResponse(`**/api/scenes/${SCENE_ID}`, { timeout: 10000 }).catch(() => null)
    await page.goto(`/scene-detail/${SCENE_ID}`)
    await waitForLoadingComplete(page)
    await responsePromise

    const btn = page.locator('button:has-text("跟读练习")')
    await btn.click()
    await page.waitForTimeout(300)
    await btn.click()
    await page.waitForTimeout(300)

    // 折叠后跟读内容不可见
    const shadowingContent = page.locator('text=/第 1 句|开始跟读/')
    await expect(shadowingContent).not.toBeVisible()
  })
})

// ============================================================
// 题型标签颜色测试
// ============================================================

test.describe('题型标签样式', () => {
  test('填空题标签应有正确颜色类', async ({ page }) => {
    await mockSceneDetail(page)
    await mockSceneTests(page, [MOCK_FILL_BLANK_TEST])
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)

    const label = page.locator('span:has-text("填空题")')
    await expect(label).toHaveClass(/text-\[#F59E0B\]/)
  })

  test('情景再现标签应有正确颜色类', async ({ page }) => {
    await mockSceneDetail(page)
    await mockSceneTests(page, [MOCK_GUIDED_ROLEPLAY_TEST])
    await navigateToTest(page, MOCK_GUIDED_ROLEPLAY_TEST.id)

    const label = page.locator('span:has-text("情景再现")')
    await expect(label).toHaveClass(/text-\[#7C3AED\]/)
  })

  test('词汇激活标签应有正确颜色类', async ({ page }) => {
    await mockSceneDetail(page)
    await mockSceneTests(page, [MOCK_VOCAB_ACTIVATION_TEST])
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)

    const label = page.locator('span:has-text("词汇激活")')
    await expect(label).toHaveClass(/text-\[#059669\]/)
  })
})

// ============================================================
// 多题型混合导航测试
// ============================================================

test.describe('多题型混合导航', () => {
  const allTests = [
    MOCK_FILL_BLANK_TEST,
    MOCK_GUIDED_ROLEPLAY_TEST,
    MOCK_VOCAB_ACTIVATION_TEST,
  ]

  test.beforeEach(async ({ page }) => {
    await mockSceneDetail(page)
    await mockSceneTests(page, allTests)
  })

  test('进度条应正确显示当前题目位置', async ({ page }) => {
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)

    // 第1题，共3题
    await expect(page.locator('text=题目 1 / 3')).toBeVisible()
  })

  test('答完填空题后点击下一题应跳转到情景再现', async ({ page }) => {
    await mockFillBlankEvaluate(page)
    await navigateToTest(page, MOCK_FILL_BLANK_TEST.id)

    const inputs = page.locator(SELECTORS.sceneTest.fillBlankInput)
    await inputs.nth(0).fill('meet')
    await inputs.nth(1).fill('is')
    await page.locator(SELECTORS.sceneTest.fillBlankSubmit).click()

    // 等待结果
    await expect(page.locator(SELECTORS.sceneTest.fillBlankResult)).toBeVisible({ timeout: 8000 })

    // 点击下一题
    await page.locator('button:has-text("下一题")').click()
    await page.waitForTimeout(500)

    // 应显示情景再现标签
    await expect(page.locator('span:has-text("情景再现")')).toBeVisible()
  })

  test('词汇激活是最后一题时应显示返回场景按钮', async ({ page }) => {
    await navigateToTest(page, MOCK_VOCAB_ACTIVATION_TEST.id)

    // 第3题，共3题
    await expect(page.locator('text=题目 3 / 3')).toBeVisible()

    // 答题
    await page.locator(SELECTORS.sceneTest.vocabInput).fill('pleased')
    await page.locator(SELECTORS.sceneTest.vocabSubmit).click()

    await expect(page.locator('button:has-text("返回场景")')).toBeVisible()
  })
})
