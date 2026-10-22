import { HttpErrorResponse } from '@angular/common/http';

/** Extrae un mensaje legible de un error HTTP (formato Spring: { message }). */
export function errMsg(err: unknown, porDefecto = 'Ocurrió un error inesperado.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No se pudo conectar con el servidor.';
    const e = err.error;
    if (e && typeof e === 'object' && typeof e.message === 'string' && e.message) return e.message;
    if (typeof e === 'string' && e.trim()) return e;
    if (err.status === 403) return 'No tienes permiso para realizar esta acción.';
    if (err.status === 404) return 'El recurso solicitado no existe.';
  }
  return porDefecto;
}

export function nombreCompleto(u: { nombres: string; apellidos: string }): string {
  return `${u.nombres} ${u.apellidos}`.trim();
}

/** Fecha local de hoy en formato yyyy-MM-dd. */
export function hoyISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Fecha y hora local actual en formato yyyy-MM-ddTHH:mm:ss (sin zona, como espera LocalDateTime). */
export function ahoraISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
