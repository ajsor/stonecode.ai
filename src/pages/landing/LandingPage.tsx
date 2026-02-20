import { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

// Quantum-style vortex tunnel: 16 organic rings flying toward the viewer
function QuantumField() {
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

    // Warm orange hue for stonecode.ai
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

    // Spread rings evenly along z-axis (0 = far, ~1 = close)
    const rings: Ring[] = Array.from({ length: RING_COUNT }, (_, i) => ({
      z: i / RING_COUNT,
      nodes: makeNodes(),
    }))

    let time = 0

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

      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const cy = H / 2
      const baseRadius = Math.min(W, H) * 0.35

      time += 0.012

      // Advance rings toward viewer; recycle when they pass through
      for (const ring of rings) {
        ring.z += 0.004
        if (ring.z >= 1) {
          ring.z -= 1
          ring.nodes = makeNodes()
        }
      }

      // Painter's algorithm: draw far rings first
      const sorted = [...rings].sort((a, b) => a.z - b.z)

      ctx.clearRect(0, 0, W, H)

      for (let ri = 0; ri < sorted.length; ri++) {
        const ring = sorted[ri]
        const perspective = ring.z * ring.z
        const opacity = 0.04 + perspective * 0.18
        const lineWidth = 0.3 + perspective * 1.2
        const radius = baseRadius * (0.3 + ring.z * 0.7)

        // Compute node positions with organic wobble
        const pts: [number, number][] = ring.nodes.map((node) => {
          const wobble = 1 + Math.sin(time * 1.5 + node.phase) * 0.08 + node.radiusOffset
          const drift = node.angle + Math.sin(time * 0.3 + node.phase) * 0.05
          const r = radius * wobble
          return [cx + Math.cos(drift) * r, cy + Math.sin(drift) * r]
        })

        // Draw smooth ring via quadratic Bézier curves
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

        // Connecting spokes every 3rd ring, every 5th node
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
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}

// Canvas-based star field with orange nova bursts
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number

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
      if (document.hidden) {
        animId = requestAnimationFrame(draw)
        return
      }

      const t = ts / 1000
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Stars
      for (const star of stars) {
        const alpha = (Math.sin(t * star.freq + star.phase) * 0.25 + 0.75) * star.opacity
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

      // Spawn nova
      if (ts >= nextNovaTime) {
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

      // Draw novas
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

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
    />
  )
}

// Feature card data
const FEATURES = [
  {
    word: 'Collaborate',
    subhead: 'Build together, not just for you.',
    body: "We don't take a brief and disappear. We integrate with your team, align to your goals, and build alongside you — turning your domain expertise into software that's unmistakably yours.",
    iconColor: { bg: 'rgba(16,185,129,0.15)', stroke: '#34d399' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    word: 'Deliver',
    subhead: 'From whiteboard to production.',
    body: "Vision without execution is just a slide deck. We ship production-ready software on schedule — built to perform under real-world demands and scale alongside your ambitions.",
    iconColor: { bg: 'rgba(234,88,12,0.15)', stroke: '#fb923c' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  {
    word: 'Guide',
    subhead: 'Navigate the complexity.',
    body: "Technology decisions made today define your trajectory for years. We help you cut through the noise — right tools, right architecture, and a clear roadmap for where you want to go.",
    iconColor: { bg: 'rgba(245,158,11,0.15)', stroke: '#fbbf24' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
  {
    word: 'Assist',
    subhead: 'Amplify what your team can do.',
    body: "AI isn't replacing your team — it's supercharging it. We integrate intelligent automation that eliminates friction, accelerates output, and opens capabilities that weren't possible before.",
    iconColor: { bg: 'rgba(14,165,233,0.15)', stroke: '#38bdf8' },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
]

type Feature = typeof FEATURES[number]

function FeatureCard({ f, darkMode }: { f: Feature; darkMode: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      whileHover={{
        y: -3,
        backgroundColor: darkMode ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.04)',
        borderColor: darkMode ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.14)',
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
        borderColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderRadius: 12,
        backdropFilter: 'blur(12px)',
      }}
      className="px-4 py-3 cursor-default overflow-hidden"
    >
      {/* Compact header row: icon + word + subhead */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: f.iconColor.bg, color: f.iconColor.stroke }}
        >
          {f.icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className={`text-sm font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              {f.word}
            </span>
            <span className="text-xs" style={{ color: f.iconColor.stroke }}>
              {f.subhead}
            </span>
          </div>
        </div>
      </div>

      {/* Body text — slides open on hover */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 1.0, ease: 'easeOut' } }}
            className="overflow-hidden"
          >
            <p
              className={`text-sm leading-relaxed pt-3 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}
            >
              {f.body}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth()
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return true
  })
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [, setCursorVariant] = useState('default')
  const { scrollYProgress } = useScroll()
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
    checkTouch()
    window.addEventListener('resize', checkTouch)
    return () => window.removeEventListener('resize', checkTouch)
  }, [])

  useEffect(() => {
    if (isTouchDevice) return
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isTouchDevice])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.3 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.25, 0.4, 0.25, 1] as const },
    },
  }

  const letterVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.5, ease: 'easeOut' as const },
    }),
  }

  const stoneText = 'stone'
  const codeText = 'code'
  const suffix = '.ai'

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${
        darkMode ? 'bg-[#020617]' : 'bg-slate-100'
      }`}
    >
      {/* Quantum vortex tunnel — dark mode, non-touch only */}
      {darkMode && !isTouchDevice && <QuantumField />}

      {/* Star field canvas — dark mode, non-touch only */}
      {darkMode && !isTouchDevice && <StarField />}

      {/* Nebula layers — dark mode */}
      {darkMode ? (
        <>
          {/* Top-left: deep orange */}
          <motion.div
            className="fixed pointer-events-none"
            style={{
              width: 700,
              height: 700,
              top: '-15%',
              left: '-10%',
              background:
                'radial-gradient(circle, rgba(234,88,12,0.10) 0%, rgba(251,146,60,0.04) 45%, transparent 70%)',
              filter: 'blur(50px)',
              zIndex: 1,
            }}
            animate={{ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Bottom-right: amber */}
          <motion.div
            className="fixed pointer-events-none"
            style={{
              width: 600,
              height: 600,
              bottom: '-10%',
              right: '-8%',
              background:
                'radial-gradient(circle, rgba(245,158,11,0.07) 0%, rgba(234,88,12,0.03) 45%, transparent 70%)',
              filter: 'blur(60px)',
              zIndex: 1,
            }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.85, 0.6] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
          {/* Center pulse */}
          <motion.div
            className="fixed pointer-events-none"
            style={{
              width: 500,
              height: 500,
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background:
                'radial-gradient(circle, rgba(251,146,60,0.04) 0%, transparent 70%)',
              filter: 'blur(70px)',
              zIndex: 1,
            }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          />
        </>
      ) : (
        /* Light mode: orange-tinted floating orbs */
        <motion.div
          className="fixed inset-0 pointer-events-none"
          style={{ y: backgroundY, zIndex: 1 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-100/40 via-slate-100 to-amber-100/40" />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full blur-[100px] bg-orange-300/30"
            animate={{ x: [0, 80, 0], y: [0, -40, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            style={{ top: '10%', left: '5%' }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full blur-[80px] bg-amber-300/30"
            animate={{ x: [0, -60, 0], y: [0, 50, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            style={{ bottom: '20%', right: '5%' }}
          />
        </motion.div>
      )}

      {/* Cursor glow — orange */}
      {!isTouchDevice && (
        <motion.div
          className={`fixed w-64 h-64 rounded-full pointer-events-none z-50 blur-[80px] ${
            darkMode ? 'bg-orange-500/15' : 'bg-orange-400/20'
          }`}
          animate={{ x: mousePosition.x - 128, y: mousePosition.y - 128 }}
          transition={{ type: 'spring', damping: 30, stiffness: 200 }}
        />
      )}

      {/* Progress bar — orange/amber gradient */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-600 via-amber-400 to-orange-500 origin-left z-50"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Header */}
      <motion.div
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40 flex items-center gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {/* Portal / Sign In */}
        <Link
          to={isAuthenticated ? '/portal' : '/login'}
          className={`px-4 py-2 rounded-xl backdrop-blur-xl border text-sm font-medium transition-all hover:scale-105 ${
            darkMode
              ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white hover:border-orange-500/30'
              : 'bg-black/5 border-black/10 text-slate-700 hover:bg-black/10 hover:text-slate-900'
          }`}
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          {isAuthenticated ? 'Portal' : 'Sign In'}
        </Link>

        {/* Theme toggle */}
        <div className="group relative">
          <motion.div
            className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap pointer-events-none backdrop-blur-xl border ${
              darkMode
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-black/10 border-black/10 text-slate-800'
            }`}
            style={{ opacity: 0 }}
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {darkMode ? 'Light mode' : 'Dark mode'}
            </span>
          </motion.div>

          <motion.button
            onClick={() => setDarkMode(!darkMode)}
            className={`relative p-3 rounded-2xl backdrop-blur-xl border overflow-hidden ${
              darkMode
                ? 'bg-white/5 border-white/10 text-slate-300'
                : 'bg-black/5 border-black/10 text-slate-700'
            }`}
            whileHover={{
              scale: 1.05,
              boxShadow: darkMode
                ? '0 0 30px rgba(251, 146, 60, 0.3)'
                : '0 0 30px rgba(234, 88, 12, 0.2)',
            }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle dark mode"
          >
            <AnimatePresence mode="wait">
              {darkMode ? (
                <motion.svg
                  key="sun"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 relative z-10"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </motion.svg>
              ) : (
                <motion.svg
                  key="moon"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 relative z-10"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.div>

      {/* Main content — flex column filling viewport, no scroll */}
      <main className="relative flex flex-col min-h-screen" style={{ zIndex: 10 }}>

        {/* Hero — grows to fill all space above the cards */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-16">
        <motion.div
          className="flex flex-col items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo badge — orange gradient */}
          <motion.div
            className="mb-4 sm:mb-6"
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            onHoverStart={() => setCursorVariant('hover')}
            onHoverEnd={() => setCursorVariant('default')}
          >
            <motion.div
              className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl sm:rounded-3xl flex items-center justify-center overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)',
                boxShadow: '0 8px 32px rgba(234, 88, 12, 0.35)',
              }}
              whileHover={{
                boxShadow: darkMode
                  ? '0 0 60px rgba(234, 88, 12, 0.55), 0 8px 32px rgba(234, 88, 12, 0.4)'
                  : '0 0 40px rgba(234, 88, 12, 0.4), 0 8px 24px rgba(234, 88, 12, 0.3)',
              }}
            >
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />

              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
              />

              {/* Code brackets icon */}
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white relative z-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.polyline
                  points="16 18 22 12 16 6"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                />
                <motion.polyline
                  points="8 6 2 12 8 18"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                />
              </motion.svg>
            </motion.div>
          </motion.div>

          {/* Title — Space Grotesk, tight tracking */}
          <motion.h1
            className="text-3xl sm:text-5xl md:text-7xl mb-3 sm:mb-4 flex items-baseline"
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              letterSpacing: '-0.03em',
            }}
            variants={itemVariants}
          >
            {/* "stone" — rock texture fill */}
            <span
              className="flex overflow-hidden font-bold bg-clip-text text-transparent"
              style={{
                backgroundImage: 'url(/stone-texture.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                WebkitBackgroundClip: 'text',
                filter: darkMode
                  ? 'brightness(1.4) contrast(1.1)'
                  : 'brightness(0.9) contrast(1.2)',
              }}
            >
              {stoneText.split('').map((letter, i) => (
                <motion.span
                  key={i}
                  custom={i}
                  variants={letterVariants}
                  initial="hidden"
                  animate="visible"
                  className="inline-block"
                >
                  {letter}
                </motion.span>
              ))}
            </span>

            {/* "code" — light weight, white/black */}
            <span className="flex overflow-hidden font-light">
              {codeText.split('').map((letter, i) => (
                <motion.span
                  key={i}
                  custom={i + stoneText.length}
                  variants={letterVariants}
                  initial="hidden"
                  animate="visible"
                  style={{ color: darkMode ? '#ffffff' : '#000000' }}
                  className="inline-block"
                >
                  {letter}
                </motion.span>
              ))}
            </span>

            {/* ".ai" — orange accent */}
            <motion.span
              className={`font-light ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              {suffix}
            </motion.span>
          </motion.h1>

          {/* Tagline — static, refined copy */}
          <motion.p
            className={`text-lg md:text-xl text-center max-w-xl mb-1.5 tracking-tight ${
              darkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
            variants={itemVariants}
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            Where ambition meets precision.
          </motion.p>
          <motion.p
            className={`text-xs md:text-sm text-center max-w-md mb-6 ${
              darkMode ? 'text-slate-600' : 'text-slate-500'
            }`}
            variants={itemVariants}
          >
            AI-augmented software development for businesses ready to build something great.
          </motion.p>

          {/* "Coming Soon" pill — Quantum Pipes glass style */}
          <motion.div
            className="relative px-5 py-2.5 rounded-full backdrop-blur-xl mb-0 overflow-hidden"
            style={{
              background: darkMode
                ? 'rgba(255, 255, 255, 0.03)'
                : 'rgba(255, 255, 255, 0.7)',
              border: darkMode
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: darkMode
                ? '0 4px 24px rgba(0, 0, 0, 0.3)'
                : '0 4px 16px rgba(0, 0, 0, 0.08)',
            }}
            variants={itemVariants}
            whileHover={{
              scale: 1.03,
              boxShadow: darkMode
                ? '0 8px 32px rgba(234, 88, 12, 0.15)'
                : '0 8px 32px rgba(234, 88, 12, 0.1)',
            }}
          >
            {/* Shimmer sweep */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
              }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                repeatDelay: 4,
                ease: 'easeInOut',
              }}
            />
            <div className="flex items-center gap-3 relative z-10">
              <motion.div
                className="w-2 h-2 rounded-full bg-green-400"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span
                className={`text-sm font-medium ${
                  darkMode ? 'text-slate-300' : 'text-slate-600'
                }`}
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                Coming Soon
              </span>
            </div>
          </motion.div>
        </motion.div>
        </div>{/* end hero */}

        {/* Feature cards — compact, pinned to bottom of viewport */}
        <motion.section
          className="w-full px-4 sm:px-6 pb-5 pt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.6, ease: 'easeOut' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
            {FEATURES.map((f) => (
              <FeatureCard key={f.word} f={f} darkMode={darkMode} />
            ))}
          </div>
        </motion.section>

        {/* Footer — inline at the base */}
        <motion.footer
          className={`text-center text-xs pb-4 ${darkMode ? 'text-slate-700' : 'text-slate-400'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          &copy; {new Date().getFullYear()} Andrew Stone. All rights reserved.
        </motion.footer>

      </main>
    </div>
  )
}
