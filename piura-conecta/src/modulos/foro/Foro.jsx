import { useEffect, useState, useRef } from 'react';
import { apiService } from '../../servicios/api';
import { io as ioClient } from 'socket.io-client';
import { URL_SERVIDOR } from '../../servicios/api';

// Utilidad para generar avatares con iniciales
const Avatar = ({ nombre, clase = "w-10 h-10 text-base" }) => {
  const inicial = nombre ? nombre.charAt(0).toUpperCase() : '?';
  return (
    <div className={`flex items-center justify-center rounded-full bg-utp-blue text-white font-bold shrink-0 ${clase}`}>
      {inicial}
    </div>
  );
};

// Utilidad para fechas relativas o formateadas
const formatearFecha = (fecha) => {
  return new Intl.DateTimeFormat('es-PE', { 
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
  }).format(new Date(fecha));
};

export default function Foro({ rolUsuario }) {
  const [temas, setTemas] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [selected, setSelected] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loadingTema, setLoadingTema] = useState(false);
  const [notif, setNotif] = useState(null);
  
  const repliesEndRef = useRef(null);
  const esRolControl = ['admin', 'profesor'].includes(rolUsuario);
  const usuarioActual = apiService.obtenerUsuario();
  const estaAutenticado = !!usuarioActual;

  const cargar = async () => {
    try {
      const resp = await apiService.obtenerForo();
      setTemas(resp);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let activo = true;
    (async () => { if (!activo) return; await cargar(); })();

    const socket = ioClient(URL_SERVIDOR);
    socket.on('connect', () => console.debug('Foro en tiempo real conectado'));
    
    socket.on('foro:nuevo', (data) => {
      setTemas((s) => [data, ...s]);
      setNotif({ tipo: 'nuevo_tema', contenido: `Nuevo tema: ${data.titulo}`, foroId: data.id });
      setTimeout(()=>setNotif(null), 3500);
    });

    socket.on('foro:respuesta', ({ foroId, respuesta }) => {
      setTemas((s) => s.map(t => t.id === foroId ? ({ ...t, _hasNewReply: !(selected && Number(selected.id) === Number(foroId)) }) : t));
      setReplies((r) => {
        if (!selected || Number(selected.id) !== Number(foroId)) return r;
        return [...r, respuesta];
      });
      scrollToBottom();
    });

    return () => {
      activo = false;
      socket.disconnect();
    };
  }, [selected]);

  const scrollToBottom = () => {
    setTimeout(() => {
      repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const crear = async (e) => {
    e.preventDefault();
    if (!estaAutenticado || !titulo.trim()) return;
    
    const temp = { 
      id: `tmp-${Date.now()}`, 
      titulo: titulo.trim(), 
      autor: usuarioActual?.nombre_completo || 'Tú', 
      fecha: new Date().toISOString() 
    };
    
    setTemas((s) => [temp, ...s]);
    setTitulo('');
    
    try {
      const creado = await apiService.crearTema({ titulo: titulo.trim() });
      setTemas((s) => s.map(t => t.id === temp.id ? creado : t));
    } catch (err) {
      console.error(err);
      setTemas((s) => s.filter(t => t.id !== temp.id));
    }
  };

  const eliminar = async (e, id) => {
    e.stopPropagation(); // Evita que al hacer clic en eliminar se abra el tema
    if (!window.confirm('¿Estás seguro de eliminar este tema y todas sus respuestas?')) return;
    try {
      await apiService.eliminarTema(id);
      setTemas((s) => s.filter((t) => t.id !== id));
      if (selected && Number(selected.id) === Number(id)) {
        setSelected(null);
        setReplies([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const eliminarRespuesta = async (respuestaId) => {
    if (!window.confirm('¿Eliminar esta respuesta?')) return;
    try {
      await apiService.eliminarRespuesta(respuestaId); // Asegúrate de tener este endpoint
      setReplies((r) => r.filter((x) => x.id !== respuestaId));
    } catch (err) {
      console.error(err);
    }
  };

  const abrirTema = async (id) => {
    setLoadingTema(true);
    try {
      const data = await apiService.obtenerTema(id);
      setSelected(data.tema);
      setReplies(data.replies || []);
      setTemas((s) => s.map(t => t.id === data.tema.id ? ({ ...t, _hasNewReply: false }) : t));
      scrollToBottom();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTema(false);
    }
  };

  const enviarRespuesta = async (e) => {
    e.preventDefault();
    if (!selected || !replyText.trim()) return;
    
    const temp = { 
      id: `tmp-r-${Date.now()}`, 
      foro_id: selected.id, 
      autor: usuarioActual?.nombre_completo || 'Tú', 
      contenido: replyText.trim(), 
      creado_at: new Date().toISOString() 
    };
    
    setReplies((r) => [...r, temp]);
    setReplyText('');
    scrollToBottom();
    
    try {
      const created = await apiService.crearRespuesta(selected.id, { contenido: temp.contenido });
      setReplies((r) => r.map(x => x.id === temp.id ? created : x));
    } catch (err) {
      console.error(err);
      setReplies((r) => r.filter(x => x.id !== temp.id));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl h-[calc(100vh-80px)] flex flex-col">
      <header className="mb-6 flex-shrink-0">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Comunidad y Dudas</h2>
        <p className="text-gray-500 mt-1">
          {esRolControl ? 'Panel de moderación y soporte a estudiantes.' : 'Conecta con instructores y compañeros de clase.'}
        </p>
      </header>

      {/* Alertas Flotantes del Socket */}
      {notif && (
        <div className="fixed top-20 right-4 bg-utp-dark text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-down z-50 flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-utp-blue opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-utp-blue"></span>
          </span>
          {notif.contenido}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Panel Lateral: Lista de Temas */}
        <aside className="lg:col-span-4 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden h-full">
          {estaAutenticado && (
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <form onSubmit={crear} className="flex flex-col gap-3">
                <input 
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-utp-blue focus:border-transparent outline-none transition-all" 
                  value={titulo} 
                  onChange={(e)=>setTitulo(e.target.value)} 
                  placeholder="¿Tienes alguna duda? Inicia un tema..." 
                />
                <button className="w-full rounded-lg bg-utp-dark hover:bg-gray-800 text-white font-medium px-4 py-2 transition-colors">
                  Publicar Tema
                </button>
              </form>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {temas.length === 0 ? (
              <div className="text-center p-6 text-gray-400 text-sm">No hay discusiones activas.</div>
            ) : (
              temas.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => abrirTema(t.id)}
                  className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 border-l-4 ${
                    selected && Number(selected.id) === Number(t.id) 
                    ? 'bg-blue-50 border-utp-blue' 
                    : 'bg-white border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-800 line-clamp-2 leading-tight">{t.titulo}</h4>
                    {t._hasNewReply && (
                      <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-600">
                        {t.autor ? t.autor.charAt(0).toUpperCase() : '?'}
                      </div>
                      {t.autor || 'Anónimo'}
                    </span>
                    {(esRolControl || (usuarioActual && t.autor === usuarioActual.nombre_completo)) && (
                      <button 
                        onClick={(e) => eliminar(e, t.id)} 
                        className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                      >
                        Borrar
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Panel Principal: Hilo de Discusión */}
        <main className="lg:col-span-8 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden h-full">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <svg className="w-16 h-16 mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              <p className="text-lg font-medium text-gray-500">Selecciona un tema del panel izquierdo</p>
              <p className="text-sm">O crea uno nuevo para empezar a interactuar.</p>
            </div>
          ) : (
            <>
              {/* Cabecera del Hilo (Main Post) */}
              <div className="p-6 border-b border-gray-100 bg-white shrink-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{selected.titulo}</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar nombre={selected.autor} clase="w-12 h-12 text-lg" />
                    <div>
                      <p className="font-semibold text-gray-800 leading-none">{selected.autor || 'Anónimo'}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatearFecha(selected.fecha)}</p>
                    </div>
                  </div>
                  {/* Etiqueta de salto de video estilo Udemy */}
                  {selected.video_id && selected.timestamp != null && (
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('piura:seek', { detail: { video_id: selected.video_id, timestamp: selected.timestamp } }))}
                      className="flex items-center gap-2 text-sm bg-blue-50 text-utp-blue hover:bg-blue-100 px-4 py-2 rounded-full font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                      Ir al {selected.timestamp}s
                    </button>
                  )}
                </div>
              </div>

              {/* Hilo de Respuestas */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 custom-scrollbar">
                {loadingTema ? (
                  <div className="flex justify-center items-center h-full text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-utp-blue"></div>
                  </div>
                ) : replies.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10">Sé el primero en responder a este tema.</div>
                ) : (
                  replies.map(r => {
                    const esAutorOriginal = String(r.autor) === String(selected.autor);
                    return (
                      <div key={r.id} className="flex gap-4 group">
                        <Avatar nombre={r.autor} clase="w-10 h-10 text-sm" />
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900">{r.autor || 'Anónimo'}</span>
                            {esAutorOriginal && <span className="text-[10px] font-bold bg-utp-blue/10 text-utp-blue px-2 py-0.5 rounded-full">AUTOR</span>}
                            <span className="text-xs text-gray-400">{formatearFecha(r.creado_at)}</span>
                          </div>
                          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-5 py-3 shadow-sm text-gray-700 whitespace-pre-wrap">
                            {r.contenido}
                          </div>
                          {(esRolControl || (usuarioActual && String(r.autor) === String(usuarioActual.nombre_completo))) && (
                            <button 
                              onClick={() => eliminarRespuesta(r.id)} 
                              className="text-xs text-red-500 font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={repliesEndRef} />
              </div>

              {/* Caja de Redacción (Composer) */}
              {estaAutenticado && (
                <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                  <form onSubmit={enviarRespuesta} className="flex flex-col gap-3">
                    <textarea 
                      value={replyText} 
                      onChange={(e)=>setReplyText(e.target.value)} 
                      className="w-full rounded-xl border border-gray-300 p-4 focus:ring-2 focus:ring-utp-blue focus:border-transparent outline-none resize-none transition-all" 
                      rows={3} 
                      placeholder="Escribe tu respuesta de forma respetuosa..." 
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 font-medium px-2">Soporta texto plano</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={()=> setReplyText('')} className="rounded-lg text-gray-500 hover:bg-gray-100 font-medium px-5 py-2 transition-colors">
                          Cancelar
                        </button>
                        <button disabled={!replyText.trim()} className="rounded-lg bg-utp-blue hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2 transition-all shadow-sm">
                          Responder
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}