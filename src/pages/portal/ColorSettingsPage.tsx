import { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { WeatherWidget } from '../../components/widgets/WeatherWidget'
import { ClockWidget } from '../../components/widgets/ClockWidget'

interface ColorItem {
  label: string
  tailwindClass: string
  defaultHex: string
}

interface ColorCategory {
  name: string
  items: ColorItem[]
}

const COLOR_CATEGORIES: ColorCategory[] = [
  {
    name: 'Layout',
    items: [
      { label: 'Page Background', tailwindClass: 'bg-slate-50', defaultHex: '#f8fafc' },
      { label: 'Card/Widget Background', tailwindClass: 'bg-white', defaultHex: '#ffffff' },
      { label: 'Sidebar Background', tailwindClass: 'bg-white', defaultHex: '#ffffff' },
      { label: 'Header Background', tailwindClass: 'bg-white/95', defaultHex: '#ffffff' },
    ],
  },
  {
    name: 'Borders',
    items: [
      { label: 'Card/Widget Border', tailwindClass: 'border-slate-200', defaultHex: '#e2e8f0' },
      { label: 'Card Border Hover', tailwindClass: 'border-slate-300', defaultHex: '#cbd5e1' },
      { label: 'Input Border', tailwindClass: 'border-slate-300', defaultHex: '#cbd5e1' },
      { label: 'Divider Within Cards', tailwindClass: 'border-slate-100', defaultHex: '#f1f5f9' },
    ],
  },
  {
    name: 'Text',
    items: [
      { label: 'Primary Text', tailwindClass: 'text-slate-900', defaultHex: '#0f172a' },
      { label: 'Secondary Text', tailwindClass: 'text-slate-600', defaultHex: '#475569' },
      { label: 'Muted/Placeholder Text', tailwindClass: 'text-slate-400', defaultHex: '#94a3b8' },
      { label: 'Link/Accent Text', tailwindClass: 'text-violet-600', defaultHex: '#7c3aed' },
    ],
  },
  {
    name: 'Status Colors',
    items: [
      { label: 'Success Text', tailwindClass: 'text-emerald-700', defaultHex: '#047857' },
      { label: 'Success Background', tailwindClass: 'bg-emerald-50', defaultHex: '#ecfdf5' },
      { label: 'Error Text', tailwindClass: 'text-red-700', defaultHex: '#b91c1c' },
      { label: 'Error Background', tailwindClass: 'bg-red-50', defaultHex: '#fef2f2' },
      { label: 'Warning Text', tailwindClass: 'text-amber-700', defaultHex: '#b45309' },
      { label: 'Warning Background', tailwindClass: 'bg-amber-50', defaultHex: '#fffbeb' },
    ],
  },
  {
    name: 'Decorative Icons',
    items: [
      { label: 'Green/Emerald Icons', tailwindClass: 'text-emerald-600', defaultHex: '#059669' },
      { label: 'Amber Icons', tailwindClass: 'text-amber-600', defaultHex: '#d97706' },
      { label: 'Red Icons', tailwindClass: 'text-red-600', defaultHex: '#dc2626' },
    ],
  },
  {
    name: 'Widget-Specific',
    items: [
      { label: 'Calc Operator Button BG', tailwindClass: 'bg-orange-500', defaultHex: '#f97316' },
      { label: 'Calc Operator Button Text', tailwindClass: 'text-white', defaultHex: '#ffffff' },
      { label: 'Pomodoro Timer (Focus)', tailwindClass: 'text-red-400', defaultHex: '#f87171' },
      { label: 'Pomodoro Timer (Break)', tailwindClass: 'text-green-400', defaultHex: '#4ade80' },
      { label: 'Breathing Timer Text', tailwindClass: 'text-white', defaultHex: '#ffffff' },
    ],
  },
  {
    name: 'Interactive',
    items: [
      { label: 'Hover Background', tailwindClass: 'hover:bg-slate-100', defaultHex: '#f1f5f9' },
      { label: 'Active Nav Item BG', tailwindClass: 'bg-violet-500/10', defaultHex: '#f3f0fe' },
      { label: 'Active Nav Item Text', tailwindClass: 'text-violet-600', defaultHex: '#7c3aed' },
    ],
  },
]

function buildInitialColors(): Record<string, string> {
  const colors: Record<string, string> = {}
  for (const category of COLOR_CATEGORIES) {
    for (const item of category.items) {
      const key = `${category.name}::${item.label}`
      colors[key] = item.defaultHex
    }
  }
  return colors
}

export default function ColorSettingsPage() {
  const [colors, setColors] = useState<Record<string, string>>(buildInitialColors)
  const [copied, setCopied] = useState(false)

  const c = useCallback(
    (category: string, label: string) => colors[`${category}::${label}`],
    [colors]
  )

  const handleColorChange = useCallback((key: string, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleCopyAll = useCallback(async () => {
    const lines: string[] = []
    for (const category of COLOR_CATEGORIES) {
      lines.push(`## ${category.name}`)
      for (const item of category.items) {
        const key = `${category.name}::${item.label}`
        const current = colors[key]
        const changed = current !== item.defaultHex
        lines.push(
          `  ${item.label}: ${current} (${item.tailwindClass})${changed ? ' *changed*' : ''}`
        )
      }
      lines.push('')
    }
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [colors])

  const handleResetAll = useCallback(() => {
    setColors(buildInitialColors())
  }, [])

  const hasChanges = Object.entries(colors).some(([key, value]) => {
    for (const category of COLOR_CATEGORIES) {
      for (const item of category.items) {
        if (`${category.name}::${item.label}` === key && item.defaultHex !== value) {
          return true
        }
      }
    }
    return false
  })

  // Build scoped CSS overrides for the live widget preview
  const previewStyles = useMemo(() => {
    const pageBg = c('Layout', 'Page Background')
    const cardBg = c('Layout', 'Card/Widget Background')
    const border = c('Borders', 'Card/Widget Border')
    const borderHover = c('Borders', 'Card Border Hover')
    const divider = c('Borders', 'Divider Within Cards')
    const textPrimary = c('Text', 'Primary Text')
    const textSecondary = c('Text', 'Secondary Text')
    const textMuted = c('Text', 'Muted/Placeholder Text')
    const hoverBg = c('Interactive', 'Hover Background')
    const iconAmber = c('Decorative Icons', 'Amber Icons')

    // Use !important to override both light and dark Tailwind utilities within .color-preview
    return `
      .color-preview {
        background-color: ${pageBg};
      }
      .color-preview .bg-white,
      .color-preview .dark\\:bg-white\\/5 {
        background-color: ${cardBg} !important;
      }
      .color-preview .border-slate-200,
      .color-preview .dark\\:border-white\\/10 {
        border-color: ${border} !important;
      }
      .color-preview .hover\\:border-slate-300:hover,
      .color-preview .dark\\:hover\\:border-white\\/20:hover {
        border-color: ${borderHover} !important;
      }
      .color-preview .border-b {
        border-color: ${divider} !important;
      }
      .color-preview .text-slate-900,
      .color-preview .dark\\:text-white {
        color: ${textPrimary} !important;
      }
      .color-preview .text-slate-500,
      .color-preview .text-slate-600,
      .color-preview .dark\\:text-slate-400 {
        color: ${textSecondary} !important;
      }
      .color-preview .text-slate-400,
      .color-preview .dark\\:text-slate-500 {
        color: ${textMuted} !important;
      }
      .color-preview .bg-slate-100,
      .color-preview .dark\\:bg-white\\/10 {
        background-color: ${hoverBg} !important;
      }
      .color-preview .text-amber-600,
      .color-preview .dark\\:text-amber-400 {
        color: ${iconAmber} !important;
      }
      .color-preview .text-cyan-400 {
        color: ${iconAmber} !important;
      }
    `
  }, [c])

  return (
    <div className="max-w-3xl mx-auto">
      <style>{previewStyles}</style>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link
            to="/portal/profile"
            className="text-black/60 hover:text-black transition-colors"
          >
            Profile
          </Link>
          <span className="text-black/40">/</span>
          <span className="text-black">Color Settings</span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-black">
            Light Mode Color Settings
          </h1>
        </div>
        <p className="text-black/60 mb-8">
          Pick exact colors for each light mode UI element. Use "Copy All Settings" to export your
          choices.
        </p>

        {/* Live Widget Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-black mb-4">Live Preview</h2>
          <div className="color-preview rounded-2xl p-6 border border-slate-200 dark:border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="pointer-events-auto">
                <WeatherWidget />
              </div>
              <div className="pointer-events-auto">
                <ClockWidget />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleCopyAll}
            className="px-5 py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 transition-all text-sm"
          >
            {copied ? 'Copied!' : 'Copy All Settings'}
          </button>
          {hasChanges && (
            <button
              onClick={handleResetAll}
              className="px-5 py-2.5 rounded-xl font-medium bg-slate-100 dark:bg-white/5 text-black/60 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-sm"
            >
              Reset All
            </button>
          )}
        </div>

        {/* Color categories */}
        <div className="space-y-6">
          {COLOR_CATEGORIES.map((category, catIdx) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: catIdx * 0.05 }}
              className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl"
            >
              <h2 className="text-lg font-semibold text-black mb-4">
                {category.name}
              </h2>
              <div className="space-y-3">
                {category.items.map(item => {
                  const key = `${category.name}::${item.label}`
                  const currentColor = colors[key]
                  const isChanged = currentColor !== item.defaultHex

                  return (
                    <div
                      key={key}
                      className="flex items-center gap-4 py-2 border-b border-slate-100 dark:border-white/5 last:border-0"
                    >
                      {/* Label + Tailwind class */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate">
                          {item.label}
                          {isChanged && (
                            <span className="ml-2 text-xs text-orange-500 font-normal">
                              modified
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-black/40 font-mono truncate">
                          {item.tailwindClass}
                        </p>
                      </div>

                      {/* Preview swatch */}
                      <div
                        className="w-10 h-10 rounded-lg border border-slate-200 dark:border-white/10 shrink-0"
                        style={{ backgroundColor: currentColor }}
                      />

                      {/* Hex value */}
                      <span className="text-xs font-mono text-black/60 w-16 text-center shrink-0">
                        {currentColor}
                      </span>

                      {/* Color picker */}
                      <input
                        type="color"
                        value={currentColor}
                        onChange={e => handleColorChange(key, e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer shrink-0 border-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-slate-200 dark:[&::-webkit-color-swatch]:border-white/10"
                      />

                      {/* Reset individual */}
                      {isChanged && (
                        <button
                          onClick={() => handleColorChange(key, item.defaultHex)}
                          className="text-black/40 hover:text-black/70 transition-colors shrink-0"
                          title="Reset to default"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom action */}
        <div className="mt-8 mb-4 flex justify-center">
          <button
            onClick={handleCopyAll}
            className="px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 transition-all"
          >
            {copied ? 'Copied to Clipboard!' : 'Copy All Settings'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
