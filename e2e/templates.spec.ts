import { test, expect } from '@playwright/test'

// The template gallery should create a document directly (one click) and open
// its editor, pre-filled with the template content — no intermediate modal.

test.describe('Template gallery — one-click creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('doccraft:guest-mode', '1'))
  })

  test('clicking a doc template creates a doc and opens the editor with content', async ({ page }) => {
    await page.goto('/dashboard?view=templates')
    // The "議事録" (meeting minutes) doc template card.
    const card = page.getByRole('button').filter({ hasText: '議事録' }).first()
    await expect(card).toBeVisible({ timeout: 15000 })
    await card.click()

    // Navigates into the doc editor…
    await expect(page).toHaveURL(/\/docs\/.+/, { timeout: 20000 })
    // …pre-filled with the meeting-minutes template heading.
    await expect(page.getByText('会議議事録')).toBeVisible({ timeout: 15000 })
  })

  test('clicking a slide template creates a multi-slide deck', async ({ page }) => {
    await page.goto('/dashboard?view=templates')
    const card = page.getByRole('button').filter({ hasText: '投資家向けピッチデック' }).first()
    await expect(card).toBeVisible({ timeout: 15000 })
    await card.click()

    await expect(page).toHaveURL(/\/slides\/.+/, { timeout: 20000 })
    // The pitch-deck template builds multiple slides (shown as "1/9" etc.).
    await expect(page.getByText(/\/\s*9/).first()).toBeVisible({ timeout: 15000 })
  })

  test('clicking a blank slide template opens an empty deck', async ({ page }) => {
    await page.goto('/dashboard?view=templates')
    const card = page.getByRole('button').filter({ hasText: 'ブランク' }).first()
    await expect(card).toBeVisible({ timeout: 15000 })
    await card.click()
    await expect(page).toHaveURL(/\/slides\/.+/, { timeout: 20000 })
  })
})
