import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AdminUsuarios } from './usuarios';

describe('AdminUsuarios (editar y eliminar)', () => {
  let fixture: ComponentFixture<AdminUsuarios>;
  let http: HttpTestingController;
  const url = `${environment.usuariosUrl}/usuarios`;
  const api = (id: number, nombreUsuario: string, rol: string) => ({
    idUsuario: id, nombreUsuario, correo: `${nombreUsuario}@x.com`, nombres: 'Ana', apellidos: 'Ruiz',
    roles: [{ idRol: 1, nombre: rol }], activo: true,
  });

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const botones = (etiqueta: string) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).filter((b) => b.textContent?.trim() === etiqueta) as HTMLButtonElement[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsuarios],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { rol: 'DOCENTE' } } } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminUsuarios);
    fixture.detectChanges();
    http.expectOne(url).flush([api(1, 'admin', 'ADMINISTRADOR'), api(2, 'ana', 'DOCENTE'), api(3, 'beto', 'DOCENTE'), api(4, 'cami', 'ALUMNO')]);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  it('muestra Editar y Eliminar por cada docente', () => {
    expect(botones('Editar').length).toBe(2);
    expect(botones('Eliminar').length).toBe(2);
  });

  it('Editar abre el formulario con los datos y Guardar hace PUT sin contraseña', async () => {
    botones('Editar')[0].click();
    fixture.detectChanges();
    expect(texto()).toContain('Editar a Ana Ruiz');
    await fixture.whenStable();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const correo = form.querySelector('#e-email') as HTMLInputElement;
    correo.value = 'nuevo@x.com';
    correo.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = http.expectOne({ method: 'PUT', url: `${url}/2` });
    expect(req.request.body.correo).toBe('nuevo@x.com');
    expect(req.request.body.contrasena).toBeUndefined();
    req.flush(api(2, 'ana', 'DOCENTE'));
    http.expectOne(url).flush([api(2, 'ana', 'DOCENTE')]);
  });

  it('no permite guardar un usuario o correo ya usado por otra persona', async () => {
    botones('Editar')[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const usuario = form.querySelector('#e-username') as HTMLInputElement;
    usuario.value = 'BETO';
    usuario.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    http.expectNone({ method: 'PUT' });
    expect(texto()).toContain('Ya existe otra persona');
  });

  it('Eliminar pide confirmación y hace DELETE', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    botones('Eliminar')[1].click();
    expect(window.confirm).toHaveBeenCalled();
    http.expectOne({ method: 'DELETE', url: `${url}/3` }).flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(url).flush([api(2, 'ana', 'DOCENTE')]);
  });

  it('si se cancela la confirmación no elimina', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    botones('Eliminar')[0].click();
    http.expectNone({ method: 'DELETE' });
  });
});

describe('AdminUsuarios (administradores)', () => {
  let fixture: ComponentFixture<AdminUsuarios>;
  let http: HttpTestingController;
  const url = `${environment.usuariosUrl}/usuarios`;
  const api = (id: number, nombreUsuario: string, rol: string) => ({
    idUsuario: id, nombreUsuario, correo: `${nombreUsuario}@x.com`, nombres: 'Ana', apellidos: 'Ruiz',
    roles: [{ idRol: 1, nombre: rol }], activo: true,
  });
  const botones = (etiqueta: string) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).filter((b) => b.textContent?.trim() === etiqueta) as HTMLButtonElement[];

  beforeEach(async () => {
    localStorage.setItem('user_info', JSON.stringify({ token: 't', type: 'Bearer', id: 1, username: 'admin', rol: 'ADMIN' }));
    await TestBed.configureTestingModule({
      imports: [AdminUsuarios],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { rol: 'ADMIN' } } } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminUsuarios);
    fixture.detectChanges();
    http.expectOne(url).flush([api(1, 'admin', 'ADMINISTRADOR'), api(5, 'otro', 'ADMINISTRADOR'), api(2, 'ana', 'DOCENTE')]);
    fixture.detectChanges();
  });
  afterEach(() => { http.verify(); localStorage.clear(); });

  it('lista solo administradores y no deja eliminar la cuenta propia', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Administradores');
    expect(botones('Editar').length).toBe(2);
    expect(botones('Eliminar').length).toBe(1); // el admin con id 1 es la sesión actual
  });

  it('registra un administrador con rol ADMINISTRADOR', async () => {
    botones('+ Registrar administrador')[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const poner = (id: string, valor: string) => {
      const input = form.querySelector(`#${id}`) as HTMLInputElement;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
    };
    poner('nombres', 'Nuevo'); poner('apellidos', 'Admin'); poner('email', 'n@x.com'); poner('username', 'nuevo'); poner('password', 'secreta1');
    form.dispatchEvent(new Event('submit'));

    const req = http.expectOne({ method: 'POST', url: `${url}/registro` });
    expect(req.request.body.rol).toBe('ADMINISTRADOR');
    req.flush(api(9, 'nuevo', 'ADMINISTRADOR'));
    http.expectOne(url).flush([]);
  });
});
