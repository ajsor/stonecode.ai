import { useEffect, useRef } from 'react'

interface QuantumFieldProps {
  className?: string
}

// Quantum-style vortex tunnel — sizes to its container
export function QuantumField({ className }: QuantumFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let lastTime = 0
    const TARGET_MS = 40 // ~25 FPS

    const RING_COUNT = 16
    const NODES_PER_RING = 20

    const HUE = 25
    const SAT = 55
    const LIT = 62

    const colorCache = new Map<string, string>()
    const getColor = (opacity: number) => {
      const key = opacity.toFixed(3)
      if (!colorCache.has(key)) {
        colorCache.set(key, `hsla(${HUE}, ${SAT}%, ${LIT}%, ${opacity})`)
      }
      return colorCache.get(key)!
    }

    type RingNode = { angle: number; radiusOffset: number; phase: number }
    type Ring = { z: number; nodes: RingNode[] }

    const makeNodes = (): RingNode[] =>
      Array.from({ length: NODES_PER_RING }, (_, j) => ({
        angle: (j / NODES_PER_RING) * Math.PI * 2,
        radiusOffset: Math.random() * 0.15 - 0.075,
        phase: Math.random() * Math.PI * 2,
      }))

    const rings: Ring[] = Array.from({ length: RING_COUNT }, (_, i) => ({
      z: i / RING_COUNT,
      nodes: makeNodes(),
    }))

    let time = 0

    const resize = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
      }
    }
    resize()

    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

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

      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const cy = H / 2
      const baseRadius = Math.min(W, H) * 0.35

      time += 0.012

      for (const ring of rings) {
        ring.z += 0.004
        if (ring.z >= 1) {
          ring.z -= 1
          ring.nodes = makeNodes()
        }
      }

      const sorted = [...rings].sort((a, b) => a.z - b.z)

      ctx.clearRect(0, 0, W, H)

      for (let ri = 0; ri < sorted.length; ri++) {
        const ring = sorted[ri]
        const perspective = ring.z * ring.z
        const opacity = 0.04 + perspective * 0.18
        const lineWidth = 0.3 + perspective * 1.2
        const radius = baseRadius * (0.3 + ring.z * 0.7)

        const pts: [number, number][] = ring.nodes.map((node) => {
          const wobble = 1 + Math.sin(time * 1.5 + node.phase) * 0.08 + node.radiusOffset
          const drift = node.angle + Math.sin(time * 0.3 + node.phase) * 0.05
          const r = radius * wobble
          return [cx + Math.cos(drift) * r, cy + Math.sin(drift) * r]
        })

        ctx.beginPath()
        ctx.strokeStyle = getColor(opacity)
        ctx.lineWidth = lineWidth
        ctx.moveTo((pts[0][0] + pts[pts.length - 1][0]) / 2, (pts[0][1] + pts[pts.length - 1][1]) / 2)
        for (let i = 0; i < pts.length; i++) {
          const curr = pts[i]
          const next = pts[(i + 1) % pts.length]
          ctx.quadraticCurveTo(curr[0], curr[1], (curr[0] + next[0]) / 2, (curr[1] + next[1]) / 2)
        }
        ctx.closePath()
        ctx.stroke()

        if (ri % 3 === 0 && ri + 1 < sorted.length) {
          const next = sorted[ri + 1]
          const nRadius = baseRadius * (0.3 + next.z * 0.7)
          ctx.strokeStyle = getColor(opacity * 0.15)
          ctx.lineWidth = lineWidth * 0.5

          for (let ni = 0; ni < NODES_PER_RING; ni += 5) {
            const a = ring.nodes[ni]
            const aWobble = 1 + Math.sin(time * 1.5 + a.phase) * 0.08 + a.radiusOffset
            const aDrift = a.angle + Math.sin(time * 0.3 + a.phase) * 0.05
            const ar = radius * aWobble

            const b = next.nodes[ni]
            const bWobble = 1 + Math.sin(time * 1.5 + b.phase) * 0.08 + b.radiusOffset
            const bDrift = b.angle + Math.sin(time * 0.3 + b.phase) * 0.05
            const br = nRadius * bWobble

            ctx.beginPath()
            ctx.moveTo(cx + Math.cos(aDrift) * ar, cy + Math.sin(aDrift) * ar)
            ctx.lineTo(cx + Math.cos(bDrift) * br, cy + Math.sin(bDrift) * br)
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block' }}
    />
  )
}
