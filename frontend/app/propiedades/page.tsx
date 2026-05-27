'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Propiedad {
  id: string;
  direccion: string;
  distrito: string;
  precio: number;
  tipo: string;
  area_m2: number;
  dormitorios: number;
  estado: string;
}

export default function PropertiesPage() {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/propiedades')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPropiedades(data.data);
        }
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Todas las Propiedades</h1>
      <div className="grid gap-4">
        {propiedades.map((prop) => (
          <Link key={prop.id} href={`/property/${prop.id}`}>
            <div className="border p-4 rounded hover:bg-gray-50 cursor-pointer transition">
              <h3 className="font-bold text-xl">{prop.direccion}</h3>
              <p className="text-gray-600">{prop.distrito}</p>
              <p className="text-2xl text-blue-600 font-bold">${prop.precio?.toLocaleString()}</p>
              <div className="flex gap-4 mt-2">
                <span>{prop.area_m2} m²</span>
                <span>{prop.dormitorios} dormitorios</span>
                <span>{prop.tipo}</span>
                <span className={prop.estado === 'disponible' ? 'text-green-600' : 'text-red-600'}>
                  {prop.estado}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}