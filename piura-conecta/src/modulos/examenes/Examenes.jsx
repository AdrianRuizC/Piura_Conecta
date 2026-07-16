import { useEffect, useRef, useState } from 'react';
import { apiService, URL_SERVIDOR } from '../../servicios/api';

const obtenerUrlRemota = (ruta) => {
  if (!ruta) return '';
  return ruta.startsWith('http') ? ruta : `${URL_SERVIDOR}${ruta}`;
};

const Alert = ({ tipo, texto }) => {
  if (!texto) return null;
  return (
    <div className={`rounded-3xl border px-4 py-3 text-sm ${tipo === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
      {texto}
    </div>
  );
};

const Badge = ({ tipo }) => {
  const classes = tipo === 'quiz' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${classes}`}>
      {tipo === 'quiz' ? 'Quiz' : 'PDF'}
    </span>
  );
};

const formatDate = (fecha) => {
  if (!fecha) return '';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(fecha));
};

export default function Examenes({ rolUsuario }) {
  const [examenes, setExamenes] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('quiz');
  const [preguntas, setPreguntas] = useState([]);
  const [mensaje, setMensaje] = useState(null);
  const [misEnvios, setMisEnvios] = useState([]);
  const [cargando, setCargando] = useState(false);

  const esRolControl = ['admin', 'profesor'].includes(rolUsuario);

  const mostrarMensaje = (texto, tipo = 'success') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 4000);
  };

  const cargarExamenes = async () => {
    setCargando(true);
    try {
      const resp = await apiService.obtenerExamenes();
      setExamenes(resp || []);
    } catch (err) {
      console.error(err);
      mostrarMensaje(err.message || 'No se pudieron cargar exámenes', 'error');
    } finally {
      setCargando(false);
    }
  };

  const cargarMisEnvios = async () => {
    if (esRolControl) return;
    try {
      const env = await apiService.obtenerMisSubmissions();
      setMisEnvios(env || []);
    } catch (err) {
      console.error(err);
      setMisEnvios([]);
    }
  };

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      setCargando(true);
      try {
        const resp = await apiService.obtenerExamenes();
        if (activo) setExamenes(resp || []);
      } catch (err) {
        console.error(err);
        if (activo) mostrarMensaje(err.message || 'No se pudieron cargar exámenes', 'error');
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargar();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      if (esRolControl) {
        if (activo) setMisEnvios([]);
        return;
      }
      try {
        const env = await apiService.obtenerMisSubmissions();
        if (activo) setMisEnvios(env || []);
      } catch (err) {
        console.error(err);
        if (activo) setMisEnvios([]);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [esRolControl]);

  const validarQuiz = () => {
    if (preguntas.length === 0) {
      mostrarMensaje('Agrega al menos una pregunta', 'error');
      return false;
    }

    for (const pregunta of preguntas) {
      if (!pregunta.pregunta || !pregunta.pregunta.trim()) {
        mostrarMensaje('Todas las preguntas deben tener texto', 'error');
        return false;
      }

      if (!Array.isArray(pregunta.opciones) || pregunta.opciones.length < 2) {
        mostrarMensaje('Cada pregunta necesita al menos dos opciones', 'error');
        return false;
      }

      if (pregunta.correcta === undefined || pregunta.correcta === null || Number.isNaN(Number(pregunta.correcta))) {
        mostrarMensaje('Marca la opción correcta en cada pregunta', 'error');
        return false;
      }

      if (pregunta.correcta < 0 || pregunta.correcta >= pregunta.opciones.length) {
        mostrarMensaje('La opción correcta debe ser un índice válido', 'error');
        return false;
      }
    }

    return true;
  };

  const crearExamen = async (e) => {
    e.preventDefault();
    if (!esRolControl) {
      mostrarMensaje('No estás autorizado para crear exámenes', 'error');
      return;
    }

    if (!titulo.trim()) {
      mostrarMensaje('Ingresa un título para el examen', 'error');
      return;
    }

    if (tipo === 'quiz' && !validarQuiz()) return;

    try {
      const contenido = tipo === 'quiz' ? { preguntas } : null;
      await apiService.crearExamen({ titulo: titulo.trim(), tipo, contenido });
      mostrarMensaje('Examen creado correctamente');
      setTitulo('');
      setTipo('quiz');
      setPreguntas([]);
      cargarExamenes();
    } catch (err) {
      console.error(err);
      mostrarMensaje(err.message || 'Error al crear examen', 'error');
    }
  };

  const eliminarExamen = async (id) => {
    if (!esRolControl) {
      mostrarMensaje('No autorizado', 'error');
      return;
    }
    if (!window.confirm('¿Eliminar este examen?')) return;
    try {
      await apiService.eliminarExamen(id);
      mostrarMensaje('Examen eliminado');
      setExamenes((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      mostrarMensaje(err.message || 'Error al eliminar examen', 'error');
    }
  };

  const examenesOrdenados = [...examenes].sort((a, b) => new Date(b.creado_at) - new Date(a.creado_at));

  return (
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      <header className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-utp-dark">Exámenes</h2>
            <p className="mt-2 text-gray-600">{esRolControl ? 'Administra exámenes y revisa envíos de estudiantes.' : 'Responde exámenes y revisa tus envíos recientes.'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-3xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Exámenes</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{examenes.length}</p>
            </div>
            {!esRolControl && (
              <div className="rounded-3xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Envíos</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{misEnvios.length}</p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mb-6">
        <Alert tipo={mensaje?.tipo} texto={mensaje?.texto} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <main className="space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Exámenes disponibles</h3>
                <p className="text-sm text-gray-500">Abre un examen para responderlo o revisar envíos.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-xs text-gray-600">
                {cargando ? 'Cargando...' : `${examenes.length} examen${examenes.length === 1 ? '' : 'es'}`}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {examenesOrdenados.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-500">No hay exámenes disponibles aún.</div>
              ) : (
                examenesOrdenados.map((examen) => (
                  <ExamItem
                    key={examen.id}
                    examen={examen}
                    esRolControl={esRolControl}
                    onEliminar={eliminarExamen}
                    onEnvio={cargarMisEnvios}
                  />
                ))
              )}
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          {esRolControl ? (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">Crear examen</h3>
              <p className="text-sm text-gray-500">Define un examen tipo quiz o PDF para tus estudiantes.</p>

              <form onSubmit={crearExamen} className="mt-5 space-y-4">
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Título</label>
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej. Examen de matemáticas"
                    className="w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-utp-dark focus:ring-2 focus:ring-utp-dark/20"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Tipo de examen</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-utp-dark focus:ring-2 focus:ring-utp-dark/20"
                  >
                    <option value="quiz">Quiz (auto-califica)</option>
                    <option value="pdf">PDF (profesor califica)</option>
                  </select>
                </div>

                {tipo === 'quiz' && (
                  <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-900">Preguntas</p>
                      <span className="text-xs text-gray-500">{preguntas.length} pregunta{preguntas.length === 1 ? '' : 's'}</span>
                    </div>
                    <QuestionBuilder preguntas={preguntas} onChange={setPreguntas} />
                  </div>
                )}

                <button type="submit" className="btn btn-dark w-full">
                  Crear examen
                </button>
              </form>
            </section>
          ) : (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">Tu historial</h3>
              <p className="text-sm text-gray-500">Revisa tus últimos envíos de examen.</p>
              <div className="mt-5 space-y-3">
                {misEnvios.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-500">Aún no has enviado ningún examen.</div>
                ) : (
                  misEnvios.slice(0, 5).map((envio) => (
                    <div key={envio.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                      <p className="font-semibold text-gray-900">Envío #{envio.id}</p>
                      <p className="text-sm text-gray-500">Examen {envio.examen_id}</p>
                      <p className="mt-2 text-sm text-gray-600">Estado: <span className="font-semibold text-gray-900">{envio.estado}</span></p>
                      <p className="text-sm text-gray-600">Calificación: {envio.calificacion ?? 'Pendiente'}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function ExamItem({ examen, esRolControl, onEliminar, onEnvio }) {
  const [abierto, setAbierto] = useState(false);
  const [respuestas, setRespuestas] = useState({});
  const [archivo, setArchivo] = useState(null);
  const [mensajeLocal, setMensajeLocal] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [cargandoSubs, setCargandoSubs] = useState(false);

  let contenido = examen.contenido || {};
  if (typeof contenido === 'string') {
    try {
      contenido = JSON.parse(contenido);
    } catch {
      contenido = {};
    }
  }
  const preguntas = contenido.preguntas || [];

  const cargarSubmissions = async () => {
    if (!esRolControl) return;
    setCargandoSubs(true);
    try {
      const resp = await apiService.obtenerSubmissions(examen.id);
      setSubmissions(resp.items || resp || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoSubs(false);
    }
  };

  useEffect(() => {
    if (!esRolControl || !abierto) return;
    let activo = true;
    const cargar = async () => {
      setCargandoSubs(true);
      try {
        const resp = await apiService.obtenerSubmissions(examen.id);
        if (activo) setSubmissions(resp.items || resp || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (activo) setCargandoSubs(false);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [esRolControl, abierto, examen.id]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type !== 'application/pdf') {
      setMensajeLocal({ tipo: 'error', texto: 'Solo se permiten archivos PDF.' });
      return;
    }
    setArchivo(file);
  };

  const handleRespuesta = (preguntaId, opcion) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: opcion }));
  };

  const enviar = async () => {
    setMensajeLocal(null);

    if (examen.tipo === 'quiz' && preguntas.length > 0 && Object.keys(respuestas).length !== preguntas.length) {
      setMensajeLocal({ tipo: 'error', texto: 'Completa todas las preguntas antes de enviar.' });
      return;
    }

    if (examen.tipo === 'pdf' && !archivo) {
      setMensajeLocal({ tipo: 'error', texto: 'Selecciona un PDF para enviar.' });
      return;
    }

    setGuardando(true);
    try {
      if (examen.tipo === 'quiz') {
        const resp = await apiService.enviarExamen(examen.id, { respuestas });
        setMensajeLocal({ tipo: 'success', texto: `Auto-calificado: ${resp.score}/${resp.total}` });
      } else {
        const fd = new FormData();
        fd.append('archivo', archivo);
        await apiService.enviarExamen(examen.id, fd);
        setMensajeLocal({ tipo: 'success', texto: 'PDF enviado correctamente. Está pendiente de revisión.' });
      }
      setArchivo(null);
      setRespuestas({});
      onEnvio?.();
    } catch (err) {
      console.error(err);
      setMensajeLocal({ tipo: 'error', texto: err.message || 'Error al enviar examen' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-semibold text-gray-900">{examen.titulo}</h4>
            <Badge tipo={examen.tipo} />
          </div>
          <p className="text-sm text-gray-500">Creado {formatDate(examen.creado_at)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAbierto((prev) => !prev)}
            className="btn btn-secondary"
          >
            {abierto ? 'Cerrar' : 'Ver examen'}
          </button>
          {esRolControl && (
            <button
              type="button"
              onClick={() => onEliminar(examen.id)}
              className="btn btn-danger btn-sm"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      {abierto && (
        <div className="mt-5 space-y-5 border-t border-gray-100 pt-5">
          {mensajeLocal && <Alert tipo={mensajeLocal.tipo} texto={mensajeLocal.texto} />}

          {examen.tipo === 'quiz' ? (
            preguntas.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-500">Este quiz no tiene preguntas configuradas.</div>
            ) : (
              preguntas.map((pregunta, index) => (
                <div key={pregunta.id ?? index} className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-gray-900">Pregunta {index + 1}</p>
                    <span className="text-xs text-gray-500">Correcta: {pregunta.correcta}</span>
                  </div>
                  <p className="mt-2 text-gray-700">{pregunta.pregunta}</p>
                  <div className="mt-4 space-y-3">
                    {pregunta.opciones.map((opcion, opcionIndex) => (
                      <label key={opcionIndex} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm hover:bg-gray-50">
                        <input
                          type="radio"
                          name={`pregunta-${pregunta.id ?? index}`}
                          checked={respuestas[pregunta.id] === opcionIndex}
                          onChange={() => handleRespuesta(pregunta.id, opcionIndex)}
                          className="h-4 w-4 text-utp-dark"
                        />
                        <span>{opcion}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">Sube tu respuesta en PDF</p>
              <p className="text-sm text-gray-500 mt-1">Este examen será enviado al profesor para revisión.</p>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="mt-4 w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
              />
              {archivo && <p className="mt-2 text-sm text-gray-600">Archivo listo: {archivo.name}</p>}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={enviar}
              disabled={guardando}
              className="btn btn-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {examen.tipo === 'quiz' ? 'Enviar respuestas' : 'Enviar PDF'}
            </button>
            {esRolControl && (
              <div className="rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                {cargandoSubs ? 'Cargando envíos...' : `${submissions.length} envío${submissions.length === 1 ? '' : 's'}`}
              </div>
            )}
          </div>

          {esRolControl && submissions.length > 0 && (
            <div className="space-y-3 rounded-3xl border border-gray-200 bg-gray-50 p-4">
              <h5 className="text-sm font-semibold text-gray-900">Submissions recientes</h5>
              {submissions.slice(0, 4).map((submission) => (
                <SubmissionRow key={submission.id} examenId={examen.id} submission={submission} onCalificado={cargarSubmissions} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionBuilder({ preguntas, onChange }) {
  const [texto, setTexto] = useState('');
  const [opcionesTxt, setOpcionesTxt] = useState('');
  const [correcta, setCorrecta] = useState('0');
  const [hint, setHint] = useState('');
  const idCounter = useRef(1);

  const agregarPregunta = () => {
    const textoPregunta = texto.trim();
    const opciones = opcionesTxt.split(',').map((op) => op.trim()).filter(Boolean);
    const indiceCorrecto = Number(correcta);

    if (!textoPregunta || opciones.length < 2 || Number.isNaN(indiceCorrecto) || indiceCorrecto < 0 || indiceCorrecto >= opciones.length) {
      return;
    }

    const nuevaPregunta = {
      id: `q-${idCounter.current}`,
      pregunta: textoPregunta,
      opciones,
      correcta: indiceCorrecto,
      hint: hint.trim() || undefined
    };
    idCounter.current += 1;

    onChange([...(preguntas || []), nuevaPregunta]);
    setTexto('');
    setOpcionesTxt('');
    setCorrecta('0');
    setHint('');
  };

  const eliminarPregunta = (id) => {
    onChange((preguntas || []).filter((pregunta) => pregunta.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder="Texto de la pregunta"
          className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-utp-dark focus:ring-2 focus:ring-utp-dark/20"
        />
        <input
          value={opcionesTxt}
          onChange={(e) => setOpcionesTxt(e.target.value)}
          placeholder="Opciones separadas por coma"
          className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-utp-dark focus:ring-2 focus:ring-utp-dark/20"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={correcta}
            onChange={(e) => setCorrecta(e.target.value)}
            placeholder="Índice correcta"
            className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-utp-dark focus:ring-2 focus:ring-utp-dark/20"
          />
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Sugerencia opcional"
            className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-utp-dark focus:ring-2 focus:ring-utp-dark/20"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={agregarPregunta}
        className="btn btn-dark"
      >
        Agregar pregunta
      </button>

      {(preguntas || []).length > 0 && (
        <div className="space-y-3">
          {(preguntas || []).map((pregunta, index) => (
            <div key={pregunta.id} className="rounded-3xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{index + 1}. {pregunta.pregunta}</p>
                  <p className="text-sm text-gray-500">Correcta: opción {pregunta.correcta}</p>
                  {pregunta.hint && <p className="text-sm text-gray-500">Hint: {pregunta.hint}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => eliminarPregunta(pregunta.id)}
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Eliminar
                </button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {pregunta.opciones.map((opcion, opcionIndex) => (
                  <div key={opcionIndex} className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <span className="font-semibold">{opcionIndex}.</span> {opcion}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionRow({ examenId, submission, onCalificado }) {
  const [nota, setNota] = useState(submission.calificacion ?? '');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  const calificar = async () => {
    if (nota === '') {
      setMensaje('Ingresa una calificación');
      return;
    }
    setGuardando(true);
    try {
      await apiService.calificarSubmission(examenId, submission.id, Number(nota));
      setMensaje('Calificación guardada');
      onCalificado?.();
    } catch (err) {
      console.error(err);
      setMensaje(err.message || 'Error al calificar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-gray-900">Envío #{submission.id}</p>
          <p className="text-sm text-gray-500">Alumno {submission.alumno_id}</p>
          <p className="text-sm text-gray-500">Estado: {submission.estado}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[auto_auto] sm:gap-3">
          <input
            type="number"
            min="0"
            max="100"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none"
            placeholder="Nota"
          />
          <button
            type="button"
            onClick={calificar}
            disabled={guardando}
            className="btn btn-dark disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Calificar'}
          </button>
        </div>
      </div>
      {submission.archivo_pdf && (
        <div className="mt-3 text-sm text-gray-500">
          Archivo: <a className="font-semibold text-utp-dark underline" href={obtenerUrlRemota(submission.archivo_pdf)} target="_blank" rel="noreferrer">Ver PDF</a>
        </div>
      )}
      {mensaje && <p className="mt-3 text-sm text-gray-600">{mensaje}</p>}
    </div>
  );
}
