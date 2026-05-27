'use client';

import { useEffect, useState } from 'react';

interface Propiedad {
  id: string;
  direccion: string;
  distrito: string;
  precio: number;
  tipo: string;
  area_m2: number;
  dormitorios: number;
  descripcion: string;
  imagenes: string[];
  estado: string;
}

export default function Home() {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/propiedades')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPropiedades(data.data);
          setError(null);
        } else {
          setError(data.error);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Error de conexión con el servidor');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center">Cargando propiedades...</div>;

  if (error) return (
    <div className="p-8 text-center text-red-600">
      Error: {error}
    </div>
  );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Inmobiliaria</h1>
      <h2 className="text-xl mb-4">Propiedades disponibles</h2>

      {propiedades.length === 0 ? (
        <p>No hay propiedades disponibles</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {propiedades.map((prop) => (
            <div key={prop.id} className="border p-4 rounded shadow hover:shadow-lg transition">
              {prop.imagenes && prop.imagenes[0] && (
                <img
                  src={prop.imagenes[0]}
                  alt={prop.direccion}
                  className="w-full h-48 object-cover rounded mb-4"
                />
              )}
              <h3 className="font-bold text-lg">{prop.direccion}</h3>
              <p className="text-gray-600">{prop.distrito}</p>
              <p className="text-2xl text-green-600 font-bold mt-2">
                ${prop.precio?.toLocaleString()}
              </p>
              <div className="flex gap-4 mt-2 text-sm text-gray-500">
                <span>📐 {prop.area_m2} m²</span>
                <span>🛏️ {prop.dormitorios} dorm.</span>
                <span>📋 {prop.tipo}</span>
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-1 rounded ${prop.estado === 'disponible' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {prop.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}