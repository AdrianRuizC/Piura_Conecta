import { useEffect, useState } from 'react';
import { apiService } from '../../servicios/api';

export default function Examenes({ rolUsuario }) {
  const [examenes, setExamenes] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const esRolControl = ['admin', 'profesor'].includes(rolUsuario);

  const [misEnvios, setMisEnvios] = useState([]);

  const cargarExamenes = async () => {
    try {
      const resp = await apiService.obtenerExamenes();
      setExamenes(resp || []);
    } catch (err) {
      console.error(err);
      setMensaje(err.message || 'No se pudieron cargar exámenes');
    }
  };

  const cargarMisEnvios = async () => {
    try {
      const rol = rolUsuario || (JSON.parse(localStorage.getItem('usuarioPiura')||'null')||{}).rol;
      if (rol && !['admin','profesor'].includes(rol)){
        const env = await apiService.obtenerMisSubmissions();
        setMisEnvios(env || []);
      }
    } catch (e) {
      setMisEnvios([]);
    }
  };

  useEffect(() => {
    cargarExamenes();
  }, []);

  useEffect(() => {
    cargarMisEnvios();
  }, [rolUsuario]);

  const [tipo, setTipo] = useState('quiz');
  const [preguntas, setPreguntas] = useState([]);

  const crear = async (e) => {
    e.preventDefault();
    if (!esRolControl) return setMensaje('No autorizado');
    if (!titulo.trim()) return setMensaje('Ingresa un título');
    if (tipo === 'quiz' && preguntas.length === 0) return setMensaje('Agrega al menos una pregunta al quiz');
    try {
      const contenido = tipo === 'quiz' ? { preguntas } : null;
      await apiService.crearExamen({ titulo: titulo.trim(), tipo, contenido });
      setTitulo(''); setPreguntas([]);
      setMensaje('Examen creado correctamente');
      cargarExamenes();
    } catch (err) { setMensaje(err.message || 'Error al crear'); }
  };

  const eliminar = async (id) => {
    if (!esRolControl) return setMensaje('No autorizado');
    if (!window.confirm('Eliminar examen?')) return;
    try {
      await apiService.eliminarExamen(id);
      setMensaje('Examen eliminado');
      cargarExamenes();
    } catch (err) { setMensaje(err.message || 'Error al eliminar'); }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <header className="mb-6">
        <h2 className="text-3xl font-extrabold text-utp-dark">Exámenes</h2>
        <p className="text-gray-600 mt-2">{esRolControl ? 'Crea y administra exámenes' : 'Consulta exámenes disponibles'}</p>
      </header>

      {mensaje && <div className="mb-4 text-sm text-red-600">{mensaje}</div>}

      {esRolControl && (
        <form onSubmit={crear} className="mb-6 space-y-3">
          <div className="flex gap-2">
            <input className="flex-1 rounded-xl border border-gray-200 p-2" value={titulo} onChange={(e)=>setTitulo(e.target.value)} placeholder="Título del examen" />
            <select className="rounded-xl border" value={tipo} onChange={(e)=>setTipo(e.target.value)}>
              <option value="quiz">Quiz (auto-califica)</option>
              <option value="pdf">PDF (profesor califica en clase)</option>
            </select>
            <button className="rounded-xl bg-utp-dark text-white px-4 py-2">Crear</button>
          </div>
          {tipo === 'quiz' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Preguntas (opciones separadas por coma, marque la opción correcta con su índice empezando en 0)</p>
              <QuestionBuilder preguntas={preguntas} onChange={setPreguntas} />
            </div>
          )}
        </form>
      )}

      {misEnvios.length > 0 && !esRolControl && (
        <section className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-xl font-semibold mb-3">Mis envíos recientes</h3>
          <div className="space-y-2">
            {misEnvios.map((s) => (
              <div key={s.id} className="rounded border p-3 bg-white">
                <p className="font-medium">Envío #{s.id} - examen {s.examen_id}</p>
                <p className="text-sm text-gray-600">Estado: {s.estado} - Calificación: {s.calificacion ?? 'Pendiente'}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="space-y-3">
        {examenes.length === 0 ? <p className="text-sm text-gray-500">No hay exámenes.</p> : (
          examenes.map((ex) => (
            <ExamItem key={ex.id} examen={ex} esRolControl={esRolControl} onEliminar={eliminar} onEnvio={cargarMisEnvios} />
          ))
        )}
      </div>
    </div>
  );
}

function ExamItem({ examen, esRolControl, onEliminar, onEnvio }){
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [respuestas, setRespuestas] = useState({});
  const [archivo, setArchivo] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const cargarSubmissions = async () => {
    try {
      const r = await apiService.obtenerSubmissions(examen.id);
      setSubmissions(r.items || r);
    } catch (err) { console.error(err); }
  };

  const enviar = async () => {
    try {
      if (examen.tipo === 'quiz'){
        const resp = await apiService.enviarExamen(examen.id, { respuestas });
        setMensaje(`Auto-calificado: ${resp.score}/${resp.total}`);
      } else {
        if (!archivo) return setMensaje('Adjunte un PDF');
        const fd = new FormData(); fd.append('archivo', archivo);
        await apiService.enviarExamen(examen.id, fd);
        setMensaje('Envío registrado, pendiente de calificación');
      }
      if (esRolControl) {
        cargarSubmissions();
      } else if (typeof onEnvio === 'function') {
        onEnvio();
      }
    } catch (err){ setMensaje(err.message || 'Error al enviar'); }
  };

  useEffect(()=>{ if (esRolControl && abierto) cargarSubmissions(); }, [esRolControl, abierto]);

  return (
    <div className="rounded border p-3">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-semibold">{examen.titulo}</p>
          <p className="text-sm text-gray-500">{examen.tipo}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setAbierto((s)=>!s)} className="text-utp-dark">{abierto? 'Cerrar':'Abrir'}</button>
          {esRolControl && <button onClick={()=>onEliminar(examen.id)} className="text-red-600">Eliminar</button>}
        </div>
      </div>
      {abierto && (
        <div className="mt-3">
          <div className="space-y-3">
            {examen.tipo === 'quiz' ? (
              <>
                {(examen.contenido && examen.contenido.preguntas || []).map((p, idx) => (
                  <div key={p.id} className="p-2 border rounded">
                    <p className="font-medium">{p.pregunta}</p>
                    <div className="space-x-2 mt-2">
                      {(p.opciones || []).map((op, i) => (
                        <label key={i} className="inline-flex items-center mr-3">
                          <input type="radio" name={`q-${p.id}`} onChange={()=>setRespuestas((s)=>({...s, [p.id]: i}))} />
                          <span className="ml-2">{op}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <button onClick={enviar} className="rounded bg-utp-dark text-white px-3 py-1">Enviar quiz</button>
                  {mensaje && <span className="text-sm text-green-600">{mensaje}</span>}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">Sube tu PDF para que el profesor lo revise en clase.</p>
                <input type="file" accept="application/pdf" onChange={(e)=>setArchivo(e.target.files[0])} />
                <div className="flex gap-2 mt-2">
                  <button onClick={enviar} className="rounded bg-utp-dark text-white px-3 py-1">Enviar PDF</button>
                  {mensaje && <span className="text-sm text-green-600">{mensaje}</span>}
                </div>
              </>
            )}

            {submissions && submissions.length>0 && (
              <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-3">
                <h4 className="font-semibold mb-2">Envíos recientes</h4>
                <div className="space-y-2">
                  {submissions.map((s) => (
                    <div key={s.id} className="rounded border bg-white p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-start">
                        <div>
                          <p className="font-medium">Alumno: {s.alumno_id}</p>
                          <p className="text-sm text-gray-600">Estado: {s.estado} · Calificación: {s.calificacion ?? 'Pendiente'}</p>
                        </div>
                        {(s.archivo_pdf) && (
                          <a className="text-utp-dark underline" href={s.archivo_pdf} target="_blank" rel="noreferrer">Ver PDF</a>
                        )}
                      </div>
                      {esRolControl && (
                        <GradeRow examen={examen} submission={s} onCalificado={cargarSubmissions} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionBuilder({ preguntas, onChange }){
  const [texto, setTexto] = useState('');
  const [opcionesTxt, setOpcionesTxt] = useState('');
  const [correcta, setCorrecta] = useState('0');

  const agregar = () => {
    if (!texto.trim()) return;
    const ops = opcionesTxt.split(',').map(s=>s.trim()).filter(Boolean);
    const id = Date.now();
    const nueva = { id, pregunta: texto.trim(), opciones: ops, correcta: Number(correcta) };
    onChange([...(preguntas||[]), nueva]);
    setTexto(''); setOpcionesTxt(''); setCorrecta('0');
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <input placeholder="Texto pregunta" value={texto} onChange={(e)=>setTexto(e.target.value)} className="p-2 border rounded md:col-span-2" />
        <input placeholder="Índice correcta" value={correcta} onChange={(e)=>setCorrecta(e.target.value)} className="p-2 border rounded" />
      </div>
      <input placeholder="Opciones separadas por coma" value={opcionesTxt} onChange={(e)=>setOpcionesTxt(e.target.value)} className="p-2 border rounded w-full" />
      <div className="flex gap-2"><button type="button" onClick={agregar} className="rounded bg-utp-dark text-white px-3 py-1">Agregar pregunta</button></div>
      <div className="space-y-1">
        {(preguntas||[]).map(p=> <div key={p.id} className="text-sm text-gray-700">• {p.pregunta} ({p.opciones.length} opciones)</div>)}
      </div>
    </div>
  );
}

function GradeRow({ examen, submission, onCalificado }) {
  const [nota, setNota] = useState(submission.calificacion ?? '');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  const calificar = async () => {
    if (nota === '') return setMensaje('Ingresa una nota');
    setGuardando(true);
    try {
      await apiService.calificarSubmission(examen.id, submission.id, Number(nota));
      setMensaje('Calificación guardada');
      onCalificado();
    } catch (err) {
      setMensaje(err.message || 'Error al calificar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-2 rounded border-t border-gray-200 pt-3">
      <label className="text-sm font-medium">Calificar envío</label>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="number"
          min="0"
          max="100"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className="w-24 rounded border px-2 py-1"
          placeholder="Nota"
        />
        <button disabled={guardando} onClick={calificar} className="rounded bg-utp-dark text-white px-3 py-1 disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar'}</button>
        {mensaje && <span className="text-sm text-gray-600">{mensaje}</span>}
      </div>
    </div>
  );
}
