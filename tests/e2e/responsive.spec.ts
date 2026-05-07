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
    // Burger button — the last button in nav that's visible on mobile (lg:hidden)
    const burgerBtn = page.locator('nav button.lg\\:hidden').last()
    await expect(burgerBtn).toBeVisible()
    await burgerBtn.click()
    // Mobile menu should appear with links
    const mobileMenu = page.locator('.lg\\:hidden.bg-bg-card')
    await expect(mobileMenu).toBeVisible()
    await expect(mobileMenu.getByText('Вакансии')).toBeVisible()
  })

  test('mobile: sidebars hidden', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    // Left and right sidebars should be hidden on mobile (lg:block)
    const leftSidebar = page.locator('aside').first()
    await expect(leftSidebar).toBeHidden()
  })
})
