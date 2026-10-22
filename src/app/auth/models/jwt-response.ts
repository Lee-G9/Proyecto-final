export interface JwtResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  email: string;
  rol: 'ADMIN' | 'DOCENTE' | 'ALUMNO';
  nombres?: string;
  apellidos?: string;
}
