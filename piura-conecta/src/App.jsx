import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './modulos/auth/Login';
import PlantillaPrincipal from './plantillas/PlantillaPrincipal';
import Tablero from './modulos/tablero/Tablero';
import Videos from './modulos/videos/Videos';
import Materiales from './modulos/biblioteca/Materiales';
import Examenes from './modulos/examenes/Examenes';
import Foro from './modulos/foro/Foro';
import Progreso from './modulos/progreso/Progreso';
import Descargas from './modulos/descargas/Descargas';
import RutaProtegida from './componentes/RutaProtegida';
import Usuarios from './modulos/usuarios/Usuarios';

function App() {
  const [usuarioActual, setUsuarioActual] = useState(() => {
    const almacenamiento = localStorage.getItem('usuarioPiura');
    return almacenamiento ? JSON.parse(almacenamiento) : null;
  });

  const iniciarSesion = (usuario) => {
    localStorage.setItem('usuarioPiura', JSON.stringify(usuario));
    setUsuarioActual(usuario);
  };

  const cerrarSesion = () => {
    localStorage.removeItem('usuarioPiura');
    setUsuarioActual(null);
  };

  return (
    <BrowserRouter>
      {usuarioActual ? (
        <PlantillaPrincipal usuario={usuarioActual} alCerrarSesion={cerrarSesion}>
          <Routes>
            <Route path="/" element={<Tablero />} />
            <Route
              path="/videos"
              element={
                <RutaProtegida usuario={usuarioActual}>
                  <Videos rolUsuario={usuarioActual.rol} />
                </RutaProtegida>
              }
            />
            <Route
              path="/materiales"
              element={
                <RutaProtegida usuario={usuarioActual}>
                  <Materiales rolUsuario={usuarioActual.rol} />
                </RutaProtegida>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
            <Route
              path="/examenes"
              element={
                <RutaProtegida usuario={usuarioActual}>
                  <Examenes rolUsuario={usuarioActual.rol} />
                </RutaProtegida>
              }
            />
            <Route
              path="/foro"
              element={
                <RutaProtegida usuario={usuarioActual}>
                  <Foro rolUsuario={usuarioActual.rol} />
                </RutaProtegida>
              }
            />
            <Route
              path="/progreso"
              element={
                <RutaProtegida usuario={usuarioActual}>
                  <Progreso rolUsuario={usuarioActual.rol} />
                </RutaProtegida>
              }
            />
            <Route
              path="/usuarios"
              element={
                <RutaProtegida usuario={usuarioActual} rolRequerido="profesor">
                  <Usuarios />
                </RutaProtegida>
              }
            />
            <Route
              path="/descargas"
              element={
                <RutaProtegida usuario={usuarioActual}>
                  <Descargas rolUsuario={usuarioActual.rol} />
                </RutaProtegida>
              }
            />
          </Routes>
        </PlantillaPrincipal>
      ) : (
        <Routes>
          <Route path="/" element={<Login alIniciarSesion={iniciarSesion} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;