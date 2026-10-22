import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AsignacionApi, CursoApi, PeriodoApi, SesionApi, TareaApi, UsuarioApi } from '../../core/api-models';
import {
  cursoDesdeApi, ofertaDesdeApi, periodoDesdeApi, usuarioDesdeApi,
} from '../../core/mappers';
import {
  Curso, EdicionUsuario, NuevoUsuario, Oferta, Periodo, Rol, Sesion, Tarea, Usuario,
} from '../../core/models';
import { AcademicoService } from './academico.service';

const conflicto = (message: string) => new HttpErrorResponse({ status: 409, error: { message } });

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private academico = inject(AcademicoService);
  private usuariosUrl = environment.usuariosUrl;
  private academicoUrl = environment.academicoUrl;

  // Usuarios (servicio-usuarios): el backend lista todos y el frontend filtra por rol.
  private usuarios(rol: Rol): Observable<Usuario[]> {
    return this.http.get<UsuarioApi[]>(`${this.usuariosUrl}/usuarios`).pipe(
      map((l) => l.map(usuarioDesdeApi).filter((u) => u.rol === rol)
        .sort((a, b) => a.apellidos.localeCompare(b.apellidos)))
    );
  }
  private registrar(u: NuevoUsuario, rol: Rol): Observable<Usuario> {
    const cuerpo = {
      nombreUsuario: u.username, correo: u.email, contrasena: u.password,
      nombres: u.nombres, apellidos: u.apellidos, rol: rol === 'ADMIN' ? 'ADMINISTRADOR' : rol,
    };
    return this.http.post<UsuarioApi>(`${this.usuariosUrl}/usuarios/registro`, cuerpo).pipe(map(usuarioDesdeApi));
  }
  /** El PUT del backend siempre pisa el usuario con lo enviado, y ignora la contraseña si va vacía. */
  actualizarUsuario(id: number, u: EdicionUsuario): Observable<Usuario> {
    const cuerpo: Record<string, string> = {
      nombreUsuario: u.username, correo: u.email, nombres: u.nombres, apellidos: u.apellidos,
      rol: u.rol === 'ADMIN' ? 'ADMINISTRADOR' : u.rol,
    };
    if (u.password) cuerpo['contrasena'] = u.password;
    return this.http.put<UsuarioApi>(`${this.usuariosUrl}/usuarios/${id}`, cuerpo).pipe(map(usuarioDesdeApi));
  }
  eliminarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.usuariosUrl}/usuarios/${id}`);
  }
  docentes(): Observable<Usuario[]> { return this.usuarios('DOCENTE'); }
  alumnos(): Observable<Usuario[]> { return this.usuarios('ALUMNO'); }
  administradores(): Observable<Usuario[]> { return this.usuarios('ADMIN'); }
  registrarDocente(u: NuevoUsuario): Observable<Usuario> { return this.registrar(u, 'DOCENTE'); }
  registrarAlumno(u: NuevoUsuario): Observable<Usuario> { return this.registrar(u, 'ALUMNO'); }
  registrarAdministrador(u: NuevoUsuario): Observable<Usuario> { return this.registrar(u, 'ADMIN'); }

  // Periodos
  periodos(): Observable<Periodo[]> {
    return this.http.get<PeriodoApi[]>(`${this.academicoUrl}/periodos`).pipe(
      map((l) => l.map(periodoDesdeApi).sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)))
    );
  }
  crearPeriodo(p: Omit<Periodo, 'id'>): Observable<Periodo> {
    return this.http.post<PeriodoApi>(`${this.academicoUrl}/periodos`, p).pipe(map(periodoDesdeApi));
  }
  /** El PUT del backend pisa también `activo`: se envía siempre en true para no desactivar el registro. */
  actualizarPeriodo(id: number, p: Omit<Periodo, 'id'>): Observable<Periodo> {
    return this.http.put<PeriodoApi>(`${this.academicoUrl}/periodos/${id}`, { ...p, activo: true }).pipe(map(periodoDesdeApi));
  }
  /** El backend no valida: si el periodo tiene cursos asignados se bloquea aquí antes de borrar. */
  eliminarPeriodo(id: number): Observable<void> {
    return this.http.get<AsignacionApi[]>(`${this.academicoUrl}/asignaciones`).pipe(
      switchMap((a) => a.some((x) => x.periodo.idPeriodo === id)
        ? throwError(() => conflicto('No se puede eliminar: el periodo tiene cursos asignados. Quítalos primero en «Cursos por periodo».'))
        : this.http.delete(`${this.academicoUrl}/periodos/${id}`)),
      map(() => undefined)
    );
  }

  // Cursos
  cursos(): Observable<Curso[]> {
    return this.http.get<CursoApi[]>(`${this.academicoUrl}/cursos`).pipe(
      map((l) => l.map(cursoDesdeApi).sort((a, b) => a.codigo.localeCompare(b.codigo)))
    );
  }
  crearCurso(c: Omit<Curso, 'id'>): Observable<Curso> {
    return this.http.post<CursoApi>(`${this.academicoUrl}/cursos`, c).pipe(map(cursoDesdeApi));
  }
  /** El PUT del backend pisa también `activo`: se envía siempre en true para no desactivar el registro. */
  actualizarCurso(id: number, c: Omit<Curso, 'id'>): Observable<Curso> {
    return this.http.put<CursoApi>(`${this.academicoUrl}/cursos/${id}`, { ...c, activo: true }).pipe(map(cursoDesdeApi));
  }
  /** El backend no valida: si el curso está asignado a un periodo se bloquea aquí antes de borrar. */
  eliminarCurso(id: number): Observable<void> {
    return this.http.get<AsignacionApi[]>(`${this.academicoUrl}/asignaciones`).pipe(
      switchMap((a) => a.some((x) => x.curso.idCurso === id)
        ? throwError(() => conflicto('No se puede eliminar: el curso está asignado a un periodo. Quítalo primero en «Cursos por periodo».'))
        : this.http.delete(`${this.academicoUrl}/cursos/${id}`)),
      map(() => undefined)
    );
  }

  // Cursos dentro de un periodo (asignaciones docente). Nombres y conteos se arman uniendo varias consultas.
  ofertas(periodoId?: number, docenteId?: number): Observable<Oferta[]> {
    return forkJoin({
      a: this.http.get<AsignacionApi[]>(docenteId != null
        ? `${this.academicoUrl}/asignaciones/docente/${docenteId}`
        : `${this.academicoUrl}/asignaciones`),
      d: this.docentes(),
      s: this.http.get<SesionApi[]>(`${this.academicoUrl}/sesiones`),
      t: this.http.get<TareaApi[]>(`${this.academicoUrl}/tareas`),
    }).pipe(
      map(({ a, d, s, t }) => {
        const nombres = new Map(d.map((u) => [u.id, `${u.nombres} ${u.apellidos}`.trim()]));
        const contar = (l: { asignacionDocente: AsignacionApi }[], id: number) =>
          l.filter((x) => x.asignacionDocente.idAsignacion === id).length;
        return a
          .filter((x) => periodoId == null || x.periodo.idPeriodo === periodoId)
          .map((x) => ofertaDesdeApi(x, {
            docenteNombre: x.idDocente != null ? nombres.get(x.idDocente) ?? null : null,
            totalSesiones: contar(s, x.idAsignacion),
            totalTareas: contar(t, x.idAsignacion),
          }))
          .sort((x, y) => x.cursoNombre.localeCompare(y.cursoNombre));
      })
    );
  }
  private ofertaConDocente(a: AsignacionApi): Observable<Oferta> {
    return this.docentes().pipe(
      map((d) => {
        const doc = d.find((u) => u.id === a.idDocente);
        return ofertaDesdeApi(a, { docenteNombre: doc ? `${doc.nombres} ${doc.apellidos}`.trim() : null });
      })
    );
  }
  asignarCursoAPeriodo(cursoId: number, periodoId: number, docenteId: number | null): Observable<Oferta> {
    return this.http.post<AsignacionApi>(`${this.academicoUrl}/asignaciones`, {
      idCurso: cursoId, idPeriodo: periodoId, idDocente: docenteId,
    }).pipe(switchMap((a) => this.ofertaConDocente(a)));
  }
  /** Cambia curso, periodo y docente de una asignación (PUT reemplaza los tres). */
  actualizarOferta(ofertaId: number, d: { cursoId: number; periodoId: number; docenteId: number | null }): Observable<Oferta> {
    return this.http.put<AsignacionApi>(`${this.academicoUrl}/asignaciones/${ofertaId}`, {
      idCurso: d.cursoId, idPeriodo: d.periodoId, idDocente: d.docenteId,
    }).pipe(switchMap((a) => this.ofertaConDocente(a)));
  }
  asignarDocente(ofertaId: number, docenteId: number | null): Observable<Oferta> {
    const url = `${this.academicoUrl}/asignaciones/${ofertaId}`;
    // El PATCH del backend ignora idDocente = null, así que para quitar el docente se reemplaza la asignación completa.
    const actualizada$ = docenteId != null
      ? this.http.patch<AsignacionApi>(url, { idDocente: docenteId })
      : this.http.get<AsignacionApi>(url).pipe(
          switchMap((a) => this.http.put<AsignacionApi>(url, { idCurso: a.curso.idCurso, idPeriodo: a.periodo.idPeriodo, idDocente: null }))
        );
    return actualizada$.pipe(switchMap((a) => this.ofertaConDocente(a)));
  }
  /** El backend no borra en cascada: primero se eliminan las sesiones y tareas de la asignación. */
  quitarOferta(ofertaId: number): Observable<void> {
    return forkJoin({
      s: this.http.get<SesionApi[]>(`${this.academicoUrl}/sesiones/asignacion/${ofertaId}`),
      t: this.http.get<TareaApi[]>(`${this.academicoUrl}/tareas/asignacion/${ofertaId}`),
    }).pipe(
      switchMap(({ s, t }) => {
        const hijos = [
          ...s.map((x) => this.http.delete(`${this.academicoUrl}/sesiones/${x.idSesion}`)),
          ...t.map((x) => this.http.delete(`${this.academicoUrl}/tareas/${x.idTarea}`)),
        ];
        return hijos.length ? forkJoin(hijos) : of([]);
      }),
      switchMap(() => this.http.delete(`${this.academicoUrl}/asignaciones/${ofertaId}`)),
      map(() => undefined)
    );
  }

  // Sesiones y tareas: lógica compartida con el docente en AcademicoService.
  sesiones(ofertaId?: number): Observable<Sesion[]> { return this.academico.sesiones(ofertaId); }
  crearSesion(s: { ofertaId: number; titulo: string; fecha: string; descripcion: string }): Observable<Sesion> {
    return this.academico.crearSesion(s);
  }
  actualizarSesion(id: number, s: { titulo: string; fecha: string; descripcion: string; numero?: number }): Observable<Sesion> {
    return this.academico.actualizarSesion(id, s);
  }
  eliminarSesion(id: number): Observable<void> { return this.academico.eliminarSesion(id); }

  tareas(ofertaId?: number): Observable<Tarea[]> { return this.academico.tareas(ofertaId); }
  crearTarea(ofertaId: number, t: { titulo: string; descripcion: string; fechaLimite: string }): Observable<Tarea> {
    return this.academico.crearTarea(ofertaId, t);
  }
  actualizarTarea(id: number, t: { titulo: string; descripcion: string; fechaLimite: string }): Observable<Tarea> {
    return this.academico.actualizarTarea(id, t);
  }
  eliminarTarea(id: number): Observable<void> { return this.academico.eliminarTarea(id); }
}
