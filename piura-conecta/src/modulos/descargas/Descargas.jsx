import { useEffect, useState } from 'react';
import { apiService, URL_SERVIDOR } from '../../servicios/api';

export default function Descargas() {
  const [items, setItems] = useState([]);
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    try {
      const resp = await apiService.obtenerDescargas();
      setItems(resp);
    } catch (err) {
      console.error(err);
      setMensaje('No se pudieron cargar descargas');
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
        <h2 className="text-3xl font-extrabold text-utp-dark">Descargas</h2>
        <p className="text-gray-600 mt-2">Archivos disponibles para descarga</p>
      </header>
      {mensaje && <div className="mb-4 text-sm text-red-600">{mensaje}</div>}
      <div className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-gray-500">No hay archivos.</p> : (
          items.map(it=> (
            <div key={it.id} className="border rounded p-3 flex justify-between items-center">
              <div>
                <p className="font-semibold">{it.titulo || it.nombre}</p>
                <p className="text-sm text-gray-500">{it.descripcion || ''}</p>
              </div>
              <a href={`${URL_SERVIDOR}${it.ruta || it.archivo}`} target="_blank" rel="noreferrer" className="text-utp-red font-semibold">Descargar</a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
