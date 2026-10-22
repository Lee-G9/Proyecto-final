import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AdminCursos } from './cursos';

describe('AdminCursos (editar y eliminar)', () => {
  let fixture: ComponentFixture<AdminCursos>;
  let http: HttpTestingController;
  const base = environment.academicoUrl;
  const curso = (id: number, codigo: string) => ({ idCurso: id, codigo, nombre: `Curso ${codigo}`, descripcion: null, activo: true });

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const botones = (etiqueta: string) =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).filter((b) => b.textContent?.trim() === etiqueta) as HTMLButtonElement[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AdminCursos], providers: [provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminCursos);
    fixture.detectChanges();
    http.expectOne(`${base}/cursos`).flush([curso(1, 'MAT101'), curso(2, 'FIS101')]);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  it('muestra Editar y Eliminar por cada curso', () => {
    expect(botones('Editar').length).toBe(2);
    expect(botones('Eliminar').length).toBe(2);
  });

  it('Editar precarga el formulario y guarda con PUT', async () => {
    botones('Editar')[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(texto()).toContain('Editar curso');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const nombre = form.querySelector('#nombre') as HTMLInputElement;
    expect(nombre.value).toBe('Curso FIS101');
    nombre.value = 'Física I';
    nombre.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));

    const req = http.expectOne({ method: 'PUT', url: `${base}/cursos/2` });
    expect(req.request.body.nombre).toBe('Física I');
    expect(req.request.body.activo).toBeTrue();
    req.flush(curso(2, 'FIS101'));
    http.expectOne(`${base}/cursos`).flush([]);
  });

  it('no deja repetir el código de otro curso al editar', async () => {
    botones('Editar')[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const codigo = form.querySelector('#codigo') as HTMLInputElement;
    codigo.value = 'mat101';
    codigo.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    http.expectNone({ method: 'PUT' });
    expect(texto()).toContain('Ya existe un curso con el código MAT101');
  });

  it('Eliminar pide confirmación, revisa asignaciones y borra', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    botones('Eliminar')[0].click(); // la lista se ordena por código: FIS101 (id 2) va primero
    http.expectOne(`${base}/asignaciones`).flush([]);
    http.expectOne({ method: 'DELETE', url: `${base}/cursos/2` }).flush({ mensaje: 'ok' });
    http.expectOne(`${base}/cursos`).flush([curso(1, 'MAT101')]);
  });

  it('muestra el aviso si el curso está en uso', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    botones('Eliminar')[1].click(); // MAT101 (id 1)
    http.expectOne(`${base}/asignaciones`).flush([{
      idAsignacion: 5, idDocente: null, activo: true, curso: curso(1, 'MAT101'),
      periodo: { idPeriodo: 1, nombre: 'P', fechaInicio: '2026-01-01', fechaFin: '2026-06-01', activo: true },
    }]);
    fixture.detectChanges();
    http.expectNone({ method: 'DELETE' });
    expect(texto()).toContain('asignado a un periodo');
  });
});
