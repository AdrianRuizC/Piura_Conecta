const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { UPLOADS_DIR } = require('../config/env');

const directorioBase = path.resolve(__dirname, '..', UPLOADS_DIR);
const directorioVideos = path.join(directorioBase, 'videos');
const directorioMateriales = path.join(directorioBase, 'materiales');

for (const directorio of [directorioBase, directorioVideos, directorioMateriales]) {
  if (!fs.existsSync(directorio)) fs.mkdirSync(directorio, { recursive: true });
}

const generarNombreArchivo = (_peticion, archivo, callback) => {
  const sufijoUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  callback(null, `${sufijoUnico}${path.extname(archivo.originalname)}`);
};

const crearAlmacenamiento = (subdirectorio) =>
  multer.diskStorage({
    destination: (_peticion, _archivo, callback) => callback(null, path.join(directorioBase, subdirectorio)),
    filename: generarNombreArchivo
  });

const cargaVideos = multer({ storage: crearAlmacenamiento('videos') });
const cargaMateriales = multer({ storage: crearAlmacenamiento('materiales') });

module.exports = {
  directorioBase,
  directorioVideos,
  directorioMateriales,
  cargaVideos,
  cargaMateriales
};
