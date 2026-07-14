// No React default import required with the new JSX transform

export default function PlantillaPrincipal({ children, usuario, alCerrarSesion }) {
  const estadoRed = {
    estado: 'Conectado',
    comunidad: 'La Arena',
    usuariosConectados: 47
  };

  const nombreUsuario = usuario?.nombre || 'Usuario';
  const esRolControl = ['admin', 'profesor'].includes(usuario?.rol);
  const etiquetaVlan = usuario?.rol === 'admin' ? 'VLAN 20' : 'VLAN 10';

  return (
    <div className="min-h-screen flex flex-col bg-utp-light font-sans pb-16">
      <nav className="bg-utp-red text-white p-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center px-4 max-w-6xl">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-full shadow-sm">
              <svg className="w-6 h-6 text-utp-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Piura Conecta</h1>
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-sm font-medium bg-white/10 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-sm">
                {etiquetaVlan} - {nombreUsuario}
              </div>
                {esRolControl && (
                  <a href="/usuarios" className="text-sm font-bold text-white/90 hover:text-white transition-colors mr-3">Usuarios</a>
                )}
                <button onClick={alCerrarSesion} className="text-sm font-bold text-red-200 hover:text-white transition-colors">
                  Salir
                </button>
            </div>
          </div>

          <div className="text-sm font-medium bg-white/10 px-4 py-1.5 rounded-full border border-white/20 hidden md:block backdrop-blur-sm">
            {etiquetaVlan} - Modo {esRolControl ? 'Gestión' : 'Lectura'}
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {children}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-utp-dark text-white border-t-4 border-utp-red text-sm z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-2 max-w-6xl">
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="font-medium text-gray-200">
              Estado de red: <span className="text-white font-bold">{estadoRed.estado}</span>
            </span>
          </div>

          <div className="flex space-x-6 text-gray-400 font-medium">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span>Comunidad: <strong className="text-white">{estadoRed.comunidad}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              <span>Online: <strong className="text-white">{estadoRed.usuariosConectados}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}