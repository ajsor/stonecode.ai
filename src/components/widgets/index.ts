// Public widget surface. Individual widget components are lazy-loaded
// inside WidgetGrid and intentionally NOT re-exported here — exporting
// them would re-introduce static graph edges that defeat the lazy split.
export { WidgetGrid } from './WidgetGrid'
export { WidgetContainer } from './WidgetContainer'
export { WidgetSettings } from './WidgetSettings'
export { WidgetErrorBoundary } from './WidgetErrorBoundary'
