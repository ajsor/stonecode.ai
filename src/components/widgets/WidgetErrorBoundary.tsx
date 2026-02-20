import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  widgetName: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.widgetName}] Widget error:`, error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col rounded-2xl bg-white dark:bg-white/5 border border-red-200 dark:border-red-500/20 backdrop-blur-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-white/10">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">{this.props.widgetName}</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm text-slate-400 mb-3">
              Something went wrong loading this widget.
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 text-sm rounded-lg bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
