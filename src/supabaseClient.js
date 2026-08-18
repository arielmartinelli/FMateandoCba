import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Un placeholder del .env.example NO cuenta como configuración válida.
const PLACEHOLDERS = [
  'https://your-project-id.supabase.co',
  'your-supabase-anon-key',
  'undefined',
  'null'
];

const looksLikePlaceholder = (value) =>
  value === '' || PLACEHOLDERS.includes(value.toLowerCase());

export const supabaseUrl = rawUrl;

export const isSupabaseConfigured =
  !looksLikePlaceholder(rawUrl) &&
  !looksLikePlaceholder(rawKey) &&
  /^https:\/\/.+\.supabase\.(co|in)$/i.test(rawUrl);

/**
 * Motivo por el que la configuración no es válida. Se muestra en el panel de
 * diagnóstico del admin para no tener que adivinar por qué no guarda.
 */
export const supabaseConfigIssue = (() => {
  if (isSupabaseConfigured) return null;
  if (looksLikePlaceholder(rawUrl) && looksLikePlaceholder(rawKey)) {
    return 'Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. En local van en .env; en Vercel, en Settings → Environment Variables (y hay que volver a desplegar).';
  }
  if (looksLikePlaceholder(rawUrl)) {
    return 'Falta o es inválida VITE_SUPABASE_URL.';
  }
  if (looksLikePlaceholder(rawKey)) {
    return 'Falta VITE_SUPABASE_ANON_KEY.';
  }
  return `VITE_SUPABASE_URL no tiene el formato esperado (https://<proyecto>.supabase.co): "${rawUrl}"`;
})();

export const supabase = isSupabaseConfigured
  ? createClient(rawUrl, rawKey, {
      auth: { persistSession: false },
      global: { headers: { 'x-application-name': 'fmateando-cba' } }
    })
  : null;
