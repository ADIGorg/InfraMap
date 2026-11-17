import { z } from 'zod';

// As variáveis VITE_* são públicas no bundle. Nunca usar service_role aqui.
const schema = z.object({
  VITE_API_BASE_URL: z.url().refine(
    (value) => new URL(value).pathname.replace(/\/$/, '').endsWith('/api/v1'),
    'A API precisa terminar com /api/v1.',
  ),
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_GOOGLE_MAPS_KEY: z.string().optional(),
  VITE_GOOGLE_MAP_ID: z.string().optional(),
});

const config = schema.safeParse(import.meta.env);
if (!config.success) {
  throw new Error(
    'Configuração pública ausente ou inválida. Confira frontend/.env.example.',
  );
}

export const env = {
  apiBaseUrl: config.data.VITE_API_BASE_URL.replace(/\/$/, ''),
  supabaseUrl: config.data.VITE_SUPABASE_URL,
  supabasePublishableKey: config.data.VITE_SUPABASE_PUBLISHABLE_KEY,
  googleMapsKey: config.data.VITE_GOOGLE_MAPS_KEY ?? '',
  googleMapId: config.data.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID',
} as const;
