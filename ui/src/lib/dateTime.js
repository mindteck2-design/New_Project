/**
 * Single place for AMMS date/time handling (UI).
 *
 * Calendar dates (DOB, schedule day): always `YYYY-MM-DD` strings.
 * Never convert them through `Date` / `toISOString()` — that causes the
 * classic “saved 1 Aug, shows 2 Aug” timezone off-by-one.
 *
 * Timestamps (createdAt, audit): ISO-8601 Instant (`…Z`), format for display only.
 */

const ISO_DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/

/**
 * Coerce any stored value to a calendar date string for `<input type="date">`.
 * Uses the textual YYYY-MM-DD prefix — no local timezone conversion.
 */
export function toCalendarDate(value) {
  if (value == null || value === '') return ''
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Only for legacy Date objects: use UTC y/m/d to avoid local shift
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, '0')
    const d = String(value.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(value).trim()
  const m = ISO_DATE_PREFIX.exec(s)
  return m ? m[1] : ''
}

/** Display a calendar date without timezone mutation (e.g. "1 Aug 2024"). */
export function formatCalendarDate(value, locale = undefined) {
  const iso = toCalendarDate(value)
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  // Construct as UTC noon to keep the calendar day stable in any locale
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  return dt.toLocaleDateString(locale, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Format an Instant / ISO timestamp for operator UI. */
export function formatDateTime(value, locale = undefined) {
  if (value == null || value === '') return '—'
  const dt = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(dt.getTime())) return String(value)
  return dt.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Day bounds for filters: interpret YYYY-MM-DD as UTC calendar day. */
export function calendarDayStartMs(isoDate) {
  const iso = toCalendarDate(isoDate)
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0)
}

export function calendarDayEndMs(isoDate) {
  const iso = toCalendarDate(isoDate)
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d, 23, 59, 59, 999)
}

/**
 * Normalize form values before submit / after load.
 * Ensures `date` fields stay `YYYY-MM-DD`.
 */
export function normalizeFormDateValues(fields = [], values = {}) {
  const out = { ...values }
  for (const f of fields) {
    if (!f?.name) continue
    if (f.type === 'date' && out[f.name] != null && out[f.name] !== '') {
      out[f.name] = toCalendarDate(out[f.name])
    }
    if (f.type === 'datetime' && typeof out[f.name] === 'string') {
      // datetime-local is timezone-less local wall time; keep as-is (no Z)
      out[f.name] = out[f.name].trim()
    }
  }
  return out
}
