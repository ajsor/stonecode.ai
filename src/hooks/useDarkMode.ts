import { useEffect, useState } from 'react'

const STORAGE_KEY = 'stonecode-dark-mode'

function readInitial(): boolean {
  if (typeof window === 'undefined') return true
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved !== null) return saved === 'true'
  return true
}

/**
 * Single source of truth for dark-mode across the public site and the portal.
 * Persists to localStorage and keeps `.dark` on `<html>` in sync so Tailwind v4
 * class-based dark variants resolve consistently.
 */
export function useDarkMode(): [boolean, (value: boolean) => void] {
  const [darkMode, setDarkMode] = useState<boolean>(readInitial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem(STORAGE_KEY, String(darkMode))
  }, [darkMode])

  return [darkMode, setDarkMode]
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
