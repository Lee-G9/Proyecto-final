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

  /** JWT sin firma real: el frontend solo lee los claims, la firma la verifica el backend. */
  const jwt = (claims: object) => `h.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.s`;

  it('envía nombreUsuario/contrasena y arma la sesión con los claims del JWT', () => {
    const token = jwt({ sub: 'admin', idUsuario: 7, roles: ['ADMINISTRADOR'], exp: Math.floor(Date.now() / 1000) + 3600 });
    service.login({ username: 'admin', password: 'b' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/auth/login'));
    expect(req.request.body).toEqual({ nombreUsuario: 'admin', contrasena: 'b' });
    req.flush({ token });
    expect(service.getToken()).toBe(token);
    expect(service.getRol()).toBe('ADMIN');
    expect(service.currentUserSignal()?.id).toBe(7);
    expect(service.nombreMostrar()).toBe('admin');
    expect(service.isLoggedIn()).toBeTrue();
    service.logout();
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('considera vencido un token con exp en el pasado', () => {
    localStorage.setItem('auth_token', jwt({ sub: 'a', roles: ['ALUMNO'], exp: 1 }));
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('normalizarRol y rutaPorRol', () => {
    expect(normalizarRol('administrador')).toBe('ADMIN');
    expect(normalizarRol('foo')).toBeNull();
    expect(rutaPorRol('DOCENTE')).toBe('/docente-dashboard');
    expect(rutaPorRol(null)).toBe('/login');
  });
});
