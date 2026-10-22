import { HttpErrorResponse } from '@angular/common/http';
import { EstadoTarea } from './models';

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

export function formatoBytes(n: number | null | undefined): string {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Fecha local de hoy en formato yyyy-MM-dd. */
export function hoyISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Texto del estado de una tarea. */
export function etiquetaEstado(e: EstadoTarea): string {
  switch (e) {
    case 'PENDIENTE': return 'Pendiente';
    case 'ENTREGADA': return 'Entregada';
    case 'CALIFICADA': return 'Calificada';
    default: return 'Vencida';
  }
}

/** Clase CSS (badge) del estado de una tarea. */
export function claseEstado(e: EstadoTarea): string {
  switch (e) {
    case 'PENDIENTE': return 'b-warn';
    case 'ENTREGADA': return 'b-info';
    case 'CALIFICADA': return 'b-ok';
    default: return 'b-err';
  }
}

/** Clase CSS para resaltar notas desaprobatorias (escala 0-20, aprobatoria 11). */
export function notaClase(n: number | null | undefined): string {
  return n != null && n < 11 ? 'nota baja' : 'nota';
}
