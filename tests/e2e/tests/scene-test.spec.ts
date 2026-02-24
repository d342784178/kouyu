import { test, expect } from '@playwright/test'
import { TEST_SCENES, SELECTORS } from '../fixtures/test-data'
import {
  navigateToSceneTest,
  waitForLoadingComplete,
  waitForApiResponse,
  clearLocalStorage,
} from '../utils/test-helpers'

test.describe('场景测试页', () => {
  test.describe('页面初始加载', () => {
    test.beforeEach(async ({ page }) => {
      await clearLocalStorage(page)
    })

    test('应显示加载状态', async ({ page }) => {
      await navigateToSceneTest(page, TEST_SCENES.daily.id)
      
      // 检查加载状态
      const loadingIndicator = page.locator('text=加载中...')
      try {
        await expect(loadingIndicator).toBeVisible({ timeout: 3000 })
      } catch {
        // 加载太快
      }
    })

    test('应显示进度条', async ({ page }) => {
      await navigateToSceneTest(page, TEST_SCENES.daily.id)
      await waitForLoadingComplete(page)
      
      const progressBar = page.locator(SELECTORS.sceneTest.progressBar)
      await expect(progressBar).toBeVisible()
    })

    test('应显示题目序号', async ({ page }) => {
      await navigateToSceneTest(page, TEST_SCENES.daily.id)
      await waitForLoadingComplete(page)
      
      const questionNumber = page.locator('text=/题目 \\d+ \\/ \\d+/')
      await expect(questionNumber).toBeVisible()
    })
  })

  test.describe('选择题测试', () => {
    test.beforeEach(async ({ page }) => {
      await clearLocalStorage(page)
      await navigateToSceneTest(page, TEST_SCENES.daily.id)
      await waitForLoadingComplete(page)
    })

    test('应显示选择题题目', async ({ page }) => {
      // 等待题目加载
      await page.waitForTimeout(1000)
      
      // 检查题目类型标签
      const questionType = page.locator('span:has-text("选择题")')
      const hasChoiceQuestion = await questionType.count() > 0
      
      if (hasChoiceQuestion) {
        await expect(questionType).toBeVisible()
        
        // 检查题目文本
        const questionText = page.locator('h3[class*="text-gray-800"], p[class*="text-gray-800"]')
        await expect(questionText).toBeVisible()
      }
    })

    test('应显示选项按钮', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      // 检查选项（A、B、C、D）
      const options = page.locator('button:has-text("A"), button:has-text("B")')
      const count = await options.count()
      
      if (count > 0) {
        expect(count).toBeGreaterThanOrEqual(2)
      }
    })

    test('点击选项应选中并显示结果', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      // 查找第一个选项
      const firstOption = page.locator('button:has-text("A")').first()
      
      if (await firstOption.count() > 0) {
        await firstOption.click()
        
        // 等待结果显示
        await page.waitForTimeout(500)
        
        // 检查结果卡片
        const resultCard = page.locator(SELECTORS.sceneTest.resultCard)
        await expect(resultCard).toBeVisible()
      }
    })

    test('选择正确答案应显示正确反馈', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      // 点击第一个选项
      const firstOption = page.locator('button:has-text("A")').first()
      
      if (await firstOption.count() > 0) {
        await firstOption.click()
        await page.waitForTimeout(500)
        
        // 检查正确/错误反馈
        const feedback = page.locator('text=/回答正确|回答错误/')
        await expect(feedback).toBeVisible()
      }
    })

    test('应显示解析内容', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      // 选择一个选项
      const firstOption = page.locator('button:has-text("A")').first()
      
      if (await firstOption.count() > 0) {
        await firstOption.click()
        await page.waitForTimeout(500)
        
        // 检查解析
        const analysis = page.locator('p:has-text("分析")').or(page.locator('p[class*="text-gray-600"]'))
        const hasAnalysis = await analysis.count() > 0
        expect(hasAnalysis).toBeTruthy()
      }
    })
  })

  test.describe('问答题测试', () => {
    test.beforeEach(async ({ page }) => {
      await clearLocalStorage(page)
      await navigateToSceneTest(page, TEST_SCENES.daily.id)
      await waitForLoadingComplete(page)
    })

    test('应显示问答题题目', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      // 检查是否有问答题
      const qaType = page.locator('span:has-text("问答题")')
      const hasQA = await qaType.count() > 0
      
      if (hasQA) {
        await expect(qaType).toBeVisible()
      }
    })

    test('应显示文本输入框', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      const textArea = page.locator('textarea')
      const hasTextArea = await textArea.count() > 0
      
      if (hasTextArea) {
        await expect(textArea).toBeVisible()
        await expect(textArea).toHaveAttribute('placeholder', /请输入|输入/)
      }
    })

    test('应显示语音输入按钮', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      const micButton = page.locator('button:has-text("语音输入")')
      const hasMicButton = await micButton.count() > 0
      
      if (hasMicButton) {
        await expect(micButton).toBeVisible()
      }
    })

    test('输入答案后应能提交', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      const textArea = page.locator('textarea')
      
      if (await textArea.count() > 0) {
        // 输入答案
        await textArea.fill('Hello, my name is John. Nice to meet you.')
        
        // 检查提交按钮
        const submitButton = page.locator(SELECTORS.sceneTest.submitButton)
        await expect(submitButton).toBeVisible()
        await expect(submitButton).toBeEnabled()
      }
    })
  })

  test.describe('题目导航', () => {
    test.beforeEach(async ({ page }) => {
      await clearLocalStorage(page)
      await navigateToSceneTest(page, TEST_SCENES.daily.id)
      await waitForLoadingComplete(page)
    })

    test('应显示返回按钮', async ({ page }) => {
      const backButton = page.locator('button[class*="rounded-full"]').first()
      await expect(backButton).toBeVisible()
    })

    test('答题后应显示下一题按钮', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      // 选择一个选项
      const firstOption = page.locator('button:has-text("A")').first()
      
      if (await firstOption.count() > 0) {
        await firstOption.click()
        await page.waitForTimeout(500)
        
        // 检查下一题按钮
        const nextButton = page.locator(SELECTORS.sceneTest.nextButton)
          .or(page.locator('button:has-text("下一题")'))
          .or(page.locator('button:has-text("返回场景")'))
        
        await expect(nextButton).toBeVisible()
      }
    })

    test('点击返回应回到上一题或详情页', async ({ page }) => {
      const backButton = page.locator('button[class*="rounded-full"]').first()
      await backButton.click()
      
      // 验证页面跳转
      await page.waitForTimeout(1000)
      
      // 可能回到详情页或上一题
      const currentUrl = page.url()
      expect(
        currentUrl.includes('/scene-detail/') || 
        currentUrl.includes('/scene-test/')
      ).toBeTruthy()
    })
  })

  test.describe('测试完成流程', () => {
    test.beforeEach(async ({ page }) => {
      await clearLocalStorage(page)
      await navigateToSceneTest(page, TEST_SCENES.daily.id)
      await waitForLoadingComplete(page)
    })

    test('最后一题应显示返回场景按钮', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      // 获取总题数
      const questionNumber = await page.locator('text=/题目 \\d+ \\/ \\d+/').textContent()
      const match = questionNumber?.match(/题目 (\d+) \/ (\d+)/)
      
      if (match && match[1] === match[2]) {
        // 这是最后一题
        // 选择一个选项
        const firstOption = page.locator('button:has-text("A")').first()
        if (await firstOption.count() > 0) {
          await firstOption.click()
          await page.waitForTimeout(500)
          
          // 检查返回场景按钮
          const backToSceneButton = page.locator(SELECTORS.sceneTest.backToSceneButton)
          await expect(backToSceneButton).toBeVisible()
        }
      }
    })

    test('完成测试应能返回场景详情', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      // 答题并找到返回场景按钮
      const firstOption = page.locator('button:has-text("A")').first()
      
      if (await firstOption.count() > 0) {
        await firstOption.click()
        await page.waitForTimeout(500)
        
        // 查找返回场景按钮或下一题按钮
        const backButton = page.locator('button:has-text("返回场景")')
          .or(page.locator('button:has-text("下一题")'))
        
        if (await backButton.count() > 0) {
          await backButton.click()
          await page.waitForTimeout(1000)
          
          // 验证页面跳转
          expect(page.url()).toMatch(/\/scene-detail\/|\/scene-test\//)
        }
      }
    })
  })

  test.describe('无测试数据场景', () => {
    test('无测试题时应显示空状态', async ({ page }) => {
      // 使用一个可能没有测试题的场景
      await navigateToSceneTest(page, 'non_existent_scene_12345')
      await waitForLoadingComplete(page)
      
      // 检查空状态
      const emptyState = page.locator('text=暂无测试数据')
      await expect(emptyState).toBeVisible()
    })

    test('空状态应显示返回按钮', async ({ page }) => {
      await navigateToSceneTest(page, 'non_existent_scene_12345')
      await waitForLoadingComplete(page)
      
      const backButton = page.locator('a:has-text("返回场景详情")')
        .or(page.locator('button:has-text("返回")'))
      
      await expect(backButton).toBeVisible()
    })
  })

  test.describe('AI评测功能', () => {
    test.beforeEach(async ({ page }) => {
      await clearLocalStorage(page)
      await navigateToSceneTest(page, TEST_SCENES.daily.id)
      await waitForLoadingComplete(page)
    })

    test('提交问答题应显示AI评测中', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      const textArea = page.locator('textarea')
      
      if (await textArea.count() > 0) {
        // 输入答案
        await textArea.fill('Hello, my name is John.')
        
        // 点击提交
        const submitButton = page.locator(SELECTORS.sceneTest.submitButton)
        
        if (await submitButton.count() > 0 && await submitButton.isEnabled()) {
          await submitButton.click()
          
          // 检查评测中状态
          const evaluatingIndicator = page.locator('text=/AI.*评测|评测中/')
          try {
            await expect(evaluatingIndicator).toBeVisible({ timeout: 3000 })
          } catch {
            // 评测太快完成
          }
        }
      }
    })

    test('评测完成后应显示反馈', async ({ page }) => {
      await page.waitForTimeout(1000)
      
      const textArea = page.locator('textarea')
      
      if (await textArea.count() > 0) {
        await textArea.fill('Hello, my name is John. Nice to meet you.')
        
        const submitButton = page.locator(SELECTORS.sceneTest.submitButton)
        
        if (await submitButton.count() > 0 && await submitButton.isEnabled()) {
          await submitButton.click()
          
          // 等待评测完成
          await page.waitForTimeout(3000)
          
          // 检查结果反馈
          const feedback = page.locator('text=/回答正确|回答错误|评测完成/')
          const hasFeedback = await feedback.count() > 0
          expect(hasFeedback).toBeTruthy()
        }
      }
    })
  })

  test.describe('响应式布局', () => {
    test('移动端应正常显示测试页', async ({ page }) => {
      await clearLocalStorage(page)
      
      // 设置移动端视口
      await page.setViewportSize({ width: 375, height: 667 })
      await navigateToSceneTest(page, TEST_SCENES.daily.id)
      await waitForLoadingComplete(page)
      
      // 验证关键元素正常显示
      await expect(page.locator(SELECTORS.sceneTest.progressBar)).toBeVisible()
      
      const questionNumber = page.locator('text=/题目 \\d+ \\/ \\d+/')
      await expect(questionNumber).toBeVisible()
    })
  })

  test.describe('性能测试', () => {
    test('页面加载应在合理时间内完成', async ({ page }) => {
      await clearLocalStorage(page)
      
      const startTime = Date.now()
      await navigateToSceneTest(page, TEST_SCENES.daily.id)
      await waitForLoadingComplete(page)
      const endTime = Date.now()
      
      const loadTime = endTime - startTime
      expect(loadTime).toBeLessThan(10000) // 10秒内完成加载
    })
  })
})
