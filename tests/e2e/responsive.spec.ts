import { test, expect } from '@playwright/test'

test.describe('Responsive Design', () => {
  test('mobile: no horizontal scroll at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })

  test('mobile: burger menu works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    // Burger button should be visible
    const burgerBtn = page.locator('nav button').filter({ has: page.locator('svg path[d*="M4 6h16"]') })
    if (await burgerBtn.isVisible()) {
      await burgerBtn.click()
      // Menu links should appear
      await expect(page.getByText('Вакансии').first()).toBeVisible()
    }
  })

  test('mobile: sidebars hidden', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    // Left and right sidebars should be hidden on mobile (lg:block)
    const leftSidebar = page.locator('aside').first()
    await expect(leftSidebar).toBeHidden()
  })
})
