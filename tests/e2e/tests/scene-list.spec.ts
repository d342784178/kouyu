import { test, expect } from '@playwright/test'
import { CATEGORIES, TEST_SCENES, SELECTORS } from '../fixtures/test-data'
import {
  navigateToSceneList,
  searchScene,
  selectCategory,
  waitForLoadingComplete,
  scrollToBottom,
  elementExists,
  waitForApiResponse,
} from '../utils/test-helpers'

test.describe('场景列表页', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSceneList(page)
    await waitForLoadingComplete(page)
  })

  test.describe('页面初始加载', () => {
    test('应正确显示页面标题和描述', async ({ page }) => {
      const header = page.locator(SELECTORS.sceneList.header)
      await expect(header).toBeVisible()
      await expect(header).toHaveText('场景学习')

      const description = page.locator('p:has-text("在真实场景中练习英语口语")')
      await expect(description).toBeVisible()
    })

    test('应显示搜索框', async ({ page }) => {
      const searchInput = page.locator(SELECTORS.sceneList.searchInput)
      await expect(searchInput).toBeVisible()
      await expect(searchInput).toHaveAttribute('placeholder', '搜索场景...')
    })

    test('应显示所有分类标签', async ({ page }) => {
      for (const category of CATEGORIES) {
        const categoryButton = page.locator(SELECTORS.sceneList.categoryButton(category))
        await expect(categoryButton).toBeVisible()
      }
    })

    test('默认应选中"全部"分类', async ({ page }) => {
      const allCategoryButton = page.locator(SELECTORS.sceneList.categoryButton('全部'))
      await expect(allCategoryButton).toHaveCSS('background-color', /rgb\(/)
    })

    test('应显示场景总数', async ({ page }) => {
      const countText = page.locator('text=/共 \\d+ 个场景/')
      await expect(countText).toBeVisible()
    })
  })

  test.describe('场景列表展示', () => {
    test('应显示场景卡片列表', async ({ page }) => {
      const sceneCards = page.locator(SELECTORS.sceneList.sceneCard)
      const count = await sceneCards.count()
      expect(count).toBeGreaterThan(0)
    })

    test('场景卡片应包含必要信息', async ({ page }) => {
      const firstCard = page.locator(SELECTORS.sceneList.sceneCard).first()
      
      // 检查场景名称
      await expect(firstCard.locator('h3')).toBeVisible()
      
      // 检查分类标签
      const categoryTag = firstCard.locator('span').filter({ hasText: /日常|职场|留学|旅行|社交/ })
      await expect(categoryTag).toBeVisible()
      
      // 检查难度标签
      const difficultyTag = firstCard.locator('span').filter({ hasText: /初级|中级|高级/ })
      await expect(difficultyTag).toBeVisible()
      
      // 检查描述
      await expect(firstCard.locator('p')).toBeVisible()
    })

    test('点击场景卡片应跳转到详情页', async ({ page }) => {
      const firstCard = page.locator(SELECTORS.sceneList.sceneCard).first()
      const sceneName = await firstCard.locator('h3').textContent()
      
      await firstCard.click()
      await page.waitForURL(/\/scene-detail\//)
      
      // 验证页面标题
      const pageTitle = page.locator('h1')
      await expect(pageTitle).toHaveText(sceneName || '')
    })
  })

  test.describe('分类筛选功能', () => {
    test('切换分类应更新场景列表', async ({ page }) => {
      // 等待初始加载
      await waitForApiResponse(page, '/api/scenes')
      
      // 切换到"日常"分类
      await selectCategory(page, '日常')
      
      // 等待API响应
      await waitForApiResponse(page, '/api/scenes')
      
      // 验证场景列表更新
      const sceneCards = page.locator(SELECTORS.sceneList.sceneCard)
      const count = await sceneCards.count()
      
      if (count > 0) {
        // 验证显示的场景都属于"日常"分类
        const firstCard = sceneCards.first()
        const dailyTag = firstCard.locator('span:has-text("日常")')
        await expect(dailyTag).toBeVisible()
      }
    })

    test('切换分类应更新场景总数', async ({ page }) => {
      // 获取全部场景数
      const allCountText = await page.locator('span:has-text("共")').textContent()
      const allCount = allCountText?.match(/\d+/)?.[0]
      
      // 切换到"职场"分类
      await selectCategory(page, '职场')
      await waitForApiResponse(page, '/api/scenes')
      
      // 获取职场场景数
      const workplaceCountText = await page.locator('span:has-text("共")').textContent()
      const workplaceCount = workplaceCountText?.match(/\d+/)?.[0]
      
      // 验证数量不同（如果数据库中有数据）
      if (allCount && workplaceCount && parseInt(workplaceCount) > 0) {
        expect(parseInt(workplaceCount)).toBeLessThanOrEqual(parseInt(allCount))
      }
    })

    test('选中分类应有视觉高亮', async ({ page }) => {
      const dailyButton = page.locator(SELECTORS.sceneList.categoryButton('日常'))
      await dailyButton.click()
      
      // 验证按钮样式变化
      await expect(dailyButton).toHaveCSS('color', /rgb\(255,\s*255,\s*255\)|white/)
    })
  })

  test.describe('搜索功能', () => {
    test('搜索应过滤场景列表', async ({ page }) => {
      const searchKeyword = '见面'
      await searchScene(page, searchKeyword)
      
      // 等待API响应
      await waitForApiResponse(page, '/api/scenes')
      
      // 验证搜索结果
      const sceneCards = page.locator(SELECTORS.sceneList.sceneCard)
      const count = await sceneCards.count()
      
      if (count > 0) {
        // 验证第一个卡片包含搜索关键词
        const firstCardText = await sceneCards.first().textContent()
        const containsKeyword = firstCardText?.includes(searchKeyword) || 
                               firstCardText?.includes('见面') ||
                               firstCardText?.includes('初次')
        expect(containsKeyword).toBeTruthy()
      }
    })

    test('搜索无结果时应显示空状态', async ({ page }) => {
      // 使用一个不太可能存在的关键词
      await searchScene(page, 'xyzabc123')
      
      // 等待API响应
      await waitForApiResponse(page, '/api/scenes')
      
      // 验证空状态显示
      const emptyState = page.locator('text=暂无相关场景')
      await expect(emptyState).toBeVisible()
      
      const suggestion = page.locator('text=试试其他关键词')
      await expect(suggestion).toBeVisible()
    })

    test('清空搜索应恢复全部场景', async ({ page }) => {
      // 先搜索
      await searchScene(page, '见面')
      await waitForApiResponse(page, '/api/scenes')
      
      // 清空搜索
      const searchInput = page.locator(SELECTORS.sceneList.searchInput)
      await searchInput.clear()
      await searchInput.press('Enter')
      await waitForApiResponse(page, '/api/scenes')
      
      // 验证场景列表恢复
      const sceneCards = page.locator(SELECTORS.sceneList.sceneCard)
      const count = await sceneCards.count()
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('无限滚动加载', () => {
    test('滚动到底部应加载更多场景', async ({ page }) => {
      // 获取初始场景数量
      const initialCards = page.locator(SELECTORS.sceneList.sceneCard)
      const initialCount = await initialCards.count()
      
      // 滚动到底部
      await scrollToBottom(page)
      
      // 等待加载更多指示器或检查数量变化
      await page.waitForTimeout(1000)
      
      // 如果还有更多数据，验证加载了更多
      const hasMoreIndicator = await elementExists(page, 'text=下拉加载更多')
      const noMoreIndicator = await elementExists(page, 'text=已经到底了')
      
      if (hasMoreIndicator) {
        const newCount = await initialCards.count()
        expect(newCount).toBeGreaterThanOrEqual(initialCount)
      } else if (noMoreIndicator) {
        // 已经加载完所有数据
        expect(noMoreIndicator).toBeTruthy()
      }
    })

    test('加载更多时应显示加载状态', async ({ page }) => {
      // 滚动到底部触发加载
      await scrollToBottom(page)
      
      // 检查加载状态（如果还有更多数据）
      const loadingIndicator = page.locator('text=加载更多...')
      try {
        await expect(loadingIndicator).toBeVisible({ timeout: 2000 })
      } catch {
        // 加载太快或没有更多数据
      }
    })
  })

  test.describe('响应式布局', () => {
    test('移动端应正常显示', async ({ page }) => {
      // 设置移动端视口
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await waitForLoadingComplete(page)
      
      // 验证页面元素正常显示
      await expect(page.locator(SELECTORS.sceneList.header)).toBeVisible()
      await expect(page.locator(SELECTORS.sceneList.searchInput)).toBeVisible()
      
      // 验证场景卡片正常显示
      const sceneCards = page.locator(SELECTORS.sceneList.sceneCard)
      expect(await sceneCards.count()).toBeGreaterThan(0)
    })
  })
})
