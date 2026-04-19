import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../hooks/useDarkMode'

interface StarFieldProps {
  className?: string
}

/**
 * Full-viewport canvas star field with occasional orange nova bursts.
 * Honors prefers-reduced-motion by rendering static stars with no animation.
 */
export function StarField({ className = 'fixed inset-0 pointer-events-none' }: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let lastTime = 0
    const TARGET_MS = 40 // ~25 FPS
    const reduced = prefersReducedMotion()

    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      opacity: Math.random() * 0.6 + 0.2,
      phase: Math.random() * Math.PI * 2,
      freq: Math.random() * 0.4 + 0.2,
      isOrange: Math.random() < 0.15,
    }))

    type Nova = { x: number; y: number; r: number; maxR: number; opacity: number; isOrange: boolean }
    const novas: Nova[] = []
    let nextNovaTime = performance.now() + 2000 + Math.random() * 3000

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = (ts: number) => {
      if (ts - lastTime < TARGET_MS) {
        animId = requestAnimationFrame(draw)
        return
      }
      lastTime = ts
      if (document.hidden) {
        animId = requestAnimationFrame(draw)
        return
      }

      const t = ts / 1000
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const star of stars) {
        const alpha = reduced
          ? star.opacity
          : (Math.sin(t * star.freq + star.phase) * 0.25 + 0.75) * star.opacity
        const sx = star.x * canvas.width
        const sy = star.y * canvas.height

        if (star.isOrange) {
          const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, star.r * 6)
          grd.addColorStop(0, `rgba(251, 146, 60, ${alpha * 0.8})`)
          grd.addColorStop(1, 'rgba(251, 146, 60, 0)')
          ctx.beginPath()
          ctx.arc(sx, sy, star.r * 6, 0, Math.PI * 2)
          ctx.fillStyle = grd
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(sx, sy, star.r, 0, Math.PI * 2)
        ctx.fillStyle = star.isOrange
          ? `rgba(253, 186, 116, ${alpha})`
          : `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      }

      if (!reduced && ts >= nextNovaTime) {
        nextNovaTime = ts + 2000 + Math.random() * 3000
        const s = stars[Math.floor(Math.random() * stars.length)]
        novas.push({
          x: s.x * canvas.width,
          y: s.y * canvas.height,
          r: 0.5,
          maxR: 50 + Math.random() * 60,
          opacity: 0.8,
          isOrange: Math.random() < 0.7,
        })
      }

      for (let i = novas.length - 1; i >= 0; i--) {
        const nova = novas[i]
        const grd = ctx.createRadialGradient(nova.x, nova.y, 0, nova.x, nova.y, nova.r)
        if (nova.isOrange) {
          grd.addColorStop(0, `rgba(251, 146, 60, ${nova.opacity * 0.5})`)
          grd.addColorStop(0.5, `rgba(245, 158, 11, ${nova.opacity * 0.25})`)
          grd.addColorStop(1, 'rgba(234, 88, 12, 0)')
        } else {
          grd.addColorStop(0, `rgba(255, 255, 255, ${nova.opacity * 0.3})`)
          grd.addColorStop(1, 'rgba(255, 255, 255, 0)')
        }
        ctx.beginPath()
        ctx.arc(nova.x, nova.y, nova.r, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        nova.r = Math.min(nova.r + 1.5, nova.maxR)
        nova.opacity *= 0.972
        if (nova.opacity < 0.01) novas.splice(i, 1)
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} style={{ zIndex: 2 }} />
}
