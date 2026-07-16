export const URL_SERVIDOR = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const URL_API = `${URL_SERVIDOR}/api`;

const TOKEN_KEY = 'tokenPiura';
const USUARIO_KEY = 'usuarioPiura';

const getToken = () => localStorage.getItem(TOKEN_KEY) || null;
const setAuth = (token, usuario) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (usuario) localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
};
const clearAuth = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USUARIO_KEY); };

const obtenerRolUsuario = () => {
  try {
    const almacenamiento = localStorage.getItem(USUARIO_KEY);
    if (!almacenamiento) return 'estudiante';
    return JSON.parse(almacenamiento).rol || 'estudiante';
  } catch {
    return 'estudiante';
  }
};

const obtenerUsuario = () => {
  try {
    const almacenamiento = localStorage.getItem(USUARIO_KEY);
    if (!almacenamiento) return null;
    return JSON.parse(almacenamiento);
  } catch {
    return null;
  }
};

const obtenerEncabezados = (json = true) => {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // fallback para entornos legacy durante transición
  headers['x-rol'] = obtenerRolUsuario();
  return headers;
};

const obtenerEncabezadosMultipart = () => {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  headers['x-rol'] = obtenerRolUsuario();
  return headers;
};

export const apiService = {
  login: async (usuario, contrasena) => {
    const respuesta = await fetch(`${URL_API}/login`, {
      method: 'POST',
      headers: obtenerEncabezados(true),
      body: JSON.stringify({ usuario, contrasena })
    });

    if (!respuesta.ok) throw new Error('Credenciales institucionales inválidas');
    const cuerpo = await respuesta.json();
    // cuerpo: { token, user }
    if (cuerpo.token && cuerpo.user) {
      setAuth(cuerpo.token, cuerpo.user);
      return cuerpo.user;
    }
    return cuerpo;
  },

  obtenerCursos: async () => {
    const respuesta = await fetch(`${URL_API}/cursos`, { headers: obtenerEncabezados() });
    if (!respuesta.ok) throw new Error('Fallo al conectar con la base de datos');
    return respuesta.json();
  },

  crearCurso: async (data) => {
    const r = await fetch(`${URL_API}/cursos`, { method: 'POST', headers: obtenerEncabezados(), body: JSON.stringify(data) });
    if (!r.ok) {
      let c; try { c = await r.json(); } catch { c = await r.text(); }
      throw new Error(c?.error || String(c) || 'Error al crear curso');
    }
    return r.json();
  },

  asignarCurso: async (alumnoId, cursoId) => {
    const r = await fetch(`${URL_API}/usuarios/${alumnoId}/asignar-curso`, { method: 'POST', headers: obtenerEncabezados(), body: JSON.stringify({ curso_id: cursoId }) });
    if (!r.ok) {
      let c; try { c = await r.json(); } catch { c = await r.text(); }
      throw new Error(c?.error || String(c) || 'Error al asignar curso');
    }
    return r.json();
  },

  obtenerVideos: async () => {
    const respuesta = await fetch(`${URL_API}/videos`);
    if (!respuesta.ok) throw new Error('Fallo al cargar catálogo');
    return respuesta.json();
  },

  obtenerMateriales: async () => {
    const respuesta = await fetch(`${URL_API}/materiales`);
    if (!respuesta.ok) throw new Error('Fallo al cargar materiales');
    return respuesta.json();
  },

  subirVideo: async (formularioDatos) => {
    const respuesta = await fetch(`${URL_API}/videos`, {
      method: 'POST',
      headers: obtenerEncabezadosMultipart(),
      body: formularioDatos
    });
    if (!respuesta.ok) {
      let cuerpo;
      try { cuerpo = await respuesta.json(); } catch { cuerpo = await respuesta.text(); }
      throw new Error(cuerpo?.error || cuerpo?.message || String(cuerpo) || 'Error al enviar el archivo al servidor');
    }
    return respuesta.json();
  },

  subirMaterial: async (formularioDatos) => {
    const respuesta = await fetch(`${URL_API}/materiales`, {
      method: 'POST',
      headers: obtenerEncabezadosMultipart(),
      body: formularioDatos
    });
    if (!respuesta.ok) {
      let cuerpo;
      try { cuerpo = await respuesta.json(); } catch { cuerpo = await respuesta.text(); }
      throw new Error(cuerpo?.error || cuerpo?.message || String(cuerpo) || 'Error al enviar el archivo al servidor');
    }
    return respuesta.json();
  },

  eliminarVideo: async (idVideo) => {
    const respuesta = await fetch(`${URL_API}/videos/${idVideo}`, {
      method: 'DELETE',
      headers: obtenerEncabezados()
    });
    if (!respuesta.ok) {
      let cuerpo; try { cuerpo = await respuesta.json(); } catch { cuerpo = await respuesta.text(); }
      throw new Error(cuerpo?.error || cuerpo?.message || String(cuerpo) || 'Error al purgar el archivo');
    }
    return respuesta.json();
  }
  ,
  eliminarMaterial: async (idMaterial) => {
    const respuesta = await fetch(`${URL_API}/materiales/${idMaterial}`, {
      method: 'DELETE',
      headers: obtenerEncabezados()
    });
    if (!respuesta.ok) {
      let cuerpo; try { cuerpo = await respuesta.json(); } catch { cuerpo = await respuesta.text(); }
      throw new Error(cuerpo?.error || cuerpo?.message || String(cuerpo) || 'Error al purgar el archivo');
    }
    return respuesta.json();
  }
  ,
  // Exámenes
  obtenerExamenes: async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.curso_id) qs.set('curso_id', String(params.curso_id));
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const url = `${URL_API}/examenes${qs.toString() ? `?${qs.toString()}` : ''}`;
    const r = await fetch(url, { headers: obtenerEncabezados() });
    if (!r.ok) throw new Error('Fallo al cargar exámenes');
    const cuerpo = await r.json();
    // servidor devuelve { total, page, limit, items }
    return cuerpo.items || cuerpo;
  },

  obtenerExamen: async (id) => {
    const r = await fetch(`${URL_API}/examenes/${id}`, { headers: obtenerEncabezados() });
    if (!r.ok) throw new Error('Error al obtener examen');
    return r.json();
  },

  obtenerSubmissions: async (examenId, params = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const url = `${URL_API}/examenes/${examenId}/submissions${qs.toString() ? `?${qs.toString()}` : ''}`;
    const r = await fetch(url, { headers: obtenerEncabezados() });
    if (!r.ok) throw new Error('Error al listar envíos');
    return r.json();
  },

  obtenerMisSubmissions: async () => {
    const r = await fetch(`${URL_API}/mis-submissions`, { headers: obtenerEncabezados() });
    if (!r.ok) throw new Error('Error al obtener mis envíos');
    return r.json();
  },

  crearExamen: async (data) => {
    const respuesta = await fetch(`${URL_API}/examenes`, { method: 'POST', headers: obtenerEncabezados(), body: JSON.stringify(data) });
    if (!respuesta.ok) {
      let cuerpo; try { cuerpo = await respuesta.json(); } catch { cuerpo = await respuesta.text(); }
      throw new Error(cuerpo?.error || cuerpo?.message || String(cuerpo) || 'Error al crear examen');
    }
    return respuesta.json();
  },

  enviarExamen: async (examenId, opciones) => {
    // opciones: { respuestas } for quiz OR FormData with archivo for pdf
    if (opciones instanceof FormData) {
      const r = await fetch(`${URL_API}/examenes/${examenId}/submit`, { method: 'POST', headers: obtenerEncabezadosMultipart(), body: opciones });
      if (!r.ok) throw new Error('Error al enviar PDF');
      return r.json();
    }
    const r = await fetch(`${URL_API}/examenes/${examenId}/submit`, { method: 'POST', headers: obtenerEncabezados(), body: JSON.stringify(opciones) });
    if (!r.ok) {
      let c; try { c = await r.json(); } catch { c = await r.text(); }
      throw new Error(c?.error || String(c) || 'Error al enviar examen');
    }
    return r.json();
  },

  calificarSubmission: async (examenId, submissionId, calificacion) => {
    const r = await fetch(`${URL_API}/examenes/${examenId}/submissions/${submissionId}/grade`, { method: 'POST', headers: obtenerEncabezados(), body: JSON.stringify({ calificacion }) });
    if (!r.ok) throw new Error('Error al calificar');
    return r.json();
  },

  eliminarExamen: async (id) => {
    const r = await fetch(`${URL_API}/examenes/${id}`, { method: 'DELETE', headers: obtenerEncabezados() });
    if (!r.ok) throw new Error('Error al eliminar examen');
    return r.json();
  },

  // Foro
  obtenerForo: async () => {
    const respuesta = await fetch(`${URL_API}/foro`);
    if (!respuesta.ok) throw new Error('Fallo al cargar foro');
    return respuesta.json();
  },

  obtenerTema: async (id) => {
    const r = await fetch(`${URL_API}/foro/${id}`, { headers: obtenerEncabezados() });
    if (!r.ok) throw new Error('Error al obtener tema');
    return r.json();
  },

  crearRespuesta: async (temaId, data) => {
    const r = await fetch(`${URL_API}/foro/${temaId}/responder`, { method: 'POST', headers: obtenerEncabezados(), body: JSON.stringify(data) });
    if (!r.ok) {
      let cuerpo; try { cuerpo = await r.json(); } catch { cuerpo = await r.text(); }
      throw new Error(cuerpo?.error || String(cuerpo) || 'Error al crear respuesta');
    }
    return r.json();
  },

  obtenerUsuario,

  crearTema: async (data) => {
    const r = await fetch(`${URL_API}/foro`, { method: 'POST', headers: obtenerEncabezados(), body: JSON.stringify(data) });
    if (!r.ok) {
      let cuerpo; try { cuerpo = await r.json(); } catch { cuerpo = await r.text(); }
      throw new Error(cuerpo?.error || cuerpo?.message || String(cuerpo) || 'Error al crear tema');
    }
    return r.json();
  },

  postProgreso: async (video_id, tiempo_segundos) => {
    const r = await fetch(`${URL_API}/progreso`, { method: 'POST', headers: obtenerEncabezados(), body: JSON.stringify({ video_id, tiempo_segundos }) });
    if (!r.ok) {
      let cuerpo; try { cuerpo = await r.json(); } catch { cuerpo = await r.text(); }
      throw new Error(cuerpo?.error || String(cuerpo) || 'Error al enviar progreso');
    }
    return r.json();
  },

  eliminarTema: async (id) => {
    const r = await fetch(`${URL_API}/foro/${id}`, { method: 'DELETE', headers: obtenerEncabezados() });
    if (!r.ok) throw new Error('Error al eliminar tema');
    return r.json();
  },

  // Progreso
  obtenerProgreso: async () => {
    const respuesta = await fetch(`${URL_API}/progreso`);
    if (!respuesta.ok) throw new Error('Fallo al cargar progreso');
    return respuesta.json();
  },

  // Descargas
  obtenerDescargas: async () => {
    const respuesta = await fetch(`${URL_API}/descargas`);
    if (!respuesta.ok) throw new Error('Fallo al cargar descargas');
    return respuesta.json();
  }
  ,
  // Módulos dinámicos
  obtenerModulos: async () => {
    const r = await fetch(`${URL_API}/modulos`);
    if (!r.ok) throw new Error('Fallo al cargar módulos');
    return r.json();
  }
  ,
  // Usuarios (admin/profesor)
  obtenerUsuarios: async () => {
    const r = await fetch(`${URL_API}/usuarios`, { headers: obtenerEncabezados() });
    if (!r.ok) throw new Error('Error al listar usuarios');
    return r.json();
  },
  crearUsuario: async (data) => {
    const r = await fetch(`${URL_API}/usuarios`, { method: 'POST', headers: obtenerEncabezados(), body: JSON.stringify(data) });
    if (!r.ok) {
      let cuerpo; try { cuerpo = await r.json(); } catch { cuerpo = await r.text(); }
      throw new Error(cuerpo?.error || String(cuerpo) || 'Error al crear usuario');
    }
    return r.json();
  },
  eliminarUsuario: async (id) => {
    const r = await fetch(`${URL_API}/usuarios/${id}`, { method: 'DELETE', headers: obtenerEncabezados() });
    if (!r.ok) throw new Error('Error al eliminar usuario');
    return r.json();
  }
};