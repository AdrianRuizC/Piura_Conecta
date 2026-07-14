// No React import required (JSX transform)
import { Link } from 'react-router-dom'; // Importamos el componente de navegación

// Agregamos la propiedad 'ruta' a cada objeto
const listaDeModulos = [
  { id: 1, icono: '📚', titulo: 'Materiales', descripcion: 'Descarga de PDFs', colores: 'bg-blue-100 text-blue-700', borde: 'hover:border-blue-300', ruta: '/materiales' },
  { id: 2, icono: '🎬', titulo: 'Videos', descripcion: 'Educación offline', colores: 'bg-utp-red/10 text-utp-red', borde: 'hover:border-utp-red/40', ruta: '/videos' },
  { id: 3, icono: '📝', titulo: 'Exámenes', descripcion: 'Práctica local', colores: 'bg-green-100 text-green-700', borde: 'hover:border-green-300', ruta: '/examenes' },
  { id: 4, icono: '💬', titulo: 'Foro Local', descripcion: 'Consultas en red', colores: 'bg-purple-100 text-purple-700', borde: 'hover:border-purple-300', ruta: '/foro' },
  { id: 5, icono: '📊', titulo: 'Progreso', descripcion: 'Avance personal', colores: 'bg-yellow-100 text-yellow-700', borde: 'hover:border-yellow-300', ruta: '/progreso' },
  { id: 6, icono: '📥', titulo: 'Descargas', descripcion: 'Gestor offline', colores: 'bg-gray-200 text-gray-700', borde: 'hover:border-gray-400', ruta: '/descargas' },
];

export default function Tablero() {
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
        {listaDeModulos.map((modulo) => (
          // Cambiamos <button> por <Link to={...}>
          <Link 
            key={modulo.id}
            to={modulo.ruta} 
            className={`bg-white border-2 border-transparent rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group ${modulo.borde}`}
          >
            <div className={`text-5xl mb-5 p-5 rounded-full ${modulo.colores} group-hover:scale-110 transition-transform duration-300 ease-out shadow-inner`}>
              {modulo.icono}
            </div>
            <h3 className="font-bold text-gray-900 text-xl mb-2">{modulo.titulo}</h3>
            <p className="text-base text-gray-500 font-medium">{modulo.descripcion}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}