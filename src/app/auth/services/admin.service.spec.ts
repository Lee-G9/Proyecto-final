import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AdminService } from './admin.service';

describe('AdminService (contrato con los microservicios)', () => {
  let service: AdminService;
  let http: HttpTestingController;
  const usuarios = environment.usuariosUrl;
  const academico = environment.academicoUrl;

  const curso = { idCurso: 3, codigo: 'MAT101', nombre: 'Matemática 1', descripcion: null, activo: true };
  const periodo = { idPeriodo: 2, nombre: '2026-II', fechaInicio: '2026-08-01', fechaFin: '2026-12-15', activo: true };
  const asignacion = (id: number, idDocente: number | null) => ({ idAsignacion: id, curso, periodo, idDocente, activo: true });
  const usuarioApi = (id: number, rol: string) => ({
    idUsuario: id, nombreUsuario: `u${id}`, correo: `u${id}@x.com`, nombres: 'N', apellidos: 'A', roles: [{ idRol: 1, nombre: rol }], activo: true,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('registra un docente con los campos y el rol que pide servicio-usuarios', () => {
    let creado: any;
    service.registrarDocente({ username: 'carlos', password: 'secreta', nombres: 'Carlos', apellidos: 'Mendoza', email: 'c@x.com' })
      .subscribe((u) => (creado = u));
    const req = http.expectOne(`${usuarios}/usuarios/registro`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombreUsuario: 'carlos', correo: 'c@x.com', contrasena: 'secreta', nombres: 'Carlos', apellidos: 'Mendoza', rol: 'DOCENTE',
    });
    req.flush(usuarioApi(9, 'DOCENTE'));
    expect(creado.id).toBe(9);
    expect(creado.rol).toBe('DOCENTE');
  });

  it('edita un usuario con PUT, enviando siempre el usuario y el rol del backend', () => {
    let editado: any;
    service.actualizarUsuario(9, { username: 'carlos', password: '', nombres: 'Carlos', apellidos: 'M', email: 'c@x.com', rol: 'ALUMNO' })
      .subscribe((u) => (editado = u));
    const req = http.expectOne({ method: 'PUT', url: `${usuarios}/usuarios/9` });
    // contraseña vacía: no se envía para que el backend no la cambie
    expect(req.request.body).toEqual({ nombreUsuario: 'carlos', correo: 'c@x.com', nombres: 'Carlos', apellidos: 'M', rol: 'ALUMNO' });
    req.flush(usuarioApi(9, 'ALUMNO'));
    expect(editado.rol).toBe('ALUMNO');
  });

  it('al editar con contraseña nueva la envía como contrasena', () => {
    service.actualizarUsuario(9, { username: 'carlos', password: 'nueva123', nombres: 'C', apellidos: 'M', email: 'c@x.com', rol: 'DOCENTE' }).subscribe();
    const req = http.expectOne({ method: 'PUT', url: `${usuarios}/usuarios/9` });
    expect(req.request.body.contrasena).toBe('nueva123');
    req.flush(usuarioApi(9, 'DOCENTE'));
  });

  it('elimina un usuario con DELETE', () => {
    let listo = false;
    service.eliminarUsuario(9).subscribe(() => (listo = true));
    http.expectOne({ method: 'DELETE', url: `${usuarios}/usuarios/9` }).flush(null, { status: 204, statusText: 'No Content' });
    expect(listo).toBeTrue();
  });

  it('filtra docentes y alumnos de la lista única de usuarios', () => {
    let docentes: any[] = [];
    service.docentes().subscribe((l) => (docentes = l));
    http.expectOne(`${usuarios}/usuarios`).flush([usuarioApi(1, 'ADMINISTRADOR'), usuarioApi(2, 'DOCENTE'), usuarioApi(3, 'ALUMNO')]);
    expect(docentes.map((d) => d.id)).toEqual([2]);
  });

  it('crea una asignación con idCurso/idPeriodo/idDocente', () => {
    let oferta: any;
    service.asignarCursoAPeriodo(3, 2, 7).subscribe((o) => (oferta = o));
    const req = http.expectOne(`${academico}/asignaciones`);
    expect(req.request.body).toEqual({ idCurso: 3, idPeriodo: 2, idDocente: 7 });
    req.flush(asignacion(11, 7));
    http.expectOne(`${usuarios}/usuarios`).flush([{ ...usuarioApi(7, 'DOCENTE'), nombres: 'Ana', apellidos: 'Ruiz' }]);
    expect(oferta.id).toBe(11);
    expect(oferta.docenteNombre).toBe('Ana Ruiz');
  });

  it('arma las ofertas con nombre del docente y conteos', () => {
    let ofertas: any[] = [];
    service.ofertas(2).subscribe((l) => (ofertas = l));
    http.expectOne(`${academico}/asignaciones`).flush([asignacion(11, 7), { ...asignacion(12, null), periodo: { ...periodo, idPeriodo: 99 } }]);
    http.expectOne(`${usuarios}/usuarios`).flush([{ ...usuarioApi(7, 'DOCENTE'), nombres: 'Ana', apellidos: 'Ruiz' }]);
    http.expectOne(`${academico}/sesiones`).flush([{ idSesion: 1, asignacionDocente: asignacion(11, 7), numeroSesion: 1, titulo: 't', descripcion: null, fecha: '2026-09-01', activo: true }]);
    http.expectOne(`${academico}/tareas`).flush([]);
    expect(ofertas.length).toBe(1);
    expect(ofertas[0]).toEqual(jasmine.objectContaining({ id: 11, cursoNombre: 'Matemática 1', docenteNombre: 'Ana Ruiz', totalSesiones: 1, totalTareas: 0 }));
  });

  it('quitar el docente reemplaza la asignación porque el PATCH ignora null', () => {
    service.asignarDocente(11, null).subscribe();
    http.expectOne({ method: 'GET', url: `${academico}/asignaciones/11` }).flush(asignacion(11, 7));
    const put = http.expectOne({ method: 'PUT', url: `${academico}/asignaciones/11` });
    expect(put.request.body).toEqual({ idCurso: 3, idPeriodo: 2, idDocente: null });
    put.flush(asignacion(11, null));
    http.expectOne(`${usuarios}/usuarios`).flush([]);
  });

  it('numera la nueva sesión con el siguiente número del curso', () => {
    service.crearSesion({ ofertaId: 11, titulo: 'Límites', fecha: '2026-09-10', descripcion: '' }).subscribe();
    http.expectOne(`${academico}/sesiones/asignacion/11`).flush([
      { idSesion: 1, asignacionDocente: asignacion(11, 7), numeroSesion: 1, titulo: 'a', descripcion: null, fecha: '2026-09-01', activo: true },
      { idSesion: 2, asignacionDocente: asignacion(11, 7), numeroSesion: 2, titulo: 'b', descripcion: null, fecha: '2026-09-02', activo: true },
    ]);
    const post = http.expectOne({ method: 'POST', url: `${academico}/sesiones` });
    expect(post.request.body).toEqual({ idAsignacion: 11, numeroSesion: 3, titulo: 'Límites', descripcion: '', fecha: '2026-09-10' });
    post.flush({ idSesion: 3, asignacionDocente: asignacion(11, 7), numeroSesion: 3, titulo: 'Límites', descripcion: '', fecha: '2026-09-10', activo: true });
  });

  it('quitar una oferta borra antes sus sesiones y tareas', () => {
    service.quitarOferta(11).subscribe();
    http.expectOne(`${academico}/sesiones/asignacion/11`).flush([
      { idSesion: 1, asignacionDocente: asignacion(11, 7), numeroSesion: 1, titulo: 'a', descripcion: null, fecha: '2026-09-01', activo: true },
    ]);
    http.expectOne(`${academico}/tareas/asignacion/11`).flush([]);
    http.expectOne({ method: 'DELETE', url: `${academico}/sesiones/1` }).flush({ mensaje: 'ok' });
    http.expectOne({ method: 'DELETE', url: `${academico}/asignaciones/11` }).flush({ mensaje: 'ok' });
  });
});
