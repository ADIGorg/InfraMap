import { z } from 'zod';

const envSchema = z.object({
  apiBaseUrl: z.string().url(),
  supabaseUrl: z.string().url(),
  supabasePublishableKey: z.string().min(1),
  googleMapsKey: z.string().optional(),
});

export const env = envSchema.parse({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
});