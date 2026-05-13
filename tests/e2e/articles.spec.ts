import { test, expect } from '@playwright/test'

test.describe('Articles', () => {
  test('articles listing page renders', async ({ page }) => {
    await page.goto('/articles')
    await expect(page).toHaveTitle(/Статьи/)
    await expect(page.getByRole('heading', { name: 'Статьи' })).toBeVisible()
  })

  test('article detail page renders', async ({ page }) => {
    // Use a real published article from content/articles/
    await page.goto('/articles/kak-nayti-rabotu-smm-menedzheru-2026')
    // Title should reflect the article (matches its h1 / metaTitle)
    await expect(page).toHaveTitle(/SMM|работу/i)
    // Article body must render with an <h1>
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('SEO tag page renders', async ({ page }) => {
    await page.goto('/vacancies/tag/smm')
    // Should have unique h1
    await expect(page.getByRole('heading', { level: 1 })).toContainText('SMM')
    // Should have meta title
    await expect(page).toHaveTitle(/SMM/)
  })
})
