import { useEffect, useState } from 'react';
import { apiService } from '../../servicios/api';

export default function Usuarios() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ nombre_completo: '', usuario: '', contrasena: '', rol: 'estudiante', tenant_id: '' });
  const [error, setError] = useState('');

  const usuario = (() => { try { return JSON.parse(localStorage.getItem('usuarioPiura') || 'null'); } catch { return null; } })();

  const cargar = async () => {
    setCargando(true);
    try {
      const datos = await apiService.obtenerUsuarios();
      setLista(datos);
      // cargar cursos para asignaciones
      const cursos = await apiService.obtenerCursos();
      setCursos(cursos || []);
    } catch (e) {
      setError(e.message || 'Error al cargar usuarios');
    } finally { setCargando(false); }
  };
  const [cursos, setCursos] = useState([]);

  useEffect(() => { cargar(); }, []);

  const manejarCambio = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const asignar = async (alumnoId, cursoId) => {
    try {
      await apiService.asignarCurso(alumnoId, cursoId);
      alert('Curso asignado');
    } catch (err) {
      setError(err.message || 'Error al asignar curso');
    }
  };

  const crear = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const nuevo = await apiService.crearUsuario(form);
      setLista(s => [nuevo, ...s]);
      setForm({ nombre_completo: '', usuario: '', contrasena: '', rol: 'estudiante', tenant_id: '' });
    } catch (err) {
      setError(err.message || 'Error al crear usuario');
    }
  };

  const eliminar = async (id) => {
    if (!confirm('Eliminar usuario?')) return;
    try {
      await apiService.eliminarUsuario(id);
      setLista(s => s.filter(u => u.id !== id));
    } catch (err) {
      setError(err.message || 'Error al eliminar');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Gestión de usuarios (Profesor/Admin)</h2>
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <form onSubmit={crear} className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input name="nombre_completo" placeholder="Nombre completo" value={form.nombre_completo} onChange={manejarCambio} className="p-2 border rounded" />
        <input name="usuario" placeholder="Usuario" value={form.usuario} onChange={manejarCambio} className="p-2 border rounded" />
        <input name="contrasena" placeholder="Contraseña" value={form.contrasena} onChange={manejarCambio} className="p-2 border rounded" />
        <select name="rol" value={form.rol} onChange={manejarCambio} className="p-2 border rounded">
          <option value="estudiante">Estudiante</option>
          <option value="profesor">Profesor</option>
          <option value="admin">Admin</option>
        </select>
        {(() => {
          const current = (() => { try { return JSON.parse(localStorage.getItem('usuarioPiura') || 'null'); } catch { return null; } })();
          if (current && current.rol === 'admin') {
            return (
              <input name="tenant_id" placeholder="Community (tenant_id)" value={form.tenant_id} onChange={manejarCambio} className="p-2 border rounded md:col-span-1" />
            );
          }
          return null;
        })()}
        <div className="md:col-span-4">
          <button type="submit" className="mt-2 bg-utp-dark text-white px-4 py-2 rounded">Crear usuario</button>
        </div>
      </form>

      <div>
        <h3 className="font-semibold mb-2">Usuarios</h3>
        {cargando ? <div>Cargando...</div> : (
          <table className="w-full text-left border-collapse">
            <thead><tr><th className="p-2">ID</th><th className="p-2">Nombre</th><th className="p-2">Usuario</th><th className="p-2">Rol</th><th className="p-2">Acciones</th></tr></thead>
            <tbody>
              {lista.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{u.id}</td>
                  <td className="p-2">{u.nombre_completo}</td>
                  <td className="p-2">{u.usuario}</td>
                  <td className="p-2">{u.rol}</td>
                  <td className="p-2">
                    <button onClick={() => eliminar(u.id)} className="text-red-600 mr-3">Eliminar</button>
                    {usuario && usuario.rol === 'profesor' && u.rol === 'estudiante' && (
                      <select onChange={(e) => asignar(u.id, Number(e.target.value))} defaultValue="" className="border p-1">
                        <option value="">Asignar curso</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
