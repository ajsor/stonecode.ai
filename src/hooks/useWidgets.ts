import { useContext } from 'react'
import { WidgetContext } from '../contexts/WidgetContext'
import type { WidgetContextType } from '../types/widgets'

export function useWidgets(): WidgetContextType {
  const context = useContext(WidgetContext)

  if (!context) {
    throw new Error('useWidgets must be used within a WidgetProvider')
  }

  return context
}
