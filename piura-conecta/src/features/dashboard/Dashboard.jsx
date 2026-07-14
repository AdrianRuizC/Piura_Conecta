import { useEffect, useState } from 'react';
import { apiService } from '../../servicios/api';
import { useNavigate } from 'react-router-dom';

const modulosFallback = [
  { id: 1, icono: '📚', titulo: 'Materiales', descripcion: 'Descarga de PDFs', colores: 'bg-blue-100 text-blue-700', borde: 'hover:border-blue-300', ruta: '/materiales' },
  { id: 2, icono: '🎬', titulo: 'Videos', descripcion: 'Educación offline', colores: 'bg-utp-red/10 text-utp-red', borde: 'hover:border-utp-red/40', ruta: '/videos' },
  { id: 3, icono: '📝', titulo: 'Exámenes', descripcion: 'Práctica local', colores: 'bg-green-100 text-green-700', borde: 'hover:border-green-300', ruta: '/examenes' },
  { id: 4, icono: '💬', titulo: 'Foro Local', descripcion: 'Consultas en red', colores: 'bg-purple-100 text-purple-700', borde: 'hover:border-purple-300', ruta: '/foro' },
  { id: 5, icono: '📊', titulo: 'Progreso', descripcion: 'Avance personal', colores: 'bg-yellow-100 text-yellow-700', borde: 'hover:border-yellow-300', ruta: '/progreso' },
  { id: 6, icono: '📥', titulo: 'Descargas', descripcion: 'Gestor offline', colores: 'bg-gray-200 text-gray-700', borde: 'hover:border-gray-400', ruta: '/descargas' },
];



export default function Dashboard() {
  const [modulos, setModulos] = useState(modulosFallback);
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const m = await apiService.obtenerModulos();
        if (activo) setModulos(m.map((x) => ({ ...x, colores: x.colores || 'bg-white', borde: x.borde || '' })));
      } catch (error) {
        console.error(error);
      }
    })();
    return () => { activo = false; };
  }, []);
  const navegar = useNavigate();

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <header className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-extrabold text-utp-dark mb-5 tracking-tight">
          Educación Digital <span className="text-utp-red">Offline</span>
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
          Acceso inmediato a recursos educativos a través de la red LAN autónoma. 
          Cero consumo de datos, máxima velocidad local.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
        {modulos.map((mod) => (
          <button 
            key={mod.id}
            onClick={() => mod.ruta && navegar(mod.ruta)}
            className={`bg-white border-2 border-transparent rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group ${mod.borde || ''}`}
          >
            <div className={`text-5xl mb-5 p-5 rounded-full ${mod.colores || ''} group-hover:scale-110 transition-transform duration-300 ease-out shadow-inner`}>
              {mod.icono}
            </div>
            <h3 className="font-bold text-gray-900 text-xl mb-2">{mod.titulo}</h3>
            <p className="text-base text-gray-500 font-medium">{mod.descripcion}</p>
          </button>
        ))}
      </div>
    </div>
  );
}