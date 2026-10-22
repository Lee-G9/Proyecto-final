import { createMockApi } from './mock-db';

describe('Backend simulado: reglas de negocio', () => {
  const mem: Record<string, string> = {};
  const storage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; } };
  const api = createMockApi(storage);
  const call = (method: string, path: string, body: any = null, token: string | null = null, query: Record<string, string> = {}) =>
    api.handle({ method, path, query, body, token });
  const tk = (u: string) => call('POST', '/auth/login', { username: u, password: '123456' }).body.token as string;

  it('no permite matricular dos veces al mismo alumno en el mismo curso y periodo', () => {
    const admin = tk('admin');
    const pablo = call('GET', '/admin/alumnos', null, admin).body.find((a: any) => a.username === 'pablo');
    const per = call('GET', '/admin/periodos', null, admin).body[0];
    const mate1 = call('GET', '/admin/ofertas', null, admin, { periodoId: String(per.id) }).body.find((o: any) => o.cursoNombre === 'Matemática 1');
    expect(call('POST', '/admin/matriculas', { alumnoId: pablo.id, ofertaId: mate1.id }, admin).status).toBe(409);
  });

  it('un docente solo accede a sus cursos', () => {
    const vincent = tk('vincent');
    const admin = tk('admin');
    const per = call('GET', '/admin/periodos', null, admin).body[0];
    const mate1 = call('GET', '/admin/ofertas', null, admin, { periodoId: String(per.id) }).body.find((o: any) => o.cursoNombre === 'Matemática 1');
    expect(call('GET', `/docente/cursos/${mate1.id}/alumnos`, null, vincent).status).toBe(403);
  });

  it('un alumno no puede usar endpoints de admin', () => {
    expect(call('GET', '/admin/docentes', null, tk('pablo')).status).toBe(403);
  });
});
