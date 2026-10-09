import { z } from 'zod'

/**
 * Enterprise env contract for the UI.
 * Only VITE_* keys are exposed to the browser (Vite rule).
 * Copy templates from config/ui/ — never commit real secrets.
 */
const envSchema = z.object({
  VITE_APP_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VITE_APP_TITLE: z.string().min(1).default('AMMS Workflow Engine'),
  VITE_API_URL: z
    .string()
    .min(1, 'VITE_API_URL is required')
    .refine(
      (v) => v.startsWith('/') || v.startsWith('http://') || v.startsWith('https://'),
      'VITE_API_URL must be an absolute http(s) URL or a same-origin path like /api/v1',
    ),
  VITE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
})

const raw = {
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development',
  VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_API_TIMEOUT_MS: import.meta.env.VITE_API_TIMEOUT_MS,
}

const parsed = envSchema.safeParse(raw)

if (!parsed.success) {
  const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
  throw new Error(`[AMMS] Invalid UI environment: ${detail}`)
}

export const env = Object.freeze({
  appEnv: parsed.data.VITE_APP_ENV,
  appTitle: parsed.data.VITE_APP_TITLE,
  apiUrl: parsed.data.VITE_API_URL.replace(/\/$/, ''),
  apiTimeoutMs: parsed.data.VITE_API_TIMEOUT_MS,
  isDev: parsed.data.VITE_APP_ENV === 'development',
  isProd: parsed.data.VITE_APP_ENV === 'production',
})
