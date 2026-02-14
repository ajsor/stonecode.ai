import { useState, useEffect, useCallback } from 'react'
import { fetchNews } from '../lib/newsApi'
import type { NewsArticle } from '../lib/newsApi'

const REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes
const CACHE_KEY = 'news_cache_v1'

interface CachedNews {
  articles: NewsArticle[]
  categories: string[]
  keywords: string[]
  timestamp: number
}

export function useNews(categories: string[], keywords: string[], enabled: boolean) {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNews = useCallback(async (forceRefresh = false) => {
    if (!enabled || (categories.length === 0 && keywords.length === 0)) {
      setArticles([])
      return
    }

    // Check cache
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const parsed: CachedNews = JSON.parse(cached)
          const sameCategories = JSON.stringify(parsed.categories) === JSON.stringify(categories)
          const sameKeywords = JSON.stringify(parsed.keywords) === JSON.stringify(keywords)
          const isValid = sameCategories && sameKeywords && Date.now() - parsed.timestamp < REFRESH_INTERVAL

          if (isValid) {
            setArticles(parsed.articles)
            setError(null)
            return
          }
        }
      } catch {
        // Ignore cache errors
      }
    }

    try {
      setIsLoading(true)
      setError(null)

      const data = await fetchNews(categories, keywords)
      setArticles(data)

      const cacheData: CachedNews = {
        articles: data,
        categories,
        keywords,
        timestamp: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    } catch (err) {
      console.error('News fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load news')
    } finally {
      setIsLoading(false)
    }
  }, [categories, keywords, enabled])

  useEffect(() => {
    loadNews()
  }, [loadNews])

  useEffect(() => {
    if (!enabled) return
    const interval = setInterval(() => loadNews(true), REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [loadNews, enabled])

  return { articles, isLoading, error }
}
