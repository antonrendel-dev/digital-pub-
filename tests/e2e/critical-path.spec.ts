import { test, expect } from '@playwright/test'

test.describe('Critical Path', () => {
  test('homepage loads with feed', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Диджитал Паб/)
    // Should see the navbar
    await expect(page.locator('nav')).toBeVisible()
    // Should see filter chips
    await expect(page.getByText('Удалёнка')).toBeVisible()
  })

  test('vacancy detail page renders', async ({ page }) => {
    await page.goto('/vacancies')
    // Click first vacancy link if present
    const firstCard = page.locator('a[href*="/vacancies/"]').first()
    if (await firstCard.isVisible()) {
      await firstCard.click()
      // Should see breadcrumb
      await expect(page.getByText('Главная')).toBeVisible()
      // Should have a primary action button
      const btn = page.locator('a[href*="t.me/"], button').filter({ hasText: /Откликнуться|Написать/ })
      await expect(btn.first()).toBeVisible()
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
