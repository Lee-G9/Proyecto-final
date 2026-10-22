# Aula Nexa · LMS (frontend Angular 20)

Frontend de la plataforma LMS con tres paneles: **Administrador**, **Docente** y **Alumno**.

## Ejecutar

```bash
npm install
ng serve        # http://localhost:4200
```

Por defecto corre en **modo demostración** (`src/environments/environment.ts` → `useMock: true`): un backend simulado en memoria
(persistido en `localStorage`) responde todas las peticiones, así que no necesitas Spring Boot para probar.

Cuentas demo (contraseña `123456`): `admin`, `carlos` y `vincent` (docentes), `pablo`, `rodrigo` y `mrlee` (alumnos).
Los datos iniciales reproducen el ejemplo: periodo 2026-II con Mate 1, Mate 2 y Cálculo; Carlos dicta Mate 1 y 2, Vincent dicta Cálculo.

Para conectar al backend real: `useMock: false` y ajustar `apiUrl` (por defecto `http://localhost:8080/api`).

## Funcionalidad

**Admin** — registrar docentes y alumnos · crear periodos · crear cursos · asignar cursos a periodos y docentes a cada curso ·
crear sesiones · matricular alumnos (varios a la vez) en un curso-periodo. Un alumno puede llevar varios cursos, pero no el mismo curso dos veces en el mismo periodo.

**Docente** — ver cursos asignados · ver alumnos matriculados · calificar (nota final) · registrar asistencia por sesión · crear tareas ·
revisar entregas y calificarlas (solo lectura sobre lo entregado: no puede editarlo).

**Alumno** — ver cursos matriculados (sesiones y tareas) · tareas pendientes/entregadas/vencidas · subir y reemplazar entregas (hasta que se califique) · ver calificaciones.

Seguridad en el front: interceptor que agrega `Authorization: Bearer <jwt>`, cierre de sesión automático ante 401, `authGuard` + `roleGuard` en cada panel.

## Contrato de API esperado por el frontend

Todas las rutas cuelgan de `apiUrl`. Errores: `{ "message": "..." }` con 400/401/403/404/409. Escala de notas: 0–20.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | `{username,password}` → `{token,type,id,username,email,rol,nombres?,apellidos?}` |
| GET/POST | `/admin/docentes`, `/admin/alumnos` | listar / registrar (`username,password,nombres,apellidos,email`) |
| GET/POST | `/admin/periodos` | `{nombre,fechaInicio,fechaFin}` |
| GET/POST | `/admin/cursos` | `{codigo,nombre,descripcion}` |
| GET/POST | `/admin/ofertas?periodoId=` | curso en un periodo: POST `{cursoId,periodoId,docenteId?}` (409 si ya existe) |
| PUT | `/admin/ofertas/{id}/docente` | `{docenteId|null}` |
| DELETE | `/admin/ofertas/{id}` | 409 si tiene alumnos |
| GET/POST | `/admin/sesiones?ofertaId=` | POST `{ofertaId,titulo,fecha,descripcion}` (fecha dentro del periodo) |
| GET/POST | `/admin/matriculas?ofertaId=&periodoId=` | POST `{alumnoId,ofertaId}` → **409 si el alumno ya está en ese curso y periodo** |
| DELETE | `/admin/matriculas/{id}` | anular matrícula |
| GET | `/docente/cursos`, `/docente/cursos/{id}` | cursos asignados al docente autenticado (403 si no es suyo) |
| GET | `/docente/cursos/{id}/alumnos` | matriculados (incluye `notaFinal`, `promedioTareas`) |
| PUT | `/docente/matriculas/{id}/calificacion` | `{nota,observacion}` |
| GET | `/docente/cursos/{id}/sesiones` | con `asistenciaRegistrada`, `presentes`, `registrados` |
| GET/PUT | `/docente/sesiones/{id}/asistencia` | PUT `[{matriculaId,estado}]` (`PRESENTE,TARDANZA,FALTA,JUSTIFICADO`) |
| GET/POST | `/docente/cursos/{id}/tareas` | POST `{titulo,descripcion,fechaLimite,puntajeMax}` |
| GET | `/docente/tareas/{id}`, `/docente/tareas/{id}/entregas` | una fila por alumno matriculado (con o sin entrega) |
| PUT | `/docente/entregas/{id}/calificacion` | `{nota,retroalimentacion}` — solo califica, no modifica el archivo |
| GET | `/alumno/cursos`, `/alumno/cursos/{ofertaId}/sesiones` | matrículas del alumno autenticado |
| GET | `/alumno/tareas` | con `estado` (`PENDIENTE,ENTREGADA,CALIFICADA,VENCIDA`) y `entrega` |
| POST | `/alumno/tareas/{id}/entrega` | `multipart/form-data`: `archivo`, `comentario` (máx. 10 MB; 409 si venció o ya fue calificada) |

Los modelos exactos están en `src/app/core/models.ts`. La implementación de referencia de estas reglas es `src/app/core/mock/mock-db.ts`.

## Estructura

```
src/app/
  core/          modelos, interceptores, guards, utilidades y backend simulado (mock/)
  shared/        shell (sidebar + topbar + logout) y mensajes
  auth/          login, servicios (auth, admin, docentes, alumnos) y wrappers de cada panel
  admin/pages    inicio, usuarios, periodos, cursos, oferta, sesiones, matrículas
  docente/pages  inicio, cursos, curso-detalle (notas/asistencia/tareas), entregas
  alumno/pages   inicio, cursos, tareas, calificaciones
```

## Tests

`ng test` (Karma/Jasmine). Incluye un test de integración (`app.integration.spec.ts`) que recorre rutas, guards, interceptores y las reglas
de negocio de los tres roles contra el backend simulado.
