import React from 'react'
import { render, screen } from '@testing-library/react'
import { WeekNavigation } from '../week-navigation'

describe('WeekNavigation', () => {
  it('renders Prev, Next, and Today controls', () => {
    render(
      <WeekNavigation
        onPrevious={jest.fn()}
        onNext={jest.fn()}
        onToday={jest.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument()
  })

  it('calls onPrevious when Prev is clicked', () => {
    const onPrevious = jest.fn()
    render(
      <WeekNavigation
        onPrevious={onPrevious}
        onNext={jest.fn()}
        onToday={jest.fn()}
      />
    )
    screen.getByRole('button', { name: /prev/i }).click()
    expect(onPrevious).toHaveBeenCalledTimes(1)
  })

  it('calls onNext when Next is clicked', () => {
    const onNext = jest.fn()
    render(
      <WeekNavigation
        onPrevious={jest.fn()}
        onNext={onNext}
        onToday={jest.fn()}
      />
    )
    screen.getByRole('button', { name: /next/i }).click()
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('calls onToday when Today is clicked', () => {
    const onToday = jest.fn()
    render(
      <WeekNavigation
        onPrevious={jest.fn()}
        onNext={jest.fn()}
        onToday={onToday}
      />
    )
    screen.getByRole('button', { name: /today/i }).click()
    expect(onToday).toHaveBeenCalledTimes(1)
  })
})
