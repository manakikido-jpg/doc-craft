/**
 * Simple dictionary-based spell check for Japanese common typos.
 * Provides a list of common misspellings and their corrections.
 */

export interface SpellSuggestion {
  wrong: string
  correct: string
  message: string
}

// Common Japanese typos and misspellings (~50 entries)
const TYPO_DICTIONARY: { wrong: string; correct: string }[] = [
  // Common kanji/kana confusions
  { wrong: 'ずつ', correct: 'づつ' },
  { wrong: '少しづつ', correct: '少しずつ' },
  { wrong: 'こんにちわ', correct: 'こんにちは' },
  { wrong: 'こんばんわ', correct: 'こんばんは' },
  { wrong: 'ゆう', correct: 'いう' },
  { wrong: 'とゆう', correct: 'という' },
  { wrong: 'いずれにしろ', correct: 'いずれにせよ' },
  { wrong: 'ふいんき', correct: 'ふんいき' },
  { wrong: '的を得た', correct: '的を射た' },
  { wrong: '汚名挽回', correct: '汚名返上' },
  { wrong: '役不足', correct: '力不足' },
  { wrong: '敷居が高い', correct: '敷居が高い(※ 本来は「不義理」の意)' },
  { wrong: '延々と', correct: '延々と' },
  { wrong: '永遠と', correct: '延々と' },
  { wrong: '取り付く暇もない', correct: '取り付く島もない' },
  // Double particle errors
  { wrong: 'をを', correct: 'を' },
  { wrong: 'はは', correct: 'は' },
  { wrong: 'がが', correct: 'が' },
  { wrong: 'のの', correct: 'の' },
  // Common spelling errors
  { wrong: 'シュミレーション', correct: 'シミュレーション' },
  { wrong: 'コミニュケーション', correct: 'コミュニケーション' },
  { wrong: 'ティッシュ', correct: 'ティッシュ' },
  { wrong: 'ボランティア', correct: 'ボランティア' },
  { wrong: 'アボガド', correct: 'アボカド' },
  { wrong: 'ギプス', correct: 'ギプス' },
  { wrong: 'バトミントン', correct: 'バドミントン' },
  { wrong: 'ベット', correct: 'ベッド' },
  { wrong: 'デスクトップ', correct: 'デスクトップ' },
  { wrong: 'プリンター', correct: 'プリンター' },
  { wrong: 'ドキュメンテーション', correct: 'ドキュメンテーション' },
  // Business Japanese errors
  { wrong: 'ご確認して下さい', correct: 'ご確認ください' },
  { wrong: 'お伺いさせて頂きます', correct: 'お伺いいたします' },
  { wrong: 'とんでもございません', correct: 'とんでもないことです' },
  { wrong: '了解しました', correct: '承知しました' },
  { wrong: 'すいません', correct: 'すみません' },
  { wrong: '御社', correct: '貴社' },
  // Additional common errors
  { wrong: 'ずらい', correct: 'づらい' },
  { wrong: '確率的', correct: '確率的' },
  { wrong: 'ず つ', correct: 'ずつ' },
  { wrong: 'おなじく', correct: '同じく' },
  { wrong: '以外と', correct: '意外と' },
  { wrong: '初めまして', correct: '初めまして' },
  { wrong: 'ヒヤリング', correct: 'ヒアリング' },
  { wrong: 'プレゼンテイション', correct: 'プレゼンテーション' },
  { wrong: 'インターフェイス', correct: 'インターフェース' },
  { wrong: 'ウオッチ', correct: 'ウォッチ' },
  { wrong: 'フューチャー', correct: 'フィーチャー' },
  { wrong: 'ヴァイオレンス', correct: 'バイオレンス' },
  { wrong: 'ネットワーク', correct: 'ネットワーク' },
  { wrong: 'つずく', correct: 'つづく' },
]

/**
 * Check text for common misspellings.
 * Returns an array of suggestions with positions.
 */
export function checkSpelling(text: string): SpellSuggestion[] {
  const suggestions: SpellSuggestion[] = []
  const plainText = text.replace(/<[^>]*>/g, '')

  for (const entry of TYPO_DICTIONARY) {
    if (entry.wrong === entry.correct) continue // Skip identity entries
    if (plainText.includes(entry.wrong)) {
      suggestions.push({
        wrong: entry.wrong,
        correct: entry.correct,
        message: `「${entry.wrong}」→「${entry.correct}」`,
      })
    }
  }

  return suggestions
}

/**
 * Apply spell check CSS to content.
 * Wraps misspelled words with a span that has wavy red underline.
 */
export function highlightMisspellings(html: string): string {
  let result = html
  for (const entry of TYPO_DICTIONARY) {
    if (entry.wrong === entry.correct) continue
    if (result.includes(entry.wrong)) {
      // Only replace text outside of HTML tags
      const regex = new RegExp(`(?<![<>])${escapeRegex(entry.wrong)}(?![^<]*>)`, 'g')
      result = result.replace(
        regex,
        `<span class="spell-error" data-spell-correct="${entry.correct}" style="text-decoration: wavy underline red; text-decoration-skip-ink: none; text-underline-offset: 2px; cursor: help;" title="候補: ${entry.correct}">${entry.wrong}</span>`
      )
    }
  }
  return result
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Get correction suggestions for a misspelled word.
 */
export function getSuggestions(word: string): string[] {
  const results: string[] = []
  for (const entry of TYPO_DICTIONARY) {
    if (entry.wrong === word && entry.wrong !== entry.correct) {
      results.push(entry.correct)
    }
  }
  return results
}

export const SPELL_CHECK_STYLE = `
  .spell-error {
    text-decoration: wavy underline red !important;
    text-decoration-skip-ink: none;
    text-underline-offset: 2px;
    cursor: help;
  }
`
