import SlideEditorLoader from '@/components/slide-editor/slide-editor-loader'

export default async function SlidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SlideEditorLoader id={id} />
}
