import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Curso, Matricula, NuevoUsuario, Oferta, Periodo, Sesion, Usuario } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin`;

  // Usuarios
  docentes(): Observable<Usuario[]> { return this.http.get<Usuario[]>(`${this.base}/docentes`); }
  alumnos(): Observable<Usuario[]> { return this.http.get<Usuario[]>(`${this.base}/alumnos`); }
  registrarDocente(u: NuevoUsuario): Observable<Usuario> { return this.http.post<Usuario>(`${this.base}/docentes`, u); }
  registrarAlumno(u: NuevoUsuario): Observable<Usuario> { return this.http.post<Usuario>(`${this.base}/alumnos`, u); }

  // Periodos
  periodos(): Observable<Periodo[]> { return this.http.get<Periodo[]>(`${this.base}/periodos`); }
  crearPeriodo(p: Omit<Periodo, 'id'>): Observable<Periodo> { return this.http.post<Periodo>(`${this.base}/periodos`, p); }

  // Cursos
  cursos(): Observable<Curso[]> { return this.http.get<Curso[]>(`${this.base}/cursos`); }
  crearCurso(c: Omit<Curso, 'id'>): Observable<Curso> { return this.http.post<Curso>(`${this.base}/cursos`, c); }

  // Cursos dentro de un periodo (con docente asignado)
  ofertas(periodoId?: number): Observable<Oferta[]> {
    let params = new HttpParams();
    if (periodoId != null) params = params.set('periodoId', periodoId);
    return this.http.get<Oferta[]>(`${this.base}/ofertas`, { params });
  }
  asignarCursoAPeriodo(cursoId: number, periodoId: number, docenteId: number | null): Observable<Oferta> {
    return this.http.post<Oferta>(`${this.base}/ofertas`, { cursoId, periodoId, docenteId });
  }
  asignarDocente(ofertaId: number, docenteId: number | null): Observable<Oferta> {
    return this.http.put<Oferta>(`${this.base}/ofertas/${ofertaId}/docente`, { docenteId });
  }
  quitarOferta(ofertaId: number): Observable<void> { return this.http.delete<void>(`${this.base}/ofertas/${ofertaId}`); }

  // Sesiones
  sesiones(ofertaId?: number): Observable<Sesion[]> {
    let params = new HttpParams();
    if (ofertaId != null) params = params.set('ofertaId', ofertaId);
    return this.http.get<Sesion[]>(`${this.base}/sesiones`, { params });
  }
  crearSesion(s: { ofertaId: number; titulo: string; fecha: string; descripcion: string }): Observable<Sesion> {
    return this.http.post<Sesion>(`${this.base}/sesiones`, s);
  }

  // Matrículas (alumnos en curso-periodo)
  matriculas(filtro: { ofertaId?: number; periodoId?: number } = {}): Observable<Matricula[]> {
    let params = new HttpParams();
    if (filtro.ofertaId != null) params = params.set('ofertaId', filtro.ofertaId);
    if (filtro.periodoId != null) params = params.set('periodoId', filtro.periodoId);
    return this.http.get<Matricula[]>(`${this.base}/matriculas`, { params });
  }
  matricular(alumnoId: number, ofertaId: number): Observable<Matricula> {
    return this.http.post<Matricula>(`${this.base}/matriculas`, { alumnoId, ofertaId });
  }
  anularMatricula(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/matriculas/${id}`); }
}
