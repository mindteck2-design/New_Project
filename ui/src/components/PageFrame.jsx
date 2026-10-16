import { cn } from '@/lib/utils'

/** Shared content width for authenticated pages. */
export default function PageFrame({ children, className }) {
  return (
    <div className={cn('mx-auto flex w-full max-w-[1600px] flex-col gap-4 animate-soft-in', className)}>
      {children}
    </div>
  )
}
