const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

const esRolControl = (rolUsuario) => rolUsuario === 'profesor' || rolUsuario === 'admin';

const validarRolControl = (peticion, respuesta, siguiente) => {
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

  const rolUsuario = peticion.headers['x-rol'];
  if (!esRolControl(rolUsuario)) {
    return respuesta.status(403).json({ error: 'No autorizado para modificar el sistema' });
  }
  siguiente();
};

const verificarToken = (peticion, respuesta, siguiente) => {
  const authHeader = peticion.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      peticion.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error('JWT opcional error', err.message);
    }
  }
  return siguiente();
};

module.exports = { esRolControl, validarRolControl, verificarToken };
