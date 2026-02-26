export const toIsoDate = (value: unknown): string | null => {
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

export const extractMonth = (isoDate: string): string => {
  const month = new Date(isoDate).getUTCMonth() + 1
  return String(month).padStart(2, '0')
}

export const getIsoWeek = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00Z`)
  const target = new Date(date.valueOf())
  const dayNr = (date.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNr + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const week =
    1 +
    Math.round(
      ((target.valueOf() - firstThursday.valueOf()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    )
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}
