import {
  Pen,
  Rocket,
  BarChart3,
  Target,
  BookOpen,
  TrendingUp,
  NotebookPen,
  Cog,
  FileText,
  ClipboardList,
  Calendar,
  File,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  pen: Pen,
  rocket: Rocket,
  barChart: BarChart3,
  target: Target,
  bookOpen: BookOpen,
  trendingUp: TrendingUp,
  notebookPen: NotebookPen,
  cog: Cog,
  fileText: FileText,
  clipboardList: ClipboardList,
  calendar: Calendar,
  file: File,
}

export default function IconFromKey({
  name,
  size = 16,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
  const Icon = ICON_MAP[name]
  if (!Icon) return <span className={className}>{name}</span>
  return <Icon size={size} className={className} />
}
