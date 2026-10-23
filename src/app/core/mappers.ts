import { normalizarRol } from '../auth/services/auth';
import { AsignacionApi,CalificacionApi , CursoApi, MatriculaApi , PeriodoApi, SesionApi, TareaApi, UsuarioApi, CursoAlumnoApi, TareaAlumnoApi } from './api-models';
import { Calificacion,Curso, Matricula, Oferta, Periodo, Sesion, Tarea, Usuario, CursoAlumno, TareaAlumno} from './models';


export function usuarioDesdeApi(u: UsuarioApi): Usuario {
  const rol = (u.roles ?? []).map((r) => normalizarRol(r.nombre)).find((r) => r !== null) ?? 'ALUMNO';
  return {
    id: u.idUsuario,
    username: u.nombreUsuario,
    nombres: u.nombres ?? '',
    apellidos: u.apellidos ?? '',
    email: u.correo ?? '',
    rol,
    activo: u.activo,
  };
}

export function periodoDesdeApi(p: PeriodoApi): Periodo {
  return { id: p.idPeriodo, nombre: p.nombre, fechaInicio: p.fechaInicio, fechaFin: p.fechaFin };
}

export function cursoDesdeApi(c: CursoApi): Curso {
  return { id: c.idCurso, codigo: c.codigo, nombre: c.nombre, descripcion: c.descripcion ?? '' };
}

/** Conteos y nombres que el backend no entrega en la asignación y se calculan aparte. */
export interface ExtrasOferta {
  docenteNombre?: string | null;
  totalSesiones?: number;
  totalTareas?: number;
}

/** Una asignación docente (curso + periodo + docente) es una "oferta" en el frontend. */
export function ofertaDesdeApi(a: AsignacionApi, extras: ExtrasOferta = {}): Oferta {
  return {
    id: a.idAsignacion,
    cursoId: a.curso.idCurso,
    periodoId: a.periodo.idPeriodo,
    docenteId: a.idDocente ?? null,
    cursoCodigo: a.curso.codigo,
    cursoNombre: a.curso.nombre,
    periodoNombre: a.periodo.nombre,
    docenteNombre: extras.docenteNombre ?? null,
    totalSesiones: extras.totalSesiones ?? 0,
    totalTareas: extras.totalTareas ?? 0,
  };
}

export function sesionDesdeApi(s: SesionApi): Sesion {
  return {
    id: s.idSesion,
    ofertaId: s.asignacionDocente.idAsignacion,
    numero: s.numeroSesion,
    titulo: s.titulo,
    fecha: s.fecha,
    descripcion: s.descripcion ?? '',
    cursoNombre: s.asignacionDocente.curso.nombre,
    periodoNombre: s.asignacionDocente.periodo.nombre,
  };
}

export function tareaDesdeApi(t: TareaApi): Tarea {
  return {
    id: t.idTarea,
    ofertaId: t.asignacionDocente.idAsignacion,
    cursoNombre: t.asignacionDocente.curso.nombre,
    titulo: t.titulo,
    descripcion: t.descripcion ?? '',
    fechaLimite: (t.fechaEntrega ?? '').slice(0, 16),
  };
}

export function matriculaDesdeApi(m: MatriculaApi): Matricula {
  return {
    id: m.idMatricula,
    alumnoId: m.idAlumno,
    ofertaId: m.idAsignacion,
    fechaMatricula: m.fechaMatricula,
    activo: m.activo,
  };
}

export function calificacionDesdeApi(c: CalificacionApi): Calificacion {
  return {
    id: c.idCalificacion,
    matriculaId: c.matricula.idMatricula,
    tareaId: c.idTarea,
    nota: c.nota,
    fechaRegistro: c.fechaRegistro,
    activo: c.activo,
  };


}

export function tareaAlumnoDesdeApi(
  tarea: TareaAlumnoApi
): TareaAlumno {
  return {
    id: tarea.idTarea,
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    fechaPublicacion: tarea.fechaPublicacion,
    fechaEntrega: tarea.fechaEntrega,
    calificacionId: tarea.idCalificacion,
    nota: tarea.nota,
    fechaRegistro: tarea.fechaRegistro,
  };
}

export function cursoAlumnoDesdeApi(
  curso: CursoAlumnoApi
): CursoAlumno {
  return {
    matriculaId: curso.idMatricula,
    ofertaId: curso.idAsignacion,
    fechaMatricula: curso.fechaMatricula,

    cursoId: curso.idCurso,
    codigo: curso.codigoCurso,
    nombre: curso.nombreCurso,
    descripcion: curso.descripcionCurso,

    periodoId: curso.idPeriodo,
    periodo: curso.periodo,
    fechaInicioPeriodo: curso.fechaInicioPeriodo,
    fechaFinPeriodo: curso.fechaFinPeriodo,

    tareas: curso.tareas.map(tareaAlumnoDesdeApi),
  };
}
