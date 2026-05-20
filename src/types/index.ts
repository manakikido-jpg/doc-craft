export type DocumentType = 'slides' | 'doc' | 'spreadsheet'

export interface DocumentMeta {
  id: string
  title: string
  type: DocumentType
  createdAt: string
  updatedAt: string
  thumbnailTheme?: string
  folder?: string
}

export type SlideThemeKey =
  | 'dark-blue'
  | 'violet-slate'
  | 'emerald'
  | 'amber'
  | 'rose-pink'
  | 'white-clean'
  | 'midnight'
  | 'ocean'

export interface SlideTheme {
  key: SlideThemeKey
  label: string
  background: string
  titleColor: string
  bodyColor: string
  accentColor: string
}

// Phase 1: Element animation config
export interface ElementAnimation {
  type:
    | 'fadeIn'
    | 'slideInLeft'
    | 'slideInRight'
    | 'slideInUp'
    | 'slideInDown'
    | 'zoomIn'
    | 'bounceIn'
    | 'fadeOut'
    | 'slideOutLeft'
    | 'slideOutRight'
    | 'slideOutUp'
    | 'slideOutDown'
    | 'zoomOut'
    | 'pulse'
    | 'bounce'
    | 'shake'
    | 'spin'
  category?: 'entrance' | 'exit' | 'emphasis'
  trigger?: 'on-click' | 'with-previous' | 'after-previous'
  order?: number
  delay?: number
  duration?: number
}

export interface ElementShadow {
  offsetX: number
  offsetY: number
  blur: number
  color: string
}

/** Shared fields for all slide elements */
export interface BaseSlideElement {
  id: string
  x: number
  y: number
  w: number
  h: number
  zIndex?: number
  rotation?: number
  groupId?: string
  animation?: ElementAnimation
  opacity?: number
  shadow?: ElementShadow
  flipH?: boolean
  flipV?: boolean
  locked?: boolean
}

export interface SlideTextElement extends BaseSlideElement {
  type: 'title' | 'subtitle' | 'body' | 'label'
  content: string
  fontSize: number
  fontWeight: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
  align: 'left' | 'center' | 'right'
  fontFamily?: string
  color?: string
  letterSpacing?: number
  lineHeight?: number
  textShadow?: boolean
  highlightColor?: string
}

export interface SlideImageElement extends BaseSlideElement {
  type: 'image'
  src: string
  alt?: string
  crop?: { x: number; y: number; w: number; h: number }
  brightness?: number
  contrast?: number
  blur?: number
}

export interface SlideShapeElement extends BaseSlideElement {
  type: 'shape'
  shape:
    | 'rect'
    | 'circle'
    | 'triangle'
    | 'arrow-right'
    | 'line'
    | 'star'
    | 'diamond'
    | 'hexagon'
    | 'pentagon'
    | 'heart'
    | 'callout'
    | 'cross'
    | 'arrow-up'
    | 'arrow-down'
    | 'arrow-left'
  fill: string
  stroke?: string
  strokeWidth?: number
  strokeDash?: 'solid' | 'dashed' | 'dotted'
  gradientFill?: { color1: string; color2: string; angle: number }
  textContent?: string
  textColor?: string
  textFontSize?: number
}

export interface SlideTableElement extends BaseSlideElement {
  type: 'table'
  rows: string[][]
  headerRow?: boolean
  cellStyles?: Record<string, { bgColor?: string; textColor?: string }>
  mergedCells?: { startRow: number; startCol: number; rowSpan: number; colSpan: number }[]
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none'
  borderColor?: string
  colWidths?: number[]
  rowHeights?: number[]
}

export interface SlideConnectorElement extends Omit<BaseSlideElement, 'x' | 'y' | 'w' | 'h'> {
  type: 'connector'
  fromElementId?: string
  toElementId?: string
  fromPoint: { x: number; y: number }
  toPoint: { x: number; y: number }
  style: 'straight' | 'elbow' | 'curved'
  stroke: string
  strokeWidth?: number
  arrowHead?: boolean
}

export interface SlideVideoElement extends BaseSlideElement {
  type: 'video'
  src: string
  embedType: 'youtube' | 'url'
  autoplay?: boolean
}

export interface SlideAudioElement extends BaseSlideElement {
  type: 'audio'
  src: string
}

export interface SlideChartElement extends BaseSlideElement {
  type: 'chart'
  chartType: 'bar' | 'line' | 'pie' | 'donut'
  data: { labels: string[]; datasets: { label: string; values: number[]; color: string }[] }
  showLegend?: boolean
  showValues?: boolean
  title?: string
}

export type SlideElement =
  | SlideTextElement
  | SlideImageElement
  | SlideShapeElement
  | SlideTableElement
  | SlideConnectorElement
  | SlideVideoElement
  | SlideAudioElement
  | SlideChartElement

export interface SlideMaster {
  id: string
  name: string
  elements: SlideElement[]
  themeKey: SlideThemeKey
}

export interface Slide {
  id: string
  themeKey: SlideThemeKey
  elements: SlideElement[]
  notes?: string
  transition?:
    | 'fade'
    | 'slide-left'
    | 'slide-up'
    | 'zoom'
    | 'none'
    | 'dissolve'
    | 'wipe-left'
    | 'wipe-up'
    | 'flip'
    | 'cube'
  customTheme?: Partial<SlideTheme>
  backgroundImage?: string
  backgroundFit?: 'cover' | 'contain' | 'stretch'
  masterId?: string
}

export interface Comment {
  id: string
  blockId?: string
  slideId?: string
  parentId?: string
  text: string
  author: string
  createdAt: string
  resolved?: boolean
}

export interface VersionSnapshot {
  id: string
  title: string
  timestamp: string
  data: string
}

export interface SlidesDocument {
  meta: DocumentMeta
  slides: Slide[]
  activeSlideId: string
  comments?: Comment[]
  versions?: VersionSnapshot[]
  masters?: SlideMaster[]
  globalFooter?: { text?: string; showDate?: boolean; showSlideNumber?: boolean }
}

export type BlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'paragraph'
  | 'bullet'
  | 'numbered'
  | 'divider'
  | 'quote'
  | 'image'
  | 'code'
  | 'embed'
  | 'table'
  | 'toc'
  | 'page-break'
  | 'callout'
  | 'checklist'
  | 'footnote'
  | 'math'
  | 'drawing'
  | 'textbox'
  | 'columns'
  | 'signature'
  | 'cover-page'

export type CalloutVariant = 'info' | 'warning' | 'success' | 'error'

export type DividerStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'thick' | 'gradient'

export type DrawingTool = 'line' | 'arrow' | 'rect' | 'circle' | 'freehand' | 'highlight'

export interface DrawingStroke {
  tool: DrawingTool
  points: { x: number; y: number }[]
  color: string
  width: number
  fill?: string
}

export interface Block {
  id: string
  type: BlockType
  content: string
  indent?: number
  data?: Record<string, string>
  lineSpacing?: number
  paragraphSpacing?: 'compact' | 'normal' | 'wide'
  columns?: 1 | 2 | 3
  align?: 'left' | 'center' | 'right' | 'justify'
  textColor?: string
  bgColor?: string
  checked?: boolean
  calloutVariant?: CalloutVariant
  // Block border/decoration
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted' | 'double'
  borderColor?: string
  borderWidth?: number
  // Drop cap
  dropCap?: boolean
  // Divider style
  dividerStyle?: DividerStyle
  dividerColor?: string
  // Drawing data
  strokes?: DrawingStroke[]
}

export interface PageSettings {
  size: 'a4' | 'letter' | 'legal'
  orientation: 'portrait' | 'landscape'
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
}

export interface HeaderFooterSettings {
  headerLeft?: string
  headerCenter?: string
  headerRight?: string
  footerLeft?: string
  footerCenter?: string
  footerRight?: string
  showPageNumbers?: boolean
  pageNumberPosition?: 'left' | 'center' | 'right'
}

export interface WatermarkSettings {
  text: string
  opacity: number
  fontSize: number
  rotation: number
  color: string
}

export interface Bookmark {
  id: string
  name: string
  blockId: string
}

export interface DocDocument {
  meta: DocumentMeta
  blocks: Block[]
  comments?: Comment[]
  versions?: VersionSnapshot[]
  pageSettings?: PageSettings
  headerFooter?: HeaderFooterSettings
  watermark?: WatermarkSettings
  bookmarks?: Bookmark[]
}

// ── Spreadsheet types ──

export interface CellFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  textColor?: string
  bgColor?: string
  fontSize?: number
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  wrap?: boolean
  borderTop?: string
  borderRight?: string
  borderBottom?: string
  borderLeft?: string
  numberFormat?: 'plain' | 'number' | 'percent' | 'currency' | 'date' | 'time' | 'scientific' | 'fraction'
}

export interface Cell {
  value: string
  format?: CellFormat
}

export interface MergedCellRange {
  startRow: number
  startCol: number
  rowSpan: number
  colSpan: number
}

export interface ConditionalFormat {
  id: string
  range: { startRow: number; startCol: number; endRow: number; endCol: number }
  rule: 'greaterThan' | 'lessThan' | 'equalTo' | 'between' | 'textContains' | 'isEmpty' | 'isNotEmpty'
  values: string[]
  style: { bgColor?: string; textColor?: string; bold?: boolean }
}

export interface DataValidation {
  type: 'number' | 'text' | 'list' | 'date'
  min?: number
  max?: number
  listValues?: string[]
  errorMessage?: string
}

export interface Sheet {
  id: string
  name: string
  cells: Record<string, Cell>
  colWidths: Record<number, number>
  rowHeights: Record<number, number>
  mergedCells: MergedCellRange[]
  rowCount: number
  colCount: number
  frozenRows?: number
  frozenCols?: number
  sortState?: { col: number; direction: 'asc' | 'desc' }
  filterState?: { col: number; values: string[] }[]
  conditionalFormats?: ConditionalFormat[]
  dataValidation?: Record<string, DataValidation>  // key: "row-col"
}

export interface SpreadsheetDocument {
  meta: DocumentMeta
  sheets: Sheet[]
  activeSheetId: string
}

export interface AIGenerateRequest {
  topic: string
  slideCount: number
  style: 'business' | 'creative' | 'minimal'
}

export interface AIGeneratedSlide {
  title: string
  bullets: string[]
  themeKey: SlideThemeKey
}
