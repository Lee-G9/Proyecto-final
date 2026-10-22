import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DocentesService } from '../../auth/services/docentes.service';
import { Oferta, Sesion, Tarea } from '../../core/models';
import { errMsg } from '../../core/util';
import { Flash } from '../../shared/flash';

type Pestana = 'sesiones' | 'tareas';

const sesionVacia = () => ({ titulo: '', fecha: '', descripcion: '', numero: 1 });
const tareaVacia = () => ({ titulo: '', descripcion: '', fechaLimite: '' });

/** Detalle de un curso del docente: gestiona las sesiones y tareas de su asignación. */
@Component({
  selector: 'app-docente-curso-detalle',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <a class="back-link" routerLink="/docente-dashboard/cursos">← Mis cursos</a>

    @if (cargando()) { <div class="loading">Cargando curso…</div> }
    @else if (curso(); as c) {
      <div class="page-head">
        <div><h1>{{ c.cursoNombre }}</h1><p>{{ c.cursoCodigo }} · Periodo {{ c.periodoNombre }}</p></div>
      </div>

      @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

      <div class="tabs" role="tablist">
        <button type="button" role="tab" class="tab" [class.activa]="pestana() === 'sesiones'" (click)="pestana.set('sesiones')">Sesiones</button>
        <button type="button" role="tab" class="tab" [class.activa]="pestana() === 'tareas'" (click)="pestana.set('tareas')">Tareas</button>
      </div>

      <!-- ===================== SESIONES ===================== -->
      @if (pestana() === 'sesiones') {
        <div style="display: flex; justify-content: flex-end; margin-bottom: 16px">
          <button type="button" class="btn btn-primary" (click)="alternarFormSesion()">{{ mostrarFormSesion() ? 'Cerrar formulario' : '+ Crear sesión' }}</button>
        </div>

        @if (mostrarFormSesion()) {
          <form class="card form-card" #fs="ngForm" (ngSubmit)="guardarSesion(fs)" novalidate>
            <strong>{{ editandoSesionId() !== null ? 'Editar sesión' : 'Nueva sesión' }}</strong>
            <div class="form-grid">
              @if (editandoSesionId() !== null) {
                <div class="field"><label for="sn">N.º de sesión</label>
                  <input class="input" id="sn" name="numero" type="number" min="1" [(ngModel)]="formSesion.numero" required /></div>
              }
              <div class="field"><label for="st">Título</label>
                <input class="input" id="st" name="titulo" [(ngModel)]="formSesion.titulo" required autocomplete="off" /></div>
              <div class="field"><label for="sf">Fecha</label>
                <input class="input" id="sf" name="fecha" type="date" [(ngModel)]="formSesion.fecha" required /></div>
              <div class="field full"><label for="sd">Descripción (opcional)</label>
                <textarea class="textarea" id="sd" name="desc" [(ngModel)]="formSesion.descripcion"></textarea></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-ghost" (click)="cancelarSesion(fs)">Cancelar</button>
              <button type="submit" class="btn btn-primary" [disabled]="guardandoSesion()">
                {{ guardandoSesion() ? 'Guardando…' : (editandoSesionId() !== null ? 'Guardar cambios' : 'Crear sesión') }}</button>
            </div>
          </form>
        }

        @if (sesiones().length === 0) { <div class="empty">Todavía no creaste sesiones para este curso.</div> }
        @else {
          <div class="tabla-wrap">
            <table class="tabla">
              <thead><tr><th class="num">N.º</th><th>Título</th><th>Fecha</th><th>Descripción</th><th class="acciones">Acciones</th></tr></thead>
              <tbody>
                @for (s of sesiones(); track s.id) {
                  <tr>
                    <td class="num">{{ s.numero }}</td><td class="strong">{{ s.titulo }}</td><td>{{ s.fecha | date: 'dd/MM/yyyy' }}</td><td class="muted">{{ s.descripcion || '—' }}</td>
                    <td class="acciones">
                      <button type="button" class="btn btn-ghost btn-sm" (click)="editarSesion(s)">Editar</button>
                      <button type="button" class="btn btn-danger btn-sm" (click)="eliminarSesion(s)">Eliminar</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- ===================== TAREAS ===================== -->
      @if (pestana() === 'tareas') {
        <div style="display: flex; justify-content: flex-end; margin-bottom: 16px">
          <button type="button" class="btn btn-primary" (click)="alternarFormTarea()">{{ mostrarFormTarea() ? 'Cerrar formulario' : '+ Crear tarea' }}</button>
        </div>

        @if (mostrarFormTarea()) {
          <form class="card form-card" #f="ngForm" (ngSubmit)="guardarTarea(f)" novalidate>
            <strong>{{ editandoTareaId() !== null ? 'Editar tarea' : 'Nueva tarea' }}</strong>
            <div class="form-grid">
              <div class="field"><label for="tt">Título</label>
                <input class="input" id="tt" name="titulo" [(ngModel)]="formTarea.titulo" required autocomplete="off" /></div>
              <div class="field"><label for="tf">Fecha y hora límite</label>
                <input class="input" id="tf" name="fecha" type="datetime-local" [(ngModel)]="formTarea.fechaLimite" required /></div>
              <div class="field full"><label for="td">Consigna / instrucciones</label>
                <textarea class="textarea" id="td" name="desc" [(ngModel)]="formTarea.descripcion"></textarea></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-ghost" (click)="cancelarTarea(f)">Cancelar</button>
              <button type="submit" class="btn btn-primary" [disabled]="guardandoTarea()">
                {{ guardandoTarea() ? 'Guardando…' : (editandoTareaId() !== null ? 'Guardar cambios' : 'Crear tarea') }}</button>
            </div>
          </form>
        }

        @if (tareas().length === 0) { <div class="empty">Todavía no creaste tareas para este curso.</div> }
        @else {
          <div class="tabla-wrap">
            <table class="tabla">
              <thead><tr><th>Tarea</th><th>Fecha límite</th><th>Consigna</th><th class="acciones">Acciones</th></tr></thead>
              <tbody>
                @for (t of tareas(); track t.id) {
                  <tr>
                    <td class="strong">{{ t.titulo }}</td><td>{{ t.fechaLimite | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td class="muted">{{ t.descripcion || '—' }}</td>
                    <td class="acciones">
                      <button type="button" class="btn btn-ghost btn-sm" (click)="editarTarea(t)">Editar</button>
                      <button type="button" class="btn btn-danger btn-sm" (click)="eliminarTarea(t)">Eliminar</button>
                    </td>
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
  sesiones = signal<Sesion[]>([]);
  tareas = signal<Tarea[]>([]);
  cargando = signal(true);
  pestana = signal<Pestana>('sesiones');
  flash = new Flash();

  mostrarFormSesion = signal(false);
  guardandoSesion = signal(false);
  editandoSesionId = signal<number | null>(null);
  formSesion = sesionVacia();

  mostrarFormTarea = signal(false);
  guardandoTarea = signal(false);
  editandoTareaId = signal<number | null>(null);
  formTarea = tareaVacia();

  ngOnInit() {
    const id = this.ofertaId();
    forkJoin({ c: this.api.getCurso(id), s: this.api.sesiones(id), t: this.api.tareas(id) }).subscribe({
      next: (r) => {
        this.curso.set(r.c);
        this.sesiones.set(r.s);
        this.tareas.set(r.t);
        this.cargando.set(false);
      },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudo cargar el curso.')); },
    });
  }

  /* ---- sesiones ---- */
  private recargarSesiones() { this.api.sesiones(this.ofertaId()).subscribe((l) => this.sesiones.set(l)); }

  alternarFormSesion() {
    if (this.mostrarFormSesion()) { this.cerrarFormSesion(); return; }
    this.editandoSesionId.set(null);
    this.formSesion = sesionVacia();
    this.mostrarFormSesion.set(true);
  }

  editarSesion(s: Sesion) {
    this.editandoSesionId.set(s.id);
    this.formSesion = { titulo: s.titulo, fecha: s.fecha, descripcion: s.descripcion, numero: s.numero };
    this.mostrarFormSesion.set(true);
  }

  guardarSesion(f: NgForm) {
    if (f.invalid) { f.control.markAllAsTouched(); this.flash.err('Completa el título y la fecha.'); return; }
    const id = this.editandoSesionId();
    const { numero, ...datos } = this.formSesion;
    if (id !== null && this.sesiones().some((s) => s.id !== id && s.numero === numero)) {
      this.flash.err(`Ya hay otra sesión con el número ${numero}.`);
      return;
    }
    this.guardandoSesion.set(true);
    const req = id !== null ? this.api.actualizarSesion(id, { ...datos, numero }) : this.api.crearSesion(this.ofertaId(), datos);
    req.subscribe({
      next: (s) => {
        this.guardandoSesion.set(false);
        this.flash.ok(id !== null ? `Sesión ${s.numero} actualizada.` : `Sesión ${s.numero} creada.`);
        this.cancelarSesion(f);
        this.recargarSesiones();
      },
      error: (e) => { this.guardandoSesion.set(false); this.flash.err(errMsg(e, 'No se pudo guardar la sesión.')); },
    });
  }

  eliminarSesion(s: Sesion) {
    if (!confirm(`¿Eliminar la sesión ${s.numero}: ${s.titulo}? Esta acción no se puede deshacer.`)) return;
    this.api.eliminarSesion(s.id).subscribe({
      next: () => {
        this.flash.ok(`Sesión ${s.numero} eliminada.`);
        if (this.editandoSesionId() === s.id) this.cerrarFormSesion();
        this.recargarSesiones();
      },
      error: (e) => this.flash.err(errMsg(e, 'No se pudo eliminar la sesión.')),
    });
  }

  cancelarSesion(f: NgForm) {
    f.resetForm();
    this.cerrarFormSesion();
  }

  private cerrarFormSesion() {
    this.formSesion = sesionVacia();
    this.editandoSesionId.set(null);
    this.mostrarFormSesion.set(false);
  }

  /* ---- tareas ---- */
  private recargarTareas() { this.api.tareas(this.ofertaId()).subscribe((l) => this.tareas.set(l)); }

  alternarFormTarea() {
    if (this.mostrarFormTarea()) { this.cerrarFormTarea(); return; }
    this.editandoTareaId.set(null);
    this.formTarea = tareaVacia();
    this.mostrarFormTarea.set(true);
  }

  editarTarea(t: Tarea) {
    this.editandoTareaId.set(t.id);
    this.formTarea = { titulo: t.titulo, descripcion: t.descripcion, fechaLimite: t.fechaLimite };
    this.mostrarFormTarea.set(true);
  }

  guardarTarea(f: NgForm) {
    if (f.invalid) { f.control.markAllAsTouched(); this.flash.err('Completa el título y la fecha límite.'); return; }
    const id = this.editandoTareaId();
    this.guardandoTarea.set(true);
    const req = id !== null ? this.api.actualizarTarea(id, this.formTarea) : this.api.crearTarea(this.ofertaId(), this.formTarea);
    req.subscribe({
      next: (t) => {
        this.guardandoTarea.set(false);
        this.flash.ok(id !== null ? `Tarea "${t.titulo}" actualizada.` : `Tarea "${t.titulo}" creada.`);
        this.cancelarTarea(f);
        this.recargarTareas();
      },
      error: (e) => { this.guardandoTarea.set(false); this.flash.err(errMsg(e, 'No se pudo guardar la tarea.')); },
    });
  }

  eliminarTarea(t: Tarea) {
    if (!confirm(`¿Eliminar la tarea "${t.titulo}"? Esta acción no se puede deshacer.`)) return;
    this.api.eliminarTarea(t.id).subscribe({
      next: () => {
        this.flash.ok(`Tarea "${t.titulo}" eliminada.`);
        if (this.editandoTareaId() === t.id) this.cerrarFormTarea();
        this.recargarTareas();
      },
      error: (e) => this.flash.err(errMsg(e, 'No se pudo eliminar la tarea.')),
    });
  }

  cancelarTarea(f: NgForm) {
    f.resetForm();
    this.cerrarFormTarea();
  }

  private cerrarFormTarea() {
    this.formTarea = tareaVacia();
    this.editandoTareaId.set(null);
    this.mostrarFormTarea.set(false);
  }
}
