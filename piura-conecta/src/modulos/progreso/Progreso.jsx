import { useEffect, useState } from 'react';
import { apiService } from '../../servicios/api';

export default function Progreso() {
  const [datos, setDatos] = useState([]);
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    try {
      const resp = await apiService.obtenerProgreso();
      setDatos(resp);
    } catch (err) {
      console.error(err);
      setMensaje('No se pudo cargar progreso');
    }
  };
  useEffect(() => {
    let activo = true;
    (async () => { if (!activo) return; await cargar(); })();
    return () => { activo = false; };
  }, []);

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <header className="mb-6">
        <h2 className="text-3xl font-extrabold text-utp-dark">Progreso</h2>
        <p className="text-gray-600 mt-2">Resumen de avance en la red</p>
      </header>
      {mensaje && <div className="mb-4 text-sm text-red-600">{mensaje}</div>}
      <div className="space-y-3">
        {datos.length === 0 ? <p className="text-sm text-gray-500">No hay datos de progreso.</p> : (
          datos.map(d=> (
            <div key={d.usuario_id || d.id} className="border rounded p-3">
              <p className="font-semibold">{d.nombre || d.usuario}</p>
              <p className="text-sm text-gray-500">{d.progreso || JSON.stringify(d)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
