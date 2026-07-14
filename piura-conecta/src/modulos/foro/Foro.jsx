import { useEffect, useState } from 'react';
import { apiService } from '../../servicios/api';

export default function Foro({ rolUsuario }) {
  const [temas, setTemas] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const esRolControl = ['admin', 'profesor'].includes(rolUsuario);

  const cargar = async () => {
    try {
      const resp = await apiService.obtenerForo();
      setTemas(resp);
    } catch (err) {
      console.error(err);
      setMensaje('No se pudo cargar foro');
    }
  };
  useEffect(() => {
    let activo = true;
    (async () => { if (!activo) return; await cargar(); })();
    return () => { activo = false; };
  }, []);

  const crear = async (e) => {
    e.preventDefault();
    if (!esRolControl) return setMensaje('No autorizado para publicar');
    if (!titulo.trim()) return setMensaje('Ingresa título');
    try {
      const creado = await apiService.crearTema({ titulo: titulo.trim() });
      setTemas((s) => [creado, ...s]);
      setTitulo('');
    } catch {
      setMensaje('Error al crear');
    }
  };

  const eliminar = async (id) => {
    if (!esRolControl) return setMensaje('No autorizado');
    if (!window.confirm('Eliminar tema?')) return;
    try {
      await apiService.eliminarTema(id);
      setTemas((s) => s.filter((t) => t.id !== id));
    } catch {
      setMensaje('Error al eliminar');
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <header className="mb-6">
        <h2 className="text-3xl font-extrabold text-utp-dark">Foro Local</h2>
        <p className="text-gray-600 mt-2">{esRolControl ? 'Publica y modera temas' : 'Consulta y participa en discusiones'}</p>
      </header>
      {mensaje && <div className="mb-4 text-sm text-red-600">{mensaje}</div>}
      {esRolControl && (
        <form onSubmit={crear} className="mb-4 flex gap-2">
          <input className="flex-1 rounded-xl border border-gray-200 p-2" value={titulo} onChange={(e)=>setTitulo(e.target.value)} placeholder="Título del tema" />
          <button className="rounded-xl bg-utp-dark text-white px-4 py-2">Publicar</button>
        </form>
      )}
      <div className="space-y-3">
        {temas.map(t=> (
          <div key={t.id} className="border rounded p-3 flex justify-between items-center">
            <div>
              <p className="font-semibold">{t.titulo}</p>
              <p className="text-sm text-gray-500">{t.autor || ''}</p>
            </div>
            {esRolControl && <button onClick={()=>eliminar(t.id)} className="text-red-600">Eliminar</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
