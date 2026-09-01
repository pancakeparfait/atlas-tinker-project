import {
  isValidDateOnly,
  toDateOnly,
  serializeDateOnly,
  isInRange,
  compareDateOnly,
} from '@/lib/date-only'

describe('isValidDateOnly', () => {
  it('accepts valid dates', () => {
    expect(isValidDateOnly('2026-09-01')).toBe(true)
    expect(isValidDateOnly('2026-02-28')).toBe(true)
    expect(isValidDateOnly('2024-02-29')).toBe(true) // leap year
  })

  it('handles years 0-99 without Date-constructor 1900 mapping', () => {
    expect(isValidDateOnly('0000-01-01')).toBe(true)
    expect(isValidDateOnly('0000-02-29')).toBe(true) // year 0 is a leap year
    expect(isValidDateOnly('0001-02-28')).toBe(true)
    expect(isValidDateOnly('0001-02-29')).toBe(false) // 0001 is not a leap year
    expect(isValidDateOnly('0099-12-31')).toBe(true)
  })

  it('rejects invalid format', () => {
    expect(isValidDateOnly('2026-9-1')).toBe(false)
    expect(isValidDateOnly('2026/09/01')).toBe(false)
    expect(isValidDateOnly('09-01-2026')).toBe(false)
    expect(isValidDateOnly('20260901')).toBe(false)
    expect(isValidDateOnly('')).toBe(false)
    expect(isValidDateOnly('abc')).toBe(false)
  })

  it('rejects invalid calendar dates', () => {
    expect(isValidDateOnly('2026-02-31')).toBe(false)
    expect(isValidDateOnly('2026-04-31')).toBe(false)
    expect(isValidDateOnly('2026-13-01')).toBe(false)
    expect(isValidDateOnly('2026-00-10')).toBe(false)
    expect(isValidDateOnly('2026-01-00')).toBe(false)
    expect(isValidDateOnly('2025-02-29')).toBe(false) // non-leap year
  })
})

describe('toDateOnly', () => {
  it('converts to UTC-midnight Date', () => {
    const d = toDateOnly('2026-09-01')
    expect(d.toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('round-trips through serializeDateOnly', () => {
    expect(serializeDateOnly(toDateOnly('2026-12-31'))).toBe('2026-12-31')
  })
})

describe('serializeDateOnly', () => {
  it('serializes a Date to YYYY-MM-DD (never a timestamp)', () => {
    expect(serializeDateOnly(new Date('2026-09-01T00:00:00.000Z'))).toBe('2026-09-01')
  })

  it('handles null/undefined', () => {
    expect(serializeDateOnly(null)).toBeNull()
    expect(serializeDateOnly(undefined)).toBeNull()
  })

  it('pads month and day', () => {
    expect(serializeDateOnly(toDateOnly('2026-01-05'))).toBe('2026-01-05')
  })
})

describe('isInRange (inclusive)', () => {
  it('includes both endpoints', () => {
    expect(isInRange('2026-09-01', '2026-09-01', '2026-09-07')).toBe(true)
    expect(isInRange('2026-09-07', '2026-09-01', '2026-09-07')).toBe(true)
  })

  it('includes dates in the middle', () => {
    expect(isInRange('2026-09-04', '2026-09-01', '2026-09-07')).toBe(true)
  })

  it('excludes dates before start and after end', () => {
    expect(isInRange('2026-08-31', '2026-09-01', '2026-09-07')).toBe(false)
    expect(isInRange('2026-09-08', '2026-09-01', '2026-09-07')).toBe(false)
  })

  it('handles rollover across month/year boundaries', () => {
    expect(isInRange('2026-12-31', '2026-12-31', '2027-01-01')).toBe(true)
    expect(isInRange('2027-01-01', '2026-12-31', '2027-01-01')).toBe(true)
    expect(isInRange('2027-01-02', '2026-12-31', '2027-01-01')).toBe(false)
  })
})

describe('compareDateOnly', () => {
  it('compares correctly', () => {
    expect(compareDateOnly('2026-09-01', '2026-09-02')).toBe(-1)
    expect(compareDateOnly('2026-09-02', '2026-09-01')).toBe(1)
    expect(compareDateOnly('2026-09-01', '2026-09-01')).toBe(0)
  })
})
