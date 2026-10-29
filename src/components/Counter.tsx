import { useState } from 'react'

type CounterProps = {
  initial?: number
}

function Counter({ initial = 0 }: CounterProps) {
  const [count, setCount] = useState(initial)

  return (
    <div className="counter">
      <button type="button" onClick={() => setCount((c) => c - 1)}>
        -
      </button>
      <output aria-label="count">{count}</output>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        +
      </button>
    </div>
  )
}

export default Counter
