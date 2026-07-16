import { useEffect, useState, useRef } from 'react';
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
    // Debug: listar contenido del FormData
    for (const pair of formularioDatos.entries()) {
      console.log('formdata', pair[0], pair[1]);
    }

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
        <h2 className="text-3xl font-extrabold text-utp-dark">Biblioteca de videos</h2>
        <p className="text-gray-600 mt-2">
          {esRolControl
            ? 'Publica y gestiona el material audiovisual disponible en la red local.'
            : 'Tu acceso es de lectura para revisar el contenido disponible.'}
        </p>
      </header>

      {mensajeError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {mensajeError}
        </div>
      )}

      {mensajeExito && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {mensajeExito}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {esRolControl && (
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Subir nuevo video</h3>
            <form onSubmit={manejarSubida} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Título</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-utp-red"
                  value={tituloVideo}
                  onChange={(evento) => setTituloVideo(evento.target.value)}
                  placeholder="Ej. Clase de matemáticas"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Curso</label>
                <select
                  className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:border-utp-red"
                  value={cursoSeleccionado}
                  onChange={(evento) => setCursoSeleccionado(evento.target.value)}
                >
                  {cursos.map((curso) => (
                    <option key={curso.id} value={curso.id}>{curso.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Archivo MP4</label>
                <input
                  type="file"
                  accept="video/mp4"
                  className="w-full rounded-xl border border-dashed border-gray-300 p-3 text-sm"
                  onChange={(evento) => setArchivoVideo(evento.target.files?.[0] || null)}
                />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full rounded-xl bg-utp-dark px-4 py-3 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-500"
              >
                {cargando ? 'Subiendo...' : 'Publicar video'}
              </button>
            </form>
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Videos disponibles</h3>
          <div className="space-y-3">
            {videos.length === 0 ? (
              <p className="text-sm text-gray-500">Aún no hay videos publicados.</p>
            ) : (
              videos.map((video) => (
                <div key={video.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{video.titulo}</p>
                      <p className="text-sm text-gray-500">{video.curso}</p>
                    </div>
                    {esRolControl && (
                      <button
                        type="button"
                        onClick={() => manejarEliminacion(video.id)}
                        className="text-sm font-semibold text-utp-red hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                    <div className="mt-3">
                      <VideoPlayer
                        key={`player-${video.id}`}
                        video={video}
                        url={`${URL_SERVIDOR}${video.archivo}`}
                        registerRef={(id, refObj) => { playerRefs.current[id] = refObj; }}
                        onCreateDoubt={async (titulo, tiempo) => {
                          try {
                            await apiService.crearTema({ titulo, video_id: video.id, timestamp: tiempo });
                            setMensajeExito('Duda creada en el foro');
                          } catch (err) {
                            setMensajeError(err.message || 'No se pudo crear la duda');
                          }
                        }}
                      />
                    </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

  function VideoPlayer({ video, url, onCreateDoubt, registerRef }) {
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
    }, []);

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

    const handleCreateDoubt = async () => {
      if (!refVideo.current) return;
      const tiempo = Math.floor(refVideo.current.currentTime || 0);
      const titulo = window.prompt('Describe brevemente tu duda (se guardará el timestamp)', `Duda en ${tiempo}s sobre ${video.titulo}`);
      if (!titulo) return;
      await onCreateDoubt(titulo, tiempo);
    };

    return (
      <div className="mt-2">
        <video ref={refVideo} src={url} controls className="w-full rounded-md bg-black" onPlay={handlePlay} onPause={handlePause} onEnded={handlePause} />
        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm text-gray-500">{reproduciendo ? 'Reproduciendo' : 'Pausado'}</div>
          <div className="flex gap-2">
            <button onClick={handleCreateDoubt} className="rounded-md bg-utp-yellow px-3 py-1 text-sm font-semibold">Crear duda en este tiempo</button>
          </div>
        </div>
      </div>
    );
  }