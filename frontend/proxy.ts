import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const RUTAS_PRIVADAS = ['/crm', '/inventario', '/usuarios', '/reportes', '/calificacion', '/recomendaciones', '/documentos'];
    const esPrivada = RUTAS_PRIVADAS.some(r => pathname.startsWith(r));
    if (!esPrivada) return NextResponse.next();

    // Crear respuesta base que podemos mutar con las cookies de sesión
    let response = NextResponse.next({ request });

    // Cliente SSR: lee/escribe sesión desde cookies (no localStorage)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // getUser() valida el token contra Supabase (más seguro que getSession)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // ── Leer rol desde tabla profiles (fuente de verdad) ─────────────────
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = (profile?.role ?? 'asesor') as string;

    // /usuarios → solo admin
    if (pathname.startsWith('/usuarios') && role !== 'admin') {
        return NextResponse.redirect(new URL('/crm', request.url));
    }

    // /inventario y /reportes → admin o gerente
    const soloGerenteAdmin = ['/inventario', '/reportes'];
    if (soloGerenteAdmin.some(r => pathname.startsWith(r)) && !['admin', 'gerente'].includes(role)) {
        return NextResponse.redirect(new URL('/crm', request.url));
    }

    return response;
}

export const config = {
    matcher: ['/crm/:path*', '/inventario/:path*', '/usuarios/:path*', '/reportes/:path*', '/calificacion/:path*', '/recomendaciones/:path*', '/documentos/:path*'],
};
