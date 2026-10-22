import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { LoginRequest } from '../models/login-request';
import { JwtResponse, LoginResponse } from '../models/jwt-response';
import { environment } from '../../../environments/environment';

/** Lee el payload de un JWT (base64url → JSON). Devuelve null si el token no es válido. */
export function decodificarJwt(token: string): Record<string, any> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** Arma la sesión con los claims que firma servicio-usuarios: sub, idUsuario y roles[]. */
export function sesionDesdeToken(token: string): JwtResponse {
  const claims = decodificarJwt(token) ?? {};
  const roles: string[] = Array.isArray(claims['roles']) ? claims['roles'] : [];
  const rol = roles.map((r) => normalizarRol(r)).find((r): r is JwtResponse['rol'] => r !== null);
  return {
    token,
    type: 'Bearer',
    id: claims['idUsuario'],
    username: claims['sub'] ?? '',
    // Si el token no trae un rol conocido, el login lo rechaza (ver LoginComponent).
    rol: rol ?? (roles[0] as JwtResponse['rol']),
  };
}

/** Normaliza el rol que envía el backend (ROLE_ADMIN, administrador, etc.). */
export function normalizarRol(rol: string | null | undefined): JwtResponse['rol'] | null {
  const r = (rol ?? '').toUpperCase().replace(/^ROLE_/, '');
  if (r === 'ADMIN' || r === 'ADMINISTRADOR') return 'ADMIN';
  if (r === 'DOCENTE' || r === 'PROFESOR') return 'DOCENTE';
  if (r === 'ALUMNO' || r === 'ESTUDIANTE') return 'ALUMNO';
  return null;
}

export function rutaPorRol(rol: string | null | undefined): string {
  switch (normalizarRol(rol)) {
    case 'ADMIN': return '/admin-dashboard';
    case 'DOCENTE': return '/docente-dashboard';
    case 'ALUMNO': return '/alumno-dashboard';
    default: return '/login';
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.usuariosUrl}/auth`;

  currentUserSignal = signal<JwtResponse | null>(this.getUserFromStorage());

  constructor(private http: HttpClient) {}

  /** El backend recibe {nombreUsuario, contrasena} y responde solo {token}; el resto sale del JWT. */
  login(credentials: LoginRequest): Observable<JwtResponse> {
    const body = { nombreUsuario: credentials.username, contrasena: credentials.password };
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, body).pipe(
      map(({ token }) => sesionDesdeToken(token)),
      tap((response) => {
        if (response && response.token) {
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('user_info', JSON.stringify(response));
          this.currentUserSignal.set(response);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    this.currentUserSignal.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getRol(): string | null {
    const user = this.getUserFromStorage();
    return user ? user.rol : null;
  }

  /** Nombre para mostrar: "Nombres Apellidos" si el backend lo envía; si no, el username. */
  nombreMostrar(): string {
    const u = this.currentUserSignal();
    if (!u) return '';
    const full = `${u.nombres ?? ''} ${u.apellidos ?? ''}`.trim();
    return full || u.username;
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    return !!token && !this.tokenExpirado(token);
  }

  /** Si el token es un JWT con claim exp, valida que no haya vencido. Si no se puede leer, no lo descarta. */
  private tokenExpirado(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
    } catch {
      return false;
    }
  }

  private getUserFromStorage(): JwtResponse | null {
    const userStr = localStorage.getItem('user_info');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as JwtResponse;
    } catch {
      return null;
    }
  }
}
