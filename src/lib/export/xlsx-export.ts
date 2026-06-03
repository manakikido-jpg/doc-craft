/**
 * XLSX Export — generate a minimal .xlsx file using JSZip-like manual ZIP + XML generation.
 * Supports: cell values, basic formatting (bold, italic, colors), column widths, sheet names, merged cells.
 *
 * XLSX is a ZIP archive containing XML files. We build the XML manually to avoid heavy dependencies.
 */

import type { Sheet, CellFormat } from '@/types'

// ── Helpers ──

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function colIndexToLetter(col: number): string {
  let result = ''
  let c = col
  while (c >= 0) {
    result = String.fromCharCode(65 + (c % 26)) + result
    c = Math.floor(c / 26) - 1
  }
  return result
}

function cellRef(row: number, col: number): string {
  return `${colIndexToLetter(col)}${row + 1}`
}

function colorToArgb(hex?: string): string {
  if (!hex) return 'FF000000'
  const clean = hex.replace('#', '')
  if (clean.length === 6) return 'FF' + clean.toUpperCase()
  if (clean.length === 8) return clean.toUpperCase()
  return 'FF000000'
}

interface UsedRange {
  maxRow: number
  maxCol: number
}

function getUsedRange(sheet: Sheet): UsedRange {
  let maxRow = 0
  let maxCol = 0
  for (const key of Object.keys(sheet.cells)) {
    const [rStr, cStr] = key.split(',')
    const r = parseInt(rStr, 10)
    const c = parseInt(cStr, 10)
    if (r > maxRow) maxRow = r
    if (c > maxCol) maxCol = c
  }
  return { maxRow, maxCol }
}

// ── Shared strings ──

function buildSharedStrings(sheets: Sheet[]): { sst: Map<string, number>; xml: string } {
  const sst = new Map<string, number>()
  let idx = 0
  for (const sheet of sheets) {
    for (const cell of Object.values(sheet.cells)) {
      const val = cell.value
      if (val && isNaN(Number(val))) {
        if (!sst.has(val)) {
          sst.set(val, idx++)
        }
      }
    }
  }

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`
  xml += `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sst.size}" uniqueCount="${sst.size}">\n`
  for (const [text] of sst) {
    xml += `  <si><t>${escapeXml(text)}</t></si>\n`
  }
  xml += `</sst>`
  return { sst, xml }
}

// ── Styles ──

interface StyleEntry {
  bold?: boolean
  italic?: boolean
  textColor?: string
  bgColor?: string
  fontSize?: number
  fontFamily?: string
}

function buildStyles(sheets: Sheet[]): { styleMap: Map<string, number>; xml: string } {
  const styles: StyleEntry[] = [{}] // index 0 = default
  const styleMap = new Map<string, number>()
  styleMap.set('', 0)

  for (const sheet of sheets) {
    for (const cell of Object.values(sheet.cells)) {
      if (cell.format) {
        const key = JSON.stringify({
          bold: cell.format.bold,
          italic: cell.format.italic,
          textColor: cell.format.textColor,
          bgColor: cell.format.bgColor,
          fontSize: cell.format.fontSize,
          fontFamily: cell.format.fontFamily,
        })
        if (!styleMap.has(key)) {
          styleMap.set(key, styles.length)
          styles.push({
            bold: cell.format.bold,
            italic: cell.format.italic,
            textColor: cell.format.textColor,
            bgColor: cell.format.bgColor,
            fontSize: cell.format.fontSize,
            fontFamily: cell.format.fontFamily,
          })
        }
      }
    }
  }

  // Build minimal styles XML
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`
  xml += `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n`

  // Number formats (none custom needed)
  xml += `  <numFmts count="0"/>\n`

  // Fonts
  xml += `  <fonts count="${styles.length}">\n`
  for (const s of styles) {
    xml += `    <font>\n`
    if (s.bold) xml += `      <b/>\n`
    if (s.italic) xml += `      <i/>\n`
    xml += `      <sz val="${s.fontSize || 11}"/>\n`
    xml += `      <color rgb="${colorToArgb(s.textColor)}"/>\n`
    xml += `      <name val="${escapeXml(s.fontFamily?.split(',')[0]?.replace(/"/g, '') || 'Calibri')}"/>\n`
    xml += `    </font>\n`
  }
  xml += `  </fonts>\n`

  // Fills
  xml += `  <fills count="${styles.length + 2}">\n`
  xml += `    <fill><patternFill patternType="none"/></fill>\n`
  xml += `    <fill><patternFill patternType="gray125"/></fill>\n`
  for (const s of styles) {
    if (s.bgColor) {
      xml += `    <fill><patternFill patternType="solid"><fgColor rgb="${colorToArgb(s.bgColor)}"/></patternFill></fill>\n`
    } else {
      xml += `    <fill><patternFill patternType="none"/></fill>\n`
    }
  }
  xml += `  </fills>\n`

  // Borders (just default)
  xml += `  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>\n`

  // Cell style xfs
  xml += `  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>\n`

  // Cell xfs
  xml += `  <cellXfs count="${styles.length}">\n`
  for (let i = 0; i < styles.length; i++) {
    const fillId = styles[i].bgColor ? i + 2 : 0
    xml += `    <xf numFmtId="0" fontId="${i}" fillId="${fillId}" borderId="0" xfId="0"${i > 0 ? ' applyFont="1" applyFill="1"' : ''}/>\n`
  }
  xml += `  </cellXfs>\n`

  xml += `  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>\n`
  xml += `</styleSheet>`

  return { styleMap, xml }
}

// ── Sheet XML ──

function buildSheetXml(
  sheet: Sheet,
  sst: Map<string, number>,
  styleMap: Map<string, number>
): string {
  const { maxRow, maxCol } = getUsedRange(sheet)

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`
  xml += `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n`

  // Column widths
  const colWidthEntries = Object.entries(sheet.colWidths).filter(([, w]) => w > 0)
  if (colWidthEntries.length > 0) {
    xml += `  <cols>\n`
    for (const [colStr, width] of colWidthEntries) {
      const col = parseInt(colStr, 10) + 1
      const excelWidth = Math.round(width / 7) // approximate px to char width
      xml += `    <col min="${col}" max="${col}" width="${excelWidth}" customWidth="1"/>\n`
    }
    xml += `  </cols>\n`
  }

  // Sheet data
  xml += `  <sheetData>\n`
  for (let r = 0; r <= maxRow; r++) {
    const rowCells: string[] = []
    for (let c = 0; c <= maxCol; c++) {
      const cell = sheet.cells[`${r},${c}`]
      if (!cell || !cell.value) continue

      const ref = cellRef(r, c)
      let styleIdx = 0
      if (cell.format) {
        const key = JSON.stringify({
          bold: cell.format.bold,
          italic: cell.format.italic,
          textColor: cell.format.textColor,
          bgColor: cell.format.bgColor,
          fontSize: cell.format.fontSize,
          fontFamily: cell.format.fontFamily,
        })
        styleIdx = styleMap.get(key) || 0
      }

      const numVal = Number(cell.value)
      if (!isNaN(numVal) && cell.value.trim() !== '') {
        rowCells.push(`      <c r="${ref}"${styleIdx ? ` s="${styleIdx}"` : ''}><v>${numVal}</v></c>\n`)
      } else {
        const sstIdx = sst.get(cell.value)
        if (sstIdx !== undefined) {
          rowCells.push(`      <c r="${ref}" t="s"${styleIdx ? ` s="${styleIdx}"` : ''}><v>${sstIdx}</v></c>\n`)
        }
      }
    }
    if (rowCells.length > 0) {
      xml += `    <row r="${r + 1}">\n${rowCells.join('')}    </row>\n`
    }
  }
  xml += `  </sheetData>\n`

  // Merged cells
  if (sheet.mergedCells.length > 0) {
    xml += `  <mergeCells count="${sheet.mergedCells.length}">\n`
    for (const mc of sheet.mergedCells) {
      const from = cellRef(mc.startRow, mc.startCol)
      const to = cellRef(mc.startRow + mc.rowSpan - 1, mc.startCol + mc.colSpan - 1)
      xml += `    <mergeCell ref="${from}:${to}"/>\n`
    }
    xml += `  </mergeCells>\n`
  }

  xml += `</worksheet>`
  return xml
}

// ── CRC32 for ZIP ──

function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }
  return table
}

const CRC32_TABLE = makeCrc32Table()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

// ── ZIP builder (store method, no compression for simplicity) ──

interface ZipEntry {
  name: string
  data: Uint8Array
}

function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const parts: { header: Uint8Array; nameBytes: Uint8Array; data: Uint8Array; offset: number }[] = []
  let offset = 0

  // Local file headers + data
  const localParts: Uint8Array[] = []
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const crc = crc32(entry.data)

    // Local file header (30 bytes + name)
    const header = new Uint8Array(30)
    const hv = new DataView(header.buffer)
    hv.setUint32(0, 0x04034b50, true) // signature
    hv.setUint16(4, 20, true)         // version needed
    hv.setUint16(6, 0, true)          // flags
    hv.setUint16(8, 0, true)          // compression (store)
    hv.setUint16(10, 0, true)         // mod time
    hv.setUint16(12, 0, true)         // mod date
    hv.setUint32(14, crc, true)       // crc32
    hv.setUint32(18, entry.data.length, true) // compressed size
    hv.setUint32(22, entry.data.length, true) // uncompressed size
    hv.setUint16(26, nameBytes.length, true)  // name length
    hv.setUint16(28, 0, true)         // extra field length

    parts.push({ header, nameBytes, data: entry.data, offset })
    localParts.push(header, nameBytes, entry.data)
    offset += 30 + nameBytes.length + entry.data.length
  }

  // Central directory
  const centralParts: Uint8Array[] = []
  let centralSize = 0
  for (const part of parts) {
    const crc = crc32(part.data)
    const central = new Uint8Array(46)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)  // signature
    cv.setUint16(4, 20, true)          // version made by
    cv.setUint16(6, 20, true)          // version needed
    cv.setUint16(8, 0, true)           // flags
    cv.setUint16(10, 0, true)          // compression
    cv.setUint16(12, 0, true)          // mod time
    cv.setUint16(14, 0, true)          // mod date
    cv.setUint32(16, crc, true)        // crc32
    cv.setUint32(20, part.data.length, true) // compressed size
    cv.setUint32(24, part.data.length, true) // uncompressed size
    cv.setUint16(28, part.nameBytes.length, true) // name length
    cv.setUint16(30, 0, true)          // extra length
    cv.setUint16(32, 0, true)          // comment length
    cv.setUint16(34, 0, true)          // disk number
    cv.setUint16(36, 0, true)          // internal attr
    cv.setUint32(38, 0, true)          // external attr
    cv.setUint32(42, part.offset, true) // local header offset

    centralParts.push(central, part.nameBytes)
    centralSize += 46 + part.nameBytes.length
  }

  // End of central directory
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)    // signature
  ev.setUint16(4, 0, true)             // disk number
  ev.setUint16(6, 0, true)             // central dir disk
  ev.setUint16(8, entries.length, true) // entries on this disk
  ev.setUint16(10, entries.length, true) // total entries
  ev.setUint32(12, centralSize, true)   // central dir size
  ev.setUint32(16, offset, true)        // central dir offset
  ev.setUint16(20, 0, true)            // comment length

  // Combine all
  const totalSize = offset + centralSize + 22
  const result = new Uint8Array(totalSize)
  let pos = 0
  for (const part of localParts) {
    result.set(part, pos)
    pos += part.length
  }
  for (const part of centralParts) {
    result.set(part, pos)
    pos += part.length
  }
  result.set(eocd, pos)

  return result
}

// ── Public API ──

/**
 * Export sheets to XLSX (Uint8Array).
 */
export function exportToXLSX(sheets: Sheet[]): Uint8Array {
  const encoder = new TextEncoder()
  const { sst, xml: sstXml } = buildSharedStrings(sheets)
  const { styleMap, xml: stylesXml } = buildStyles(sheets)

  const entries: ZipEntry[] = []

  // [Content_Types].xml
  let ctXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`
  ctXml += `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n`
  ctXml += `  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n`
  ctXml += `  <Default Extension="xml" ContentType="application/xml"/>\n`
  ctXml += `  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n`
  ctXml += `  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>\n`
  ctXml += `  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\n`
  for (let i = 0; i < sheets.length; i++) {
    ctXml += `  <Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n`
  }
  ctXml += `</Types>`
  entries.push({ name: '[Content_Types].xml', data: encoder.encode(ctXml) })

  // _rels/.rels
  let relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`
  relsXml += `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n`
  relsXml += `  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n`
  relsXml += `</Relationships>`
  entries.push({ name: '_rels/.rels', data: encoder.encode(relsXml) })

  // xl/_rels/workbook.xml.rels
  let wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`
  wbRels += `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n`
  for (let i = 0; i < sheets.length; i++) {
    wbRels += `  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>\n`
  }
  wbRels += `  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>\n`
  wbRels += `  <Relationship Id="rId${sheets.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\n`
  wbRels += `</Relationships>`
  entries.push({ name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(wbRels) })

  // xl/workbook.xml
  let wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`
  wbXml += `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n`
  wbXml += `  <sheets>\n`
  for (let i = 0; i < sheets.length; i++) {
    wbXml += `    <sheet name="${escapeXml(sheets[i].name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>\n`
  }
  wbXml += `  </sheets>\n`
  wbXml += `</workbook>`
  entries.push({ name: 'xl/workbook.xml', data: encoder.encode(wbXml) })

  // xl/sharedStrings.xml
  entries.push({ name: 'xl/sharedStrings.xml', data: encoder.encode(sstXml) })

  // xl/styles.xml
  entries.push({ name: 'xl/styles.xml', data: encoder.encode(stylesXml) })

  // Worksheet files
  for (let i = 0; i < sheets.length; i++) {
    const sheetXml = buildSheetXml(sheets[i], sst, styleMap)
    entries.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: encoder.encode(sheetXml) })
  }

  return buildZip(entries)
}

/**
 * Trigger an XLSX file download in the browser.
 */
export function downloadXLSX(sheets: Sheet[], filename: string = 'export.xlsx'): void {
  const data = exportToXLSX(sheets)
  const blob = new Blob([data.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
