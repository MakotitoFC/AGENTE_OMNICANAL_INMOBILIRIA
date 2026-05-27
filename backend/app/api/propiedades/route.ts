import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        let query = supabase.from('propiedades').select('*');

        // Filtros según tus columnas reales
        const tipo = searchParams.get('tipo');
        const precioMin = searchParams.get('precioMin');
        const precioMax = searchParams.get('precioMax');
        const distrito = searchParams.get('distrito');
        const dormitorios = searchParams.get('dormitorios');

        if (tipo) query = query.eq('tipo', tipo);
        if (precioMin) query = query.gte('precio', precioMin);
        if (precioMax) query = query.lte('precio', precioMax);
        if (distrito) query = query.ilike('distrito', `%${distrito}%`);
        if (dormitorios) query = query.eq('dormitorios', parseInt(dormitorios));

        // Ordenar por created_at (existe en tu tabla)
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: data
        });
    } catch (error: any) {
        console.error('Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al obtener propiedades'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { data, error } = await supabase
            .from('propiedades')
            .insert([body])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: data
        }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al crear propiedad'
        }, { status: 500 });
    }
}