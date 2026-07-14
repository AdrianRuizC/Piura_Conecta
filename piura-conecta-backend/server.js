require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const aplicacion = express();
const puerto = process.env.PORT || 3000;

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'piuraconecta',
  password: process.env.DB_PASSWORD || 'adminpassword',
  port: Number(process.env.DB_PORT || 5432)
});

aplicacion.use(cors());
aplicacion.use(express.json());

const directorioVideos = path.join(__dirname, 'uploads', 'videos');
const directorioMateriales = path.join(__dirname, 'uploads', 'materiales');
if (!fs.existsSync(directorioVideos)) fs.mkdirSync(directorioVideos, { recursive: true });
if (!fs.existsSync(directorioMateriales)) fs.mkdirSync(directorioMateriales, { recursive: true });

const almacenamientoVideos = multer.diskStorage({
  destination: (_peticion, _archivo, callback) => callback(null, directorioVideos),
  filename: (_peticion, archivo, callback) => {
    const sufijoUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${sufijoUnico}${path.extname(archivo.originalname)}`);
  }
});

const almacenamientoMateriales = multer.diskStorage({
  destination: (_peticion, _archivo, callback) => callback(null, directorioMateriales),
  filename: (_peticion, archivo, callback) => {
    const sufijoUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${sufijoUnico}${path.extname(archivo.originalname)}`);
  }
});

const cargaVideos = multer({ storage: almacenamientoVideos });
const cargaMateriales = multer({ storage: almacenamientoMateriales });

const esRolControl = (rolUsuario) => rolUsuario === 'profesor' || rolUsuario === 'admin';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

const validarRolControl = (peticion, respuesta, siguiente) => {
  // Prefer token-based auth; fallback a header x-rol for compatibilidad
  const authHeader = peticion.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      peticion.user = payload;
      if (!esRolControl(payload.rol)) return respuesta.status(403).json({ error: 'No autorizado' });
      return siguiente();
    } catch (err) {
      console.error('JWT error', err.message);
      return respuesta.status(401).json({ error: 'Token inválido' });
    }
  }

  // Backwards compatibility: x-rol header (demo/dev only)
  const rolUsuario = peticion.headers['x-rol'];
  if (!esRolControl(rolUsuario)) {
    return respuesta.status(403).json({ error: 'No autorizado para modificar el sistema' });
  }
  siguiente();
};

// Verificar token si existe; no obliga a rol
const verificarToken = (peticion, respuesta, siguiente) => {
  const authHeader = peticion.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      peticion.user = payload;
    } catch (err) {
      // no hacer nada, dejamos sin user
      console.error('JWT opcional error', err.message);
    }
  }
  return siguiente();
};

aplicacion.use('/media', express.static(path.join(__dirname, 'uploads')));

aplicacion.get('/api/health', (_peticion, respuesta) => {
  respuesta.json({ estado: 'ok' });
});

aplicacion.post('/api/login', async (peticion, respuesta) => {
  try {
    const { usuario, contrasena } = peticion.body;
    let rows;
    try {
      const res = await pool.query('SELECT id, nombre_completo, rol, contrasena, tenant_id FROM usuarios WHERE usuario = $1', [usuario]);
      rows = res.rows;
    } catch (qerr) {
      if (qerr.code === '42703') {
        // columna tenant_id no existe en esquema antiguo
        const res2 = await pool.query('SELECT id, nombre_completo, rol, contrasena FROM usuarios WHERE usuario = $1', [usuario]);
        rows = res2.rows.map(r => ({ ...r, tenant_id: null }));
      } else throw qerr;
    }

    if (rows.length > 0) {
      const user = rows[0];
      const stored = String(user.contrasena || '');
      let valido = false;
      if (stored.startsWith('$2')) {
        valido = bcrypt.compareSync(contrasena, stored);
      } else {
        // legacy plaintext support: compare and upgrade to bcrypt
        valido = contrasena === stored;
        if (valido) {
          const nuevoHash = bcrypt.hashSync(contrasena, 10);
          await pool.query('UPDATE usuarios SET contrasena = $1 WHERE id = $2', [nuevoHash, user.id]);
        }
      }

      if (!valido) return respuesta.status(401).json({ error: 'Credenciales inválidas' });

      const payload = { id: user.id, rol: user.rol, tenant_id: user.tenant_id || null };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
      respuesta.json({ token, user: { id: user.id, nombre_completo: user.nombre_completo, rol: user.rol, tenant_id: user.tenant_id } });
    } else {
      respuesta.status(401).json({ error: 'Credenciales inválidas' });
    }
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error del servidor' });
  }
});

// --- Usuarios (gestión por profesor/admin) ---
aplicacion.get('/api/usuarios', validarRolControl, async (peticion, respuesta) => {
  try {
    const tenantId = (peticion.user && peticion.user.tenant_id) || (peticion.headers['x-tenant'] ? Number(peticion.headers['x-tenant']) : null);
    let rows;
    try {
      let consulta = 'SELECT id, nombre_completo, usuario, rol, tenant_id, creado_at FROM usuarios';
      const params = [];
      if (tenantId) {
        consulta += ' WHERE tenant_id = $1';
        params.push(tenantId);
      }
      consulta += ' ORDER BY id DESC';
      const res = await pool.query(consulta, params);
      rows = res.rows;
    } catch (qerr) {
      if (qerr.code === '42703') {
        // esquema antiguo sin tenant_id
        let consulta = 'SELECT id, nombre_completo, usuario, rol, creado_at FROM usuarios ORDER BY id DESC';
        const res2 = await pool.query(consulta);
        rows = res2.rows.map(r => ({ ...r, tenant_id: null }));
      } else throw qerr;
    }
    respuesta.json(rows);
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error al consultar usuarios' });
  }
});

aplicacion.post('/api/usuarios', validarRolControl, async (peticion, respuesta) => {
  try {
    const { nombre_completo, usuario, contrasena, rol } = peticion.body;
    const tenantId = (peticion.user && peticion.user.tenant_id) || (peticion.headers['x-tenant'] ? Number(peticion.headers['x-tenant']) : 1);
    if (!nombre_completo || !usuario || !contrasena || !rol) {
      return respuesta.status(400).json({ error: 'Faltan campos requeridos' });
    }
    const allowed = ['estudiante', 'profesor', 'admin'];
    const rolNorm = String(rol).toLowerCase().trim();
    if (!allowed.includes(rolNorm)) return respuesta.status(400).json({ error: 'Rol inválido' });
    const hash = bcrypt.hashSync(contrasena, 10);
    console.log('/api/usuarios -> crear', { usuario, rolNorm, tenantId });
    try {
      const consulta = 'INSERT INTO usuarios (nombre_completo, usuario, contrasena, rol, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre_completo, usuario, rol, tenant_id, creado_at';
      const { rows } = await pool.query(consulta, [nombre_completo, usuario, hash, rolNorm, tenantId]);
      respuesta.status(201).json(rows[0]);
    } catch (qerr) {
      if (qerr.code === '42703') {
        // columna tenant_id no existe; insertar sin tenant_id
        const consulta2 = 'INSERT INTO usuarios (nombre_completo, usuario, contrasena, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre_completo, usuario, rol, creado_at';
        const { rows } = await pool.query(consulta2, [nombre_completo, usuario, hash, rolNorm]);
        const u = rows[0];
        respuesta.status(201).json({ ...u, tenant_id: tenantId || null });
      } else {
        throw qerr;
      }
    }
  } catch (error) {
    console.error(error);
    if (error.code === '23505') { // unique_violation
      return respuesta.status(400).json({ error: 'El usuario ya existe' });
    }
    respuesta.status(500).json({ error: error.message || 'Error al crear usuario' });
  }
});

aplicacion.delete('/api/usuarios/:id', validarRolControl, async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;
    await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    respuesta.json({ mensaje: 'Usuario eliminado' });
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error al eliminar usuario' });
  }
});

aplicacion.get('/api/cursos', async (_peticion, respuesta) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cursos ORDER BY nombre ASC');
    respuesta.json(rows);
  } catch (error) {
    respuesta.status(500).json({ error: 'Error al consultar cursos' });
  }
});

aplicacion.get('/api/videos', async (_peticion, respuesta) => {
  try {
    const consulta = `
      SELECT v.id, v.titulo, v.ruta_archivo as archivo, c.nombre as curso, c.icono, c.color
      FROM videos v JOIN cursos c ON v.curso_id = c.id
      ORDER BY v.fecha_subida DESC
    `;
    const { rows } = await pool.query(consulta);
    respuesta.json(rows);
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error al consultar videos' });
  }
});

aplicacion.post('/api/videos', validarRolControl, cargaVideos.single('archivo'), async (peticion, respuesta) => {
  try {
    console.log('/api/videos -> body:', peticion.body);
    console.log('/api/videos -> file:', peticion.file && { originalname: peticion.file.originalname, mimetype: peticion.file.mimetype, size: peticion.file.size });
    const { titulo, curso_id } = peticion.body;
    if (!peticion.file) {
      return respuesta.status(400).json({ error: 'Falta archivo MP4' });
    }

    const rutaArchivo = `/media/videos/${peticion.file.filename}`;
    const consulta = 'INSERT INTO videos (titulo, curso_id, ruta_archivo) VALUES ($1, $2, $3) RETURNING *';
    const { rows } = await pool.query(consulta, [titulo, curso_id, rutaArchivo]);

    respuesta.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error al guardar el video' });
  }
});

// --- Materiales (PDF) ---
aplicacion.get('/api/materiales', async (_peticion, respuesta) => {
  try {
    const consulta = `
      SELECT m.id, m.titulo, m.ruta_archivo as archivo, c.nombre as curso
      FROM materiales m LEFT JOIN cursos c ON m.curso_id = c.id
      ORDER BY m.id DESC
    `;
    const { rows } = await pool.query(consulta);
    respuesta.json(rows);
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error al consultar materiales' });
  }
});

aplicacion.post('/api/materiales', validarRolControl, cargaMateriales.single('archivo'), async (peticion, respuesta) => {
  try {
    console.log('/api/materiales -> body:', peticion.body);
    console.log('/api/materiales -> file:', peticion.file && { originalname: peticion.file.originalname, mimetype: peticion.file.mimetype, size: peticion.file.size });
    const { titulo, curso_id } = peticion.body;
    if (!peticion.file) return respuesta.status(400).json({ error: 'Falta archivo PDF' });

    const rutaArchivo = `/media/materiales/${peticion.file.filename}`;
    const consulta = 'INSERT INTO materiales (titulo, curso_id, ruta_archivo) VALUES ($1, $2, $3) RETURNING *';
    const { rows } = await pool.query(consulta, [titulo, curso_id || null, rutaArchivo]);
    respuesta.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error al guardar material' });
  }
});

aplicacion.delete('/api/materiales/:id', validarRolControl, async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;
    const { rows } = await pool.query('SELECT ruta_archivo FROM materiales WHERE id = $1', [id]);

    if (rows.length > 0) {
      const rutaFisica = path.join(__dirname, rows[0].ruta_archivo.replace('/media', 'uploads'));
      if (fs.existsSync(rutaFisica)) fs.unlinkSync(rutaFisica);

      await pool.query('DELETE FROM materiales WHERE id = $1', [id]);
      respuesta.json({ mensaje: 'Material eliminado' });
    } else {
      respuesta.status(404).json({ error: 'No encontrado' });
    }
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error al eliminar' });
  }
});

aplicacion.delete('/api/videos/:id', validarRolControl, async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;
    const { rows } = await pool.query('SELECT ruta_archivo FROM videos WHERE id = $1', [id]);

    if (rows.length > 0) {
      const rutaFisica = path.join(__dirname, rows[0].ruta_archivo.replace('/media', 'uploads'));
      if (fs.existsSync(rutaFisica)) fs.unlinkSync(rutaFisica);

      await pool.query('DELETE FROM videos WHERE id = $1', [id]);
      respuesta.json({ mensaje: 'Eliminado de la red' });
    } else {
      respuesta.status(404).json({ error: 'No encontrado' });
    }
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error al eliminar' });
  }
});

// --- Foro ---
aplicacion.get('/api/foro', async (_peticion, respuesta) => {
  try {
    const { rows } = await pool.query('SELECT id, titulo, autor, fecha FROM foro ORDER BY id DESC');
    respuesta.json(rows);
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error al consultar foro' });
  }
});

aplicacion.post('/api/foro', validarRolControl, async (peticion, respuesta) => {
  try {
    const { titulo, autor } = peticion.body;
    const { rows } = await pool.query('INSERT INTO foro (titulo, autor) VALUES ($1, $2) RETURNING *', [titulo, autor || null]);
    respuesta.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error al crear tema' });
  }
});

aplicacion.delete('/api/foro/:id', validarRolControl, async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;
    await pool.query('DELETE FROM foro WHERE id = $1', [id]);
    respuesta.json({ mensaje: 'Tema eliminado' });
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error al eliminar tema' });
  }
});

// --- Progreso ---
aplicacion.get('/api/progreso', async (_peticion, respuesta) => {
  try {
    const { rows } = await pool.query('SELECT * FROM progreso ORDER BY usuario_id');
    respuesta.json(rows);
  } catch (error) {
    console.error(error);
    // Si la tabla no existe, devolver array vacío en lugar de 500
    respuesta.json([]);
  }
});

// --- Descargas (materiales) ---
aplicacion.get('/api/descargas', async (_peticion, respuesta) => {
  try {
    const { rows } = await pool.query('SELECT id, titulo, ruta_archivo as archivo FROM materiales ORDER BY id DESC');
    respuesta.json(rows);
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: error.message || 'Error al consultar descargas' });
  }
});

// Crear curso (admin) - cada curso pertenece a un tenant
aplicacion.post('/api/cursos', validarRolControl, async (peticion, respuesta) => {
  try {
    const rol = peticion.user && peticion.user.rol;
    if (rol !== 'admin') return respuesta.status(403).json({ error: 'No autorizado' });
    const { nombre, icono, color, tenant_id } = peticion.body;
    if (!nombre) return respuesta.status(400).json({ error: 'Falta nombre' });
    const t = tenant_id || (peticion.user && peticion.user.tenant_id) || 1;
    try {
      const { rows } = await pool.query('INSERT INTO cursos (nombre, icono, color, tenant_id) VALUES ($1, $2, $3, $4) RETURNING *', [nombre, icono || null, color || null, t]);
      respuesta.status(201).json(rows[0]);
    } catch (qerr) {
      if (qerr.code === '42703') {
        const { rows } = await pool.query('INSERT INTO cursos (nombre, icono, color) VALUES ($1, $2, $3) RETURNING *', [nombre, icono || null, color || null]);
        respuesta.status(201).json(rows[0]);
      } else throw qerr;
    }
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: 'Error al crear curso' });
  }
});

// Asignar curso a alumno (profesor/admin)
aplicacion.post('/api/usuarios/:id/asignar-curso', validarRolControl, async (peticion, respuesta) => {
  try {
    const actor = peticion.user;
    const { id } = peticion.params; // alumno id
    const { curso_id } = peticion.body;
    if (!curso_id) return respuesta.status(400).json({ error: 'Falta curso_id' });

    const alumnoRes = await pool.query('SELECT id, tenant_id FROM usuarios WHERE id = $1', [id]);
    if (alumnoRes.rows.length === 0) return respuesta.status(404).json({ error: 'Alumno no existe' });
    const alumno = alumnoRes.rows[0];

    let cursoRes;
    try {
      cursoRes = await pool.query('SELECT id, tenant_id FROM cursos WHERE id = $1', [curso_id]);
    } catch (qerr) {
      if (qerr.code === '42703') {
        cursoRes = await pool.query('SELECT id FROM cursos WHERE id = $1', [curso_id]);
      } else throw qerr;
    }
    if (cursoRes.rows.length === 0) return respuesta.status(404).json({ error: 'Curso no existe' });
    const curso = cursoRes.rows[0];

    const actorTenant = actor.tenant_id || null;
    if (actor.rol !== 'admin' && actor.rol !== 'profesor') return respuesta.status(403).json({ error: 'No autorizado' });
    if (actor.rol === 'profesor') {
      if (!actorTenant || (alumno.tenant_id && alumno.tenant_id !== actorTenant) || (curso.tenant_id && curso.tenant_id !== actorTenant)) {
        return respuesta.status(403).json({ error: 'Alumno o curso fuera de su comunidad' });
      }
    }

    await pool.query('INSERT INTO inscripciones (alumno_id, curso_id, tenant_id) VALUES ($1, $2, $3)', [id, curso_id, actorTenant]);
    respuesta.json({ ok: true });
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: 'Error al asignar curso' });
  }
});

// --- Módulos dinámicos para la UI ---
aplicacion.get('/api/modulos', (_peticion, respuesta) => {
  const modulos = [
    { id: 1, icono: '📚', titulo: 'Materiales', descripcion: 'Descarga de PDFs', ruta: '/materiales' },
    { id: 2, icono: '🎬', titulo: 'Videos', descripcion: 'Educación offline', ruta: '/videos' },
    { id: 3, icono: '📝', titulo: 'Exámenes', descripcion: 'Práctica local', ruta: '/examenes' },
    { id: 4, icono: '💬', titulo: 'Foro Local', descripcion: 'Consultas en red', ruta: '/foro' },
    { id: 5, icono: '📊', titulo: 'Progreso', descripcion: 'Avance personal', ruta: '/progreso' },
    { id: 6, icono: '📥', titulo: 'Descargas', descripcion: 'Gestor offline', ruta: '/descargas' }
  ];
  respuesta.json(modulos);
});

// --- Exámenes: creación, listado paginado, envíos y calificación ---
// Lista paginada: /api/examenes?curso_id=1&page=1&limit=10
aplicacion.get('/api/examenes', async (peticion, respuesta) => {
  try {
    const curso_id = peticion.query.curso_id ? Number(peticion.query.curso_id) : null;
    const page = Math.max(1, Number(peticion.query.page) || 1);
    const limit = Math.min(100, Number(peticion.query.limit) || 20);
    const offset = (page - 1) * limit;
    let base = 'SELECT id, titulo, tipo, contenido, curso_id, tenant_id, creado_at FROM examenes';
    const params = [];
    if (curso_id) {
      params.push(curso_id);
      base += ` WHERE curso_id = $${params.length}`;
    }
    const countRes = await pool.query(base.replace('SELECT id, titulo, tipo, contenido, curso_id, tenant_id, creado_at FROM', 'SELECT count(*)::int as total FROM'), params);
    params.push(limit, offset);
    const dataRes = await pool.query(`${base} ORDER BY creado_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`, params);
    respuesta.json({ total: countRes.rows[0].total, page, limit, items: dataRes.rows });
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: 'Error al listar examenes' });
  }
});

// Crear examen (profesor/admin)
aplicacion.post('/api/examenes', validarRolControl, async (peticion, respuesta) => {
  try {
    const usuario = peticion.user;
    const { titulo, tipo, contenido, curso_id, tenant_id } = peticion.body;
    if (!titulo || !tipo) return respuesta.status(400).json({ error: 'Falta titulo o tipo' });
    if (!['quiz', 'pdf'].includes(tipo)) return respuesta.status(400).json({ error: 'Tipo inválido' });
    const t = tenant_id || usuario.tenant_id || null;
    const { rows } = await pool.query('INSERT INTO examenes (titulo, tipo, contenido, curso_id, tenant_id) VALUES ($1,$2,$3,$4,$5) RETURNING *', [titulo, tipo, contenido ? JSON.stringify(contenido) : null, curso_id || null, t]);
    respuesta.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: 'Error al crear examen' });
  }
});

aplicacion.delete('/api/examenes/:id', validarRolControl, async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;
    await pool.query('DELETE FROM examenes WHERE id = $1', [id]);
    respuesta.json({ mensaje: 'Examen eliminado' });
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: 'Error al eliminar examen' });
  }
});

// Enviar respuestas o PDF para un examen
aplicacion.post('/api/examenes/:id/submit', verificarToken, cargaMateriales.single('archivo'), async (peticion, respuesta) => {
  try {
    const examenId = Number(peticion.params.id);
    const alumno = peticion.user || null; // peticion.user set if token provided via verificarToken
    const examenRes = await pool.query('SELECT id, tipo, contenido, tenant_id FROM examenes WHERE id = $1', [examenId]);
    if (examenRes.rows.length === 0) return respuesta.status(404).json({ error: 'Examen no existe' });
    const examen = examenRes.rows[0];

    if (examen.tipo === 'quiz') {
      const respuestasRaw = peticion.body.respuestas;
      const respuestas = typeof respuestasRaw === 'string' ? JSON.parse(respuestasRaw) : (respuestasRaw || {});
      // contenido expected to have preguntas: [{id, pregunta, opciones, correcta}]
      const preguntas = examen.contenido && examen.contenido.preguntas ? examen.contenido.preguntas : [];
      let correctas = 0;
      preguntas.forEach((p) => {
        const given = respuestas[p.id];
        if (given !== undefined && String(given) === String(p.correcta)) correctas++;
      });
      const score = preguntas.length ? Math.round((correctas / preguntas.length) * 100) : 0;
      const usuarioId = alumno ? alumno.id : (peticion.body.alumno_id ? Number(peticion.body.alumno_id) : null);
      await pool.query('INSERT INTO examen_submissions (examen_id, alumno_id, respuestas, calificacion, estado) VALUES ($1,$2,$3,$4,$5)', [examenId, usuarioId, JSON.stringify(respuestas), score, 'calificado']);
      return respuesta.json({ auto: true, score, total: preguntas.length });
    }

    // pdf submission: file should be uploaded
    let archivo = null;
    if (peticion.file) archivo = `/media/materiales/${peticion.file.filename}`;
    const usuarioId = alumno ? alumno.id : (peticion.body.alumno_id ? Number(peticion.body.alumno_id) : null);
    await pool.query('INSERT INTO examen_submissions (examen_id, alumno_id, archivo_pdf, estado) VALUES ($1,$2,$3,$4)', [examenId, usuarioId, archivo, 'pendiente']);
    respuesta.json({ ok: true, pendiente: true });
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: 'Error al enviar examen' });
  }
});

// Profesor califica una submission (solo profesor/admin)
aplicacion.post('/api/examenes/:examenId/submissions/:submissionId/grade', validarRolControl, async (peticion, respuesta) => {
  try {
    const { examenId, submissionId } = peticion.params;
    const { calificacion } = peticion.body;
    if (calificacion === undefined) return respuesta.status(400).json({ error: 'Falta calificacion' });
    await pool.query('UPDATE examen_submissions SET calificacion=$1, estado=$2 WHERE id=$3 AND examen_id=$4', [calificacion, 'calificado', Number(submissionId), Number(examenId)]);
    respuesta.json({ ok: true });
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: 'Error al calificar' });
  }
});

// Obtener examen por id
aplicacion.get('/api/examenes/:id', async (peticion, respuesta) => {
  try {
    const { id } = peticion.params;
    const { rows } = await pool.query('SELECT id, titulo, tipo, contenido, curso_id, tenant_id, creado_at FROM examenes WHERE id = $1', [id]);
    if (rows.length === 0) return respuesta.status(404).json({ error: 'No existe' });
    respuesta.json(rows[0]);
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: 'Error al obtener examen' });
  }
});

// Listar submissions de un examen (profesor/admin), paginado
aplicacion.get('/api/examenes/:id/submissions', validarRolControl, async (peticion, respuesta) => {
  try {
    const examenId = Number(peticion.params.id);
    const page = Math.max(1, Number(peticion.query.page) || 1);
    const limit = Math.min(100, Number(peticion.query.limit) || 20);
    const offset = (page - 1) * limit;
    const countRes = await pool.query('SELECT count(*)::int as total FROM examen_submissions WHERE examen_id = $1', [examenId]);
    const dataRes = await pool.query('SELECT id, examen_id, alumno_id, respuestas, archivo_pdf, calificacion, estado, creado_at FROM examen_submissions WHERE examen_id = $1 ORDER BY creado_at DESC LIMIT $2 OFFSET $3', [examenId, limit, offset]);
    respuesta.json({ total: countRes.rows[0].total, page, limit, items: dataRes.rows });
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: 'Error al listar submissions' });
  }
});

// Obtener mis submissions (alumno) - requiere token
aplicacion.get('/api/mis-submissions', verificarToken, async (peticion, respuesta) => {
  try {
    const usuario = peticion.user;
    if (!usuario || !usuario.id) return respuesta.status(401).json({ error: 'No autenticado' });
    const { rows } = await pool.query('SELECT id, examen_id, respuestas, archivo_pdf, calificacion, estado, creado_at FROM examen_submissions WHERE alumno_id = $1 ORDER BY creado_at DESC', [usuario.id]);
    respuesta.json(rows);
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: 'Error al obtener mis envíos' });
  }
});

// --- Métricas simples ---
aplicacion.post('/api/metrics', async (peticion, respuesta) => {
  try {
    const { key, inc } = peticion.body;
    if (!key) return respuesta.status(400).json({ error: 'Falta key' });
    const aumento = Number(inc || 1);
    await pool.query(
      `INSERT INTO metrics (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = metrics.value + $2`,
      [key, aumento]
    );
    respuesta.json({ ok: true });
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: 'Error al actualizar métricas' });
  }
});

aplicacion.get('/api/metrics', async (_peticion, respuesta) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM metrics');
    respuesta.json(rows.reduce((acc, r) => ((acc[r.key] = Number(r.value)), acc), {}));
  } catch (error) {
    console.error(error);
    respuesta.status(500).json({ error: 'Error al obtener métricas' });
  }
});

aplicacion.listen(puerto, '0.0.0.0', () => console.log(`🚀 Servidor backend operando en puerto ${puerto}`));