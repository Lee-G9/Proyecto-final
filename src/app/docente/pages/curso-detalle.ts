import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DocentesService } from '../../auth/services/docentes.service';
import { EstadoAsistencia, FilaAsistencia, Matricula, Oferta, SesionDocente, TareaDocente } from '../../core/models';
import { errMsg, notaClase } from '../../core/util';
import { Flash } from '../../shared/flash';

interface FilaNota { m: Matricula; nota: number | null; obs: string; guardando: boolean; }
type Pestana = 'alumnos' | 'asistencia' | 'tareas';

@Component({
  selector: 'app-docente-curso-detalle',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <a class="back-link" routerLink="/docente-dashboard/cursos">← Mis cursos</a>

    @if (cargando()) { <div class="loading">Cargando curso…</div> }
    @else if (curso(); as c) {
      <div class="page-head">
        <div><h1>{{ c.cursoNombre }}</h1><p>{{ c.cursoCodigo }} · Periodo {{ c.periodoNombre }} · {{ filas().length }} alumnos matriculados</p></div>
      </div>

      @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

      <div class="tabs" role="tablist">
        <button type="button" role="tab" class="tab" [class.activa]="pestana() === 'alumnos'" (click)="pestana.set('alumnos')">Alumnos y notas</button>
        <button type="button" role="tab" class="tab" [class.activa]="pestana() === 'asistencia'" (click)="pestana.set('asistencia')">Asistencia</button>
        <button type="button" role="tab" class="tab" [class.activa]="pestana() === 'tareas'" (click)="pestana.set('tareas')">Tareas</button>
      </div>

      <!-- ===================== ALUMNOS Y NOTAS ===================== -->
      @if (pestana() === 'alumnos') {
        @if (filas().length === 0) { <div class="empty">Aún no hay alumnos matriculados en este curso.</div> }
        @else {
          <div class="tabla-wrap">
            <table class="tabla">
              <thead><tr><th>Alumno</th><th class="num">Prom. tareas</th><th>Nota final (0–20)</th><th>Observación</th><th></th></tr></thead>
              <tbody>
                @for (f of filas(); track f.m.id) {
                  <tr>
                    <td class="strong">{{ f.m.alumnoNombre }}</td>
                    <td class="num">{{ f.m.promedioTareas ?? '—' }}</td>
                    <td style="width: 140px"><input class="input compacto" type="number" min="0" max="20" step="0.5" [attr.aria-label]="'Nota final de ' + f.m.alumnoNombre" [(ngModel)]="f.nota" /></td>
                    <td style="min-width: 220px"><input class="input compacto" [attr.aria-label]="'Observación para ' + f.m.alumnoNombre" [(ngModel)]="f.obs" placeholder="Opcional" /></td>
                    <td class="acciones"><button type="button" class="btn btn-primary btn-sm" [disabled]="f.guardando" (click)="guardarNota(f)">{{ f.guardando ? 'Guardando…' : 'Guardar' }}</button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- ===================== ASISTENCIA ===================== -->
      @if (pestana() === 'asistencia') {
        @if (sesiones().length === 0) { <div class="empty">El administrador aún no creó sesiones para este curso.</div> }
        @else {
          <div class="tabla-wrap">
            <table class="tabla">
              <thead><tr><th class="num">N.º</th><th>Sesión</th><th>Fecha</th><th>Asistencia</th><th></th></tr></thead>
              <tbody>
                @for (s of sesiones(); track s.id) {
                  <tr>
                    <td class="num">{{ s.numero }}</td><td class="strong">{{ s.titulo }}</td><td>{{ s.fecha | date: 'dd/MM/yyyy' }}</td>
                    <td>@if (s.asistenciaRegistrada) { <span class="badge b-ok">Registrada · {{ s.presentes }}/{{ s.registrados }} asistieron</span> } @else { <span class="badge b-warn">Pendiente</span> }</td>
                    <td class="acciones"><button type="button" class="btn btn-sm" [class.btn-primary]="!s.asistenciaRegistrada" [class.btn-ghost]="s.asistenciaRegistrada" (click)="abrirAsistencia(s)">
                      {{ s.asistenciaRegistrada ? 'Editar' : 'Tomar asistencia' }}</button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (sesionSel(); as s) {
          <div class="card" style="margin-top: 20px">
            <div class="card-top">
              <h3>Sesión {{ s.numero }}: {{ s.titulo }}</h3>
              <button type="button" class="btn btn-ghost btn-sm" (click)="sesionSel.set(null)">Cerrar</button>
            </div>
            @if (asistencia().length === 0) { <p class="muted">No hay alumnos matriculados.</p> }
            @else {
              <div class="tabla-wrap" style="margin-top: 12px; border: none">
                <table class="tabla">
                  <thead><tr><th>Alumno</th><th>Estado</th></tr></thead>
                  <tbody>
                    @for (a of asistencia(); track a.matriculaId) {
                      <tr>
                        <td class="strong">{{ a.alumnoNombre }}</td>
                        <td>
                          <div class="segmentos" role="group" [attr.aria-label]="'Asistencia de ' + a.alumnoNombre">
                            @for (e of estados; track e.v) {
                              <button type="button" class="segmento" [class]="'segmento' + (a.estado === e.v ? ' sel-' + e.v : '')" [attr.aria-pressed]="a.estado === e.v" (click)="a.estado = e.v">{{ e.l }}</button>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="form-actions" style="justify-content: space-between">
                <button type="button" class="btn btn-ghost" (click)="marcarTodos()">Marcar todos presentes</button>
                <button type="button" class="btn btn-primary" [disabled]="guardandoAsistencia()" (click)="guardarAsistencia()">{{ guardandoAsistencia() ? 'Guardando…' : 'Guardar asistencia' }}</button>
              </div>
            }
          </div>
        }
      }

      <!-- ===================== TAREAS ===================== -->
      @if (pestana() === 'tareas') {
        <div style="display: flex; justify-content: flex-end; margin-bottom: 16px">
          <button type="button" class="btn btn-primary" (click)="mostrarFormTarea.set(!mostrarFormTarea())">{{ mostrarFormTarea() ? 'Cerrar formulario' : '+ Crear tarea' }}</button>
        </div>

        @if (mostrarFormTarea()) {
          <form class="card form-card" #f="ngForm" (ngSubmit)="crearTarea(f)" novalidate>
            <div class="form-grid">
              <div class="field"><label for="tt">Título</label>
                <input class="input" id="tt" name="titulo" [(ngModel)]="formTarea.titulo" required autocomplete="off" /></div>
              <div class="field"><label for="tf">Fecha y hora límite</label>
                <input class="input" id="tf" name="fecha" type="datetime-local" [(ngModel)]="formTarea.fechaLimite" required /></div>
              <div class="field"><label for="tp">Puntaje máximo</label>
                <input class="input" id="tp" name="puntaje" type="number" min="1" max="100" [(ngModel)]="formTarea.puntajeMax" required /></div>
              <div class="field full"><label for="td">Consigna / instrucciones</label>
                <textarea class="textarea" id="td" name="desc" [(ngModel)]="formTarea.descripcion"></textarea></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-ghost" (click)="cancelarTarea(f)">Cancelar</button>
              <button type="submit" class="btn btn-primary" [disabled]="guardandoTarea()">{{ guardandoTarea() ? 'Guardando…' : 'Crear tarea' }}</button>
            </div>
          </form>
        }

        @if (tareas().length === 0) { <div class="empty">Todavía no creaste tareas para este curso.</div> }
        @else {
          <div class="tabla-wrap">
            <table class="tabla">
              <thead><tr><th>Tarea</th><th>Fecha límite</th><th class="num">Puntaje</th><th class="num">Entregas</th><th class="num">Calificadas</th><th></th></tr></thead>
              <tbody>
                @for (t of tareas(); track t.id) {
                  <tr>
                    <td class="strong">{{ t.titulo }}</td><td>{{ t.fechaLimite | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td class="num">{{ t.puntajeMax }}</td><td class="num">{{ t.totalEntregas }}/{{ t.totalAlumnos }}</td><td class="num">{{ t.totalCalificadas }}</td>
                    <td class="acciones"><a class="btn btn-dark btn-sm" [routerLink]="['tareas', t.id]">Revisar entregas</a></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    }
  `,
})
export class DocenteCursoDetalle implements OnInit {
  /** Parámetro :id de la ruta (withComponentInputBinding). */
  id = input.required<string>();
  private api = inject(DocentesService);
  private ofertaId = computed(() => Number(this.id()));

  curso = signal<Oferta | null>(null);
  filas = signal<FilaNota[]>([]);
  sesiones = signal<SesionDocente[]>([]);
  tareas = signal<TareaDocente[]>([]);
  cargando = signal(true);
  pestana = signal<Pestana>('alumnos');
  flash = new Flash();

  sesionSel = signal<SesionDocente | null>(null);
  asistencia = signal<FilaAsistencia[]>([]);
  guardandoAsistencia = signal(false);
  estados: { v: EstadoAsistencia; l: string }[] = [
    { v: 'PRESENTE', l: 'Presente' }, { v: 'TARDANZA', l: 'Tardanza' }, { v: 'FALTA', l: 'Falta' }, { v: 'JUSTIFICADO', l: 'Justificado' },
  ];

  mostrarFormTarea = signal(false);
  guardandoTarea = signal(false);
  formTarea = { titulo: '', descripcion: '', fechaLimite: '', puntajeMax: 20 };
  notaClase = notaClase;

  ngOnInit() {
    const id = this.ofertaId();
    forkJoin({ c: this.api.getCurso(id), a: this.api.alumnos(id), s: this.api.sesiones(id), t: this.api.tareas(id) }).subscribe({
      next: (r) => {
        this.curso.set(r.c);
        this.setAlumnos(r.a);
        this.sesiones.set(r.s);
        this.tareas.set(r.t);
        this.cargando.set(false);
      },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudo cargar el curso.')); },
    });
  }

  private setAlumnos(a: Matricula[]) {
    this.filas.set(a.map((m) => ({ m, nota: m.notaFinal, obs: m.observacion, guardando: false })));
  }

  /* ---- notas ---- */
  guardarNota(f: FilaNota) {
    if (f.nota == null || isNaN(Number(f.nota)) || f.nota < 0 || f.nota > 20) { this.flash.err('La nota debe estar entre 0 y 20.'); return; }
    f.guardando = true;
    this.api.calificarAlumno(f.m.id, Number(f.nota), f.obs).subscribe({
      next: (m) => { f.guardando = false; f.m = m; f.nota = m.notaFinal; this.flash.ok(`Nota de ${m.alumnoNombre} guardada (${m.notaFinal}).`); },
      error: (e) => { f.guardando = false; this.flash.err(errMsg(e, 'No se pudo guardar la nota.')); },
    });
  }

  /* ---- asistencia ---- */
  abrirAsistencia(s: SesionDocente) {
    this.api.asistencia(s.id).subscribe({
      next: (a) => { this.asistencia.set(a); this.sesionSel.set(s); },
      error: (e) => this.flash.err(errMsg(e, 'No se pudo cargar la asistencia.')),
    });
  }

  marcarTodos() {
    this.asistencia.update((l) => l.map((a) => ({ ...a, estado: 'PRESENTE' as EstadoAsistencia })));
  }

  guardarAsistencia() {
    const s = this.sesionSel();
    if (!s) return;
    const sinMarcar = this.asistencia().filter((a) => a.estado == null);
    if (sinMarcar.length) { this.flash.err(`Falta marcar a: ${sinMarcar.map((a) => a.alumnoNombre).join(', ')}.`); return; }
    this.guardandoAsistencia.set(true);
    this.api.guardarAsistencia(s.id, this.asistencia().map((a) => ({ matriculaId: a.matriculaId, estado: a.estado as EstadoAsistencia }))).subscribe({
      next: () => {
        this.guardandoAsistencia.set(false);
        this.flash.ok(`Asistencia de la sesión ${s.numero} guardada.`);
        this.sesionSel.set(null);
        this.api.sesiones(this.ofertaId()).subscribe((l) => this.sesiones.set(l));
      },
      error: (e) => { this.guardandoAsistencia.set(false); this.flash.err(errMsg(e, 'No se pudo guardar la asistencia.')); },
    });
  }

  /* ---- tareas ---- */
  crearTarea(f: NgForm) {
    if (f.invalid) { f.control.markAllAsTouched(); this.flash.err('Completa el título, la fecha límite y el puntaje.'); return; }
    this.guardandoTarea.set(true);
    this.api.crearTarea(this.ofertaId(), this.formTarea).subscribe({
      next: (t) => {
        this.guardandoTarea.set(false);
        this.flash.ok(`Tarea "${t.titulo}" creada.`);
        this.cancelarTarea(f);
        this.api.tareas(this.ofertaId()).subscribe((l) => this.tareas.set(l));
      },
      error: (e) => { this.guardandoTarea.set(false); this.flash.err(errMsg(e, 'No se pudo crear la tarea.')); },
    });
  }

  cancelarTarea(f: NgForm) {
    f.resetForm();
    this.formTarea = { titulo: '', descripcion: '', fechaLimite: '', puntajeMax: 20 };
    this.mostrarFormTarea.set(false);
  }
}
