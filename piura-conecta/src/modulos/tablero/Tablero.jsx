import { Link } from 'react-router-dom';

export default function Tablero() {
  const modulos = [
    { 
      id: 1, 
      titulo: 'Materiales de Estudio', 
      descripcion: 'Accede a libros, manuales agrícolas y guías en formato PDF.', 
      icono: '📚', 
      bgIcono: 'bg-blue-100', 
      txtIcono: 'text-blue-600',
      ruta: '/materiales' 
    },
    { 
      id: 2, 
      titulo: 'Videoteca Educativa', 
      descripcion: 'Clases completas y tutoriales paso a paso sin gastar datos.', 
      icono: '🎬', 
      bgIcono: 'bg-red-100', 
      txtIcono: 'text-red-600',
      ruta: '/videos' 
    },
    { 
      id: 3, 
      titulo: 'Centro de Exámenes', 
      descripcion: 'Pon a prueba tus conocimientos con simulacros y quices.', 
      icono: '📝', 
      bgIcono: 'bg-emerald-100', 
      txtIcono: 'text-emerald-600',
      ruta: '/examenes' 
    },
    { 
      id: 4, 
      titulo: 'Foro Comunitario', 
      descripcion: 'Comparte dudas, experiencias y soluciones con tu comunidad.', 
      icono: '💬', 
      bgIcono: 'bg-purple-100', 
      txtIcono: 'text-purple-600',
      ruta: '/foro' 
    },
    { 
      id: 5, 
      titulo: 'Mi Progreso', 
      descripcion: 'Revisa tus calificaciones y el avance de tu aprendizaje.', 
      icono: '📈', 
      bgIcono: 'bg-amber-100', 
      txtIcono: 'text-amber-600',
      ruta: '/progreso' 
    },
    { 
      id: 6, 
      titulo: 'Gestor de Descargas', 
      descripcion: 'Administra tus archivos guardados para uso 100% offline.', 
      icono: '📥', 
      bgIcono: 'bg-gray-100', 
      txtIcono: 'text-gray-600',
      ruta: '/descargas' 
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* BANNER HERO ESTILO UDEMY/PLATZI */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden mb-12 relative shadow-2xl">
        {/* Decoraciones de fondo abstracto */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-[#c31f26] rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        
        <div className="relative z-10 p-8 md:p-12 lg:p-16">
          <span className="text-red-400 font-bold tracking-wider uppercase text-sm mb-2 block">
            Red Educativa Local
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Educación Digital <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">Offline</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl font-light mb-8 leading-relaxed">
            Acceso inmediato a recursos educativos a través de la red LAN autónoma. Cero consumo de datos, máxima velocidad en tu comunidad.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/videos" className="bg-[#c31f26] hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-red-900/50">
              Continuar Aprendiendo
            </Link>
            <Link to="/materiales" className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-xl backdrop-blur-sm transition-all border border-white/10">
              Explorar Biblioteca
            </Link>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE MÓDULOS */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">¿Qué quieres hacer hoy?</h2>
          <p className="text-gray-500 mt-1">Selecciona una herramienta de aprendizaje</p>
        </div>
      </div>

      {/* GRID DE TARJETAS (ESTILO KHAN ACADEMY) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modulos.map((mod) => (
          <Link 
            key={mod.id} 
            to={mod.ruta}
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-gray-300 transition-all duration-300 hover:-translate-y-1 group flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${mod.bgIcono} ${mod.txtIcono} group-hover:scale-110 transition-transform duration-300`}>
                {mod.icono}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#c31f26] transition-colors">
              {mod.titulo}
            </h3>
            
            <p className="text-gray-500 text-sm leading-relaxed flex-grow">
              {mod.descripcion}
            </p>
          </Link>
        ))}
      </div>

    </div>
  );
}