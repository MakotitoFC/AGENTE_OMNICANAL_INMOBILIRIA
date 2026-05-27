import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ApiResponse } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const { email, password, name } = await request.json();

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name
                }
            }
        });

        if (error) throw error;

        return NextResponse.json<ApiResponse>({
            success: true,
            data: data.user
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json<ApiResponse>({
            success: false,
            error: 'Error al registrar usuario'
        }, { status: 500 });
    }
}