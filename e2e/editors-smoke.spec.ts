import { test, expect, type Page } from '@playwright/test'

// Guest-mode smoke coverage for the slide / doc / spreadsheet editors:
// seed a minimal document, load the editor, confirm it does NOT hang on the
// loading spinner, perform one edit, and confirm persistence across reload.

type Seed = { key: string; doc: unknown }

function slideSeed(id: string): Seed {
  const now = new Date().toISOString()
  return {
    key: 'doccraft:slide:' + id,
    doc: {
      meta: { id, title: 'E2E Slides', type: 'slides', createdAt: now, updatedAt: now },
      slides: [{ id: 'slide-1', themeKey: 'white-clean', elements: [] }],
      activeSlideId: 'slide-1',
    },
  }
}
function docSeed(id: string): Seed {
  const now = new Date().toISOString()
  return {
    key: 'doccraft:doc:' + id,
    doc: {
      meta: { id, title: 'E2E Doc', type: 'doc', createdAt: now, updatedAt: now },
      blocks: [
        { id: 'b1', type: 'h1', content: 'E2E Heading' },
        { id: 'b2', type: 'paragraph', content: '' },
      ],
    },
  }
}
function sheetSeed(id: string): Seed {
  const now = new Date().toISOString()
  return {
    key: 'doccraft:spreadsheet:' + id,
    doc: {
      meta: { id, title: 'E2E Sheet', type: 'spreadsheet', createdAt: now, updatedAt: now },
      // Seed one cell so the (empty-sheet) welcome/template overlay does not block the grid.
      sheets: [{ id: 'sheet-1', name: 'Sheet1', cells: { '5-5': { value: 'seed' } }, colWidths: {}, rowHeights: {}, mergedCells: [], rowCount: 100, colCount: 26 }],
      activeSheetId: 'sheet-1',
    },
  }
}

async function seed(page: Page, id: string, s: Seed, type: string) {
  await page.addInitScript(
    ({ id, key, doc, type }) => {
      localStorage.setItem('doccraft:guest-mode', '1')
      if (localStorage.getItem(key)) return // seed once; survive reload
      localStorage.setItem(key, JSON.stringify(doc))
      const meta = (doc as { meta: unknown }).meta
      const list = JSON.parse(localStorage.getItem('doccraft:meta') || '[]').filter((m: { id: string }) => m.id !== id)
      list.unshift(meta)
      localStorage.setItem('doccraft:meta', JSON.stringify(list))
      void type
    },
    { id, key: s.key, doc: s.doc, type },
  )
}

test.describe('Editors smoke — does not hang on load', () => {
  test('slide editor loads (no infinite spinner)', async ({ page }) => {
    const id = 'e2e-slide-1'
    await seed(page, id, slideSeed(id), 'slides')
    await page.goto(`/slides/${id}`)
    // The loading spinner text must disappear within a reasonable window.
    await expect(page.getByText('読み込み中')).toHaveCount(0, { timeout: 15000 })
  })

  test('doc editor loads and a block is editable', async ({ page }) => {
    const id = 'e2e-doc-1'
    await seed(page, id, docSeed(id), 'doc')
    await page.goto(`/docs/${id}`)
    await expect(page.getByText('読み込み中')).toHaveCount(0, { timeout: 15000 })
    await expect(page.locator('[contenteditable="true"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('spreadsheet editor loads with a cell grid', async ({ page }) => {
    const id = 'e2e-sheet-1'
    await seed(page, id, sheetSeed(id), 'spreadsheet')
    await page.goto(`/spreadsheets/${id}`)
    await expect(page.getByText('読み込み中')).toHaveCount(0, { timeout: 15000 })
    await expect(page.locator('[role="gridcell"]').first()).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Editors smoke — edit and persist', () => {
  test('doc editor: type into a block and it shows on canvas', async ({ page }) => {
    const id = 'e2e-doc-edit'
    await seed(page, id, docSeed(id), 'doc')
    await page.goto(`/docs/${id}`)
    const para = page.locator('[contenteditable="true"]').nth(1)
    await expect(para).toBeVisible({ timeout: 15000 })
    await para.click()
    await page.keyboard.type('hello-e2e-doc')
    // The typed text should be reflected immediately in the editable block.
    await expect(page.getByText('hello-e2e-doc')).toBeVisible({ timeout: 5000 })
  })

  test('doc editor: typed content persists across reload', async ({ page }) => {
    const id = 'e2e-doc-persist'
    await seed(page, id, docSeed(id), 'doc')
    await page.goto(`/docs/${id}`)
    const para = page.locator('[contenteditable="true"]').nth(1)
    await expect(para).toBeVisible({ timeout: 15000 })
    await para.click()
    await page.keyboard.type('persist-e2e-doc')
    // Click away to blur/commit the block, then allow autosave to flush.
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.waitForTimeout(4000)
    await page.reload()
    await expect(page.getByText('persist-e2e-doc')).toBeVisible({ timeout: 15000 })
  })

  test('spreadsheet editor: edit cell A1 and it persists across reload', async ({ page }) => {
    const id = 'e2e-sheet-edit'
    await seed(page, id, sheetSeed(id), 'spreadsheet')
    await page.goto(`/spreadsheets/${id}`)
    const firstCell = page.locator('[role="gridcell"]').first()
    await expect(firstCell).toBeVisible({ timeout: 15000 })
    await firstCell.dblclick()
    await page.keyboard.type('e2e-cell-42')
    await page.keyboard.press('Enter')
    await expect(page.getByText('e2e-cell-42')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(4000) // allow autosave
    await page.reload()
    await expect(page.getByText('e2e-cell-42')).toBeVisible({ timeout: 15000 })
  })
})
