const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/**
 * Validate a string is a valid YYYY-MM-DD date (no time component).
 * Rejects invalid calendar dates like 2026-02-31.
 */
export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_REGEX.test(value)) return false

  const [yearStr, monthStr, dayStr] = value.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)

  if (month < 1 || month > 12) return false
  if (day < 1) return false

  const isLeapYear =
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const daysInMonth =
    DAYS_IN_MONTH[month - 1] + (month === 2 && isLeapYear ? 1 : 0)
  return day <= daysInMonth
}

/**
 * Convert a YYYY-MM-DD string to a UTC-midnight Date for Prisma.
 */
export function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

/**
 * Serialize a Prisma Date (or date-only) back to YYYY-MM-DD.
 * Handles Date objects, strings, and null/undefined.
 */
export function serializeDateOnly(
  value: Date | string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if `date` falls within the inclusive range [start, end].
 * All arguments are YYYY-MM-DD strings.
 */
export function isInRange(
  date: string,
  start: string,
  end: string,
): boolean {
  return date >= start && date <= end
}

/**
 * Compare two YYYY-MM-DD strings. Returns -1, 0, or 1.
 */
export function compareDateOnly(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
