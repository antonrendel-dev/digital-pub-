import { test, expect } from '@playwright/test'

test.describe('Critical Path', () => {
  test('homepage loads with feed', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Диджитал Паб/)
    // Should see the navbar
    await expect(page.locator('nav')).toBeVisible()
    // Should see filter chips (use first() since tag text appears in cards too)
    await expect(page.getByRole('button', { name: 'Удалёнка' }).first()).toBeVisible()
  })

  test('vacancy detail page loads directly', async ({ page }) => {
    // First get a real vacancy slug from the listing
    const response = await page.goto('/vacancies')
    const firstLink = page.locator('a[href*="/vacancies/"]').first()

    if (await firstLink.isVisible()) {
      const href = await firstLink.getAttribute('href')

      // Navigate directly (full page load, not SPA navigation)
      const detailResponse = await page.goto(href!)
      expect(detailResponse?.status()).toBe(200)

      // Wait for React hydration to complete
      await page.waitForFunction(() => document.querySelector('h1') !== null, { timeout: 15000 })

      // Should see the vacancy title (h1)
      await expect(page.locator('h1')).toBeVisible()
      // Should have CTA button
      const cta = page.locator('text=/Откликнуться|Написать/').first()
      await expect(cta).toBeVisible()
    }
  })

  test('theme toggle works', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    // Click theme toggle button
    await page.getByTitle('Сменить тему').click()
    await expect(html).toHaveAttribute('data-theme', 'dark')
    // Click again to go back
    await page.getByTitle('Сменить тему').click()
    await expect(html).toHaveAttribute('data-theme', 'light')
  })
})
