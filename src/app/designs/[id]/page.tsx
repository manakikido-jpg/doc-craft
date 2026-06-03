import DesignEditorLoader from '@/components/design-editor/design-editor-loader'

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DesignEditorLoader id={id} />
}
