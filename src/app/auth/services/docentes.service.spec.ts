import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { DocentesService } from './docentes.service';

describe('DocentesService (contrato con servicio-academico)', () => {
  let service: DocentesService;
  let http: HttpTestingController;
  const academico = environment.academicoUrl;
  const asignacion = {
    idAsignacion: 11,
    curso: { idCurso: 3, codigo: 'MAT101', nombre: 'Matemática 1', descripcion: null, activo: true },
    periodo: { idPeriodo: 2, nombre: '2026-II', fechaInicio: '2026-08-01', fechaFin: '2026-12-15', activo: true },
    idDocente: 7,
    activo: true,
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DocentesService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lista los cursos del docente desde mis-asignaciones, con conteos', () => {
    let cursos: any[] = [];
    service.getCursosDocente().subscribe((l) => (cursos = l));
    http.expectOne(`${academico}/asignaciones/mis-asignaciones`).flush([asignacion]);
    http.expectOne(`${academico}/sesiones/asignacion/11`).flush([]);
    http.expectOne(`${academico}/tareas/asignacion/11`).flush([
      { idTarea: 5, asignacionDocente: asignacion, titulo: 't', descripcion: null, fechaPublicacion: null, fechaEntrega: '2026-10-01T23:59:00', activo: true },
    ]);
    expect(cursos[0]).toEqual(jasmine.objectContaining({ id: 11, cursoNombre: 'Matemática 1', totalTareas: 1, totalSesiones: 0 }));
  });

  it('crea la tarea con idAsignacion, fechaPublicacion y fechaEntrega', () => {
    let tarea: any;
    service.crearTarea(11, { titulo: 'Práctica 1', descripcion: 'd', fechaLimite: '2026-10-01T23:59' })
      .subscribe((t) => (tarea = t));
    const req = http.expectOne({ method: 'POST', url: `${academico}/tareas` });
    expect(req.request.body.idAsignacion).toBe(11);
    expect(req.request.body.fechaEntrega).toBe('2026-10-01T23:59');
    expect(req.request.body.fechaPublicacion).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    req.flush({ idTarea: 8, asignacionDocente: asignacion, titulo: 'Práctica 1', descripcion: 'd', fechaPublicacion: null, fechaEntrega: '2026-10-01T23:59:00', activo: true });
    expect(tarea.id).toBe(8);
    expect(tarea.fechaLimite).toBe('2026-10-01T23:59');
  });

  it('getCurso busca entre las asignaciones del docente y falla con 404 si no es suya', () => {
    let curso: any;
    service.getCurso(11).subscribe((o) => (curso = o));
    http.expectOne(`${academico}/asignaciones/mis-asignaciones`).flush([asignacion]);
    http.expectOne(`${academico}/sesiones/asignacion/11`).flush([]);
    http.expectOne(`${academico}/tareas/asignacion/11`).flush([]);
    expect(curso.id).toBe(11);

    let status = 0;
    service.getCurso(99).subscribe({ error: (e) => (status = e.status) });
    http.expectOne(`${academico}/asignaciones/mis-asignaciones`).flush([asignacion]);
    http.expectOne(`${academico}/sesiones/asignacion/11`).flush([]);
    http.expectOne(`${academico}/tareas/asignacion/11`).flush([]);
    expect(status).toBe(404);
  });
});
