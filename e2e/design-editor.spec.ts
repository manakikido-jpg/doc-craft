import { test, expect, type Page } from '@playwright/test'

// End-to-end coverage for the design editor's critical flow, exercised in guest
// mode (localStorage persistence) so it needs no Supabase auth. Seeds a document
// before load, edits it, and asserts the edits survive a reload.

const DESIGN_ID = 'e2e-design-1'

async function seedGuestDesign(page: Page) {
  await page.addInitScript((id) => {
    localStorage.setItem('doccraft:guest-mode', '1')
    // Seed ONLY once — this init script also runs on reload, and re-seeding would
    // wipe edits made during the test. Skip if the design already exists.
    if (localStorage.getItem('doccraft:design:' + id)) return
    const now = new Date().toISOString()
    const meta = { id, title: 'E2E Design', type: 'design', createdAt: now, updatedAt: now }
    const doc = {
      meta,
      canvas: { id: 'c1', themeKey: 'dark-blue', elements: [] },
      canvasSize: { preset: 'instagram-post', width: 1080, height: 1080, label: 'Instagram投稿' },
    }
    localStorage.setItem('doccraft:design:' + id, JSON.stringify(doc))
    const list = JSON.parse(localStorage.getItem('doccraft:meta') || '[]').filter((m: { id: string }) => m.id !== id)
    list.unshift(meta)
    localStorage.setItem('doccraft:meta', JSON.stringify(list))
  }, DESIGN_ID)
}

test.describe('Design editor — critical flow (guest mode)', () => {
  test('loads the editor with toolbar and canvas', async ({ page }) => {
    await seedGuestDesign(page)
    await page.goto(`/designs/${DESIGN_ID}`)
    await expect(page.locator('[data-canvas-bg="true"]')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: 'テキスト' })).toBeVisible()
    await expect(page.getByRole('button', { name: '図形' })).toBeVisible()
  })

  test('adds a text element and it renders on the canvas', async ({ page }) => {
    await seedGuestDesign(page)
    await page.goto(`/designs/${DESIGN_ID}`)
    const canvas = page.locator('[data-canvas-bg="true"]')
    await expect(canvas).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'テキスト' }).click()
    await expect(canvas.getByText('テキストを入力')).toBeVisible()
  })

  test('shows a save status that reaches "saved"', async ({ page }) => {
    await seedGuestDesign(page)
    await page.goto(`/designs/${DESIGN_ID}`)
    await expect(page.locator('[data-canvas-bg="true"]')).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: '図形' }).click()
    await page.getByRole('button', { name: '四角形' }).click()

    await expect(page.locator('[data-save-status="saved"]')).toBeVisible({ timeout: 10000 })
  })

  test('persists added elements across a reload', async ({ page }) => {
    await seedGuestDesign(page)
    await page.goto(`/designs/${DESIGN_ID}`)
    const canvas = page.locator('[data-canvas-bg="true"]')
    await expect(canvas).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'テキスト' }).click()
    await expect(canvas.getByText('テキストを入力')).toBeVisible()

    // Wait for the autosave to flush.
    await expect(page.locator('[data-save-status="saved"]')).toBeVisible({ timeout: 10000 })

    await page.reload()
    await expect(canvas).toBeVisible({ timeout: 15000 })
    // The element should still be there after reload (persisted to localStorage).
    await expect(canvas.getByText('テキストを入力')).toBeVisible()
  })

  test('undo removes the last added element', async ({ page }) => {
    await seedGuestDesign(page)
    await page.goto(`/designs/${DESIGN_ID}`)
    const canvas = page.locator('[data-canvas-bg="true"]')
    await expect(canvas).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'テキスト' }).click()
    await expect(canvas.getByText('テキストを入力')).toBeVisible()

    await page.getByRole('button', { name: '元に戻す (Ctrl+Z)' }).click()
    await expect(canvas.getByText('テキストを入力')).toHaveCount(0)
  })
})
