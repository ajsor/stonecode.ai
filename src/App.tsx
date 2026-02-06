import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence, useAnimation } from 'framer-motion'

// Tagline component with glow and grow effect on load and hover
function TaglineWithEffect({ darkMode }: { darkMode: boolean }) {
  const controls = useAnimation()
  const [hasAnimated, setHasAnimated] = useState(false)

  const runAnimation = () => {
    return controls.start({
      scale: [1, 1.1, 1.1, 1],
      textShadow: darkMode
        ? [
            '0 0 0px rgba(167, 139, 250, 0)',
            '0 0 30px rgba(167, 139, 250, 0.8), 0 0 60px rgba(167, 139, 250, 0.4)',
            '0 0 30px rgba(167, 139, 250, 0.8), 0 0 60px rgba(167, 139, 250, 0.4)',
            '0 0 0px rgba(167, 139, 250, 0)',
          ]
        : [
            '0 0 0px rgba(124, 58, 237, 0)',
            '0 0 25px rgba(124, 58, 237, 0.6), 0 0 50px rgba(124, 58, 237, 0.3)',
            '0 0 25px rgba(124, 58, 237, 0.6), 0 0 50px rgba(124, 58, 237, 0.3)',
            '0 0 0px rgba(124, 58, 237, 0)',
          ],
      transition: {
        duration: 2.5,
        times: [0, 0.25, 0.75, 1],
        ease: 'easeInOut',
      },
    })
  }

  // Play animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runAnimation().then(() => setHasAnimated(true))
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  const handleHoverStart = () => {
    if (hasAnimated) {
      runAnimation()
    }
  }

  return (
    <motion.p
      className={`text-xl md:text-2xl text-center max-w-lg mb-12 cursor-default ${
        darkMode ? 'text-slate-400' : 'text-slate-600'
      }`}
      initial={{ scale: 1, opacity: 1 }}
      animate={controls}
      onHoverStart={handleHoverStart}
    >
      Building the future, one line at a time.
    </motion.p>
  )
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return true
  })
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [, setCursorVariant] = useState('default')
  const { scrollYProgress } = useScroll()
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.4, 0.25, 1] as const,
      },
    },
  }

  const letterVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.5,
        ease: 'easeOut' as const,
      },
    }),
  }

  const glowVariants = {
    default: {
      opacity: 0.3,
      scale: 1,
    },
    hover: {
      opacity: 0.6,
      scale: 1.2,
    },
  }

  const stoneText = 'stone'
  const codeText = 'code'
  const suffix = '.ai'

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${
      darkMode ? 'bg-slate-950' : 'bg-slate-100'
    }`}>
      {/* Animated gradient background */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        style={{ y: backgroundY }}
      >
        <div className={`absolute inset-0 ${
          darkMode
            ? 'bg-gradient-to-br from-violet-950/50 via-slate-950 to-blue-950/50'
            : 'bg-gradient-to-br from-violet-100/50 via-slate-100 to-blue-100/50'
        }`} />

        {/* Animated orbs */}
        <motion.div
          className={`absolute w-[600px] h-[600px] rounded-full blur-[120px] ${
            darkMode ? 'bg-violet-600/20' : 'bg-violet-400/30'
          }`}
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ top: '10%', left: '10%' }}
        />
        <motion.div
          className={`absolute w-[500px] h-[500px] rounded-full blur-[100px] ${
            darkMode ? 'bg-blue-600/20' : 'bg-blue-400/30'
          }`}
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ bottom: '20%', right: '10%' }}
        />
        <motion.div
          className={`absolute w-[400px] h-[400px] rounded-full blur-[80px] ${
            darkMode ? 'bg-cyan-600/15' : 'bg-cyan-400/20'
          }`}
          animate={{
            x: [0, 60, 0],
            y: [0, 80, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
      </motion.div>

      {/* Cursor glow effect */}
      <motion.div
        className={`fixed w-64 h-64 rounded-full pointer-events-none z-50 blur-[80px] ${
          darkMode ? 'bg-violet-500/20' : 'bg-violet-400/20'
        }`}
        animate={{
          x: mousePosition.x - 128,
          y: mousePosition.y - 128,
        }}
        transition={{
          type: 'spring',
          damping: 30,
          stiffness: 200,
        }}
        variants={glowVariants}
        initial="default"
      />

      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 origin-left z-50"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Theme Toggle */}
      <motion.div
        className="fixed top-6 right-6 z-40 group"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {/* Hover label */}
        <motion.div
          className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap pointer-events-none backdrop-blur-xl border ${
            darkMode
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-black/10 border-black/10 text-slate-800'
          }`}
          initial={{ opacity: 0, x: 10, scale: 0.9 }}
          whileHover={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
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
              ? '0 0 30px rgba(250, 204, 21, 0.3)'
              : '0 0 30px rgba(99, 102, 241, 0.3)'
          }}
          whileTap={{ scale: 0.95 }}
          aria-label="Toggle dark mode"
        >
          {/* Animated background glow on hover */}
          <motion.div
            className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              darkMode
                ? 'bg-gradient-to-br from-yellow-400/20 via-orange-400/10 to-transparent'
                : 'bg-gradient-to-br from-indigo-400/20 via-purple-400/10 to-transparent'
            }`}
          />

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
                whileHover={{
                  color: '#facc15',
                  filter: 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.6))'
                }}
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
                whileHover={{
                  color: '#818cf8',
                  filter: 'drop-shadow(0 0 8px rgba(129, 140, 248, 0.6))'
                }}
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <motion.div
          className="flex flex-col items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Animated Logo */}
          <motion.div
            className="mb-10"
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            onHoverStart={() => setCursorVariant('hover')}
            onHoverEnd={() => setCursorVariant('default')}
          >
            <motion.div
              className={`relative w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden ${
                darkMode
                  ? 'bg-gradient-to-br from-violet-500 to-blue-600'
                  : 'bg-gradient-to-br from-violet-600 to-blue-700'
              }`}
              whileHover={{
                boxShadow: darkMode
                  ? '0 0 60px rgba(139, 92, 246, 0.5)'
                  : '0 0 60px rgba(139, 92, 246, 0.3)',
              }}
            >
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />

              {/* Animated gradient border */}
              <motion.div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                }}
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: 'easeInOut',
                }}
              />

              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-white relative z-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
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

          {/* Animated Title */}
          <motion.h1
            className="text-5xl md:text-7xl tracking-tight mb-6 flex items-baseline"
            variants={itemVariants}
          >
            {/* "stone" with rock texture fill */}
            <span
              className="flex overflow-hidden font-bold bg-clip-text text-transparent"
              style={{
                backgroundImage: 'url(/stone-texture.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                WebkitBackgroundClip: 'text',
                filter: darkMode ? 'brightness(1.4) contrast(1.1)' : 'brightness(0.9) contrast(1.2)',
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

            {/* "code" with lighter weight */}
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

            {/* ".ai" suffix */}
            <motion.span
              className={`font-light ${darkMode ? 'text-violet-400' : 'text-violet-600'}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              {suffix}
            </motion.span>
          </motion.h1>

          {/* Tagline with glow and grow effect */}
          <TaglineWithEffect darkMode={darkMode} />

          {/* Glassmorphism Card */}
          <motion.div
            className={`relative px-8 py-4 rounded-2xl backdrop-blur-xl border mb-12 overflow-hidden ${
              darkMode
                ? 'bg-white/5 border-white/10'
                : 'bg-white/60 border-white/20'
            }`}
            variants={itemVariants}
            whileHover={{
              scale: 1.02,
              boxShadow: darkMode
                ? '0 8px 32px rgba(139, 92, 246, 0.2)'
                : '0 8px 32px rgba(139, 92, 246, 0.15)',
            }}
          >
            {/* Animated shimmer */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              }}
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 4,
                ease: 'easeInOut',
              }}
            />

            <div className="flex items-center gap-3 relative z-10">
              <motion.div
                className="w-2 h-2 rounded-full bg-green-400"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <span className={`text-sm font-medium ${
                darkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Coming Soon
              </span>
            </div>
          </motion.div>

          {/* TODO: Unhide CTA Button when ready */}
          {/* <motion.div variants={itemVariants}>
            <motion.a
              href="mailto:hello@stonecode.ai"
              className={`relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-medium text-white overflow-hidden group ${
                darkMode
                  ? 'bg-gradient-to-r from-violet-600 to-blue-600'
                  : 'bg-gradient-to-r from-violet-600 to-blue-600'
              }`}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 40px rgba(139, 92, 246, 0.4)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.5 }}
              />

              <span className="relative z-10">Get in Touch</span>
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 relative z-10"
                viewBox="0 0 20 20"
                fill="currentColor"
                initial={{ x: 0 }}
                whileHover={{ x: 5 }}
              >
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </motion.svg>
            </motion.a>
          </motion.div> */}

          {/* TODO: Unhide social links and update URLs */}
          {/* <motion.div className="flex gap-4 mt-8" variants={itemVariants}>
            <motion.a
              href="https://linkedin.com/in/YOUR-PROFILE"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-4 rounded-2xl backdrop-blur-xl border transition-colors ${
                darkMode
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white'
                  : 'bg-white/60 border-white/20 hover:bg-white/80 text-slate-600 hover:text-slate-900'
              }`}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              aria-label="LinkedIn"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </motion.a>
            <motion.a
              href="https://github.com/YOUR-PROFILE"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-4 rounded-2xl backdrop-blur-xl border transition-colors ${
                darkMode
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white'
                  : 'bg-white/60 border-white/20 hover:bg-white/80 text-slate-600 hover:text-slate-900'
              }`}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              aria-label="GitHub"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </motion.a>
          </motion.div> */}
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer
        className={`absolute bottom-6 left-0 right-0 text-center text-sm ${
          darkMode ? 'text-slate-500' : 'text-slate-400'
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        &copy; {new Date().getFullYear()} Andrew Stone. All rights reserved.
      </motion.footer>
    </div>
  )
}

export default App
