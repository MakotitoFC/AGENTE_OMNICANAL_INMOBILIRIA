export interface Profile {
    id: string;
    nombre: string;
    telefono?: string;
    email?: string;
    telegram_chat_id?: string;
    role: 'gerente' | 'asesor';
    activo: boolean;
    avatar_url?: string;
    created_at: string;
}

export interface Propiedad {
    id: string;
    direccion: string;
    distrito?: string;
    latitud?: number;
    longitud?: number;
    tipo?: string;
    area_m2?: number;
    dormitorios?: number;
    precio?: number;
    precio_venta?: number;
    moneda: string;
    estado: 'disponible' | 'vendido' | 'reservado' | 'oferta';
    descripcion?: string;
    imagenes?: string[];
    archivos?: string[];
    activo: boolean;
    created_at: string;
}

export type PropiedadInput = Omit<Propiedad, 'id' | 'created_at'>;

export interface Cliente {
    id: number;
    telegram_chat_id?: string;
    nombre?: string;
    telefono?: string;
    email?: string;
    presupuesto_min?: number;
    presupuesto_max?: number;
    tipo_preferido?: string[];
    distritos_preferidos?: string[];
    etapa: 'nuevo' | 'contactado' | 'negociacion' | 'cierre' | 'perdido';
    origen?: 'web' | 'telegram' | 'referido';
    preferencias_extra?: Record<string, unknown>;
    puntuacion_lead?: number;
    ultima_actividad?: string;
    created_at: string;
    updated_at: string;
}

export type ClienteInput = {
    nombre: string;
    telefono: string;
    email?: string;
    origen?: 'web' | 'telegram';
    propiedad_interes?: string;
};

export interface Cita {
    id: number;
    propiedad_id: string;
    cliente_id: number;
    asesor_id: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    estado: 'programada' | 'realizada' | 'cancelada' | 'reprogramada';
    notas?: string;
    recordatorio_24h: boolean;
    recordatorio_1h: boolean;
    created_at: string;
}

export interface Seguimiento {
    id: number;
    cliente_id: number;
    cita_id?: number;
    tipo: 'llamada' | 'whatsapp' | 'visita' | 'nota' | 'telegram';
    programado_para: string;
    ejecutado_en?: string;
    estado: 'pendiente' | 'realizado' | 'cancelado';
    notas?: string;
    created_at: string;
}

export interface Venta {
    id: number;
    propiedad_id: string;
    cliente_id: number;
    asesor_id?: string;
    fecha_venta: string;
    precio_original: number;
    descuento_aplicado: number;
    precio_final: number;
    tipo_pago: 'contado' | 'credito' | 'financiado';
    num_cuotas: number;
    estado: 'activo' | 'cancelado' | 'completado';
    notas?: string;
    files?: string[];
    created_at: string;
}

export interface ChatMensaje {
    id: number;
    cliente_id: number;
    cita_id?: number;
    seguimiento_id?: number;
    direccion: 'entrante' | 'saliente';
    contenido: string;
    tipo_contenido: 'texto' | 'imagen' | 'audio' | 'documento';
    metadata?: Record<string, unknown>;
    fecha_creacion: string;
}

export interface Descuento {
    id: number;
    nota?: string;
    propiedad_id: string;
    porcentaje: number;
    fecha_inicio: string;
    fecha_fin: string;
    activo: boolean;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}