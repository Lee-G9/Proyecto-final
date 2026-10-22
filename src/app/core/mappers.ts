import { normalizarRol } from '../auth/services/auth';
import { AsignacionApi, CursoApi, PeriodoApi, SesionApi, TareaApi, UsuarioApi } from './api-models';
import { Curso, Oferta, Periodo, Sesion, Tarea, Usuario } from './models';

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
