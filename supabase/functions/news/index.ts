// Supabase Edge Function: news
// Proxies NewsAPI.org requests server-side to avoid CORS and keep API key secure.
// Auth-gated to authenticated portal users to prevent quota drain by anyone
// who finds the function URL.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://stonecode.ai',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  Vary: 'Origin',
}

const NEWS_API_BASE = 'https://newsapi.org/v2'

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const bearer = authHeader.replace(/^Bearer\s+/i, '')
    if (!bearer) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const { data: { user }, error: authError } = await admin.auth.getUser(bearer)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('NEWS_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'NEWS_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const category = url.searchParams.get('category') || ''
    const keywords = url.searchParams.get('keywords') || ''
    const country = url.searchParams.get('country') || 'us'
    const pageSize = Math.min(Number(url.searchParams.get('pageSize') || '10'), 20)

    // Build cache key
    const cacheKey = `${category}:${keywords}:${country}:${pageSize}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(
        JSON.stringify(cached.data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let articles: unknown[] = []

    if (keywords) {
      // Use /everything endpoint for keyword search
      const newsUrl = new URL(`${NEWS_API_BASE}/everything`)
      newsUrl.searchParams.set('q', keywords)
      newsUrl.searchParams.set('pageSize', String(pageSize))
      newsUrl.searchParams.set('sortBy', 'publishedAt')
      newsUrl.searchParams.set('language', 'en')
      newsUrl.searchParams.set('apiKey', apiKey)

      const resp = await fetch(newsUrl.toString())
      if (!resp.ok) {
        const err = await resp.text()
        throw new Error(`NewsAPI error: ${resp.status} - ${err}`)
      }
      const data = await resp.json()
      articles = data.articles || []
    } else if (category) {
      // Use /top-headlines for category browsing
      const newsUrl = new URL(`${NEWS_API_BASE}/top-headlines`)
      newsUrl.searchParams.set('category', category)
      newsUrl.searchParams.set('country', country)
      newsUrl.searchParams.set('pageSize', String(pageSize))
      newsUrl.searchParams.set('apiKey', apiKey)

      const resp = await fetch(newsUrl.toString())
      if (!resp.ok) {
        const err = await resp.text()
        throw new Error(`NewsAPI error: ${resp.status} - ${err}`)
      }
      const data = await resp.json()
      articles = data.articles || []
    }

    const result = { articles }
    cache.set(cacheKey, { data: result, timestamp: Date.now() })

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
