import { useCallback, useEffect, useState, useRef } from 'react';
import { apiService, URL_SERVIDOR } from '../../servicios/api';

export default function Videos({ rolUsuario }) {
  const [videos, setVideos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [tituloVideo, setTituloVideo] = useState('');
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [archivoVideo, setArchivoVideo] = useState(null);
  const [mensajeError, setMensajeError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [cargando, setCargando] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const usuarioActual = apiService.obtenerUsuario();

  const esRolControl = ['admin', 'profesor'].includes(rolUsuario);

  useEffect(() => {
    let activo = true;
    (async () => {
      if (!activo) return;
      try {
        const videosRespuesta = await apiService.obtenerVideos();
        if (activo) setVideos(videosRespuesta);

        if (esRolControl) {
          const cursosRespuesta = await apiService.obtenerCursos();
          if (activo) setCursos(cursosRespuesta);

          if (cursosRespuesta.length > 0) {
            setCursoSeleccionado(String(cursosRespuesta[0].id));
          }
        }
      } catch (error) {
        setMensajeError(error.message || 'No se pudo cargar el catálogo de videos.');
      }
    })();
    return () => { activo = false; };
  }, [esRolControl]);

  // refs registry for player instances to support seeking from foro
  const playerRefs = useRef({});
  const registerRef = useCallback((id, refObj) => {
    playerRefs.current[id] = refObj;
  }, []);

  const abrirVideoGrande = (video) => {
    setSelectedVideo(video);
    setMensajeError('');
    setMensajeExito('');
  };
  const cerrarVideoGrande = () => setSelectedVideo(null);

  useEffect(() => {
    const handler = (ev) => {
      try {
        const detail = ev.detail || {};
        const { video_id, timestamp } = detail;
        const vref = playerRefs.current && playerRefs.current[video_id];
        if (vref && vref.current) {
          vref.current.currentTime = Number(timestamp || 0);
          vref.current.play().catch(() => {});
        }
      } catch (e) { console.debug('seek event', e); }
    };
    window.addEventListener('piura:seek', handler);
    return () => window.removeEventListener('piura:seek', handler);
  }, []);

  const manejarSubida = async (evento) => {
    evento.preventDefault();
    setMensajeError('');
    setMensajeExito('');

    if (!esRolControl) {
      setMensajeError('Solo los profesores o administradores pueden publicar videos.');
      return;
    }

    if (!tituloVideo.trim() || !cursoSeleccionado || !archivoVideo) {
      setMensajeError('Completa todos los campos para publicar un video.');
      return;
    }

    const formularioDatos = new FormData();
    formularioDatos.append('titulo', tituloVideo.trim());
    formularioDatos.append('curso_id', cursoSeleccionado);
    formularioDatos.append('archivo', archivoVideo);

    setCargando(true);
    try {
      const videoCreado = await apiService.subirVideo(formularioDatos);
      setVideos((videosAnteriores) => [videoCreado, ...videosAnteriores]);
      setTituloVideo('');
      setArchivoVideo(null);
      evento.target.reset();
      setMensajeExito(`Video publicado: ${videoCreado.titulo}`);
    } catch (error) {
      setMensajeError(error.message || 'No se pudo subir el video.');
    } finally {
      setCargando(false);
    }
  };

  const manejarEliminacion = async (idVideo) => {
    if (!esRolControl) {
      setMensajeError('Solo los profesores o administradores pueden eliminar videos.');
      return;
    }

    if (!window.confirm('¿Deseas eliminar este video de la red?')) {
      return;
    }

    setMensajeError('');
    setMensajeExito('');

    try {
      await apiService.eliminarVideo(idVideo);
      setVideos((videosAnteriores) => videosAnteriores.filter((video) => video.id !== idVideo));
      setMensajeExito('Video eliminado correctamente.');
    } catch (error) {
      setMensajeError(error.message || 'No se pudo eliminar el video.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <header className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-utp-dark">Biblioteca de videos</h2>
            <p className="text-gray-600 mt-2 max-w-2xl">
              {esRolControl
                ? 'Publica, gestiona y organiza videos para tus estudiantes. Crea dudas directamente desde el reproductor y fusiona el contenido con el foro.'
                : 'Reproduce las clases disponibles y consulta dudas vinculadas al minuto exacto del video.'}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Videos</p>
              <p className="mt-2 text-3xl font-bold text-utp-dark">{videos.length}</p>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Acción</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">{esRolControl ? 'Publica y administra' : 'Explora y participa'}</p>
            </div>
          </div>
        </div>
      </header>

      {mensajeError && (
        <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
          {mensajeError}
        </div>
      )}

      {mensajeExito && (
        <div className="mb-6 rounded-3xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700 shadow-sm">
          {mensajeExito}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[0.95fr_0.8fr]">
        <section className="space-y-6">
          {videos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
              <p className="text-lg font-semibold text-gray-900">No hay videos disponibles</p>
              <p className="mt-2 text-sm">Verifica más tarde o, si eres docente, sube el primero.</p>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              {videos.map((video) => (
                <div key={video.id} className="group overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                  <div className="p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-utp-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-utp-blue">
                        {video.curso || 'General'}
                      </span>
                      {esRolControl && (
                        <button
                          type="button"
                          onClick={() => manejarEliminacion(video.id)}
                          className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{video.titulo}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">Reproduce el contenido y crea dudas con timestamp para que otros estudiantes y docentes te respondan.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => abrirVideoGrande(video)}
                    className="group relative flex h-[220px] w-full items-center justify-center overflow-hidden rounded-b-[28px] bg-slate-950 text-white transition hover:bg-slate-900"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_40%)]" />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
                      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-3xl text-white">
                        ▶
                      </span>
                      <p className="text-lg font-semibold">Ver en grande</p>
                      <p className="text-sm text-gray-200">Toque para abrir el reproductor en pantalla grande.</p>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          {esRolControl && (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-gray-500">Nuevo video</p>
                  <h3 className="mt-2 text-xl font-bold text-gray-900">Sube tu clase</h3>
                </div>
                <span className="inline-flex rounded-full bg-utp-yellow/20 px-3 py-1 text-xs font-semibold text-utp-dark">+ Añadir</span>
              </div>

              <form onSubmit={manejarSubida} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Título del video</label>
                  <input
                    type="text"
                    className="w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-utp-red focus:bg-white"
                    value={tituloVideo}
                    onChange={(evento) => setTituloVideo(evento.target.value)}
                    placeholder="Ej. Física: Leyes de Newton"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Curso vinculado</label>
                  <select
                    className="w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-utp-red focus:bg-white"
                    value={cursoSeleccionado}
                    onChange={(evento) => setCursoSeleccionado(evento.target.value)}
                  >
                    {cursos.map((curso) => (
                      <option key={curso.id} value={curso.id}>{curso.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Selecciona archivo</label>
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600">
                    <input
                      type="file"
                      accept="video/mp4"
                      className="w-full cursor-pointer text-sm text-gray-700 file:mr-4 file:rounded-full file:border-0 file:bg-utp-dark file:px-4 file:py-2 file:text-white"
                      onChange={(evento) => setArchivoVideo(evento.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cargando}
                  className="btn btn-dark w-full disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {cargando ? 'Subiendo...' : 'Publicar video'}
                </button>
              </form>
            </section>
          )}

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.18em] text-gray-500">Instrucciones</p>
            <h3 className="mt-2 text-xl font-bold text-gray-900">Crea dudas en tiempo real</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Usa el botón "Crear duda en este tiempo" dentro del reproductor para abrir un tema en el foro con enlace directo al minuto exacto.
            </p>
            <div className="mt-5 grid gap-3 text-sm text-gray-700">
              <div className="rounded-2xl bg-gray-50 px-4 py-3">1. Reproduce un video.</div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3">2. Pulsa el botón cuando tengas una pregunta.</div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3">3. Ve al foro y responde o elimina tus temas.</div>
            </div>
          </section>
        </aside>
      </div>

      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-4 py-6 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedVideo.titulo}</h3>
                <p className="text-sm text-gray-500">{selectedVideo.curso || 'General'}</p>
              </div>
              <button
                type="button"
                onClick={cerrarVideoGrande}
                className="btn btn-light"
              >
                Cerrar
              </button>
            </div>
            <div className="bg-slate-950 p-6">
              <VideoPlayer
                key={`modal-player-${selectedVideo.id}`}
                video={selectedVideo}
                url={`${URL_SERVIDOR}${selectedVideo.archivo}`}
                autoPlay
                registerRef={registerRef}
                onCreateDoubt={async (titulo, tiempo) => {
                  try {
                    await apiService.crearTema({ titulo, video_id: selectedVideo.id, timestamp: tiempo, autor: usuarioActual?.nombre_completo || usuarioActual?.nombre });
                    setMensajeExito('Duda creada en el foro');
                  } catch (err) {
                    setMensajeError(err.message || 'No se pudo crear la duda');
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

  function VideoPlayer({ video, url, onCreateDoubt, registerRef, autoPlay }) {
    const refVideo = useRef(null);
    const intervaloRef = useRef(null);
    const [reproduciendo, setReproduciendo] = useState(false);

    useEffect(() => {
      // register ref for parent (for seeking), and cleanup
      if (registerRef && typeof registerRef === 'function') registerRef(video.id, refVideo);
      return () => {
        if (intervaloRef.current) clearInterval(intervaloRef.current);
        if (registerRef && typeof registerRef === 'function') registerRef(video.id, null);
      };
    }, [registerRef, video.id]);

    const startPings = () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      intervaloRef.current = setInterval(async () => {
        if (!refVideo.current) return;
        const tiempo = Math.floor(refVideo.current.currentTime || 0);
        try {
          await apiService.postProgreso(video.id, tiempo);
        } catch (err) {
          // no interrumpir la reproducción por errores en progreso
          console.debug('progreso error', err.message || err);
        }
      }, 10000);
    };

    const handlePlay = () => {
      setReproduciendo(true);
      startPings();
    };

    const handlePause = () => {
      setReproduciendo(false);
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };

    useEffect(() => {
      if (!refVideo.current) return;
      if (autoPlay) {
        refVideo.current.play().catch(() => {});
      }
    }, [autoPlay]);

    const handleCreateDoubt = async () => {
      if (!refVideo.current) return;
      const tiempo = Math.floor(refVideo.current.currentTime || 0);
      const titulo = window.prompt('Describe tu duda', `Duda en ${tiempo}s sobre ${video.titulo}`);
      if (!titulo) return;
      await onCreateDoubt(titulo, tiempo);
    };

    return (
      <div className="relative overflow-hidden rounded-b-[28px] bg-slate-950">
        <video
          ref={refVideo}
          src={url}
          controls
          className="h-[240px] w-full bg-black object-cover"
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handlePause}
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-slate-950/90 to-transparent p-4 text-white">
          <div className="flex items-center justify-between text-sm text-slate-200">
            <span>{reproduciendo ? 'Reproduciendo' : 'Pausado'}</span>
            <button
              onClick={handleCreateDoubt}
              className="rounded-full bg-utp-yellow px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-950 shadow-sm transition hover:bg-yellow-300"
            >
              Crear duda
            </button>
          </div>
          <div className="text-xs text-slate-300">Guarda una duda con el minuto exacto para el foro.</div>
        </div>
      </div>
    );
  }