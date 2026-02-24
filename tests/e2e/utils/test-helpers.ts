import { Page, expect, Locator } from '@playwright/test'
import { TEST_SCENES, SELECTORS } from '../fixtures/test-data'

// 等待页面加载完成
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForLoadState('domcontentloaded')
}

// 导航到场景列表页
export async function navigateToSceneList(page: Page) {
  await page.goto('/scene-list')
  await waitForPageLoad(page)
  await expect(page.locator(SELECTORS.sceneList.header)).toBeVisible()
}

// 导航到场景详情页
export async function navigateToSceneDetail(page: Page, sceneId: string = TEST_SCENES.daily.id) {
  await page.goto(`/scene-detail/${sceneId}`)
  await waitForPageLoad(page)
}

// 导航到场景测试页
export async function navigateToSceneTest(page: Page, sceneId: string = TEST_SCENES.daily.id) {
  await page.goto(`/scene-test/${sceneId}`)
  await waitForPageLoad(page)
}

// 获取场景卡片
export async function getSceneCardByName(page: Page, sceneName: string): Promise<Locator> {
  const card = page.locator(`a:has(h3:has-text("${sceneName}"))`)
  await expect(card).toBeVisible()
  return card
}

// 点击场景卡片进入详情
export async function clickSceneCard(page: Page, sceneName: string) {
  const card = await getSceneCardByName(page, sceneName)
  await card.click()
  await waitForPageLoad(page)
}

// 搜索场景
export async function searchScene(page: Page, keyword: string) {
  const searchInput = page.locator(SELECTORS.sceneList.searchInput)
  await searchInput.fill(keyword)
  await searchInput.press('Enter')
  await page.waitForTimeout(500)
}

// 选择分类
export async function selectCategory(page: Page, category: string) {
  const categoryButton = page.locator(SELECTORS.sceneList.categoryButton(category))
  await categoryButton.click()
  await page.waitForTimeout(500)
}

// 等待加载完成
export async function waitForLoadingComplete(page: Page) {
  const loadingSpinner = page.locator('[class*="animate-spin"]').first()
  try {
    await loadingSpinner.waitFor({ state: 'hidden', timeout: 5000 })
  } catch {
    // 加载已完成或不存在
  }
}

// 检查元素是否存在
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).count() > 0
}

// 滚动到页面底部
export async function scrollToBottom(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(300)
}

// 等待API响应
export async function waitForApiResponse(page: Page, urlPattern: string) {
  return await page.waitForResponse(response => 
    response.url().includes(urlPattern) && response.status() === 200
  )
}

// 截取页面截图
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ 
    path: `e2e-report/screenshots/${name}.png`,
    fullPage: true 
  })
}

// 验证场景卡片内容
export async function verifySceneCardContent(
  card: Locator, 
  expected: { name?: string; category?: string; difficulty?: string }
) {
  if (expected.name) {
    await expect(card.locator('h3')).toHaveText(expected.name)
  }
  if (expected.category) {
    await expect(card.locator(`text=${expected.category}`)).toBeVisible()
  }
  if (expected.difficulty) {
    await expect(card.locator(`text=${expected.difficulty}`)).toBeVisible()
  }
}

// 模拟语音输入
export async function mockSpeechRecognition(page: Page, text: string) {
  await page.evaluate((mockText) => {
    // 模拟webkitSpeechRecognition
    const mockRecognition = {
      start: function() {
        setTimeout(() => {
          const event = new Event('result')
          Object.defineProperty(event, 'results', {
            value: [[{ transcript: mockText }]],
          })
          this.onresult?.(event)
        }, 100)
      },
      stop: function() {},
      onresult: null,
      onerror: null,
      onend: null,
    }
    ;(window as any).webkitSpeechRecognition = function() {
      return mockRecognition
    }
  }, text)
}

// 清除localStorage缓存
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => localStorage.clear())
}

// 设置localStorage缓存
export async function setLocalStorage(page: Page, key: string, value: object) {
  await page.evaluate((data) => {
    localStorage.setItem(data.key, JSON.stringify(data.value))
  }, { key, value })
}
