import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { data, error } = await supabase
            .from('propiedades')
            .select('*')
            .eq('id', params.id)
            .single();

        if (error) throw error;

        if (!data) {
            return NextResponse.json({
                success: false,
                error: 'Propiedad no encontrada'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: data
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al obtener propiedad'
        }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        const { data, error } = await supabase
            .from('propiedades')
            .update(body)
            .eq('id', params.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: data
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al actualizar propiedad'
        }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { error } = await supabase
            .from('propiedades')
            .delete()
            .eq('id', params.id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Propiedad eliminada'
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || 'Error al eliminar propiedad'
        }, { status: 500 });
    }
}