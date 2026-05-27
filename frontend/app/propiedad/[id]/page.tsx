'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Propiedad {
  id: string;
  direccion: string;
  distrito: string;
  latitud: number;
  longitud: number;
  tipo: string;
  area_m2: number;
  dormitorios: number;
  precio: number;
  precio_venta: number;
  moneda: string;
  estado: string;
  descripcion: string;
  imagenes: string[];
  archivos: string[];
  created_at: string;
}

export default function PropertyDetail() {
  const { id } = useParams();
  const [propiedad, setPropiedad] = useState<Propiedad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:3001/api/propiedades/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPropiedad(data.data);
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-8 text-center">Cargando detalles...</div>;

  if (!propiedad) return (
    <div className="p-8 text-center text-red-600">
      Propiedad no encontrada
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/properties" className="text-blue-500 mb-4 inline-block">
        ← Volver a propiedades
      </Link>

      <h1 className="text-3xl font-bold mb-4">{propiedad.direccion}</h1>
      <p className="text-gray-600 mb-4">{propiedad.distrito}</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          {propiedad.imagenes && propiedad.imagenes[0] ? (
            <img
              src={propiedad.imagenes[0]}
              alt={propiedad.direccion}
              className="w-full rounded-lg shadow"
            />
          ) : (
            <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
              Sin imagen
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-3xl font-bold text-green-600">
            {propiedad.moneda === 'PEN' ? 'S/ ' : '$ '}
            {propiedad.precio?.toLocaleString()}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <p><strong>Tipo:</strong> {propiedad.tipo}</p>
            <p><strong>Área:</strong> {propiedad.area_m2} m²</p>
            <p><strong>Dormitorios:</strong> {propiedad.dormitorios}</p>
            <p><strong>Estado:</strong> {propiedad.estado}</p>
          </div>

          {propiedad.descripcion && (
            <div>
              <p><strong>Descripción:</strong></p>
              <p className="text-gray-700">{propiedad.descripcion}</p>
            </div>
          )}

          <button className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition">
            Contactar asesor
          </button>
        </div>
      </div>
    </div>
  );
}