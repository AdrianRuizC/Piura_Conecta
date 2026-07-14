import { useEffect, useState } from 'react';
import { apiService, URL_SERVIDOR } from '../../servicios/api';

export default function Materiales({ rolUsuario }) {
  const [materiales, setMateriales] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [mensajeError, setMensajeError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [cargando, setCargando] = useState(false);

  const esRolControl = ['admin', 'profesor'].includes(rolUsuario);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const resp = await apiService.obtenerMateriales();
        if (activo) setMateriales(resp);
      } catch (err) {
        console.error(err);
        setMensajeError(err.message || 'No se pudo cargar materiales.');
      }
    })();
    return () => { activo = false; };
  }, []);

  const manejarSubida = async (e) => {
    e.preventDefault();
    setMensajeError('');
    setMensajeExito('');

    if (!esRolControl) return setMensajeError('Solo profesores/administradores pueden subir materiales.');
    if (!titulo.trim() || !archivo) return setMensajeError('Completa todos los campos.');

    const fd = new FormData();
    fd.append('titulo', titulo.trim());
    fd.append('archivo', archivo);
    // Debug: listar contenido del FormData
    for (const pair of fd.entries()) {
      console.log('formdata', pair[0], pair[1]);
    }

    setCargando(true);
    try {
      const creado = await apiService.subirMaterial(fd);
      setMateriales((m) => [creado, ...m]);
      setTitulo('');
      setArchivo(null);
      e.target.reset();
      setMensajeExito('Material subido correctamente.');
    } catch (err) {
      setMensajeError(err.message || 'Error al subir material.');
    } finally { setCargando(false); }
  };

  const manejarEliminar = async (id) => {
    if (!esRolControl) return setMensajeError('No autorizado');
    if (!window.confirm('¿Eliminar este material?')) return;
    try {
      await apiService.eliminarMaterial(id);
      setMateriales((m) => m.filter((mat) => mat.id !== id));
      setMensajeExito('Material eliminado.');
    } catch (err) {
      setMensajeError(err.message || 'No se pudo eliminar.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <header className="mb-6">
        <h2 className="text-3xl font-extrabold text-utp-dark">Materiales</h2>
        <p className="text-gray-600 mt-2">{esRolControl ? 'Sube y administra PDFs' : 'Consulta y descarga materiales disponibles'}</p>
      </header>

      {mensajeError && <div className="mb-4 text-sm text-red-700">{mensajeError}</div>}
      {mensajeExito && <div className="mb-4 text-sm text-green-700">{mensajeExito}</div>}

      {esRolControl && (
        <section className="bg-white p-6 rounded-2xl shadow-sm border mb-8">
          <form onSubmit={manejarSubida} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
              <input className="w-full rounded-xl border border-gray-200 p-3" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Archivo (PDF)</label>
              <input type="file" accept="application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
            </div>
            <button disabled={cargando} className="rounded-xl bg-utp-dark text-white px-4 py-2">{cargando ? 'Subiendo...' : 'Subir material'}</button>
          </form>
        </section>
      )}

      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <h3 className="text-xl font-bold mb-4">Listado</h3>
        {materiales.length === 0 ? (
          <p className="text-sm text-gray-500">No hay materiales disponibles.</p>
        ) : (
          <div className="space-y-3">
            {materiales.map((mat) => (
              <div key={mat.id} className="flex items-center justify-between border p-3 rounded">
                <div>
                  <p className="font-semibold">{mat.titulo}</p>
                  <p className="text-sm text-gray-500">{mat.curso || ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <a href={`${URL_SERVIDOR}${mat.archivo}`} target="_blank" rel="noreferrer" className="text-utp-red font-semibold">Ver / Descargar</a>
                  {esRolControl && (
                    <button onClick={() => manejarEliminar(mat.id)} className="text-sm text-red-600">Eliminar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
