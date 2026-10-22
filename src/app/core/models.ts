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

/** Un curso dictado dentro de un periodo (curso + periodo + docente). */
export interface Oferta {
  id: number;
  cursoId: number;
  periodoId: number;
  docenteId: number | null;
  cursoCodigo: string;
  cursoNombre: string;
  periodoNombre: string;
  docenteNombre: string | null;
  totalAlumnos: number;
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

export interface SesionDocente extends Sesion {
  asistenciaRegistrada: boolean;
  presentes: number;
  registrados: number;
}

/** Alumno matriculado en una oferta (curso-periodo). */
export interface Matricula {
  id: number;
  alumnoId: number;
  alumnoNombre: string;
  ofertaId: number;
  cursoCodigo: string;
  cursoNombre: string;
  periodoId: number;
  periodoNombre: string;
  docenteNombre: string | null;
  notaFinal: number | null;
  observacion: string;
  promedioTareas: number | null;
}

export type EstadoAsistencia = 'PRESENTE' | 'TARDANZA' | 'FALTA' | 'JUSTIFICADO';

export interface FilaAsistencia {
  matriculaId: number;
  alumnoNombre: string;
  estado: EstadoAsistencia | null;
}

export interface TareaDocente {
  id: number;
  ofertaId: number;
  cursoNombre: string;
  titulo: string;
  descripcion: string;
  fechaLimite: string; // yyyy-MM-ddTHH:mm
  puntajeMax: number;
  totalAlumnos: number;
  totalEntregas: number;
  totalCalificadas: number;
}

export type EstadoTarea = 'PENDIENTE' | 'ENTREGADA' | 'CALIFICADA' | 'VENCIDA';

export interface FilaEntrega {
  matriculaId: number;
  alumnoId: number;
  alumnoNombre: string;
  entregaId: number | null;
  archivoNombre: string | null;
  archivoTamano: number | null;
  archivoUrl?: string | null;
  comentario: string | null;
  fechaEntrega: string | null;
  nota: number | null;
  retroalimentacion: string | null;
  estado: EstadoTarea;
}

export interface Entrega {
  id: number;
  archivoNombre: string;
  archivoTamano: number;
  archivoUrl?: string | null;
  comentario: string;
  fechaEntrega: string;
  nota: number | null;
  retroalimentacion: string;
}

export interface TareaAlumno {
  id: number;
  ofertaId: number;
  cursoCodigo: string;
  cursoNombre: string;
  titulo: string;
  descripcion: string;
  fechaLimite: string;
  puntajeMax: number;
  estado: EstadoTarea;
  entrega: Entrega | null;
}
