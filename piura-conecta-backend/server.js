require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT, CORS_ORIGIN } = require('./config/env');
const { registrarRutas } = require('./routes');

const aplicacion = express();

const corsOrigins = CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((valor) => valor.trim()).filter(Boolean);
aplicacion.use(cors({ origin: corsOrigins }));
aplicacion.use(express.json());
aplicacion.use('/media', express.static(path.join(__dirname, 'uploads')));

registrarRutas(aplicacion);

const iniciarServidor = () => {
  return aplicacion.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor backend operando en puerto ${PORT}`);
  });
};

if (require.main === module) {
  iniciarServidor();
}

module.exports = { aplicacion, iniciarServidor };
