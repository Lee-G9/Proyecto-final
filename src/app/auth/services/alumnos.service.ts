import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Matricula, Sesion, TareaAlumno } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class AlumnosService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/alumno`;

  /** Cursos en los que el alumno autenticado está matriculado (incluye nota final). */
  getCursosAlumno(): Observable<Matricula[]> { return this.http.get<Matricula[]>(`${this.base}/cursos`); }
  sesiones(ofertaId: number): Observable<Sesion[]> { return this.http.get<Sesion[]>(`${this.base}/cursos/${ofertaId}/sesiones`); }
  tareas(): Observable<TareaAlumno[]> { return this.http.get<TareaAlumno[]>(`${this.base}/tareas`); }

  subirTarea(tareaId: number, archivo: File, comentario: string): Observable<TareaAlumno> {
    const fd = new FormData();
    fd.append('archivo', archivo);
    fd.append('comentario', comentario);
    return this.http.post<TareaAlumno>(`${this.base}/tareas/${tareaId}/entrega`, fd);
  }
}
