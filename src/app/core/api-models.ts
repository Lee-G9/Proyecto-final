/** Formas JSON que devuelven servicio-usuarios y servicio-academico (entidades JPA tal cual). */

export interface RolApi {
  idRol: number;
  nombre: string;
}

export interface UsuarioApi {
  idUsuario: number;
  nombreUsuario: string;
  correo: string | null;
  nombres: string | null;
  apellidos: string | null;
  roles: RolApi[];
  activo: boolean;
}

export interface CursoApi {
  idCurso: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface PeriodoApi {
  idPeriodo: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export interface AsignacionApi {
  idAsignacion: number;
  curso: CursoApi;
  periodo: PeriodoApi;
  idDocente: number | null;
  activo: boolean;
}

export interface SesionApi {
  idSesion: number;
  asignacionDocente: AsignacionApi;
  numeroSesion: number;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  activo: boolean;
}

export interface TareaApi {
  idTarea: number;
  asignacionDocente: AsignacionApi;
  titulo: string;
  descripcion: string | null;
  fechaPublicacion: string | null;
  fechaEntrega: string | null;
  activo: boolean;
}

export interface MatriculaApi {
  idMatricula: number;
  idAlumno: number;
  idAsignacion: number;
  fechaMatricula: string;
  activo: boolean;
}

export interface CalificacionApi {
  idCalificacion: number;
  matricula: MatriculaApi;
  idTarea: number;
  nota: number;
  fechaRegistro: string;
  activo: boolean;
}

export interface TareaAlumnoApi {
  idTarea: number;
  titulo: string;
  descripcion: string;
  fechaPublicacion: string;
  fechaEntrega: string;
  idCalificacion: number | null;
  nota: number | null;
  fechaRegistro: string | null;
}

export interface CursoAlumnoApi {
  idMatricula: number;
  idAsignacion: number;
  fechaMatricula: string;

  idCurso: number;
  codigoCurso: string;
  nombreCurso: string;
  descripcionCurso: string;

  idPeriodo: number;
  periodo: string;
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;

  tareas: TareaAlumnoApi[];
}
