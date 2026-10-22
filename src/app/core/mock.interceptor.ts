import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { createMockApi } from './mock/mock-db';

let api: ReturnType<typeof createMockApi> | null = null;

/** Reinicia los datos simulados a su estado inicial (útil para demos). */
export function resetMockDb(): void {
  (api ??= createMockApi(localStorage)).reset();
}

/**
 * Responde las peticiones al backend con datos simulados cuando environment.useMock = true.
 * Debe ir al FINAL de la cadena de interceptores (no llama a next).
 */
export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMock || !req.url.startsWith(environment.apiUrl)) return next(req);
  api ??= createMockApi(localStorage);

  const url = new URL(req.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (query[k] = v));
  // Los parámetros de HttpClient ({ params }) viajan en req.params, no en req.url.
  req.params.keys().forEach((k) => (query[k] = req.params.get(k) ?? ''));

  let body: any = req.body;
  if (body instanceof FormData) {
    const archivo = body.get('archivo');
    body = {
      archivoNombre: archivo instanceof File ? archivo.name : '',
      archivoTamano: archivo instanceof File ? archivo.size : 0,
      comentario: body.get('comentario') ?? '',
    };
  }

  const auth = req.headers.get('Authorization');
  const res = api.handle({
    method: req.method,
    path: url.pathname.substring(new URL(environment.apiUrl).pathname.replace(/\/$/, '').length),
    query,
    body,
    token: auth ? auth.replace(/^Bearer\s+/i, '') : null,
  });

  if (res.status >= 400) {
    return throwError(() => new HttpErrorResponse({ status: res.status, error: res.body, url: req.url })).pipe(delay(150));
  }
  return of(new HttpResponse({ status: res.status, body: res.body, url: req.url })).pipe(delay(150));
};
