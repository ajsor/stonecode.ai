import { useState } from 'react'
import { WidgetContainer } from './WidgetContainer'

type Operator = '+' | '-' | '*' | '/' | null

export function CalculatorWidget() {
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operator, setOperator] = useState<Operator>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? digit : display + digit)
    }
  }

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.')
      setWaitingForOperand(false)
      return
    }

    if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }

  const clear = () => {
    setDisplay('0')
    setPreviousValue(null)
    setOperator(null)
    setWaitingForOperand(false)
  }

  const toggleSign = () => {
    const value = parseFloat(display)
    setDisplay(String(-value))
  }

  const inputPercent = () => {
    const value = parseFloat(display)
    setDisplay(String(value / 100))
  }

  const performOperation = (nextOperator: Operator) => {
    const inputValue = parseFloat(display)

    if (previousValue === null) {
      setPreviousValue(inputValue)
    } else if (operator) {
      const result = calculate(previousValue, inputValue, operator)
      setDisplay(String(result))
      setPreviousValue(result)
    }

    setWaitingForOperand(true)
    setOperator(nextOperator)
  }

  const calculate = (a: number, b: number, op: Operator): number => {
    switch (op) {
      case '+': return a + b
      case '-': return a - b
      case '*': return a * b
      case '/': return b !== 0 ? a / b : 0
      default: return b
    }
  }

  const equals = () => {
    if (operator === null || previousValue === null) return

    const inputValue = parseFloat(display)
    const result = calculate(previousValue, inputValue, operator)

    setDisplay(String(result))
    setPreviousValue(null)
    setOperator(null)
    setWaitingForOperand(true)
  }

  const Button = ({
    onClick,
    children,
    className = '',
    wide = false,
  }: {
    onClick: () => void
    children: React.ReactNode
    className?: string
    wide?: boolean
  }) => (
    <button
      onClick={onClick}
      className={`${wide ? 'col-span-2' : ''} h-10 rounded-lg font-medium transition-colors ${className}`}
    >
      {children}
    </button>
  )

  // Format display to avoid overflow
  const formatDisplay = (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return value
    if (value.length > 12) {
      return num.toExponential(6)
    }
    return value
  }

  return (
    <WidgetContainer
      title="Calculator"
      icon={
        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      }
    >
      <div className="h-full flex flex-col">
        {/* Display */}
        <div className="bg-white/5 rounded-xl p-3 mb-3">
          <div className="text-right text-2xl font-mono text-white truncate">
            {formatDisplay(display)}
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-4 gap-1.5 flex-1">
          <Button onClick={clear} className="bg-slate-600 text-white hover:bg-slate-500">
            AC
          </Button>
          <Button onClick={toggleSign} className="bg-slate-600 text-white hover:bg-slate-500">
            +/-
          </Button>
          <Button onClick={inputPercent} className="bg-slate-600 text-white hover:bg-slate-500">
            %
          </Button>
          <Button onClick={() => performOperation('/')} className="bg-orange-500 text-white hover:bg-orange-400">
            /
          </Button>

          <Button onClick={() => inputDigit('7')} className="bg-white/10 text-white hover:bg-white/20">
            7
          </Button>
          <Button onClick={() => inputDigit('8')} className="bg-white/10 text-white hover:bg-white/20">
            8
          </Button>
          <Button onClick={() => inputDigit('9')} className="bg-white/10 text-white hover:bg-white/20">
            9
          </Button>
          <Button onClick={() => performOperation('*')} className="bg-orange-500 text-white hover:bg-orange-400">
            *
          </Button>

          <Button onClick={() => inputDigit('4')} className="bg-white/10 text-white hover:bg-white/20">
            4
          </Button>
          <Button onClick={() => inputDigit('5')} className="bg-white/10 text-white hover:bg-white/20">
            5
          </Button>
          <Button onClick={() => inputDigit('6')} className="bg-white/10 text-white hover:bg-white/20">
            6
          </Button>
          <Button onClick={() => performOperation('-')} className="bg-orange-500 text-white hover:bg-orange-400">
            -
          </Button>

          <Button onClick={() => inputDigit('1')} className="bg-white/10 text-white hover:bg-white/20">
            1
          </Button>
          <Button onClick={() => inputDigit('2')} className="bg-white/10 text-white hover:bg-white/20">
            2
          </Button>
          <Button onClick={() => inputDigit('3')} className="bg-white/10 text-white hover:bg-white/20">
            3
          </Button>
          <Button onClick={() => performOperation('+')} className="bg-orange-500 text-white hover:bg-orange-400">
            +
          </Button>

          <Button onClick={() => inputDigit('0')} className="bg-white/10 text-white hover:bg-white/20" wide>
            0
          </Button>
          <Button onClick={inputDecimal} className="bg-white/10 text-white hover:bg-white/20">
            .
          </Button>
          <Button onClick={equals} className="bg-orange-500 text-white hover:bg-orange-400">
            =
          </Button>
        </div>
      </div>
    </WidgetContainer>
  )
}
