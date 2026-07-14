import { useState } from 'react';
import { apiService } from '../../servicios/api';

export default function Login({ alIniciarSesion }) {
  const [pestanaActiva, setPestanaActiva] = useState('estudiante');
  const [nombreEstudiante, setNombreEstudiante] = useState('');
  const [usuarioProfesor, setUsuarioProfesor] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [cargando, setCargando] = useState(false);

  const cambiarPestana = (nuevaPestana) => {
    setPestanaActiva(nuevaPestana);
    setMensajeError('');
  };

  const manejarIngreso = async (evento) => {
    evento.preventDefault();
    setMensajeError('');

    if (pestanaActiva === 'estudiante') {
      if (nombreEstudiante.trim().length < 3) {
        setMensajeError('Por favor, ingresa tu nombre real completo.');
        return;
      }

      alIniciarSesion({ rol: 'estudiante', nombre: nombreEstudiante.trim() });
      return;
    }

    if (!usuarioProfesor.trim() || !contrasena.trim()) {
      setMensajeError('Completa todos los campos institucionales.');
      return;
    }

    setCargando(true);
    try {
      const usuarioAuth = await apiService.login(usuarioProfesor.trim(), contrasena);
      // apiService.login guarda token y devuelve el objeto user
      alIniciarSesion({ rol: usuarioAuth.rol, nombre: usuarioAuth.nombre_completo });
    } catch (error) {
      setMensajeError(error.message || 'Error de conexión con el servidor principal.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-utp-light via-white to-blue-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-utp-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-fade-in" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-fade-in" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-[32px] border border-gray-200 bg-white/95 shadow-2xl backdrop-blur-xl">
        <div className="bg-utp-red px-8 py-7 text-center text-white">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white shadow-lg">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Piura Conecta</h1>
          <p className="mt-2 text-sm text-white/85">Acceso rápido a contenido, exámenes y recursos educativos.</p>
        </div>

        <div className="flex border-b border-gray-200 bg-white">
          <button
            type="button"
            className={`flex-1 py-4 text-sm font-semibold transition ${pestanaActiva === 'estudiante' ? 'text-utp-red border-b-2 border-utp-red bg-red-50/40' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            onClick={() => cambiarPestana('estudiante')}
          >
            👨‍🎓 Estudiante
          </button>
          <button
            type="button"
            className={`flex-1 py-4 text-sm font-semibold transition ${pestanaActiva === 'profesor' ? 'text-utp-red border-b-2 border-utp-red bg-red-50/40' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            onClick={() => cambiarPestana('profesor')}
          >
            👨‍🏫 Profesor
          </button>
        </div>

        <form onSubmit={manejarIngreso} className="space-y-6 px-8 py-8">
          {mensajeError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              {mensajeError}
            </div>
          )}

          <div className="space-y-6 animate-fade-in">
            {pestanaActiva === 'estudiante' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre y Apellido</label>
                  <input
                    type="text"
                    placeholder="Ingresa tu nombre completo"
                    className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-utp-red focus:ring-2 focus:ring-utp-red/20 outline-none"
                    value={nombreEstudiante}
                    onChange={(evento) => setNombreEstudiante(evento.target.value)}
                  />
                  <p className="mt-2 text-xs text-gray-400">Accede rápido al contenido compartido sin credenciales.</p>
                </div>
                <div className="rounded-3xl border border-gray-100 bg-blue-50 p-4 text-sm text-gray-600">
                  <p className="font-semibold text-gray-800">Modo Estudiante</p>
                  <p>Explora videos, materiales y exámenes sin credenciales administrativas.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Usuario Institucional</label>
                  <input
                    type="text"
                    placeholder="Ingresa tu usuario"
                    className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-utp-red focus:ring-2 focus:ring-utp-red/20 outline-none"
                    value={usuarioProfesor}
                    onChange={(evento) => setUsuarioProfesor(evento.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition focus:border-utp-red focus:ring-2 focus:ring-utp-red/20 outline-none"
                    value={contrasena}
                    onChange={(evento) => setContrasena(evento.target.value)}
                  />
                </div>
                <div className="rounded-3xl border border-gray-100 bg-green-50 p-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-800">Acceso Administrativo</p>
                  <p>Ingresa con tus credenciales para gestionar usuarios, material y exámenes.</p>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="mt-4 w-full rounded-3xl bg-utp-dark px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-black/5 transition hover:bg-black disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed"
          >
            {cargando ? 'Autenticando...' : (pestanaActiva === 'estudiante' ? 'Ingresar a la Red' : 'Iniciar Sesión Administrativa')}
          </button>
        </form>
      </div>

      <div className="mt-8 text-sm font-medium text-gray-500 flex items-center">
        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
        Enlace troncal activo (VLAN 10/20) - 192.168.1.1
      </div>
    </div>
  );
}