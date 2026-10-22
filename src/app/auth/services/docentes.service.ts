import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadoAsistencia, Entrega, FilaAsistencia, FilaEntrega, Matricula, Oferta, SesionDocente, TareaDocente,
} from '../../core/models';

@Injectable({ providedIn: 'root' })
export class DocentesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/docente`;

  /** Cursos (curso-periodo) asignados al docente autenticado. */
  getCursosDocente(): Observable<Oferta[]> { return this.http.get<Oferta[]>(`${this.base}/cursos`); }
  getCurso(ofertaId: number): Observable<Oferta> { return this.http.get<Oferta>(`${this.base}/cursos/${ofertaId}`); }

  alumnos(ofertaId: number): Observable<Matricula[]> { return this.http.get<Matricula[]>(`${this.base}/cursos/${ofertaId}/alumnos`); }
  calificarAlumno(matriculaId: number, nota: number, observacion: string): Observable<Matricula> {
    return this.http.put<Matricula>(`${this.base}/matriculas/${matriculaId}/calificacion`, { nota, observacion });
  }

  sesiones(ofertaId: number): Observable<SesionDocente[]> { return this.http.get<SesionDocente[]>(`${this.base}/cursos/${ofertaId}/sesiones`); }
  asistencia(sesionId: number): Observable<FilaAsistencia[]> { return this.http.get<FilaAsistencia[]>(`${this.base}/sesiones/${sesionId}/asistencia`); }
  guardarAsistencia(sesionId: number, filas: { matriculaId: number; estado: EstadoAsistencia }[]): Observable<void> {
    return this.http.put<void>(`${this.base}/sesiones/${sesionId}/asistencia`, filas);
  }

  tareas(ofertaId: number): Observable<TareaDocente[]> { return this.http.get<TareaDocente[]>(`${this.base}/cursos/${ofertaId}/tareas`); }
  tarea(tareaId: number): Observable<TareaDocente> { return this.http.get<TareaDocente>(`${this.base}/tareas/${tareaId}`); }
  crearTarea(ofertaId: number, t: { titulo: string; descripcion: string; fechaLimite: string; puntajeMax: number }): Observable<TareaDocente> {
    return this.http.post<TareaDocente>(`${this.base}/cursos/${ofertaId}/tareas`, t);
  }
  entregas(tareaId: number): Observable<FilaEntrega[]> { return this.http.get<FilaEntrega[]>(`${this.base}/tareas/${tareaId}/entregas`); }
  /** El docente solo califica: no existe endpoint para modificar el contenido de una entrega. */
  calificarEntrega(entregaId: number, nota: number, retroalimentacion: string): Observable<Entrega> {
    return this.http.put<Entrega>(`${this.base}/entregas/${entregaId}/calificacion`, { nota, retroalimentacion });
  }
}
