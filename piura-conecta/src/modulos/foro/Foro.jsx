import { useEffect, useState, useRef } from 'react';
import { apiService } from '../../servicios/api';
import { io as ioClient } from 'socket.io-client';
import { URL_SERVIDOR } from '../../servicios/api';

const Avatar = ({ nombre, clase = 'w-10 h-10 text-base' }) => {
  const inicial = nombre ? nombre.charAt(0).toUpperCase() : '?';
  return (
    <div className={`flex items-center justify-center rounded-full bg-utp-blue text-white font-bold shrink-0 ${clase}`}>
      {inicial}
    </div>
  );
};

const formatearFecha = (fecha) => {
  if (!fecha) return '';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(fecha));
};

export default function Foro({ rolUsuario }) {
  const [temas, setTemas] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [selected, setSelected] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loadingTema, setLoadingTema] = useState(false);
  const [message, setMessage] = useState(null);

  const repliesEndRef = useRef(null);
  const selectedRef = useRef(null);
  const tempIdCounter = useRef(1);
  const tempReplyIdCounter = useRef(1);

  const esRolControl = ['admin', 'profesor'].includes(rolUsuario);
  const usuarioActual = apiService.obtenerUsuario();
  const estaAutenticado = !!usuarioActual;
  const nombreUsuario = usuarioActual?.nombre_completo || usuarioActual?.nombre || 'Anónimo';

  const mostrarMensaje = (tipo, texto) => {
    setMessage({ tipo, texto });
    setTimeout(() => setMessage(null), 3500);
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        const resp = await apiService.obtenerForo();
        setTemas(resp);
      } catch (err) {
        console.error(err);
        setMessage({ tipo: 'error', texto: 'No se pudo cargar el foro.' });
      }
    };
    cargar();
  }, []);

  useEffect(() => {
    selectedRef.current = selected ? selected.id : null;
  }, [selected]);

  const bajarScroll = () => {
    setTimeout(() => {
      repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    const socket = ioClient(URL_SERVIDOR);
    socket.on('connect', () => console.debug('Foro en tiempo real conectado'));

    socket.on('foro:nuevo', (data) => {
      setTemas((prev) => [data, ...prev]);
    });

    socket.on('foro:respuesta', ({ foroId, respuesta }) => {
      setTemas((prev) => prev.map((t) => {
        if (t.id === foroId) {
          return { ...t, _hasNewReply: selectedRef.current !== foroId, replies: (t.replies ?? 0) + 1, last_reply_at: respuesta.creado_at };
        }
        return t;
      }));

      if (selectedRef.current === foroId) {
        setReplies((prev) => [...prev, respuesta]);
        bajarScroll();
      }
    });

    return () => socket.disconnect();
  }, []);

  const crearTema = async (e) => {
    e.preventDefault();
    if (!estaAutenticado) {
      mostrarMensaje('error', 'Debes iniciar sesión para publicar un tema.');
      return;
    }
    if (!titulo.trim()) {
      mostrarMensaje('error', 'Escribe el título del tema.');
      return;
    }

    const temp = {
      id: `tmp-${tempIdCounter.current}`,
      titulo: titulo.trim(),
      autor: nombreUsuario,
      fecha: new Date().toISOString(),
      replies: 0,
      last_reply_at: null
    };
    tempIdCounter.current += 1;

    setTemas((prev) => [temp, ...prev]);
    setTitulo('');

    try {
      const creado = await apiService.crearTema({ titulo: temp.titulo, autor: nombreUsuario });
      setTemas((prev) => prev.map((t) => (t.id === temp.id ? { ...creado, replies: 0, last_reply_at: null } : t)));
      mostrarMensaje('success', 'Tema creado correctamente.');
      abrirTema(creado.id);
    } catch (err) {
      console.error(err);
      setTemas((prev) => prev.filter((t) => t.id !== temp.id));
      mostrarMensaje('error', 'No se pudo crear el tema.');
    }
  };

  const abrirTema = async (id) => {
    setLoadingTema(true);
    try {
      const data = await apiService.obtenerTema(id);
      setSelected(data.tema);
      setReplies(data.replies || []);
      setTemas((prev) => prev.map((t) => (t.id === data.tema.id ? { ...t, _hasNewReply: false } : t)));
      bajarScroll();
    } catch (err) {
      console.error(err);
      mostrarMensaje('error', 'No se pudo abrir el tema.');
    } finally {
      setLoadingTema(false);
    }
  };

  const enviarRespuesta = async (e) => {
    e.preventDefault();
    if (!estaAutenticado) {
      mostrarMensaje('error', 'Debes iniciar sesión para responder.');
      return;
    }
    if (!selected) return;
    if (!replyText.trim()) {
      mostrarMensaje('error', 'Escribe tu respuesta.');
      return;
    }

    const temp = {
      id: `tmp-r-${tempReplyIdCounter.current}`,
      foro_id: selected.id,
      autor: nombreUsuario,
      contenido: replyText.trim(),
      creado_at: new Date().toISOString()
    };
    tempReplyIdCounter.current += 1;

    setReplies((prev) => [...prev, temp]);
    setReplyText('');
    bajarScroll();

    try {
      const created = await apiService.crearRespuesta(selected.id, { contenido: temp.contenido, autor: nombreUsuario });
      setReplies((prev) => prev.map((item) => (item.id === temp.id ? created : item)));
      setTemas((prev) => prev.map((t) => (t.id === selected.id ? { ...t, replies: (t.replies ?? 0) + 1, last_reply_at: created.creado_at } : t)));
      mostrarMensaje('success', 'Respuesta publicada.');
    } catch (err) {
      console.error(err);
      setReplies((prev) => prev.filter((item) => item.id !== temp.id));
      mostrarMensaje('error', 'No se pudo enviar la respuesta.');
    }
  };

  const eliminarTema = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar este tema?')) return;

    try {
      await apiService.eliminarTema(id, { autor: nombreUsuario });
      setTemas((prev) => prev.filter((item) => item.id !== id));
      if (selected && Number(selected.id) === Number(id)) {
        setSelected(null);
        setReplies([]);
      }
      mostrarMensaje('success', 'Tema eliminado.');
    } catch (err) {
      console.error(err);
      mostrarMensaje('error', 'No se pudo eliminar el tema.');
    }
  };

  const eliminarRespuesta = async (respuestaId) => {
    if (!selected) return;
    if (!window.confirm('¿Eliminar esta respuesta?')) return;

    try {
      await apiService.eliminarRespuesta(selected.id, respuestaId, { autor: nombreUsuario });
      setReplies((prev) => prev.filter((item) => item.id !== respuestaId));
      mostrarMensaje('success', 'Respuesta eliminada.');
    } catch (err) {
      console.error(err);
      mostrarMensaje('error', 'No se pudo eliminar la respuesta.');
    }
  };

  const temasOrdenados = [...temas].sort((a, b) => {
    const fechaA = a.last_reply_at || a.fecha;
    const fechaB = b.last_reply_at || b.fecha;
    return new Date(fechaB) - new Date(fechaA);
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl h-[calc(100vh-80px)] flex flex-col">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Foro de la comunidad</h2>
          <p className="text-gray-500 mt-1">Publica temas, responde a dudas y participa con tu grupo.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Temas</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{temas.length}</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Actividad</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">{selected ? formatearFecha(selected.last_reply_at || selected.fecha) : 'Reciente'}</p>
          </div>
        </div>
      </header>

      {message && (
        <div className={`mb-6 rounded-3xl border px-5 py-4 text-sm shadow-sm ${message.tipo === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {message.texto}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        <aside className="lg:col-span-4 flex flex-col rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden h-full">
          <div className="p-5 border-b border-gray-100 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Temas recientes</h3>
            <p className="text-sm text-gray-500 mt-1">Selecciona un tema para leer y responder.</p>
          </div>

          <div className="p-5 space-y-4">
            {estaAutenticado ? (
              <form onSubmit={crearTema} className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">Crear nuevo tema</label>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título del tema"
                  className="w-full rounded-3xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-utp-blue focus:ring-2 focus:ring-utp-blue/20"
                />
                <button type="submit" className="btn btn-primary w-full">
                  Publicar tema
                </button>
              </form>
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                Inicia sesión para crear temas y responder en el foro.
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {temasOrdenados.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-400">No hay temas aún.</div>
            ) : temasOrdenados.map((tema) => {
              const activo = selected && Number(selected.id) === Number(tema.id);
              return (
                <div
                  key={tema.id}
                  onClick={() => abrirTema(tema.id)}
                  className={`cursor-pointer rounded-3xl border p-4 transition ${activo ? 'border-utp-blue bg-blue-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 line-clamp-2">{tema.titulo}</h4>
                      <p className="mt-2 text-xs text-gray-500">{tema.autor || 'Anónimo'}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {tema.last_reply_at ? 'Actualizado' : 'Creado'}
                      <div>{formatearFecha(tema.last_reply_at || tema.fecha)}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500">
                    <span>{tema.replies ?? 0} respuestas</span>
                    {tema._hasNewReply && <span className="rounded-full bg-red-100 px-2 py-1 text-red-600">Nuevo</span>}
                  </div>
                  {(esRolControl || (usuarioActual && tema.autor === usuarioActual.nombre_completo)) && (
                    <button
                      onClick={(e) => eliminarTema(e, tema.id)}
                      className="btn btn-danger btn-sm mt-4"
                    >
                      Eliminar tema
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <main className="lg:col-span-8 flex flex-col rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden h-full">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center text-gray-400">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-100 text-3xl">💬</div>
              <div className="max-w-lg">
                <h3 className="text-xl font-semibold text-gray-900">Selecciona un tema para ver su conversación</h3>
                <p className="mt-2 text-sm text-gray-500">Aquí verás el hilo del tema, las respuestas y el formulario para participar.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-gray-100 p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selected.titulo}</h3>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span>{selected.autor || 'Anónimo'}</span>
                      <span>·</span>
                      <span>{formatearFecha(selected.fecha)}</span>
                    </div>
                  </div>
                  {selected.video_id && selected.timestamp != null && (
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('piura:seek', { detail: { video_id: selected.video_id, timestamp: selected.timestamp } }))}
                      className="btn btn-secondary"
                    >
                      Ir al minuto {selected.timestamp}s
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-50">
                {loadingTema ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-utp-blue"></div>
                  </div>
                ) : replies.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
                    Este tema aún no tiene respuestas.
                  </div>
                ) : (
                  replies.map((reply) => {
                    const esAutorRespuesta = usuarioActual && reply.autor === usuarioActual.nombre_completo;
                    return (
                      <div key={reply.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar nombre={reply.autor} clase="w-11 h-11 text-sm" />
                            <div>
                              <p className="font-semibold text-gray-900">{reply.autor || 'Anónimo'}</p>
                              <p className="text-xs text-gray-400">{formatearFecha(reply.creado_at)}</p>
                            </div>
                          </div>
                          {(esRolControl || esAutorRespuesta) && (
                            <button
                              onClick={() => eliminarRespuesta(reply.id)}
                              className="btn btn-danger btn-sm"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                        <p className="mt-4 text-gray-700 whitespace-pre-wrap">{reply.contenido}</p>
                      </div>
                    );
                  })
                )}
                <div ref={repliesEndRef} />
              </div>

              <div className="border-t border-gray-100 bg-gray-50 p-6">
                {estaAutenticado ? (
                  <form onSubmit={enviarRespuesta} className="space-y-4">
                    <label className="text-sm font-semibold text-gray-900">Responder</label>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                      placeholder="Escribe tu respuesta..."
                      className="w-full rounded-3xl border border-gray-300 bg-white px-4 py-4 text-sm outline-none focus:border-utp-blue focus:ring-2 focus:ring-utp-blue/20"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                      <span className="text-xs text-gray-500">Contribuye con respuestas claras y respetuosas.</span>
                      <button
                        type="submit"
                        disabled={!replyText.trim()}
                        className="rounded-3xl bg-utp-blue px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Publicar respuesta
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
                    Inicia sesión para responder y participar en el hilo.
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
