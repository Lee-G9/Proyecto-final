import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AcademicoService } from './academico.service';
import { AdminService } from './admin.service';

describe('AcademicoService y AdminService (editar y eliminar)', () => {
  let academico: AcademicoService;
  let admin: AdminService;
  let http: HttpTestingController;
  const base = environment.academicoUrl;

  const curso = { idCurso: 3, codigo: 'MAT101', nombre: 'Matemática 1', descripcion: null, activo: true };
  const periodo = { idPeriodo: 2, nombre: '2026-II', fechaInicio: '2026-08-01', fechaFin: '2026-12-15', activo: true };
  const asignacion = (id: number, idDocente: number | null, c = curso, p = periodo) => ({ idAsignacion: id, curso: c, periodo: p, idDocente, activo: true });
  const sesionApi = (id: number, numero: number) => ({ idSesion: id, asignacionDocente: asignacion(11, 7), numeroSesion: numero, titulo: 'S', descripcion: null, fecha: '2026-09-01', activo: true });
  const tareaApi = (id: number) => ({ idTarea: id, asignacionDocente: asignacion(11, 7), titulo: 'T', descripcion: null, fechaPublicacion: '2026-09-01T10:00:00', fechaEntrega: '2026-10-01T23:59:00', activo: true });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    academico = TestBed.inject(AcademicoService);
    admin = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  /* ------------------------------ sesiones ------------------------------ */
  it('edita una sesión con PATCH y envía el número solo si se indica', () => {
    academico.actualizarSesion(5, { titulo: 'Nuevo', fecha: '2026-09-02', descripcion: '', numero: 4 }).subscribe();
    const req = http.expectOne({ method: 'PATCH', url: `${base}/sesiones/5` });
    expect(req.request.body).toEqual({ titulo: 'Nuevo', fecha: '2026-09-02', descripcion: '', numeroSesion: 4 });
    req.flush(sesionApi(5, 4));

    academico.actualizarSesion(5, { titulo: 'Nuevo', fecha: '2026-09-02', descripcion: '' }).subscribe();
    const sinNumero = http.expectOne({ method: 'PATCH', url: `${base}/sesiones/5` });
    expect('numeroSesion' in sinNumero.request.body).toBeFalse();
    sinNumero.flush(sesionApi(5, 4));
  });

  it('elimina una sesión con DELETE', () => {
    let listo = false;
    academico.eliminarSesion(5).subscribe(() => (listo = true));
    http.expectOne({ method: 'DELETE', url: `${base}/sesiones/5` }).flush({ mensaje: 'ok' });
    expect(listo).toBeTrue();
  });

  /* ------------------------------- tareas ------------------------------- */
  it('lista todas las tareas (admin) o las de una asignación', () => {
    let todas: any[] = [];
    academico.tareas().subscribe((l) => (todas = l));
    http.expectOne(`${base}/tareas`).flush([tareaApi(1), tareaApi(2)]);
    expect(todas.length).toBe(2);

    academico.tareas(11).subscribe();
    http.expectOne(`${base}/tareas/asignacion/11`).flush([]);
  });

  it('edita una tarea con PATCH sin tocar la fecha de publicación', () => {
    let t: any;
    academico.actualizarTarea(8, { titulo: 'T2', descripcion: 'd', fechaLimite: '2026-10-05T20:00' }).subscribe((r) => (t = r));
    const req = http.expectOne({ method: 'PATCH', url: `${base}/tareas/8` });
    expect(req.request.body).toEqual({ titulo: 'T2', descripcion: 'd', fechaEntrega: '2026-10-05T20:00' });
    req.flush(tareaApi(8));
    expect(t.fechaLimite).toBe('2026-10-01T23:59');
  });

  it('elimina una tarea con DELETE', () => {
    academico.eliminarTarea(8).subscribe();
    http.expectOne({ method: 'DELETE', url: `${base}/tareas/8` }).flush({ mensaje: 'ok' });
  });

  /* ------------------------- cursos y periodos -------------------------- */
  it('edita un curso con PUT y activo=true para no desactivarlo', () => {
    admin.actualizarCurso(3, { codigo: 'MAT102', nombre: 'Mate 2', descripcion: 'x' }).subscribe();
    const req = http.expectOne({ method: 'PUT', url: `${base}/cursos/3` });
    expect(req.request.body).toEqual({ codigo: 'MAT102', nombre: 'Mate 2', descripcion: 'x', activo: true });
    req.flush(curso);
  });

  it('no elimina un curso asignado a un periodo', () => {
    let mensaje = '';
    admin.eliminarCurso(3).subscribe({ error: (e) => (mensaje = e.error.message) });
    http.expectOne(`${base}/asignaciones`).flush([asignacion(11, 7)]);
    http.expectNone({ method: 'DELETE' });
    expect(mensaje).toContain('asignado a un periodo');
  });

  it('elimina un curso libre con DELETE', () => {
    let listo = false;
    admin.eliminarCurso(9).subscribe(() => (listo = true));
    http.expectOne(`${base}/asignaciones`).flush([asignacion(11, 7)]);
    http.expectOne({ method: 'DELETE', url: `${base}/cursos/9` }).flush({ mensaje: 'ok' });
    expect(listo).toBeTrue();
  });

  it('edita un periodo con PUT y activo=true', () => {
    admin.actualizarPeriodo(2, { nombre: '2026-III', fechaInicio: '2026-09-01', fechaFin: '2026-12-20' }).subscribe();
    const req = http.expectOne({ method: 'PUT', url: `${base}/periodos/2` });
    expect(req.request.body).toEqual({ nombre: '2026-III', fechaInicio: '2026-09-01', fechaFin: '2026-12-20', activo: true });
    req.flush(periodo);
  });

  it('no elimina un periodo con cursos asignados', () => {
    let mensaje = '';
    admin.eliminarPeriodo(2).subscribe({ error: (e) => (mensaje = e.error.message) });
    http.expectOne(`${base}/asignaciones`).flush([asignacion(11, 7)]);
    http.expectNone({ method: 'DELETE' });
    expect(mensaje).toContain('tiene cursos asignados');
  });

  /* ----------------------------- asignaciones ---------------------------- */
  it('actualiza una asignación con PUT (curso, periodo y docente)', () => {
    let oferta: any;
    admin.actualizarOferta(11, { cursoId: 4, periodoId: 2, docenteId: null }).subscribe((o) => (oferta = o));
    const req = http.expectOne({ method: 'PUT', url: `${base}/asignaciones/11` });
    expect(req.request.body).toEqual({ idCurso: 4, idPeriodo: 2, idDocente: null });
    req.flush(asignacion(11, null, { ...curso, idCurso: 4, nombre: 'Otro' }));
    http.expectOne(`${environment.usuariosUrl}/usuarios`).flush([]);
    expect(oferta.cursoNombre).toBe('Otro');
    expect(oferta.docenteId).toBeNull();
  });

  it('filtra las ofertas por docente con /asignaciones/docente/{id}', () => {
    admin.ofertas(2, 7).subscribe();
    http.expectOne(`${base}/asignaciones/docente/7`).flush([asignacion(11, 7)]);
    http.expectOne(`${environment.usuariosUrl}/usuarios`).flush([]);
    http.expectOne(`${base}/sesiones`).flush([]);
    http.expectOne(`${base}/tareas`).flush([]);
  });
});
