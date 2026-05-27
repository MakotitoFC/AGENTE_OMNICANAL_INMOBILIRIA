export interface Property {
    id: string;
    title: string;
    description: string;
    price: number;
    area: number;
    bedrooms: number;
    bathrooms: number;
    location: string;
    city: string;
    image_url: string;
    type: 'venta' | 'alquiler';
    status: 'disponible' | 'vendido' | 'alquilado';
    featured: boolean;
    created_at: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}