/** Lo único que devuelve POST /api/v1/auth/login. */
export interface LoginResponse {
  token: string;
}

/** Sesión del usuario: se arma decodificando los claims del JWT (sub, idUsuario, roles). */
export interface JwtResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  rol: 'ADMIN' | 'DOCENTE' | 'ALUMNO';
  email?: string;
  nombres?: string;
  apellidos?: string;
}
