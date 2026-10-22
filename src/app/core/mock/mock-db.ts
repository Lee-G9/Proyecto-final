/**
 * Backend simulado en memoria para desarrollo sin Spring Boot.
 * Lógica pura (sin Angular) para poder probarla de forma aislada.
 * Cuando el backend real esté listo: environment.useMock = false.
 */
export interface KeyValueStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}
export interface MockRequest {
  method: string;
  path: string; // relativo a apiUrl, ej. /admin/docentes
  query: Record<string, string>;
  body: any;
  token: string | null;
}
export interface MockResponse {
  status: number;
  body: any;
}

const KEY = 'lms_mock_db_v1';
const ESTADOS_ASISTENCIA = ['PRESENTE', 'TARDANZA', 'FALTA', 'JUSTIFICADO'];

class HttpErr extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
class Created {
  constructor(public body: any) {}
}

interface Db {
  seq: number;
  usuarios: any[];
  periodos: any[];
  cursos: any[];
  ofertas: any[];
  sesiones: any[];
  matriculas: any[];
  asistencias: any[];
  tareas: any[];
  entregas: any[];
}

type Ctx = { params: Record<string, string>; query: Record<string, string>; body: any; user: any | null };
type Handler = (c: Ctx) => any;
interface Route {
  method: string;
  re: RegExp;
  keys: string[];
  role: string | null;
  fn: Handler;
}

/* ------------------------------ datos iniciales ------------------------------ */

function seed(now: Date): Db {
  const db: Db = {
    seq: 0, usuarios: [], periodos: [], cursos: [], ofertas: [], sesiones: [],
    matriculas: [], asistencias: [], tareas: [], entregas: [],
  };
  const id = () => ++db.seq;
  const day = (n: number) => new Date(now.getTime() + n * 864e5).toISOString().slice(0, 10);
  const user = (username: string, nombres: string, apellidos: string, rol: string) => {
    const u = { id: id(), username, password: '123456', nombres, apellidos, email: `${username}@aulanexa.edu`, rol, activo: true };
    db.usuarios.push(u);
    return u;
  };

  user('admin', 'Admin', 'General', 'ADMIN');
  const carlos = user('carlos', 'Carlos', 'Mendoza', 'DOCENTE');
  const vincent = user('vincent', 'Vincent', 'Torres', 'DOCENTE');
  const pablo = user('pablo', 'Pablo', 'Rojas', 'ALUMNO');
  const rodrigo = user('rodrigo', 'Rodrigo', 'Salazar', 'ALUMNO');
  const lee = user('mrlee', 'Mr.', 'Lee', 'ALUMNO');

  const periodo = { id: id(), nombre: '2026-II', fechaInicio: day(-80), fechaFin: day(70) };
  db.periodos.push(periodo);

  const mate1 = { id: id(), codigo: 'MAT101', nombre: 'Matemática 1', descripcion: 'Álgebra y funciones.' };
  const mate2 = { id: id(), codigo: 'MAT102', nombre: 'Matemática 2', descripcion: 'Trigonometría y geometría analítica.' };
  const calc = { id: id(), codigo: 'MAT201', nombre: 'Cálculo', descripcion: 'Límites, derivadas e integrales.' };
  db.cursos.push(mate1, mate2, calc);

  const of = (c: any, d: any) => {
    const o = { id: id(), cursoId: c.id, periodoId: periodo.id, docenteId: d.id };
    db.ofertas.push(o);
    return o;
  };
  const oMate1 = of(mate1, carlos);
  const oMate2 = of(mate2, carlos);
  const oCalc = of(calc, vincent);

  const mat = (a: any, o: any) => {
    const m = { id: id(), alumnoId: a.id, ofertaId: o.id, notaFinal: null as number | null, observacion: '' };
    db.matriculas.push(m);
    return m;
  };
  const mPabloM1 = mat(pablo, oMate1);
  const mRodM1 = mat(rodrigo, oMate1);
  mat(rodrigo, oMate2);
  mat(pablo, oCalc);
  mat(lee, oCalc);

  const ses = (o: any, numero: number, titulo: string, fecha: string, descripcion = '') => {
    const s = { id: id(), ofertaId: o.id, numero, titulo, fecha, descripcion };
    db.sesiones.push(s);
    return s;
  };
  const s1 = ses(oMate1, 1, 'Introducción y repaso de álgebra', day(-21));
  const s2 = ses(oMate1, 2, 'Funciones lineales', day(-14));
  ses(oMate1, 3, 'Funciones cuadráticas', day(-7));
  ses(oMate1, 4, 'Taller práctico', day(5));
  ses(oCalc, 1, 'Concepto de límite', day(-10));
  ses(oCalc, 2, 'Límites laterales', day(4));

  for (const s of [s1, s2]) {
    db.asistencias.push({ sesionId: s.id, matriculaId: mPabloM1.id, estado: 'PRESENTE' });
    db.asistencias.push({ sesionId: s.id, matriculaId: mRodM1.id, estado: s === s1 ? 'PRESENTE' : 'TARDANZA' });
  }

  const tarea = (o: any, titulo: string, descripcion: string, dias: number) => {
    const t = { id: id(), ofertaId: o.id, titulo, descripcion, fechaLimite: `${day(dias)}T23:59`, puntajeMax: 20 };
    db.tareas.push(t);
    return t;
  };
  const t1 = tarea(oMate1, 'Práctica 1: ecuaciones', 'Resuelve los ejercicios 1 al 10 del material y sube tu solución en PDF.', -5);
  tarea(oMate1, 'Práctica 2: funciones', 'Gráficos de funciones lineales y cuadráticas. Entrega en PDF.', 7);
  tarea(oCalc, 'Tarea de límites', 'Calcula los límites indicados y justifica cada paso.', 3);

  db.entregas.push({
    id: id(), tareaId: t1.id, matriculaId: mPabloM1.id, archivoNombre: 'practica1_pablo.pdf', archivoTamano: 245000,
    comentario: 'Adjunto mi práctica.', fechaEntrega: `${day(-6)}T18:20`, nota: 16, retroalimentacion: 'Buen trabajo, revisa el ejercicio 7.',
  });
  db.entregas.push({
    id: id(), tareaId: t1.id, matriculaId: mRodM1.id, archivoNombre: 'practica1_rodrigo.pdf', archivoTamano: 310000,
    comentario: '', fechaEntrega: `${day(-5)}T21:05`, nota: null, retroalimentacion: '',
  });
  return db;
}

/* ------------------------------------ API ------------------------------------ */

export function createMockApi(storage: KeyValueStorage, clock: () => Date = () => new Date()) {
  let db: Db = load();
  const routes: Route[] = [];

  function load(): Db {
    try {
      const s = storage.getItem(KEY);
      if (s) return JSON.parse(s) as Db;
    } catch { /* se recrea */ }
    const d = seed(clock());
    storage.setItem(KEY, JSON.stringify(d));
    return d;
  }
  const save = () => storage.setItem(KEY, JSON.stringify(db));
  const nextId = () => ++db.seq;

  function reset() {
    db = seed(clock());
    save();
  }

  /* --- helpers de validación --- */
  const str = (v: unknown, label: string, min = 1): string => {
    const s = typeof v === 'string' ? v.trim() : '';
    if (!s) throw new HttpErr(400, `${label} es obligatorio.`);
    if (s.length < min) throw new HttpErr(400, `${label} debe tener al menos ${min} caracteres.`);
    return s;
  };
  const optStr = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
  const isDateTime = (s: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !isNaN(Date.parse(s));
  const toNum = (v: unknown, label: string): number => {
    const n = typeof v === 'number' ? v : Number(v);
    if (v === null || v === '' || v === undefined || !Number.isFinite(n)) throw new HttpErr(400, `${label} no es válido.`);
    return n;
  };
  const round2 = (n: number) => Math.round(n * 100) / 100;

  /* --- búsquedas --- */
  const find = (list: any[], id: unknown, label: string) => {
    const x = list.find((i) => i.id === Number(id));
    if (!x) throw new HttpErr(404, `${label} no existe.`);
    return x;
  };
  const nombreDe = (u: any) => (u ? `${u.nombres} ${u.apellidos}`.trim() : null);
  const pub = (u: any) => {
    const { password, ...rest } = u;
    return rest;
  };
  const userFromToken = (token: string | null) => {
    const m = /^mock-token-(\d+)$/.exec(token ?? '');
    return m ? db.usuarios.find((u) => u.id === Number(m[1]) && u.activo) ?? null : null;
  };

  /* --- DTOs --- */
  function ofertaDto(o: any) {
    const c = db.cursos.find((x) => x.id === o.cursoId);
    const p = db.periodos.find((x) => x.id === o.periodoId);
    const d = db.usuarios.find((x) => x.id === o.docenteId);
    return {
      id: o.id, cursoId: o.cursoId, periodoId: o.periodoId, docenteId: o.docenteId ?? null,
      cursoCodigo: c.codigo, cursoNombre: c.nombre, periodoNombre: p.nombre, docenteNombre: nombreDe(d),
      totalAlumnos: db.matriculas.filter((m) => m.ofertaId === o.id).length,
      totalSesiones: db.sesiones.filter((s) => s.ofertaId === o.id).length,
      totalTareas: db.tareas.filter((t) => t.ofertaId === o.id).length,
    };
  }
  function promedioTareas(matriculaId: number): number | null {
    const notas = db.entregas
      .filter((e) => e.matriculaId === matriculaId && e.nota != null)
      .map((e) => (e.nota / db.tareas.find((t) => t.id === e.tareaId).puntajeMax) * 20);
    return notas.length ? round2(notas.reduce((a, b) => a + b, 0) / notas.length) : null;
  }
  function matriculaDto(m: any) {
    const a = db.usuarios.find((u) => u.id === m.alumnoId);
    const o = db.ofertas.find((x) => x.id === m.ofertaId);
    const od = ofertaDto(o);
    return {
      id: m.id, alumnoId: m.alumnoId, alumnoNombre: nombreDe(a), ofertaId: m.ofertaId,
      cursoCodigo: od.cursoCodigo, cursoNombre: od.cursoNombre, periodoId: od.periodoId, periodoNombre: od.periodoNombre,
      docenteNombre: od.docenteNombre, notaFinal: m.notaFinal ?? null, observacion: m.observacion ?? '',
      promedioTareas: promedioTareas(m.id),
    };
  }
  function sesionDto(s: any) {
    const od = ofertaDto(db.ofertas.find((o) => o.id === s.ofertaId));
    return { id: s.id, ofertaId: s.ofertaId, numero: s.numero, titulo: s.titulo, fecha: s.fecha, descripcion: s.descripcion ?? '',
      cursoNombre: od.cursoNombre, periodoNombre: od.periodoNombre };
  }
  const vencida = (t: any) => new Date(t.fechaLimite).getTime() < clock().getTime();
  function estadoTarea(t: any, e: any | undefined) {
    if (e) return e.nota != null ? 'CALIFICADA' : 'ENTREGADA';
    return vencida(t) ? 'VENCIDA' : 'PENDIENTE';
  }
  const entregaDto = (e: any) => ({
    id: e.id, archivoNombre: e.archivoNombre, archivoTamano: e.archivoTamano, archivoUrl: null,
    comentario: e.comentario ?? '', fechaEntrega: e.fechaEntrega, nota: e.nota ?? null, retroalimentacion: e.retroalimentacion ?? '',
  });
  function tareaDocenteDto(t: any) {
    const od = ofertaDto(db.ofertas.find((o) => o.id === t.ofertaId));
    const es = db.entregas.filter((e) => e.tareaId === t.id);
    return {
      id: t.id, ofertaId: t.ofertaId, cursoNombre: od.cursoNombre, titulo: t.titulo, descripcion: t.descripcion,
      fechaLimite: t.fechaLimite, puntajeMax: t.puntajeMax, totalAlumnos: od.totalAlumnos,
      totalEntregas: es.length, totalCalificadas: es.filter((e) => e.nota != null).length,
    };
  }
  function tareaAlumnoDto(t: any, matriculaId: number) {
    const od = ofertaDto(db.ofertas.find((o) => o.id === t.ofertaId));
    const e = db.entregas.find((x) => x.tareaId === t.id && x.matriculaId === matriculaId);
    return {
      id: t.id, ofertaId: t.ofertaId, cursoCodigo: od.cursoCodigo, cursoNombre: od.cursoNombre, titulo: t.titulo,
      descripcion: t.descripcion, fechaLimite: t.fechaLimite, puntajeMax: t.puntajeMax,
      estado: estadoTarea(t, e), entrega: e ? entregaDto(e) : null,
    };
  }

  /* --- control de acceso docente --- */
  function ofertaDeDocente(ofertaId: unknown, user: any) {
    const o = find(db.ofertas, ofertaId, 'El curso');
    if (o.docenteId !== user.id) throw new HttpErr(403, 'Este curso no está asignado a tu usuario.');
    return o;
  }
  function tareaDeDocente(tareaId: unknown, user: any) {
    const t = find(db.tareas, tareaId, 'La tarea');
    ofertaDeDocente(t.ofertaId, user);
    return t;
  }
  function sesionDeDocente(sesionId: unknown, user: any) {
    const s = find(db.sesiones, sesionId, 'La sesión');
    ofertaDeDocente(s.ofertaId, user);
    return s;
  }
  function matriculaDeAlumno(ofertaId: unknown, user: any) {
    const m = db.matriculas.find((x) => x.ofertaId === Number(ofertaId) && x.alumnoId === user.id);
    if (!m) throw new HttpErr(403, 'No estás matriculado en este curso.');
    return m;
  }

  /* --- registro de rutas --- */
  function on(method: string, pattern: string, fn: Handler) {
    const keys: string[] = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    const role = pattern.startsWith('/admin') ? 'ADMIN' : pattern.startsWith('/docente') ? 'DOCENTE' : pattern.startsWith('/alumno') ? 'ALUMNO' : null;
    routes.push({ method, re, keys, role, fn });
  }

  /* ============================ AUTH ============================ */
  on('POST', '/auth/login', ({ body }) => {
    const login = optStr(body.username).toLowerCase();
    const u = db.usuarios.find((x) => x.username.toLowerCase() === login || x.email.toLowerCase() === login);
    if (!u || u.password !== body.password || !u.activo) throw new HttpErr(401, 'Credenciales incorrectas.');
    return { token: `mock-token-${u.id}`, type: 'Bearer', id: u.id, username: u.username, email: u.email, rol: u.rol, nombres: u.nombres, apellidos: u.apellidos };
  });

  /* ============================ ADMIN ============================ */
  const listaUsuarios = (rol: string) => () =>
    db.usuarios.filter((u) => u.rol === rol).map(pub).sort((a, b) => a.apellidos.localeCompare(b.apellidos));
  const crearUsuario = (rol: string) => ({ body }: Ctx) => {
    const username = str(body.username, 'El usuario', 3).toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(username)) throw new HttpErr(400, 'El usuario solo admite letras, números, punto, guion y guion bajo.');
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length < 6) throw new HttpErr(400, 'La contraseña debe tener al menos 6 caracteres.');
    const nombres = str(body.nombres, 'Los nombres');
    const apellidos = str(body.apellidos, 'Los apellidos');
    const email = str(body.email, 'El correo').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpErr(400, 'El correo no tiene un formato válido.');
    if (db.usuarios.some((u) => u.username.toLowerCase() === username)) throw new HttpErr(409, `El usuario "${username}" ya existe.`);
    if (db.usuarios.some((u) => u.email.toLowerCase() === email)) throw new HttpErr(409, `El correo "${email}" ya está registrado.`);
    const u = { id: nextId(), username, password, nombres, apellidos, email, rol, activo: true };
    db.usuarios.push(u);
    return new Created(pub(u));
  };
  on('GET', '/admin/docentes', listaUsuarios('DOCENTE'));
  on('POST', '/admin/docentes', crearUsuario('DOCENTE'));
  on('GET', '/admin/alumnos', listaUsuarios('ALUMNO'));
  on('POST', '/admin/alumnos', crearUsuario('ALUMNO'));

  on('GET', '/admin/periodos', () => [...db.periodos].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)));
  on('POST', '/admin/periodos', ({ body }) => {
    const nombre = str(body.nombre, 'El nombre del periodo');
    const fechaInicio = str(body.fechaInicio, 'La fecha de inicio');
    const fechaFin = str(body.fechaFin, 'La fecha de fin');
    if (!isDate(fechaInicio) || !isDate(fechaFin)) throw new HttpErr(400, 'Las fechas no son válidas.');
    if (fechaFin <= fechaInicio) throw new HttpErr(400, 'La fecha de fin debe ser posterior a la de inicio.');
    if (db.periodos.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) throw new HttpErr(409, `El periodo "${nombre}" ya existe.`);
    const p = { id: nextId(), nombre, fechaInicio, fechaFin };
    db.periodos.push(p);
    return new Created(p);
  });

  on('GET', '/admin/cursos', () => [...db.cursos].sort((a, b) => a.codigo.localeCompare(b.codigo)));
  on('POST', '/admin/cursos', ({ body }) => {
    const codigo = str(body.codigo, 'El código').toUpperCase();
    const nombre = str(body.nombre, 'El nombre del curso');
    if (db.cursos.some((c) => c.codigo === codigo)) throw new HttpErr(409, `El código "${codigo}" ya existe.`);
    const c = { id: nextId(), codigo, nombre, descripcion: optStr(body.descripcion) };
    db.cursos.push(c);
    return new Created(c);
  });

  on('GET', '/admin/ofertas', ({ query }) =>
    db.ofertas.filter((o) => !query['periodoId'] || o.periodoId === Number(query['periodoId'])).map(ofertaDto)
      .sort((a, b) => a.cursoNombre.localeCompare(b.cursoNombre)));
  on('POST', '/admin/ofertas', ({ body }) => {
    const curso = find(db.cursos, body.cursoId, 'El curso');
    const periodo = find(db.periodos, body.periodoId, 'El periodo');
    if (db.ofertas.some((o) => o.cursoId === curso.id && o.periodoId === periodo.id))
      throw new HttpErr(409, `"${curso.nombre}" ya está asignado al periodo ${periodo.nombre}.`);
    let docenteId: number | null = null;
    if (body.docenteId != null && body.docenteId !== '') {
      const d = find(db.usuarios, body.docenteId, 'El docente');
      if (d.rol !== 'DOCENTE') throw new HttpErr(400, 'El usuario seleccionado no es docente.');
      docenteId = d.id;
    }
    const o = { id: nextId(), cursoId: curso.id, periodoId: periodo.id, docenteId };
    db.ofertas.push(o);
    return new Created(ofertaDto(o));
  });
  on('PUT', '/admin/ofertas/:id/docente', ({ params, body }) => {
    const o = find(db.ofertas, params['id'], 'La oferta');
    if (body.docenteId == null || body.docenteId === '') o.docenteId = null;
    else {
      const d = find(db.usuarios, body.docenteId, 'El docente');
      if (d.rol !== 'DOCENTE') throw new HttpErr(400, 'El usuario seleccionado no es docente.');
      o.docenteId = d.id;
    }
    return ofertaDto(o);
  });
  on('DELETE', '/admin/ofertas/:id', ({ params }) => {
    const o = find(db.ofertas, params['id'], 'La oferta');
    if (db.matriculas.some((m) => m.ofertaId === o.id)) throw new HttpErr(409, 'No se puede quitar: el curso tiene alumnos matriculados.');
    db.ofertas = db.ofertas.filter((x) => x.id !== o.id);
    db.sesiones = db.sesiones.filter((s) => s.ofertaId !== o.id);
    db.tareas = db.tareas.filter((t) => t.ofertaId !== o.id);
    return null;
  });

  on('GET', '/admin/sesiones', ({ query }) =>
    db.sesiones.filter((s) => !query['ofertaId'] || s.ofertaId === Number(query['ofertaId'])).map(sesionDto)
      .sort((a, b) => a.ofertaId - b.ofertaId || a.numero - b.numero));
  on('POST', '/admin/sesiones', ({ body }) => {
    const o = find(db.ofertas, body.ofertaId, 'El curso del periodo');
    const titulo = str(body.titulo, 'El título');
    const fecha = str(body.fecha, 'La fecha');
    if (!isDate(fecha)) throw new HttpErr(400, 'La fecha no es válida.');
    const p = db.periodos.find((x) => x.id === o.periodoId);
    if (fecha < p.fechaInicio || fecha > p.fechaFin) throw new HttpErr(400, `La fecha debe estar dentro del periodo ${p.nombre} (${p.fechaInicio} a ${p.fechaFin}).`);
    const numero = Math.max(0, ...db.sesiones.filter((s) => s.ofertaId === o.id).map((s) => s.numero)) + 1;
    const s = { id: nextId(), ofertaId: o.id, numero, titulo, fecha, descripcion: optStr(body.descripcion) };
    db.sesiones.push(s);
    return new Created(sesionDto(s));
  });

  on('GET', '/admin/matriculas', ({ query }) =>
    db.matriculas
      .filter((m) => !query['ofertaId'] || m.ofertaId === Number(query['ofertaId']))
      .filter((m) => !query['periodoId'] || db.ofertas.find((o) => o.id === m.ofertaId).periodoId === Number(query['periodoId']))
      .map(matriculaDto)
      .sort((a, b) => a.alumnoNombre!.localeCompare(b.alumnoNombre!)));
  on('POST', '/admin/matriculas', ({ body }) => {
    const alumno = find(db.usuarios, body.alumnoId, 'El alumno');
    if (alumno.rol !== 'ALUMNO') throw new HttpErr(400, 'El usuario seleccionado no es alumno.');
    const oferta = find(db.ofertas, body.ofertaId, 'El curso del periodo');
    // Regla: un alumno no puede matricularse dos veces en el mismo curso dentro del mismo periodo.
    const duplicada = db.matriculas.some((m) => {
      if (m.alumnoId !== alumno.id) return false;
      const o = db.ofertas.find((x) => x.id === m.ofertaId);
      return o.cursoId === oferta.cursoId && o.periodoId === oferta.periodoId;
    });
    if (duplicada) {
      const od = ofertaDto(oferta);
      throw new HttpErr(409, `${nombreDe(alumno)} ya está matriculado en ${od.cursoNombre} (${od.periodoNombre}).`);
    }
    const m = { id: nextId(), alumnoId: alumno.id, ofertaId: oferta.id, notaFinal: null, observacion: '' };
    db.matriculas.push(m);
    return new Created(matriculaDto(m));
  });
  on('DELETE', '/admin/matriculas/:id', ({ params }) => {
    const m = find(db.matriculas, params['id'], 'La matrícula');
    db.matriculas = db.matriculas.filter((x) => x.id !== m.id);
    db.asistencias = db.asistencias.filter((a) => a.matriculaId !== m.id);
    db.entregas = db.entregas.filter((e) => e.matriculaId !== m.id);
    return null;
  });

  /* ============================ DOCENTE ============================ */
  on('GET', '/docente/cursos', ({ user }) => db.ofertas.filter((o) => o.docenteId === user.id).map(ofertaDto));
  on('GET', '/docente/cursos/:id', ({ params, user }) => ofertaDto(ofertaDeDocente(params['id'], user)));
  on('GET', '/docente/cursos/:id/alumnos', ({ params, user }) => {
    const o = ofertaDeDocente(params['id'], user);
    return db.matriculas.filter((m) => m.ofertaId === o.id).map(matriculaDto).sort((a, b) => a.alumnoNombre!.localeCompare(b.alumnoNombre!));
  });
  on('PUT', '/docente/matriculas/:id/calificacion', ({ params, body, user }) => {
    const m = find(db.matriculas, params['id'], 'La matrícula');
    ofertaDeDocente(m.ofertaId, user);
    const nota = toNum(body.nota, 'La nota');
    if (nota < 0 || nota > 20) throw new HttpErr(400, 'La nota debe estar entre 0 y 20.');
    m.notaFinal = round2(nota);
    m.observacion = optStr(body.observacion);
    return matriculaDto(m);
  });

  on('GET', '/docente/cursos/:id/sesiones', ({ params, user }) => {
    const o = ofertaDeDocente(params['id'], user);
    return db.sesiones.filter((s) => s.ofertaId === o.id).sort((a, b) => a.numero - b.numero).map((s) => {
      const regs = db.asistencias.filter((a) => a.sesionId === s.id);
      return { ...sesionDto(s), asistenciaRegistrada: regs.length > 0, presentes: regs.filter((a) => a.estado === 'PRESENTE' || a.estado === 'TARDANZA').length, registrados: regs.length };
    });
  });
  on('GET', '/docente/sesiones/:id/asistencia', ({ params, user }) => {
    const s = sesionDeDocente(params['id'], user);
    return db.matriculas.filter((m) => m.ofertaId === s.ofertaId).map((m) => ({
      matriculaId: m.id,
      alumnoNombre: nombreDe(db.usuarios.find((u) => u.id === m.alumnoId)),
      estado: db.asistencias.find((a) => a.sesionId === s.id && a.matriculaId === m.id)?.estado ?? null,
    })).sort((a, b) => a.alumnoNombre!.localeCompare(b.alumnoNombre!));
  });
  on('PUT', '/docente/sesiones/:id/asistencia', ({ params, body, user }) => {
    const s = sesionDeDocente(params['id'], user);
    if (!Array.isArray(body)) throw new HttpErr(400, 'Formato de asistencia no válido.');
    for (const r of body) {
      const m = db.matriculas.find((x) => x.id === Number(r.matriculaId) && x.ofertaId === s.ofertaId);
      if (!m) throw new HttpErr(400, 'Hay alumnos que no pertenecen a este curso.');
      if (!ESTADOS_ASISTENCIA.includes(r.estado)) throw new HttpErr(400, 'Estado de asistencia no válido.');
    }
    for (const r of body) {
      const ex = db.asistencias.find((a) => a.sesionId === s.id && a.matriculaId === Number(r.matriculaId));
      if (ex) ex.estado = r.estado;
      else db.asistencias.push({ sesionId: s.id, matriculaId: Number(r.matriculaId), estado: r.estado });
    }
    return null;
  });

  on('GET', '/docente/cursos/:id/tareas', ({ params, user }) => {
    const o = ofertaDeDocente(params['id'], user);
    return db.tareas.filter((t) => t.ofertaId === o.id).map(tareaDocenteDto).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
  });
  on('POST', '/docente/cursos/:id/tareas', ({ params, body, user }) => {
    const o = ofertaDeDocente(params['id'], user);
    const titulo = str(body.titulo, 'El título');
    const fechaLimite = str(body.fechaLimite, 'La fecha límite');
    if (!isDateTime(fechaLimite)) throw new HttpErr(400, 'La fecha límite no es válida.');
    const puntajeMax = body.puntajeMax == null || body.puntajeMax === '' ? 20 : toNum(body.puntajeMax, 'El puntaje máximo');
    if (puntajeMax <= 0 || puntajeMax > 100) throw new HttpErr(400, 'El puntaje máximo debe estar entre 1 y 100.');
    const t = { id: nextId(), ofertaId: o.id, titulo, descripcion: optStr(body.descripcion), fechaLimite: fechaLimite.slice(0, 16), puntajeMax };
    db.tareas.push(t);
    return new Created(tareaDocenteDto(t));
  });
  on('GET', '/docente/tareas/:id', ({ params, user }) => tareaDocenteDto(tareaDeDocente(params['id'], user)));
  on('GET', '/docente/tareas/:id/entregas', ({ params, user }) => {
    const t = tareaDeDocente(params['id'], user);
    return db.matriculas.filter((m) => m.ofertaId === t.ofertaId).map((m) => {
      const e = db.entregas.find((x) => x.tareaId === t.id && x.matriculaId === m.id);
      return {
        matriculaId: m.id, alumnoId: m.alumnoId, alumnoNombre: nombreDe(db.usuarios.find((u) => u.id === m.alumnoId)),
        entregaId: e?.id ?? null, archivoNombre: e?.archivoNombre ?? null, archivoTamano: e?.archivoTamano ?? null, archivoUrl: null,
        comentario: e?.comentario ?? null, fechaEntrega: e?.fechaEntrega ?? null, nota: e?.nota ?? null,
        retroalimentacion: e?.retroalimentacion ?? null, estado: estadoTarea(t, e),
      };
    }).sort((a, b) => a.alumnoNombre!.localeCompare(b.alumnoNombre!));
  });
  // El docente SOLO puede calificar: este endpoint modifica nota y retroalimentación, nunca el contenido entregado.
  on('PUT', '/docente/entregas/:id/calificacion', ({ params, body, user }) => {
    const e = find(db.entregas, params['id'], 'La entrega');
    const t = tareaDeDocente(e.tareaId, user);
    const nota = toNum(body.nota, 'La nota');
    if (nota < 0 || nota > t.puntajeMax) throw new HttpErr(400, `La nota debe estar entre 0 y ${t.puntajeMax}.`);
    e.nota = round2(nota);
    e.retroalimentacion = optStr(body.retroalimentacion);
    return entregaDto(e);
  });

  /* ============================ ALUMNO ============================ */
  on('GET', '/alumno/cursos', ({ user }) => db.matriculas.filter((m) => m.alumnoId === user.id).map(matriculaDto));
  on('GET', '/alumno/cursos/:ofertaId/sesiones', ({ params, user }) => {
    matriculaDeAlumno(params['ofertaId'], user);
    return db.sesiones.filter((s) => s.ofertaId === Number(params['ofertaId'])).sort((a, b) => a.numero - b.numero).map(sesionDto);
  });
  on('GET', '/alumno/tareas', ({ user }) =>
    db.matriculas.filter((m) => m.alumnoId === user.id).flatMap((m) =>
      db.tareas.filter((t) => t.ofertaId === m.ofertaId).map((t) => tareaAlumnoDto(t, m.id)))
      .sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite)));
  on('POST', '/alumno/tareas/:id/entrega', ({ params, body, user }) => {
    const t = find(db.tareas, params['id'], 'La tarea');
    const m = matriculaDeAlumno(t.ofertaId, user);
    const archivoNombre = str(body.archivoNombre, 'El archivo adjunto');
    const archivoTamano = body.archivoTamano == null ? 0 : toNum(body.archivoTamano, 'El tamaño del archivo');
    if (archivoTamano > 10 * 1024 * 1024) throw new HttpErr(400, 'El archivo supera el máximo de 10 MB.');
    if (vencida(t)) throw new HttpErr(409, 'La fecha límite de esta tarea ya venció.');
    const ex = db.entregas.find((e) => e.tareaId === t.id && e.matriculaId === m.id);
    if (ex && ex.nota != null) throw new HttpErr(409, 'Esta tarea ya fue calificada y no se puede modificar.');
    const fechaEntrega = clock().toISOString().slice(0, 16);
    if (ex) Object.assign(ex, { archivoNombre, archivoTamano, comentario: optStr(body.comentario), fechaEntrega });
    else db.entregas.push({ id: nextId(), tareaId: t.id, matriculaId: m.id, archivoNombre, archivoTamano, comentario: optStr(body.comentario), fechaEntrega, nota: null, retroalimentacion: '' });
    return new Created(tareaAlumnoDto(t, m.id));
  });

  /* ============================ despacho ============================ */
  function handle(req: MockRequest): MockResponse {
    try {
      const path = req.path.replace(/\/+$/, '') || '/';
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(path);
        if (!m) continue;
        const params: Record<string, string> = {};
        r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        let user: any = null;
        if (r.role) {
          user = userFromToken(req.token);
          if (!user) throw new HttpErr(401, 'Tu sesión no es válida. Inicia sesión nuevamente.');
          if (user.rol !== r.role) throw new HttpErr(403, 'No tienes permiso para realizar esta acción.');
        }
        const out = r.fn({ params, query: req.query, body: req.body ?? {}, user });
        if (req.method !== 'GET') save();
        return out instanceof Created ? { status: 201, body: out.body } : { status: 200, body: out ?? null };
      }
      throw new HttpErr(404, 'Recurso no encontrado.');
    } catch (e) {
      if (e instanceof HttpErr) return { status: e.status, body: { message: e.message } };
      console.error('[mock] error interno', e);
      return { status: 500, body: { message: 'Error interno del servidor simulado.' } };
    }
  }

  return { handle, reset };
}
