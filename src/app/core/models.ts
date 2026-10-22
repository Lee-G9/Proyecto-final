export type Rol = 'ADMIN' | 'DOCENTE' | 'ALUMNO';

export interface Usuario {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

export interface NuevoUsuario {
  username: string;
  password: string;
  nombres: string;
  apellidos: string;
  email: string;
}

/** Datos editables de un usuario; password vacío = no cambiar la contraseña. */
export interface EdicionUsuario {
  username: string;
  password: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: Rol;
}

export interface Periodo {
  id: number;
  nombre: string;
  fechaInicio: string; // yyyy-MM-dd
  fechaFin: string;
}

export interface Curso {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
}

/** Un curso dictado dentro de un periodo (curso + periodo + docente): la asignación docente del backend. */
export interface Oferta {
  id: number;
  cursoId: number;
  periodoId: number;
  docenteId: number | null;
  cursoCodigo: string;
  cursoNombre: string;
  periodoNombre: string;
  docenteNombre: string | null;
  totalSesiones: number;
  totalTareas: number;
}

export interface Sesion {
  id: number;
  ofertaId: number;
  numero: number;
  titulo: string;
  fecha: string; // yyyy-MM-dd
  descripcion: string;
  cursoNombre?: string;
  periodoNombre?: string;
}

export interface Tarea {
  id: number;
  ofertaId: number;
  cursoNombre: string;
  titulo: string;
  descripcion: string;
  fechaLimite: string; // yyyy-MM-ddTHH:mm
}
