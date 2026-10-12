import Markdown from '@/components/Markdown'
import { cn } from '@/lib/utils'

/** Read-only Notion-like content blocks — Markdown parsed via react-markdown + remark-gfm. */
export function FormContentBlock({ block, className }) {
  const type = String(block?.type || '').toLowerCase()
  const text = block?.content || block?.label || ''

  if (type === 'divider') {
    return <hr className={cn('my-4 border-border', className)} />
  }

  if (type === 'heading1') {
    return (
      <div className={cn(className)}>
        <Markdown>{`# ${text || 'Untitled'}`}</Markdown>
      </div>
    )
  }
  if (type === 'heading2') {
    return (
      <div className={cn(className)}>
        <Markdown>{`## ${text || 'Untitled'}`}</Markdown>
      </div>
    )
  }
  if (type === 'heading3') {
    return (
      <div className={cn(className)}>
        <Markdown>{`### ${text || 'Untitled'}`}</Markdown>
      </div>
    )
  }
  if (type === 'callout') {
    return (
      <aside
        className={cn(
          'rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-amber-950',
          className,
        )}
      >
        <Markdown compact>{text || 'Note'}</Markdown>
      </aside>
    )
  }
  if (type === 'bullets') {
    const md = String(text)
      .split('\n')
      .map((line) => {
        const t = line.trim()
        if (!t) return ''
        return t.startsWith('-') || t.startsWith('*') ? t : `- ${t}`
      })
      .filter(Boolean)
      .join('\n')
    return (
      <div className={cn(className)}>
        <Markdown>{md}</Markdown>
      </div>
    )
  }

  // paragraph / free Markdown document block
  return (
    <div className={cn(className)}>
      <Markdown>{text}</Markdown>
    </div>
  )
}
