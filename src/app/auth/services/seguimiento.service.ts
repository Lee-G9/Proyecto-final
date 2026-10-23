import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

import {
  CalificacionApi,
  CursoAlumnoApi,
  MatriculaApi,
} from '../../core/api-models';

import {
  calificacionDesdeApi,
  cursoAlumnoDesdeApi,
  matriculaDesdeApi,
} from '../../core/mappers';

import {
  Calificacion,
  CursoAlumno,
  Matricula,
} from '../../core/models';

@Injectable({
  providedIn: 'root',
})
export class SeguimientoService {

  private http = inject(HttpClient);
  private base = environment.seguimientoUrl;

  /* ============================== MATRÍCULAS ============================== */

  /** ADMINISTRADOR: lista todas las matrículas. */
  matriculas(): Observable<Matricula[]> {
    return this.http
      .get<MatriculaApi[]>(`${this.base}/matriculas`)
      .pipe(
        map((lista) =>
          lista.map(matriculaDesdeApi)
        )
      );
  }

  /** ADMINISTRADOR: obtiene una matrícula por ID. */
  matricula(id: number): Observable<Matricula> {
    return this.http
      .get<MatriculaApi>(
        `${this.base}/matriculas/${id}`
      )
      .pipe(
        map(matriculaDesdeApi)
      );
  }

  /** ADMINISTRADOR: lista las matrículas de un alumno. */
  matriculasPorAlumno(
    idAlumno: number
  ): Observable<Matricula[]> {

    return this.http
      .get<MatriculaApi[]>(
        `${this.base}/matriculas/alumno/${idAlumno}`
      )
      .pipe(
        map((lista) =>
          lista.map(matriculaDesdeApi)
        )
      );
  }

  /** DOCENTE: alumnos matriculados en una de sus asignaciones. */
  matriculasPorAsignacion(
    idAsignacion: number
  ): Observable<Matricula[]> {

    return this.http
      .get<MatriculaApi[]>(
        `${this.base}/matriculas/asignacion/${idAsignacion}`
      )
      .pipe(
        map((lista) =>
          lista.map(matriculaDesdeApi)
        )
      );
  }

  /** ALUMNO: matrículas del usuario autenticado. */
  misMatriculas(): Observable<Matricula[]> {

    return this.http
      .get<MatriculaApi[]>(
        `${this.base}/matriculas/mis-matriculas`
      )
      .pipe(
        map((lista) =>
          lista.map(matriculaDesdeApi)
        )
      );
  }

  /** ALUMNO: cursos, tareas y calificaciones del usuario autenticado. */
  misCursos(): Observable<CursoAlumno[]> {

    return this.http
      .get<CursoAlumnoApi[]>(
        `${this.base}/matriculas/mis-cursos`
      )
      .pipe(
        map((lista) =>
          lista.map(cursoAlumnoDesdeApi)
        )
      );
  }

  /** ADMINISTRADOR: registra una matrícula. */
  registrarMatricula(datos: {
    alumnoId: number;
    ofertaId: number;
    fechaMatricula: string;
  }): Observable<Matricula> {

    return this.http
      .post<MatriculaApi>(
        `${this.base}/matriculas`,
        {
          idAlumno: datos.alumnoId,
          idAsignacion: datos.ofertaId,
          fechaMatricula: datos.fechaMatricula,
        }
      )
      .pipe(
        map(matriculaDesdeApi)
      );
  }

  /** ADMINISTRADOR: actualiza completamente una matrícula. */
  actualizarMatricula(
    id: number,
    datos: {
      alumnoId: number;
      ofertaId: number;
      fechaMatricula: string;
    }
  ): Observable<Matricula> {

    return this.http
      .put<MatriculaApi>(
        `${this.base}/matriculas/${id}`,
        {
          idAlumno: datos.alumnoId,
          idAsignacion: datos.ofertaId,
          fechaMatricula: datos.fechaMatricula,
        }
      )
      .pipe(
        map(matriculaDesdeApi)
      );
  }

  /** ADMINISTRADOR: actualización parcial de una matrícula. */
  actualizarParcialMatricula(
    id: number,
    datos: {
      alumnoId?: number;
      ofertaId?: number;
      fechaMatricula?: string;
    }
  ): Observable<Matricula> {

    const cuerpo: Record<string, number | string> = {};

    if (datos.alumnoId !== undefined) {
      cuerpo['idAlumno'] = datos.alumnoId;
    }

    if (datos.ofertaId !== undefined) {
      cuerpo['idAsignacion'] = datos.ofertaId;
    }

    if (datos.fechaMatricula !== undefined) {
      cuerpo['fechaMatricula'] =
        datos.fechaMatricula;
    }

    return this.http
      .patch<MatriculaApi>(
        `${this.base}/matriculas/${id}`,
        cuerpo
      )
      .pipe(
        map(matriculaDesdeApi)
      );
  }

  /** ADMINISTRADOR: elimina una matrícula. */
  eliminarMatricula(
    id: number
  ): Observable<void> {

    return this.http
      .delete(
        `${this.base}/matriculas/${id}`
      )
      .pipe(
        map(() => undefined)
      );
  }

  /* ============================ CALIFICACIONES ============================ */

  /** ADMINISTRADOR: lista todas las calificaciones. */
  calificaciones(): Observable<Calificacion[]> {

    return this.http
      .get<CalificacionApi[]>(
        `${this.base}/calificaciones`
      )
      .pipe(
        map((lista) =>
          lista.map(calificacionDesdeApi)
        )
      );
  }

  /** ADMINISTRADOR: obtiene una calificación por ID. */
  calificacion(
    id: number
  ): Observable<Calificacion> {

    return this.http
      .get<CalificacionApi>(
        `${this.base}/calificaciones/${id}`
      )
      .pipe(
        map(calificacionDesdeApi)
      );
  }

  /** DOCENTE: calificaciones correspondientes a una matrícula. */
  calificacionesPorMatricula(
    idMatricula: number
  ): Observable<Calificacion[]> {

    return this.http
      .get<CalificacionApi[]>(
        `${this.base}/calificaciones/matricula/${idMatricula}`
      )
      .pipe(
        map((lista) =>
          lista.map(calificacionDesdeApi)
        )
      );
  }

  /** DOCENTE: calificaciones correspondientes a una tarea. */
  calificacionesPorTarea(
    idTarea: number
  ): Observable<Calificacion[]> {

    return this.http
      .get<CalificacionApi[]>(
        `${this.base}/calificaciones/tarea/${idTarea}`
      )
      .pipe(
        map((lista) =>
          lista.map(calificacionDesdeApi)
        )
      );
  }

  /** ALUMNO: calificaciones del usuario autenticado. */
  misCalificaciones(): Observable<Calificacion[]> {

    return this.http
      .get<CalificacionApi[]>(
        `${this.base}/calificaciones/mis-calificaciones`
      )
      .pipe(
        map((lista) =>
          lista.map(calificacionDesdeApi)
        )
      );
  }

  /** DOCENTE: registra una calificación. */
  registrarCalificacion(datos: {
    matriculaId: number;
    tareaId: number;
    nota: number;
    fechaRegistro: string;
  }): Observable<Calificacion> {

    return this.http
      .post<CalificacionApi>(
        `${this.base}/calificaciones`,
        {
          idMatricula: datos.matriculaId,
          idTarea: datos.tareaId,
          nota: datos.nota,
          fechaRegistro: datos.fechaRegistro,
        }
      )
      .pipe(
        map(calificacionDesdeApi)
      );
  }

  /** DOCENTE: actualiza completamente una calificación. */
  actualizarCalificacion(
    id: number,
    datos: {
      matriculaId: number;
      tareaId: number;
      nota: number;
      fechaRegistro: string;
    }
  ): Observable<Calificacion> {

    return this.http
      .put<CalificacionApi>(
        `${this.base}/calificaciones/${id}`,
        {
          idMatricula: datos.matriculaId,
          idTarea: datos.tareaId,
          nota: datos.nota,
          fechaRegistro: datos.fechaRegistro,
        }
      )
      .pipe(
        map(calificacionDesdeApi)
      );
  }

  /** DOCENTE: actualización parcial de una calificación. */
  actualizarParcialCalificacion(
    id: number,
    datos: {
      matriculaId?: number;
      tareaId?: number;
      nota?: number;
      fechaRegistro?: string;
    }
  ): Observable<Calificacion> {

    const cuerpo: Record<string, number | string> = {};

    if (datos.matriculaId !== undefined) {
      cuerpo['idMatricula'] =
        datos.matriculaId;
    }

    if (datos.tareaId !== undefined) {
      cuerpo['idTarea'] =
        datos.tareaId;
    }

    if (datos.nota !== undefined) {
      cuerpo['nota'] =
        datos.nota;
    }

    if (datos.fechaRegistro !== undefined) {
      cuerpo['fechaRegistro'] =
        datos.fechaRegistro;
    }

    return this.http
      .patch<CalificacionApi>(
        `${this.base}/calificaciones/${id}`,
        cuerpo
      )
      .pipe(
        map(calificacionDesdeApi)
      );
  }

  /** DOCENTE: elimina una calificación. */
  eliminarCalificacion(
    id: number
  ): Observable<void> {

    return this.http
      .delete(
        `${this.base}/calificaciones/${id}`
      )
      .pipe(
        map(() => undefined)
      );
  }
}
