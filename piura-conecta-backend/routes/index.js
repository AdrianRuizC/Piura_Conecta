const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { cargaVideos, cargaMateriales } = require('../utils/storage');
const { validarRolControl, verificarToken } = require('../middleware/auth');
const { JWT_SECRET } = require('../config/env');

const registrarRutas = (aplicacion, io = null) => {
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
          const res2 = await pool.query('SELECT id, nombre_completo, usuario, rol, creado_at FROM usuarios ORDER BY id DESC');
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
      try {
        const consulta = 'INSERT INTO usuarios (nombre_completo, usuario, contrasena, rol, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre_completo, usuario, rol, tenant_id, creado_at';
        const { rows } = await pool.query(consulta, [nombre_completo, usuario, hash, rolNorm, tenantId]);
        respuesta.status(201).json(rows[0]);
      } catch (qerr) {
        if (qerr.code === '42703') {
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
      if (error.code === '23505') return respuesta.status(400).json({ error: 'El usuario ya existe' });
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
      const { titulo, curso_id } = peticion.body;
      if (!peticion.file) return respuesta.status(400).json({ error: 'Falta archivo MP4' });
      const rutaArchivo = `/media/videos/${peticion.file.filename}`;
      const consulta = 'INSERT INTO videos (titulo, curso_id, ruta_archivo) VALUES ($1, $2, $3) RETURNING *';
      const { rows } = await pool.query(consulta, [titulo, curso_id, rutaArchivo]);
      respuesta.status(201).json(rows[0]);
    } catch (error) {
      console.error(error);
      respuesta.status(500).json({ error: error.message || 'Error al guardar el video' });
    }
  });

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
        const rutaFisica = path.join(__dirname, '..', 'uploads', rows[0].ruta_archivo.replace('/media', '').replace(/^\//, ''));
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
        const rutaFisica = path.join(__dirname, '..', 'uploads', rows[0].ruta_archivo.replace('/media', '').replace(/^\//, ''));
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

  aplicacion.get('/api/foro', async (_peticion, respuesta) => {
    try {
      let rows;
      try {
        const res = await pool.query('SELECT id, titulo, autor, fecha, video_id, timestamp FROM foro ORDER BY id DESC');
        rows = res.rows;
      } catch (qerr) {
        // fallback for older schema
        const res2 = await pool.query('SELECT id, titulo, autor, fecha FROM foro ORDER BY id DESC');
        rows = res2.rows.map(r => ({ ...r, video_id: null, timestamp: null }));
      }
      respuesta.json(rows);
    } catch (error) {
      console.error(error);
      respuesta.status(500).json({ error: error.message || 'Error al consultar foro' });
    }
  });

  // Obtener un tema con sus respuestas
  aplicacion.get('/api/foro/:id', async (peticion, respuesta) => {
    try {
      const { id } = peticion.params;
      const temaRes = await pool.query('SELECT id, titulo, autor, fecha, video_id, timestamp FROM foro WHERE id = $1', [id]);
      if (temaRes.rows.length === 0) return respuesta.status(404).json({ error: 'No encontrado' });
      const tema = temaRes.rows[0];
      let replies = [];
      try {
        const r = await pool.query('SELECT id, foro_id, autor, contenido, creado_at FROM foro_respuestas WHERE foro_id = $1 ORDER BY creado_at ASC', [id]);
        replies = r.rows;
      } catch (qerr) {
        // fallback: empty replies if table missing
        replies = [];
      }
      respuesta.json({ tema, replies });
    } catch (error) {
      console.error(error);
      respuesta.status(500).json({ error: 'Error al obtener tema' });
    }
  });

  aplicacion.post('/api/foro', verificarToken, async (peticion, respuesta) => {
    try {
      const { titulo, video_id, timestamp } = peticion.body;
      const autor = (peticion.user && peticion.user.nombre_completo) || peticion.body.autor || null;
      // try to store video context if schema supports it
      try {
        const { rows } = await pool.query('INSERT INTO foro (titulo, autor, video_id, timestamp) VALUES ($1, $2, $3, $4) RETURNING *', [titulo, autor || null, video_id || null, timestamp || null]);
        const created = rows[0];
        if (io) io.emit('foro:nuevo', created);
        return respuesta.status(201).json(created);
      } catch (qerr) {
        if (qerr.code === '42703') {
          const { rows } = await pool.query('INSERT INTO foro (titulo, autor) VALUES ($1, $2) RETURNING *', [titulo, autor || null]);
          const created = rows[0];
          const meta = { ...created, video_id: video_id || null, timestamp: timestamp || null };
          if (io) io.emit('foro:nuevo', meta);
          return respuesta.status(201).json(meta);
        }
        throw qerr;
      }
    } catch (error) {
      console.error(error);
      respuesta.status(500).json({ error: error.message || 'Error al crear tema' });
    }
  });

  // Responder un tema del foro y notificar via socket
  aplicacion.post('/api/foro/:id/responder', verificarToken, async (peticion, respuesta) => {
    try {
      const { id } = peticion.params;
      const { contenido } = peticion.body;
      const autor = (peticion.user && peticion.user.nombre_completo) || peticion.body.autor || null;
      try {
        const { rows } = await pool.query('INSERT INTO foro_respuestas (foro_id, autor, contenido) VALUES ($1,$2,$3) RETURNING *', [id, autor || null, contenido || null]);
        const created = rows[0];
        if (io) io.emit('foro:respuesta', { foroId: Number(id), respuesta: created });
        return respuesta.status(201).json(created);
      } catch (qerr) {
        if (qerr.code === '42P01' || qerr.code === '42703') {
          // fallback: store in generic foro_replies if schema different, or just return the content
          const created = { id: null, foro_id: Number(id), autor: autor || null, contenido: contenido || null, creado_at: new Date().toISOString() };
          if (io) io.emit('foro:respuesta', { foroId: Number(id), respuesta: created });
          return respuesta.status(201).json(created);
        }
        throw qerr;
      }
    } catch (error) {
      console.error(error);
      respuesta.status(500).json({ error: 'Error al crear respuesta' });
    }
  });

  aplicacion.delete('/api/foro/:id', verificarToken, async (peticion, respuesta) => {
    try {
      const { id } = peticion.params;
      // check ownership or role
      const temaRes = await pool.query('SELECT id, titulo, autor FROM foro WHERE id = $1', [id]);
      if (temaRes.rows.length === 0) return respuesta.status(404).json({ error: 'No encontrado' });
      const tema = temaRes.rows[0];
      const actor = peticion.user || null;
      const esControl = actor && (actor.rol === 'admin' || actor.rol === 'profesor');
      const esAutor = actor && tema.autor && String(tema.autor) === String(actor.nombre_completo);
      if (!esControl && !esAutor) return respuesta.status(403).json({ error: 'No autorizado' });
      await pool.query('DELETE FROM foro WHERE id = $1', [id]);
      respuesta.json({ mensaje: 'Tema eliminado' });
    } catch (error) {
      console.error(error);
      respuesta.status(500).json({ error: error.message || 'Error al eliminar tema' });
    }
  });

  aplicacion.get('/api/progreso', async (_peticion, respuesta) => {
    try {
      const { rows } = await pool.query('SELECT * FROM progreso ORDER BY usuario_id');
      respuesta.json(rows);
    } catch (error) {
      console.error(error);
      respuesta.json([]);
    }
  });

  aplicacion.get('/api/descargas', async (_peticion, respuesta) => {
    try {
      const { rows } = await pool.query('SELECT id, titulo, ruta_archivo as archivo FROM materiales ORDER BY id DESC');
      respuesta.json(rows);
    } catch (error) {
      console.error(error);
      respuesta.status(500).json({ error: error.message || 'Error al consultar descargas' });
    }
  });

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

  aplicacion.post('/api/usuarios/:id/asignar-curso', validarRolControl, async (peticion, respuesta) => {
    try {
      const actor = peticion.user;
      const { id } = peticion.params;
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
      const dataRes = await pool.query(`${base} ORDER BY creado_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
      respuesta.json({ total: countRes.rows[0].total, page, limit, items: dataRes.rows });
    } catch (error) {
      console.error(error);
      respuesta.status(500).json({ error: 'Error al listar examenes' });
    }
  });

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

  aplicacion.post('/api/examenes/:id/submit', verificarToken, cargaMateriales.single('archivo'), async (peticion, respuesta) => {
    try {
      const examenId = Number(peticion.params.id);
      const alumno = peticion.user || null;
      const examenRes = await pool.query('SELECT id, tipo, contenido, tenant_id FROM examenes WHERE id = $1', [examenId]);
      if (examenRes.rows.length === 0) return respuesta.status(404).json({ error: 'Examen no existe' });
      const examen = examenRes.rows[0];

      if (examen.tipo === 'quiz') {
        const respuestasRaw = peticion.body.respuestas;
        const respuestas = typeof respuestasRaw === 'string' ? JSON.parse(respuestasRaw) : (respuestasRaw || {});
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

  // Guardar progreso periódico (upsert)
  aplicacion.post('/api/progreso', verificarToken, async (peticion, respuesta) => {
    try {
      const usuario = peticion.user;
      const { video_id, tiempo_segundos } = peticion.body;
      const usuarioId = usuario && usuario.id ? usuario.id : (peticion.body.usuario_id ? Number(peticion.body.usuario_id) : null);
      if (!usuarioId || !video_id) return respuesta.status(400).json({ error: 'Falta usuario o video_id' });

      try {
        await pool.query(
          `INSERT INTO progreso (usuario_id, video_id, tiempo_segundos, actualizado_at) VALUES ($1,$2,$3,now())
           ON CONFLICT (usuario_id, video_id) DO UPDATE SET tiempo_segundos = $3, actualizado_at = now()`
          , [usuarioId, video_id, Number(tiempo_segundos || 0)]
        );
        return respuesta.json({ ok: true });
      } catch (qerr) {
        if (qerr.code === '42703' || qerr.code === '42P01') {
          await pool.query('INSERT INTO progreso (usuario_id, video_id, tiempo_segundos) VALUES ($1,$2,$3)', [usuarioId, video_id, Number(tiempo_segundos || 0)]);
          return respuesta.json({ ok: true });
        }
        throw qerr;
      }
    } catch (error) {
      console.error(error);
      respuesta.status(500).json({ error: 'Error al guardar progreso' });
    }
  });

  // Crear attempt parcial para examen
  aplicacion.post('/api/examenes/:id/attempts', verificarToken, async (peticion, respuesta) => {
    try {
      const examenId = Number(peticion.params.id);
      const usuario = peticion.user || null;
      const usuarioId = usuario ? usuario.id : (peticion.body.alumno_id ? Number(peticion.body.alumno_id) : null);
      if (!usuarioId) return respuesta.status(401).json({ error: 'No autenticado' });
      const { rows } = await pool.query('INSERT INTO examen_submissions (examen_id, alumno_id, respuestas, estado, creado_at) VALUES ($1,$2,$3,$4,now()) RETURNING id', [examenId, usuarioId, JSON.stringify({}), 'en_progreso']);
      respuesta.status(201).json({ submissionId: rows[0].id });
    } catch (error) {
      console.error(error);
      respuesta.status(500).json({ error: 'Error al iniciar attempt' });
    }
  });

  // Responder una pregunta dentro de un attempt (validación por pregunta)
  aplicacion.post('/api/examenes/:id/attempts/:submissionId/question/:questionId', verificarToken, async (peticion, respuesta) => {
    try {
      const examenId = Number(peticion.params.id);
      const submissionId = Number(peticion.params.submissionId);
      const questionId = peticion.params.questionId;
      const { respuesta: answer } = peticion.body;

      const exRes = await pool.query('SELECT id, tipo, contenido FROM examenes WHERE id = $1', [examenId]);
      if (exRes.rows.length === 0) return respuesta.status(404).json({ error: 'Examen no existe' });
      const examen = exRes.rows[0];
      if (examen.tipo !== 'quiz') return respuesta.status(400).json({ error: 'No es un examen tipo quiz' });
      const contenido = typeof examen.contenido === 'string' ? JSON.parse(examen.contenido) : (examen.contenido || {});
      const preguntas = contenido.preguntas || [];
      const pregunta = preguntas.find(p => String(p.id) === String(questionId));
      if (!pregunta) return respuesta.status(404).json({ error: 'Pregunta no encontrada' });

      const correcta = pregunta.correcta;
      const esCorrecta = String(answer) === String(correcta);

      const subRes = await pool.query('SELECT id, respuestas FROM examen_submissions WHERE id = $1 AND examen_id = $2', [submissionId, examenId]);
      if (subRes.rows.length === 0) return respuesta.status(404).json({ error: 'Submission no encontrada' });
      let respuestas = {};
      try { respuestas = subRes.rows[0].respuestas ? JSON.parse(subRes.rows[0].respuestas) : {}; } catch (e) { respuestas = {}; }
      respuestas[questionId] = { given: answer, correct: esCorrecta };
      await pool.query('UPDATE examen_submissions SET respuestas = $1 WHERE id = $2', [JSON.stringify(respuestas), submissionId]);

      const hint = (!esCorrecta && pregunta.hint) ? pregunta.hint : null;
      return respuesta.json({ correct: esCorrecta, correcta, hint });
    } catch (error) {
      console.error(error);
      respuesta.status(500).json({ error: 'Error al validar pregunta' });
    }
  });

  // Métricas: racha de días seguidos y horas vistas
  aplicacion.get('/api/metrics/dashboard', async (peticion, respuesta) => {
    try {
      const usuarioId = peticion.query.user_id ? Number(peticion.query.user_id) : (peticion.user && peticion.user.id) || null;
      if (!usuarioId) return respuesta.status(400).json({ error: 'Falta user_id' });

      const diasRes = await pool.query(`SELECT DISTINCT date_trunc('day', coalesce(actualizado_at, creado_at, now()))::date as dia FROM progreso WHERE usuario_id = $1 ORDER BY dia DESC`, [usuarioId]);
      const dias = diasRes.rows.map(r => r.dia);
      let racha = 0;
      const hoy = new Date();
      const hoyYmd = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
      for (let i = 0; i < dias.length; i++) {
        const d = new Date(dias[i]);
        const expected = new Date(hoyYmd);
        expected.setUTCDate(hoyYmd.getUTCDate() - racha);
        if (d.toISOString().slice(0,10) === expected.toISOString().slice(0,10)) {
          racha++;
        } else break;
      }

      let tiempoTotalSec = 0;
      try {
        const tRes = await pool.query('SELECT sum(coalesce(tiempo_segundos,0))::int as total FROM progreso WHERE usuario_id = $1', [usuarioId]);
        tiempoTotalSec = Number((tRes.rows[0] && tRes.rows[0].total) || 0);
      } catch (err) {
        tiempoTotalSec = 0;
      }

      const horas = Math.round((tiempoTotalSec / 3600) * 100) / 100;
      respuesta.json({ streak_days: racha, hours_watched: horas });
    } catch (error) {
      console.error(error);
      respuesta.status(500).json({ error: 'Error al calcular métricas' });
    }
  });
};

module.exports = { registrarRutas };
