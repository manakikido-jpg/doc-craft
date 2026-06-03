import { describe, it, expect } from 'vitest'
import { sanitizeHtml, escapeHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('strips script tags completely', () => {
    const result = sanitizeHtml('<script>alert("xss")</script>Hello')
    expect(result).not.toContain('<script')
    expect(result).not.toContain('alert')
    expect(result).toContain('Hello')
  })

  it('strips event handler attributes', () => {
    const result = sanitizeHtml('<div onload="alert(1)">text</div>')
    expect(result).not.toContain('onload')
    expect(result).toContain('text')
  })

  it('strips iframe tags', () => {
    const result = sanitizeHtml('<iframe src="evil.com"></iframe>content')
    expect(result).not.toContain('iframe')
    expect(result).toContain('content')
  })

  it('allows safe inline formatting tags', () => {
    const result = sanitizeHtml('<b>bold</b> <i>italic</i> <u>underline</u>')
    expect(result).toContain('<b>')
    expect(result).toContain('<i>')
    expect(result).toContain('<u>')
  })

  it('allows safe style attributes but blocks dangerous CSS', () => {
    const safe = sanitizeHtml('<span style="color: red; font-size: 14px">text</span>')
    expect(safe).toContain('color')
    expect(safe).toContain('font-size')

    const dangerous = sanitizeHtml('<span style="background: url(javascript:alert(1))">text</span>')
    expect(dangerous).not.toContain('javascript')
  })

  it('blocks style attributes with expression()', () => {
    const result = sanitizeHtml('<span style="width: expression(alert(1))">text</span>')
    expect(result).not.toContain('expression')
  })

  it('strips data attributes', () => {
    const result = sanitizeHtml('<span data-evil="payload">text</span>')
    expect(result).not.toContain('data-evil')
    expect(result).toContain('text')
  })
})

describe('escapeHtml', () => {
  it('escapes all HTML special characters', () => {
    const result = escapeHtml('<div class="test">O\'Brien & Co</div>')
    expect(result).toBe('&lt;div class=&quot;test&quot;&gt;O&#39;Brien &amp; Co&lt;/div&gt;')
  })

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('passes through plain text unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123')
  })
})
