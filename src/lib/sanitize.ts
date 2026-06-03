import DOMPurify from 'dompurify'

/**
 * Whitelist of safe CSS properties allowed in style attributes.
 * Blocks dangerous properties like position, expression(), url(), behavior, -moz-binding.
 */
const ALLOWED_CSS_PROPERTIES = new Set([
  'color',
  'background-color',
  'background',
  'font-size',
  'font-weight',
  'font-style',
  'font-family',
  'text-align',
  'text-decoration',
  'text-indent',
  'text-transform',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'white-space',
  'vertical-align',
  'display',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-color',
  'border-style',
  'border-width',
  'border-radius',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'opacity',
  'overflow',
  'list-style',
  'list-style-type',
])

/**
 * Filter a style attribute string to only include whitelisted CSS properties.
 * Also blocks any values containing url(), expression(), or other dangerous patterns.
 */
function sanitizeStyleValue(style: string): string {
  const dangerousPatterns = /url\s*\(|expression\s*\(|javascript\s*:|behavior\s*:|@import|-moz-binding/i
  return style
    .split(';')
    .map(decl => decl.trim())
    .filter(decl => {
      if (!decl) return false
      const colonIdx = decl.indexOf(':')
      if (colonIdx === -1) return false
      const prop = decl.substring(0, colonIdx).trim().toLowerCase()
      const val = decl.substring(colonIdx + 1).trim()
      if (!ALLOWED_CSS_PROPERTIES.has(prop)) return false
      if (dangerousPatterns.test(val)) return false
      return true
    })
    .join('; ')
}

let purifyHookInstalled = false

function ensurePurifyHook() {
  if (purifyHookInstalled) return
  purifyHookInstalled = true
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName === 'style' && data.attrValue) {
      data.attrValue = sanitizeStyleValue(data.attrValue)
    }
  })
}

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe inline formatting tags used by contentEditable.
 * Style attributes are filtered to only allow safe CSS properties.
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // SSR fallback: strip all HTML tags
    return dirty.replace(/<[^>]*>/g, '')
  }
  ensurePurifyHook()
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b', 'i', 'u', 's', 'em', 'strong', 'span', 'br', 'div', 'p',
      'sub', 'sup', 'font', 'strike', 'del', 'ins', 'mark',
    ],
    ALLOWED_ATTR: ['style', 'color', 'face', 'size', 'class'],
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * Escape HTML for contexts where no HTML is allowed (e.g. export to raw HTML string).
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
