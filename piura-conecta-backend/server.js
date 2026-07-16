require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server: IOServer } = require('socket.io');
const { PORT, CORS_ORIGIN } = require('./config/env');
const { registrarRutas } = require('./routes');

const aplicacion = express();

const corsOrigins = CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((valor) => valor.trim()).filter(Boolean);
aplicacion.use(cors({ origin: corsOrigins }));
aplicacion.use(express.json());
aplicacion.use('/media', express.static(path.join(__dirname, 'uploads')));

// HTTP + socket.io server
const httpServer = http.createServer(aplicacion);
const io = new IOServer(httpServer, { cors: { origin: corsOrigins } });

// Expose io to routes so they can emit events
registrarRutas(aplicacion, io);

const iniciarServidor = () => {
  return httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor backend operando en puerto ${PORT}`);
  });
};

if (require.main === module) {
  iniciarServidor();
}

module.exports = { aplicacion, iniciarServidor, io };
