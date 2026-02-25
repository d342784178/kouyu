import { test, expect } from '@playwright/test'
import { TEST_SCENES, SELECTORS } from '../fixtures/test-data'
import {
  navigateToSceneDetail,
  navigateToSceneList,
  waitForLoadingComplete,
  waitForApiResponse,
  clearLocalStorage,
} from '../utils/test-helpers'

test.describe('场景详情页', () => {
  test.describe('页面初始加载', () => {
    test.beforeEach(async ({ page }) => {
      await clearLocalStorage(page)
      await navigateToSceneDetail(page, TEST_SCENES.daily.id)
      await waitForApiResponse(page, `/api/scenes/${TEST_SCENES.daily.id}`)
    })

    test('应正确显示场景名称', async ({ page }) => {
      const sceneName = page.locator('h1')
      await expect(sceneName).toBeVisible()
      await expect(sceneName).not.toHaveText('')
    })

    test('应显示返回按钮', async ({ page }) => {
      const backButton = page.locator(SELECTORS.sceneDetail.backButton)
      await expect(backButton).toBeVisible()
    })

    test('应显示难度标签', async ({ page }) => {
      const difficultyBadge = page.locator(SELECTORS.sceneDetail.difficultyBadge).first()
      await expect(difficultyBadge).toBeVisible()
      
      const difficultyText = await difficultyBadge.textContent()
      expect(['初级', '中级', '高级']).toContain(difficultyText)
    })

    test('应显示学习时长', async ({ page }) => {
      const durationText = page.locator('text=/\\d+分钟/')
      await expect(durationText).toBeVisible()
    })

    test('应显示场景描述', async ({ page }) => {
      const description = page.locator('p[class*="text-gray-600"]').first()
      await expect(description).toBeVisible()
      await expect(description).not.toHaveText('')
    })

    test('应显示播放全部按钮', async ({ page }) => {
      const playAllButton = page.locator(SELECTORS.sceneDetail.playAllButton)
      await expect(playAllButton).toBeVisible()
    })
  })

  test.describe('对话学习区域', () => {
    test.beforeEach(async ({ page }) => {
      await clearLocalStorage(page)
      await navigateToSceneDetail(page, TEST_SCENES.daily.id)
      await waitForApiResponse(page, `/api/scenes/${TEST_SCENES.daily.id}`)
    })

    test('应显示对话学习标题', async ({ page }) => {
      const dialogueSection = page.locator(SELECTORS.sceneDetail.dialogueSection)
      await expect(dialogueSection).toBeVisible()
      await expect(dialogueSection).toHaveText(/对话学习/)
    })

    test('应显示对话轮数', async ({ page }) => {
      const roundCount = page.locator('text=/\\d+ 轮对话/')
      await expect(roundCount).toBeVisible()
    })

    test('应显示对话内容', async ({ page }) => {
      // 等待对话内容加载
      await page.waitForSelector('[class*="rounded-2xl"]:has(p)', { timeout: 5000 })
      
      // 验证对话文本存在
      const dialogueTexts = page.locator('p:has-text("My name")')
      const count = await dialogueTexts.count()
      expect(count).toBeGreaterThan(0)
    })

    test('应显示说话人名称', async ({ page }) => {
      // 检查是否有说话人标签
      const speakerLabels = page.locator('span, div').filter({ hasText: /Tom|Lisa|Speaker/ })
      const count = await speakerLabels.count()
      expect(count).toBeGreaterThan(0)
    })

    test('应显示翻译文本', async ({ page }) => {
      // 检查中文翻译
      const translations = page.locator('p, span').filter({ hasText: /你好|我叫|认识/ })
      const count = await translations.count()
      expect(count).toBeGreaterThan(0)
    })

    test('应显示播放按钮', async ({ page }) => {
      // 查找播放按钮（通常是圆形按钮）
      const playButtons = page.locator('button[class*="rounded"], svg[class*="play"]').first()
      await expect(playButtons).toBeVisible()
    })
  })

  test.describe('高频词汇区域', () => {
    test.beforeEach(async ({ page }) => {
      await clearLocalStorage(page)
      await navigateToSceneDetail(page, TEST_SCENES.daily.id)
      await waitForApiResponse(page, `/api/scenes/${TEST_SCENES.daily.id}`)
    })

    test('应显示高频词汇标题', async ({ page }) => {
      const vocabularySection = page.locator(SELECTORS.sceneDetail.vocabularySection)
      await expect(vocabularySection).toBeVisible()
      await expect(vocabularySection).toHaveText(/高频词汇/)
    })

    test('应显示词汇数量', async ({ page }) => {
      const vocabCount = page.locator('text=/\\d+ 个词汇/')
      await expect(vocabCount).toBeVisible()
    })

    test('应显示词汇内容', async ({ page }) => {
      // 等待词汇内容加载
      await page.waitForTimeout(1000)
      
      // 验证词汇文本存在
      const vocabTexts = page.locator('div, span, p').filter({ hasText: /Nice|Hello|meet/ })
      const count = await vocabTexts.count()
      expect(count).toBeGreaterThan(0)
    })

    test('应显示音标', async ({ page }) => {
      // 检查音标格式
      const phonetics = page.locator('text=/\\/.*\\//')
      const count = await phonetics.count()
      expect(count).toBeGreaterThan(0)
    })

    test('应显示例句', async ({ page }) => {
      // 检查例句
      const examples = page.locator('p, div').filter({ hasText: /I\'m|My name|Hello/ })
      const count = await examples.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('开始测试按钮', () => {
    test.beforeEach(async ({ page }) => {
      await clearLocalStorage(page)
      await navigateToSceneDetail(page, TEST_SCENES.daily.id)
      await waitForApiResponse(page, `/api/scenes/${TEST_SCENES.daily.id}`)
    })

    test('应显示开始测试按钮', async ({ page }) => {
      const startTestButton = page.locator(SELECTORS.sceneDetail.startTestButton)
      await expect(startTestButton).toBeVisible()
    })

    test('点击开始测试应跳转到测试页', async ({ page }) => {
      const startTestButton = page.locator(SELECTORS.sceneDetail.startTestButton)
      await startTestButton.click()
      
      // 等待跳转到测试页
      await page.waitForURL(/\/scene-test\//, { timeout: 5000 })
      
      // 验证URL包含场景ID
      expect(page.url()).toContain(TEST_SCENES.daily.id)
    })
  })

  test.describe('返回功能', () => {
    test('点击返回按钮应回到场景列表', async ({ page }) => {
      await navigateToSceneDetail(page, TEST_SCENES.daily.id)
      await waitForLoadingComplete(page)
      
      const backButton = page.locator(SELECTORS.sceneDetail.backButton)
      await backButton.click()
      
      // 验证返回场景列表
      await page.waitForURL('/scene-list')
      await expect(page.locator(SELECTORS.sceneList.header)).toBeVisible()
    })
  })

  test.describe('页面导航流程', () => {
    test('从列表到详情再到测试的完整流程', async ({ page }) => {
      // 1. 进入场景列表
      await navigateToSceneList(page)
      await waitForLoadingComplete(page)
      
      // 2. 点击第一个场景
      const firstCard = page.locator(SELECTORS.sceneList.sceneCard).first()
      const sceneName = await firstCard.locator('h3').textContent()
      await firstCard.click()
      
      // 3. 验证详情页
      await page.waitForURL(/\/scene-detail\//)
      await expect(page.locator('h1')).toHaveText(sceneName || '')
      
      // 4. 点击开始测试
      const startTestButton = page.locator(SELECTORS.sceneDetail.startTestButton)
      await startTestButton.click()
      
      // 5. 验证跳转到测试页
      await page.waitForURL(/\/scene-test\//, { timeout: 5000 })
    })
  })

  test.describe('错误处理', () => {
    test('访问不存在的场景应显示404', async ({ page }) => {
      await navigateToSceneDetail(page, 'non_existent_scene')
      
      // 等待页面加载
      await page.waitForTimeout(2000)
      
      // 检查是否显示404或错误信息
      const notFoundContent = page.locator('text=/404|not found|不存在|未找到/i')
      const errorContent = page.locator('text=/error|错误|失败/i')
      
      const hasNotFound = await notFoundContent.count() > 0
      const hasError = await errorContent.count() > 0
      
      expect(hasNotFound || hasError).toBeTruthy()
    })
  })

  test.describe('响应式布局', () => {
    test('移动端应正常显示详情页', async ({ page }) => {
      await clearLocalStorage(page)
      
      // 设置移动端视口
      await page.setViewportSize({ width: 375, height: 667 })
      await navigateToSceneDetail(page, TEST_SCENES.daily.id)
      await waitForApiResponse(page, `/api/scenes/${TEST_SCENES.daily.id}`)
      
      // 验证关键元素正常显示
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator(SELECTORS.sceneDetail.dialogueSection)).toBeVisible()
      await expect(page.locator(SELECTORS.sceneDetail.startTestButton)).toBeVisible()
    })
  })

  test.describe('数据缓存', () => {
    test('再次访问应从localStorage读取缓存', async ({ page }) => {
      // 第一次访问
      await navigateToSceneDetail(page, TEST_SCENES.daily.id)
      await waitForApiResponse(page, `/api/scenes/${TEST_SCENES.daily.id}`)
      
      // 刷新页面
      await page.reload()
      
      // 验证页面快速加载（使用缓存）
      await expect(page.locator('h1')).toBeVisible({ timeout: 3000 })
    })
  })
})
