export type DocumentType = 'slides' | 'doc' | 'spreadsheet' | 'design'

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
  | 'brand'

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
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce'
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
  hyperlink?: string
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
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline'
  underline?: boolean
  strikethrough?: boolean
  verticalAlign?: 'top' | 'middle' | 'bottom'
  bulletType?: 'none' | 'disc' | 'circle' | 'square' | 'decimal' | 'alpha' | 'roman'
  indentLevel?: number  // 0-5
  writingMode?: 'horizontal' | 'vertical'
  padding?: { top: number; right: number; bottom: number; left: number }
  textColumns?: 1 | 2 | 3
  autoSize?: 'none' | 'shrink' | 'grow'
  superscript?: boolean
  subscript?: boolean
  wordArtStyle?: 'none' | 'outline' | 'glow' | 'shadow3d'
  paragraphSpacingBefore?: number  // px
  paragraphSpacingAfter?: number   // px
}

export interface SlideImageElement extends BaseSlideElement {
  type: 'image'
  src: string
  alt?: string
  crop?: { x: number; y: number; w: number; h: number }
  brightness?: number
  contrast?: number
  blur?: number
  maskShape?: 'none' | 'circle' | 'triangle' | 'star' | 'hexagon' | 'rounded-rect'
  colorFilter?: 'none' | 'grayscale' | 'sepia' | 'high-contrast' | 'washout' | 'cool' | 'warm' | 'vintage' | 'duotone'
  imageStyle?: { borderRadius?: string; boxShadow?: string; border?: string }
  objectFit?: 'cover' | 'contain' | 'fill'
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
  cornerRadius?: number  // 0-50 for rounded rect
  gradientType?: 'linear' | 'radial'
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
  arrowHeadType?: 'triangle' | 'diamond' | 'circle' | 'none'
  arrowTailType?: 'triangle' | 'diamond' | 'circle' | 'none'
  label?: string
  labelFontSize?: number
  labelColor?: string
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
  chartType:
    | 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'radar' | 'horizontalBar'
    | 'stackedBar' | 'stackedBar100' | 'stackedArea' | 'steppedLine' | 'smoothLine'
    | 'bubble' | 'combo' | 'funnel' | 'waterfall'
  data: { labels: string[]; datasets: { label: string; values: number[]; color: string; axis?: 'primary' | 'secondary' }[] }
  showLegend?: boolean
  showValues?: boolean
  title?: string
  axisLabelX?: string
  axisLabelY?: string
  showGridLines?: boolean
  dataLabelPosition?: 'none' | 'above' | 'center' | 'outside'
  trendLine?: 'none' | 'linear' | 'exponential' | 'moving-average'
  trendLineColor?: string
  dualAxis?: boolean
  secondaryAxisLabel?: string
  chartAnimation?: 'none' | 'grow' | 'fade' | 'slide-up' | 'cascade'
  chartAnimationDuration?: number
  colorTheme?: 'default' | 'mono' | 'pastel' | 'vivid' | 'ocean' | 'warm'
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
    | 'morph'
  customTheme?: Partial<SlideTheme>
  backgroundColor?: string
  backgroundImage?: string
  backgroundFit?: 'cover' | 'contain' | 'stretch'
  masterId?: string
  sectionName?: string
  sectionColor?: string
  transitionDuration?: number  // ms, default 500
  autoAdvance?: number  // seconds, 0 = manual
  hidden?: boolean
  lockedElementIds?: string[]
  hiddenElementIds?: string[]
  elementGroups?: Record<string, string[]>
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
  mentions?: string[]
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
  slideSize?: { width: number; height: number; preset: '16:9' | '4:3' | 'a4' | 'custom' }
  sections?: { id: string; name: string; color?: string; startSlideIndex: number }[]
  outlineCollapsed?: Record<string, boolean>  // slideId -> collapsed state
}

export type BlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
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
  | 'section-break'
  | 'column-break'

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

export type NumberFormat = 'decimal' | 'upper-alpha' | 'lower-alpha' | 'upper-roman' | 'lower-roman' | 'katakana' | 'kanji'

export interface Block {
  id: string
  type: BlockType
  content: string
  indent?: number
  data?: Record<string, string>
  lineSpacing?: number
  paragraphSpacing?: 'compact' | 'normal' | 'wide' | 'extra-wide'
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
  // Text indent (first line indent in em)
  textIndent?: number
  // Divider style
  dividerStyle?: DividerStyle
  dividerColor?: string
  // Drawing data
  strokes?: DrawingStroke[]
  // Numbered list options
  numberFormat?: NumberFormat
  restartNumbering?: boolean
  startNumber?: number
}

export interface PageSettings {
  size: 'a4' | 'letter' | 'legal'
  orientation: 'portrait' | 'landscape'
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
  mirrorMargins?: boolean
  hyphens?: 'none' | 'auto' | 'manual'
  verticalAlign?: 'top' | 'center' | 'justify' | 'bottom'
  pageBackground?: string
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
  differentFirstPage?: boolean
  differentOddEven?: boolean
  oddHeaderLeft?: string
  oddHeaderCenter?: string
  oddHeaderRight?: string
  evenHeaderLeft?: string
  evenHeaderCenter?: string
  evenHeaderRight?: string
  oddFooterLeft?: string
  oddFooterCenter?: string
  oddFooterRight?: string
  evenFooterLeft?: string
  evenFooterCenter?: string
  evenFooterRight?: string
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

export interface TrackChange {
  id: string
  blockId: string
  type: 'insert' | 'delete' | 'modify'
  oldContent?: string
  newContent?: string
  author: string
  timestamp: string
  accepted?: boolean
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
  trackChanges?: TrackChange[]
  trackChangesEnabled?: boolean
  footnotePosition?: 'page' | 'end'
  pageBorder?: { style: string; color: string; width: number }
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
  numberFormat?: 'plain' | 'number' | 'percent' | 'currency' | 'date' | 'time' | 'scientific' | 'fraction' | 'custom' | 'accounting' | 'currencyUSD' | 'currencyEUR' | 'comma'
  customFormat?: string
  fontFamily?: string
  rotation?: number       // 0-360 degrees
  indent?: number         // 0-5 levels
  locked?: boolean        // cell protection
}

export interface CellComment {
  author: string
  text: string
  timestamp: number
  resolved?: boolean
}

export interface Cell {
  value: string
  format?: CellFormat
  comment?: string
  comments?: CellComment[]
  checkbox?: boolean
  hyperlink?: { url: string; label?: string }
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
  rule: 'greaterThan' | 'lessThan' | 'equalTo' | 'between' | 'textContains' | 'isEmpty' | 'isNotEmpty' | 'topN' | 'bottomN' | 'aboveAverage' | 'belowAverage' | 'duplicate' | 'unique' | 'colorScale' | 'dataBar'
  values: string[]
  style: { bgColor?: string; textColor?: string; bold?: boolean }
}

export interface DataValidation {
  type: 'number' | 'text' | 'list' | 'date'
  min?: number
  max?: number
  listValues?: string[]
  errorMessage?: string
  rejectInput?: boolean
}

export interface Sheet {
  id: string
  name: string
  color?: string
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
  hiddenRows?: number[]
  hiddenCols?: number[]
  rowGroups?: { start: number; end: number; collapsed?: boolean }[]
  colGroups?: { start: number; end: number; collapsed?: boolean }[]
  protected?: boolean
}

export type SpreadsheetChartType =
  | 'bar' | 'line' | 'pie' | 'scatter'
  | 'area' | 'stackedBar' | 'stackedBar100' | 'horizontalBar' | 'donut' | 'combo'

export interface SpreadsheetChart {
  id: string
  chartType: SpreadsheetChartType
  title: string
  range: { startRow: number; startCol: number; endRow: number; endCol: number }
  x: number
  y: number
}

export interface SpreadsheetDocument {
  meta: DocumentMeta
  sheets: Sheet[]
  activeSheetId: string
  /** Charts overlaid on the grid; reference a cell range and update live. */
  charts?: SpreadsheetChart[]
}

// ── Design types ──

export type DesignCanvasPreset =
  | 'instagram-post'
  | 'instagram-story'
  | 'twitter-post'
  | 'twitter-header'
  | 'facebook-post'
  | 'facebook-cover'
  | 'youtube-thumbnail'
  | 'poster-a4'
  | 'business-card'
  | 'presentation-16:9'
  | 'banner-wide'
  | 'custom'

export interface DesignCanvasSize {
  width: number
  height: number
  preset: DesignCanvasPreset
  label: string
}

export interface DesignDocument {
  meta: DocumentMeta
  canvas: Slide
  canvasSize: DesignCanvasSize
  comments?: Comment[]
  versions?: VersionSnapshot[]
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
