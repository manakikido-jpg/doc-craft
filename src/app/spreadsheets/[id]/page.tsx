import SpreadsheetEditorLoader from '@/components/spreadsheet-editor/spreadsheet-editor-loader'

export default async function SpreadsheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SpreadsheetEditorLoader id={id} />
}
