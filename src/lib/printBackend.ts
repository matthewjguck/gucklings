const devDefaultBackend = 'local'

export const PRINT_SERVER_URL = import.meta.env.VITE_PRINT_SERVER_URL ?? 'http://127.0.0.1:9100'

export const PRINT_BACKEND =
  (import.meta.env.VITE_PRINT_BACKEND as 'local' | 'supabase' | undefined) ??
  (import.meta.env.DEV ? devDefaultBackend : 'supabase')

export const USE_LOCAL_PRINT_SERVER = PRINT_BACKEND === 'local'