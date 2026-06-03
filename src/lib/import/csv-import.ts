/**
 * CSV Import utility — parse CSV text with configurable delimiters.
 * Handles quoted fields with embedded delimiters and newlines.
 */

export type CsvDelimiter = ',' | '\t' | ';' | 'auto'

/**
 * Auto-detect delimiter from the first line(s) of CSV text.
 */
function detectDelimiter(text: string): ',' | '\t' | ';' {
  const firstLines = text.split('\n').slice(0, 5).join('\n')
  const counts: Record<string, number> = { ',': 0, '\t': 0, ';': 0 }

  let inQuote = false
  for (const ch of firstLines) {
    if (ch === '"') {
      inQuote = !inQuote
    } else if (!inQuote) {
      if (ch in counts) counts[ch]++
    }
  }

  if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t'
  if (counts[';'] > counts[',']) return ';'
  return ','
}

/**
 * Parse a CSV string into a 2D string array.
 */
export function parseCSV(
  text: string,
  delimiter: CsvDelimiter = 'auto'
): string[][] {
  if (!text.trim()) return []

  const delim = delimiter === 'auto' ? detectDelimiter(text) : delimiter
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ("")
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"'
          i += 2
          continue
        } else {
          // End of quoted field
          inQuotes = false
          i++
          continue
        }
      } else {
        currentField += ch
        i++
        continue
      }
    }

    // Not in quotes
    if (ch === '"' && currentField === '') {
      inQuotes = true
      i++
    } else if (ch === delim) {
      currentRow.push(currentField)
      currentField = ''
      i++
    } else if (ch === '\r') {
      // Handle \r\n or bare \r
      currentRow.push(currentField)
      currentField = ''
      rows.push(currentRow)
      currentRow = []
      i++
      if (i < text.length && text[i] === '\n') i++
    } else if (ch === '\n') {
      currentRow.push(currentField)
      currentField = ''
      rows.push(currentRow)
      currentRow = []
      i++
    } else {
      currentField += ch
      i++
    }
  }

  // Push last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  return rows
}
