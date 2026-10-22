import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, normalizarRol, rutaPorRol } from './auth';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('guarda token y normaliza el rol al iniciar sesión', () => {
    service.login({ username: 'a', password: 'b' }).subscribe();
    http.expectOne((r) => r.url.endsWith('/auth/login')).flush({ token: 't', type: 'Bearer', id: 1, username: 'a', email: 'a@a.com', rol: 'ROLE_ADMIN' });
    expect(service.getToken()).toBe('t');
    expect(service.getRol()).toBe('ADMIN');
    expect(service.isLoggedIn()).toBeTrue();
    service.logout();
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('normalizarRol y rutaPorRol', () => {
    expect(normalizarRol('administrador')).toBe('ADMIN');
    expect(normalizarRol('foo')).toBeNull();
    expect(rutaPorRol('DOCENTE')).toBe('/docente-dashboard');
    expect(rutaPorRol(null)).toBe('/login');
  });
});
