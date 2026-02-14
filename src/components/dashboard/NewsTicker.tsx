import { useWidgets } from '../../hooks/useWidgets'
import { useNews } from '../../hooks/useNews'

export function NewsTicker() {
  const { configs } = useWidgets()
  const newsConfig = configs.news
  const { articles } = useNews(
    newsConfig.categories,
    newsConfig.keywords,
    newsConfig.enabled
  )

  if (!newsConfig.enabled || articles.length === 0) {
    return null
  }

  const headlines = articles
    .filter((a) => a.title && a.title !== '[Removed]')
    .slice(0, 30)

  if (headlines.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 border-t border-white/10 backdrop-blur-xl">
      <div className="flex items-center h-10">
        {/* Label */}
        <div className="flex-shrink-0 px-4 bg-violet-500/20 h-full flex items-center border-r border-white/10">
          <span className="text-xs font-bold text-violet-400 tracking-wider">NEWS</span>
        </div>

        {/* Scrolling area */}
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-ticker flex items-center whitespace-nowrap hover:[animation-play-state:paused]">
            {/* Duplicate content for seamless loop */}
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center">
                {headlines.map((article, i) => (
                  <a
                    key={`${copy}-${i}`}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    <span className="text-slate-600 mr-3">{article.source.name}</span>
                    {article.title}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
