import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente Supabase para el navegador.
 * Usa @supabase/ssr → escribe la sesión en cookies además de localStorage,
 * lo que permite que proxy.ts (middleware) valide la sesión server-side.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnon);

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
