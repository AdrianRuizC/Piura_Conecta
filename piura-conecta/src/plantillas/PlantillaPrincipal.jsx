import { Link } from 'react-router-dom';

export default function PlantillaPrincipal({ children, usuario, alCerrarSesion }) {
  const estadoRed = {
    estado: 'Conectado',
    comunidad: 'La Arena',
    usuariosConectados: 47
  };

  const nombreUsuario = usuario?.nombre || 'Usuario';
  const esRolControl = ['admin', 'profesor'].includes(usuario?.rol);
  const etiquetaVlan = usuario?.rol === 'admin' ? 'VLAN 20' : 'VLAN 10';
  const inicial = nombreUsuario.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fa] font-sans pb-16">
      
      {/* NAVBAR ESTILO KHAN ACADEMY / UDEMY (Blanco y limpio) */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          
          {/* Lado Izquierdo: Logo y Título */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="bg-[#c31f26] p-1.5 rounded-lg text-white group-hover:bg-red-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
              </div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Piura Conecta</h1>
            </Link>

            {/* Links de navegación principal */}
            <div className="hidden md:flex space-x-6">
              <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {etiquetaVlan} - {esRolControl ? 'Modo Gestión' : 'Modo Lectura'}
              </span>
              {esRolControl && (
                <Link to="/usuarios" className="text-sm font-bold text-gray-600 hover:text-[#c31f26] transition-colors py-1">
                  Gestión de Usuarios
                </Link>
              )}
            </div>
          </div>

          {/* Lado Derecho: Perfil y Salir */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-gray-900">{nombreUsuario}</span>
              <span className="text-xs font-medium text-gray-500">{usuario?.rol === 'admin' ? 'Administrador' : 'Estudiante'}</span>
            </div>
            
            {/* Avatar circular */}
            <div className="w-9 h-9 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-sm shadow-inner">
              {inicial}
            </div>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            <button onClick={alCerrarSesion} className="text-sm font-bold text-gray-500 hover:text-[#c31f26] transition-colors">
              Salir
            </button>
          </div>
        </div>
      </nav>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-grow flex flex-col items-center">
        {children}
      </main>

      {/* BARRA INFERIOR DISCRETA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 text-gray-600 text-xs font-medium z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row justify-between items-center w-full">
          
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span>Estado de red local: <strong className="text-gray-900">Conexión Óptima</strong></span>
          </div>

          <div className="flex space-x-6 mt-2 md:mt-0">
            <div className="flex items-center space-x-1.5">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
              <span>Comunidad: <strong className="text-gray-900">{estadoRed.comunidad}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              <span>Online: <strong className="text-gray-900">{estadoRed.usuariosConectados}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}