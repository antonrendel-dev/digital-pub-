import { test, expect } from '@playwright/test'

test.describe('Articles', () => {
  test('articles listing page renders', async ({ page }) => {
    await page.goto('/articles')
    await expect(page).toHaveTitle(/Статьи/)
    await expect(page.getByRole('heading', { name: 'Статьи' })).toBeVisible()
  })

  test('article detail page renders', async ({ page }) => {
    await page.goto('/articles/sample')
    await expect(page).toHaveTitle(/Как найти работу/)
    // Content should include the article heading
    await expect(page.getByText('С чего начать поиск')).toBeVisible()
  })

  test('SEO tag page renders', async ({ page }) => {
    await page.goto('/vacancies/tag/smm')
    // Should have unique h1
    await expect(page.getByRole('heading', { level: 1 })).toContainText('SMM')
    // Should have meta title
    await expect(page).toHaveTitle(/SMM/)
  })
})
