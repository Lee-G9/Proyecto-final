import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AsignacionApi, SesionApi, TareaApi } from '../../core/api-models';
import { ofertaDesdeApi } from '../../core/mappers';
import { Oferta, Sesion, Tarea } from '../../core/models';
import { AcademicoService } from './academico.service';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class DocentesService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private academico = inject(AcademicoService);
  private base = environment.academicoUrl;

  /** Cursos (asignaciones) del docente autenticado, con sus conteos de sesiones y tareas. */
  getCursosDocente(): Observable<Oferta[]> {
    return this.http.get<AsignacionApi[]>(`${this.base}/asignaciones/mis-asignaciones`).pipe(
      switchMap((asignaciones) => asignaciones.length
        ? forkJoin(asignaciones.map((a) => forkJoin({
            s: this.http.get<SesionApi[]>(`${this.base}/sesiones/asignacion/${a.idAsignacion}`),
            t: this.http.get<TareaApi[]>(`${this.base}/tareas/asignacion/${a.idAsignacion}`),
          }).pipe(map(({ s, t }) => ofertaDesdeApi(a, {
            docenteNombre: this.auth.nombreMostrar(), totalSesiones: s.length, totalTareas: t.length,
          })))))
        : of([] as Oferta[]))
    );
  }
  /** GET /asignaciones/{id} es solo de administrador, por eso se busca entre las del docente. */
  getCurso(ofertaId: number): Observable<Oferta> {
    return this.getCursosDocente().pipe(
      map((l) => {
        const o = l.find((x) => x.id === ofertaId);
        if (!o) throw new HttpErrorResponse({ status: 404, error: { message: 'Este curso no está asignado a tu usuario.' } });
        return o;
      })
    );
  }

  sesiones(ofertaId: number): Observable<Sesion[]> { return this.academico.sesiones(ofertaId); }
  crearSesion(ofertaId: number, s: { titulo: string; fecha: string; descripcion: string }): Observable<Sesion> {
    return this.academico.crearSesion({ ofertaId, ...s });
  }
  actualizarSesion(id: number, s: { titulo: string; fecha: string; descripcion: string; numero?: number }): Observable<Sesion> {
    return this.academico.actualizarSesion(id, s);
  }
  eliminarSesion(id: number): Observable<void> { return this.academico.eliminarSesion(id); }

  tareas(ofertaId: number): Observable<Tarea[]> { return this.academico.tareas(ofertaId); }
  crearTarea(ofertaId: number, t: { titulo: string; descripcion: string; fechaLimite: string }): Observable<Tarea> {
    return this.academico.crearTarea(ofertaId, t);
  }
  actualizarTarea(id: number, t: { titulo: string; descripcion: string; fechaLimite: string }): Observable<Tarea> {
    return this.academico.actualizarTarea(id, t);
  }
  eliminarTarea(id: number): Observable<void> { return this.academico.eliminarTarea(id); }
}
