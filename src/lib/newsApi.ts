const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export interface NewsArticle {
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  source: { id: string | null; name: string }
  publishedAt: string
}

export type NewsCategory =
  | 'business'
  | 'entertainment'
  | 'general'
  | 'health'
  | 'science'
  | 'sports'
  | 'technology'

export const NEWS_CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: 'business', label: 'Business' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'general', label: 'General' },
  { id: 'health', label: 'Health' },
  { id: 'science', label: 'Science' },
  { id: 'sports', label: 'Sports' },
  { id: 'technology', label: 'Technology' },
]

export async function fetchNews(
  categories: string[],
  keywords: string[]
): Promise<NewsArticle[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase not configured')
  }

  const baseUrl = `${SUPABASE_URL}/functions/v1/news`
  const allArticles: NewsArticle[] = []
  const seenUrls = new Set<string>()

  // Fetch by keywords if any
  if (keywords.length > 0) {
    const url = new URL(baseUrl)
    url.searchParams.set('keywords', keywords.join(' OR '))
    url.searchParams.set('pageSize', '15')

    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (resp.ok) {
      const data = await resp.json()
      for (const article of data.articles ?? []) {
        if (article.url && !seenUrls.has(article.url)) {
          seenUrls.add(article.url)
          allArticles.push(article)
        }
      }
    }
  }

  // Fetch by categories
  for (const category of categories) {
    const url = new URL(baseUrl)
    url.searchParams.set('category', category)
    url.searchParams.set('pageSize', '10')

    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (resp.ok) {
      const data = await resp.json()
      for (const article of data.articles ?? []) {
        if (article.url && !seenUrls.has(article.url)) {
          seenUrls.add(article.url)
          allArticles.push(article)
        }
      }
    }
  }

  return allArticles
}
