import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor, unauthorizedInterceptor } from './core/auth.interceptor';
import { mockInterceptor, resetMockDb } from './core/mock.interceptor';
import { AuthService } from './auth/services/auth';
import { DocentesService } from './auth/services/docentes.service';
import { AlumnosService } from './auth/services/alumnos.service';
import { AdminService } from './auth/services/admin.service';
import { AdminMatriculas } from './admin/pages/matriculas';
import { AlumnoTareas } from './alumno/pages/tareas';
import { DocenteCursoDetalle } from './docente/pages/curso-detalle';
import { DocenteEntregas } from './docente/pages/entregas';

const esperar = (ms = 800) => new Promise((r) => setTimeout(r, ms));

describe('Integración: rutas + guards + interceptores + backend simulado', () => {
  let harness: RouterTestingHarness;
  let auth: AuthService;

  const texto = () => (harness.routeNativeElement as HTMLElement).textContent ?? '';
  /** Navega y devuelve la instancia del componente de página (anidado dentro del shell del rol). */
  const ir = async <T>(url: string, tipo?: Type<T>): Promise<T> => {
    await harness.navigateByUrl(url);
    await esperar();
    harness.detectChanges();
    return (tipo ? harness.fixture.debugElement.query(By.directive(tipo))?.componentInstance : null) as T;
  };
  /** Espera un Observable que debe fallar y devuelve el error HTTP. */
  const error = async (o: { subscribe: (...a: any[]) => any }): Promise<any> => {
    try { await lanzar(o); } catch (e) { return e; }
    return null;
  };
  const entrar = async (u: string) => {
    await new Promise<void>((ok, ko) => auth.login({ username: u, password: '123456' }).subscribe({ next: () => ok(), error: ko }));
  };
  const lanzar = <T>(o: { subscribe: (...a: any[]) => any }) => new Promise<T>((ok, ko) => o.subscribe({ next: ok, error: ko }));

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding()), provideHttpClient(withInterceptors([authInterceptor, unauthorizedInterceptor, mockInterceptor]))],
    });
    resetMockDb();
    auth = TestBed.inject(AuthService);
    auth.logout();
    harness = await RouterTestingHarness.create();
  });

  it('sin sesión, cualquier dashboard redirige al login', async () => {
    await harness.navigateByUrl('/admin-dashboard/docentes');
    expect(TestBed.inject(Router).url).toBe('/login');
  }, 60000);

  it('login de admin entra al panel y un docente no puede entrar al panel admin', async () => {
    await entrar('admin');
    await ir('/admin-dashboard');
    expect(TestBed.inject(Router).url).toBe('/admin-dashboard/inicio');
    expect(texto()).toContain('Panel de gestión');

    auth.logout();
    await entrar('carlos');
    await harness.navigateByUrl('/admin-dashboard/docentes');
    expect(TestBed.inject(Router).url).toBe('/docente-dashboard/inicio');
  }, 60000);

  it('admin: todas las páginas se renderizan con datos', async () => {
    await entrar('admin');
    await ir('/admin-dashboard/inicio');
    expect(texto()).toContain('Matemática 1');
    await ir('/admin-dashboard/docentes');
    expect(texto()).toContain('Carlos Mendoza');
    expect(texto()).toContain('Vincent Torres');
    await ir('/admin-dashboard/alumnos');
    expect(texto()).toContain('Pablo Rojas');
    expect(texto()).toContain('Lee');
    await ir('/admin-dashboard/periodos');
    expect(texto()).toContain('2026-II');
    await ir('/admin-dashboard/cursos');
    expect(texto()).toContain('Cálculo');
    await ir('/admin-dashboard/oferta');
    expect(texto()).toContain('Agregar curso al periodo');
    await ir('/admin-dashboard/sesiones');
    expect(texto()).toContain('Concepto de límite'); // primer curso del periodo: Cálculo
    expect(texto()).not.toContain('Funciones lineales'); // sesiones de otro curso: el filtro funciona
    await ir('/admin-dashboard/matriculas');
    expect(texto()).toContain('Pablo Rojas');
  }, 60000);

  it('admin: matricular varios alumnos y bloquear la doble matrícula en el mismo curso/periodo', async () => {
    await entrar('admin');
    const c = await ir<AdminMatriculas>('/admin-dashboard/matriculas', AdminMatriculas);
    // Primer curso del periodo (orden alfabético): Cálculo -> Pablo y Mr. Lee ya matriculados, Rodrigo disponible
    expect(c.ofertaActual()?.cursoNombre).toBe('Cálculo');
    expect(c.pendientes().map((a) => a.username)).toEqual(['rodrigo']);
    c.seleccion.set(new Set(c.pendientes().map((a) => a.id)));
    c.matricular();
    await esperar();
    harness.detectChanges();
    expect(c.matriculas().length).toBe(3);
    expect(c.pendientes().length).toBe(0);
    expect(texto()).toContain('Todos los alumnos ya están matriculados');

    // Intento directo (API) de duplicar -> 409 con mensaje claro
    const alumnos = await lanzar<any[]>(TestBed.inject(AdminService).alumnos());
    const pablo = alumnos.find((a) => a.username === 'pablo');
    expect((await error(TestBed.inject(AdminService).matricular(pablo.id, c.ofertaId()!)))?.status).toBe(409);
  }, 60000);

  it('docente: ve solo sus cursos, califica, toma asistencia, crea tarea y califica entrega', async () => {
    await entrar('carlos');
    await ir('/docente-dashboard/cursos');
    expect(texto()).toContain('Matemática 1');
    expect(texto()).toContain('Matemática 2');
    expect(texto()).not.toContain('Cálculo');

    const cursos = await lanzar<any[]>(TestBed.inject(DocentesService).getCursosDocente());
    const mate1 = cursos.find((x) => x.cursoNombre === 'Matemática 1');
    const d = await ir<DocenteCursoDetalle>(`/docente-dashboard/cursos/${mate1.id}`, DocenteCursoDetalle);
    expect(d.filas().length).toBe(2);
    expect(texto()).toContain('Pablo Rojas');

    // nota final
    const fp = d.filas().find((f) => f.m.alumnoNombre.startsWith('Pablo'))!;
    fp.nota = 17;
    fp.obs = 'Muy bien';
    d.guardarNota(fp);
    await esperar();
    expect(fp.m.notaFinal).toBe(17);

    // nota inválida
    fp.nota = 25;
    d.guardarNota(fp);
    expect(d.flash.m()?.tipo).toBe('err');

    // asistencia
    d.pestana.set('asistencia');
    harness.detectChanges();
    const s4 = d.sesiones().find((s) => s.numero === 4)!;
    d.abrirAsistencia(s4);
    await esperar();
    d.marcarTodos();
    d.asistencia()[1].estado = 'FALTA';
    d.guardarAsistencia();
    await esperar();
    expect(d.sesiones().find((s) => s.numero === 4)!.asistenciaRegistrada).toBe(true);
    expect(d.sesiones().find((s) => s.numero === 4)!.presentes).toBe(1);

    // crear tarea
    d.formTarea = { titulo: 'Quiz 1', descripcion: '', fechaLimite: '2099-01-01T10:00', puntajeMax: 20 };
    d.crearTarea({ invalid: false, resetForm() {}, control: { markAllAsTouched() {} } } as any);
    await esperar();
    expect(d.tareas().some((t) => t.titulo === 'Quiz 1')).toBe(true);

    // calificar entrega de Rodrigo en Práctica 1 (sin calificar en el seed)
    const p1 = d.tareas().find((t) => t.titulo.startsWith('Práctica 1'))!;
    const e = await ir<DocenteEntregas>(`/docente-dashboard/cursos/${mate1.id}/tareas/${p1.id}`, DocenteEntregas);
    const fr = e.filas().find((r) => r.f.alumnoNombre.startsWith('Rodrigo'))!;
    expect(fr.f.estado).toBe('ENTREGADA');
    fr.nota = 14;
    fr.retro = 'Bien';
    e.calificar(fr, e.tarea()!);
    await esperar();
    expect(fr.f.estado).toBe('CALIFICADA');
    expect(e.calificadas()).toBe(2);
  }, 60000);

  it('docente: no accede al curso de otro docente (403)', async () => {
    await entrar('admin');
    const ofertas = await lanzar<any[]>(TestBed.inject(AdminService).ofertas());
    const calculo = ofertas.find((o) => o.cursoNombre === 'Cálculo');
    auth.logout();
    await entrar('carlos');
    expect((await error(TestBed.inject(DocentesService).alumnos(calculo.id)))?.status).toBe(403);
  }, 60000);

  it('alumno: ve pendientes, sube una tarea y luego queda como entregada', async () => {
    await entrar('rodrigo');
    await ir('/alumno-dashboard/cursos');
    expect(texto()).toContain('Matemática 1');
    expect(texto()).toContain('Matemática 2');

    const t = await ir<AlumnoTareas>('/alumno-dashboard/tareas', AlumnoTareas);
    const pend = t.tareas().filter((x) => x.estado === 'PENDIENTE');
    expect(pend.length).toBe(1);
    expect(pend[0].titulo).toContain('Práctica 2');
    expect(texto()).toContain('Práctica 2');

    t.archivos.set({ [pend[0].id]: new File(['hola'], 'practica2.pdf', { type: 'application/pdf' }) });
    t.comentarios[pend[0].id] = 'listo';
    t.subir(pend[0], { value: 'x' } as HTMLInputElement);
    await esperar();
    harness.detectChanges();
    const despues = t.tareas().find((x) => x.id === pend[0].id)!;
    expect(despues.estado).toBe('ENTREGADA');
    expect(despues.entrega?.archivoNombre).toBe('practica2.pdf');
    expect(t.conteo().PENDIENTE).toBe(0);

    await ir('/alumno-dashboard/calificaciones');
    expect(texto()).toContain('Matemática 1');
    await ir('/alumno-dashboard/inicio');
    expect(texto()).toContain('Cursos matriculados');
  }, 60000);

  it('alumno: no puede entregar tareas de un curso donde no está matriculado', async () => {
    await entrar('admin');
    const doc = await lanzar<any[]>(TestBed.inject(AdminService).ofertas());
    auth.logout();
    await entrar('carlos');
    const calc = doc.find((o) => o.cursoNombre === 'Cálculo');
    auth.logout();
    await entrar('vincent');
    const tareasCalc = await lanzar<any[]>(TestBed.inject(DocentesService).tareas(calc.id));
    auth.logout();
    await entrar('rodrigo');
    expect((await error(TestBed.inject(AlumnosService).subirTarea(tareasCalc[0].id, new File(['x'], 'a.pdf'), '')))?.status).toBe(403);
  }, 60000);

  it('logout limpia la sesión', async () => {
    await entrar('admin');
    expect(auth.isLoggedIn()).toBe(true);
    auth.logout();
    expect(auth.isLoggedIn()).toBe(false);
  }, 60000);
});
