import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SesionApi, TareaApi } from '../../core/api-models';
import { sesionDesdeApi, tareaDesdeApi } from '../../core/mappers';
import { Sesion, Tarea } from '../../core/models';
import { ahoraISO } from '../../core/util';

/**
 * Sesiones y tareas de servicio-academico. Las usan tanto el administrador como el docente
 * (el backend deja al docente tocar solo las de sus propias asignaciones).
 */
@Injectable({ providedIn: 'root' })
export class AcademicoService {
  private http = inject(HttpClient);
  private base = environment.academicoUrl;

  /* ------------------------------- sesiones ------------------------------- */

  sesiones(ofertaId?: number): Observable<Sesion[]> {
    const url = ofertaId != null ? `${this.base}/sesiones/asignacion/${ofertaId}` : `${this.base}/sesiones`;
    return this.http.get<SesionApi[]>(url).pipe(
      map((l) => l.map(sesionDesdeApi).sort((a, b) => a.ofertaId - b.ofertaId || a.numero - b.numero))
    );
  }

  /** El backend no numera: la nueva sesión toma el número siguiente al mayor de su curso. */
  crearSesion(s: { ofertaId: number; titulo: string; fecha: string; descripcion: string }): Observable<Sesion> {
    return this.sesiones(s.ofertaId).pipe(
      switchMap((existentes) => this.http.post<SesionApi>(`${this.base}/sesiones`, {
        idAsignacion: s.ofertaId,
        numeroSesion: Math.max(0, ...existentes.map((x) => x.numero)) + 1,
        titulo: s.titulo,
        descripcion: s.descripcion,
        fecha: s.fecha,
      })),
      map(sesionDesdeApi)
    );
  }

  /** PATCH: solo cambia lo enviado y no toca la asignación ni el resto de campos. */
  actualizarSesion(id: number, s: { titulo: string; fecha: string; descripcion: string; numero?: number }): Observable<Sesion> {
    const cuerpo: Record<string, string | number> = { titulo: s.titulo, fecha: s.fecha, descripcion: s.descripcion };
    if (s.numero != null) cuerpo['numeroSesion'] = s.numero;
    return this.http.patch<SesionApi>(`${this.base}/sesiones/${id}`, cuerpo).pipe(map(sesionDesdeApi));
  }

  eliminarSesion(id: number): Observable<void> {
    return this.http.delete(`${this.base}/sesiones/${id}`).pipe(map(() => undefined));
  }

  /* -------------------------------- tareas -------------------------------- */

  tareas(ofertaId?: number): Observable<Tarea[]> {
    const url = ofertaId != null ? `${this.base}/tareas/asignacion/${ofertaId}` : `${this.base}/tareas`;
    return this.http.get<TareaApi[]>(url).pipe(
      map((l) => l.map(tareaDesdeApi).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite)))
    );
  }

  tarea(id: number): Observable<Tarea> {
    return this.http.get<TareaApi>(`${this.base}/tareas/${id}`).pipe(map(tareaDesdeApi));
  }

  crearTarea(ofertaId: number, t: { titulo: string; descripcion: string; fechaLimite: string }): Observable<Tarea> {
    return this.http.post<TareaApi>(`${this.base}/tareas`, {
      idAsignacion: ofertaId,
      titulo: t.titulo,
      descripcion: t.descripcion,
      fechaPublicacion: ahoraISO(),
      fechaEntrega: t.fechaLimite,
    }).pipe(map(tareaDesdeApi));
  }

  /** PATCH: conserva la fecha de publicación original. */
  actualizarTarea(id: number, t: { titulo: string; descripcion: string; fechaLimite: string }): Observable<Tarea> {
    return this.http.patch<TareaApi>(`${this.base}/tareas/${id}`, {
      titulo: t.titulo, descripcion: t.descripcion, fechaEntrega: t.fechaLimite,
    }).pipe(map(tareaDesdeApi));
  }

  eliminarTarea(id: number): Observable<void> {
    return this.http.delete(`${this.base}/tareas/${id}`).pipe(map(() => undefined));
  }
}
