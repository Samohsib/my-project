import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Counter from './Counter.tsx'

describe('Counter', () => {
  it('starts at the initial value', () => {
    render(<Counter initial={5} />)
    expect(screen.getByLabelText('count')).toHaveTextContent('5')
  })

  it('increments and decrements', async () => {
    const user = userEvent.setup()
    render(<Counter />)

    await user.click(screen.getByRole('button', { name: '+' }))
    await user.click(screen.getByRole('button', { name: '+' }))
    await user.click(screen.getByRole('button', { name: '-' }))

    expect(screen.getByLabelText('count')).toHaveTextContent('1')
  })
})
