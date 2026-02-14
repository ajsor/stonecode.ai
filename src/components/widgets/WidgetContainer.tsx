import { type ReactNode, useState, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WidgetCollapseContext } from './WidgetGrid'

interface WidgetContainerProps {
  title: string
  icon: ReactNode
  children: ReactNode
  isLoading?: boolean
  error?: string | null
  headerAction?: ReactNode
}

export function WidgetContainer({
  title,
  icon,
  children,
  isLoading,
  error,
  headerAction,
}: WidgetContainerProps) {
  const collapseCtx = useContext(WidgetCollapseContext)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !isCollapsed
    setIsCollapsed(next)
    collapseCtx?.reportCollapse(next)
  }

  return (
    <motion.div
      className="h-full flex flex-col rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 backdrop-blur-xl overflow-hidden transition-colors"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header with drag handle */}
      <div className="widget-drag-handle flex items-center justify-between px-4 py-3 border-b border-white/10 cursor-move select-none">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            {icon}
          </div>
          <h3 className="text-sm font-medium text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          <button
            onClick={handleToggleCollapse}
            className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="text-slate-500 hover:text-slate-400 cursor-grab active:cursor-grabbing transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            className="flex-1 overflow-auto p-4"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            ) : (
              children
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
