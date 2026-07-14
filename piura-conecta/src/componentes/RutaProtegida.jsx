import { Navigate } from 'react-router-dom';

const USUARIO_KEY = 'usuarioPiura';

export default function RutaProtegida({ children, usuario, rolRequerido }) {
  const usuarioLocal = usuario || (() => {
    try {
      const raw = localStorage.getItem(USUARIO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  if (!usuarioLocal) return <Navigate to="/" replace />;

  if (rolRequerido === 'admin' && usuarioLocal.rol !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // permitir acceso a profesores y admins cuando se solicita 'profesor'
  if (rolRequerido === 'profesor' && !['profesor', 'admin'].includes(usuarioLocal.rol)) {
    return <Navigate to="/" replace />;
  }

  return children;
}