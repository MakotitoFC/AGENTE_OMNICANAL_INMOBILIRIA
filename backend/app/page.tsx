export default function Home() {
    return (
        <div style={{ padding: '2rem' }}>
            <h1>Backend API Inmobiliaria</h1>
            <h2>Endpoints disponibles:</h2>
            <ul>
                <li><strong>GET</strong> <a href="/api/propiedades">/api/propiedades</a> - Lista todas las propiedades</li>
                <li><strong>GET</strong> /api/propiedades/:id - Obtener una propiedad</li>
                <li><strong>POST</strong> /api/propiedades - Crear propiedad</li>
                <li><strong>PUT</strong> /api/propiedades/:id - Actualizar propiedad</li>
                <li><strong>DELETE</strong> /api/propiedades/:id - Eliminar propiedad</li>
                <li><strong>POST</strong> /api/auth/login - Iniciar sesión</li>
                <li><strong>POST</strong> /api/auth/register - Registrar usuario</li>
            </ul>
        </div>
    );
}