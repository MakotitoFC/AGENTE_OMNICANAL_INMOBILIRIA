import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                user: data.user,
                session: data.session
            }
        });
    } catch (error) {
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Error al iniciar sesión'
        }, { status: 401 });
    }
}