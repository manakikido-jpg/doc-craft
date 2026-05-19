import DocEditorLoader from '@/components/doc-editor/doc-editor-loader'

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DocEditorLoader id={id} />
}
