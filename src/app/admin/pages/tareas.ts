import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../auth/services/admin.service';
import { Oferta, Tarea } from '../../core/models';
import { errMsg } from '../../core/util';
import { Flash } from '../../shared/flash';

const vacio = (ofertaId: number | null = null) => ({ ofertaId, titulo: '', descripcion: '', fechaLimite: '' });

/** Tareas de todos los cursos: el administrador puede ver, crear, editar y eliminar cualquiera. */
@Component({
  selector: 'app-admin-tareas',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-head">
      <div><h1>Tareas</h1><p>Tareas publicadas en los cursos de cada periodo. Los docentes también pueden gestionar las de sus cursos.</p></div>
    </div>

    @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

    @if (cargando()) { <div class="loading">Cargando…</div> }
    @else if (ofertas().length === 0) { <div class="empty">Primero asigna cursos a un periodo en «Cursos por periodo».</div> }
    @else {
      <div class="toolbar">
        <div class="field" style="min-width: 320px"><label for="of">Curso del periodo</label>
          <select class="select" id="of" [ngModel]="filtroOfertaId()" (ngModelChange)="cambiarFiltro($event)">
            <option [ngValue]="null">Todos los cursos</option>
            @for (o of ofertas(); track o.id) { <option [ngValue]="o.id">{{ o.periodoNombre }} · {{ o.cursoCodigo }} {{ o.cursoNombre }}</option> }
          </select></div>
        <button type="button" class="btn btn-primary" (click)="alternarForm()">{{ mostrarForm() ? 'Cerrar formulario' : '+ Crear tarea' }}</button>
      </div>

      @if (mostrarForm()) {
        <form class="card form-card" #f="ngForm" (ngSubmit)="guardar(f)" novalidate>
          <strong>{{ editandoId() !== null ? 'Editar tarea' : 'Nueva tarea' }}</strong>
          <div class="form-grid">
            <div class="field"><label for="tof">Curso del periodo</label>
              <select class="select" id="tof" name="oferta" [(ngModel)]="form.ofertaId" required [disabled]="editandoId() !== null">
                <option [ngValue]="null">Selecciona un curso</option>
                @for (o of ofertas(); track o.id) { <option [ngValue]="o.id">{{ o.periodoNombre }} · {{ o.cursoCodigo }} {{ o.cursoNombre }}</option> }
              </select></div>
            <div class="field"><label for="tt">Título</label>
              <input class="input" id="tt" name="titulo" [(ngModel)]="form.titulo" required autocomplete="off" /></div>
            <div class="field"><label for="tf">Fecha y hora límite</label>
              <input class="input" id="tf" name="fecha" type="datetime-local" [(ngModel)]="form.fechaLimite" required /></div>
            <div class="field full"><label for="td">Consigna / instrucciones</label>
              <textarea class="textarea" id="td" name="desc" [(ngModel)]="form.descripcion"></textarea></div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" (click)="cancelar(f)">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="guardando()">
              {{ guardando() ? 'Guardando…' : (editandoId() !== null ? 'Guardar cambios' : 'Crear tarea') }}</button>
          </div>
        </form>
      }

      @if (tareas().length === 0) { <div class="empty">No hay tareas para esta selección.</div> }
      @else {
        <div class="tabla-wrap">
          <table class="tabla">
            <thead><tr><th>Curso</th><th>Tarea</th><th>Fecha límite</th><th>Consigna</th><th class="acciones">Acciones</th></tr></thead>
            <tbody>
              @for (t of tareas(); track t.id) {
                <tr>
                  <td>{{ etiqueta(t.ofertaId) }}</td>
                  <td class="strong">{{ t.titulo }}</td>
                  <td>{{ t.fechaLimite | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="muted">{{ t.descripcion || '—' }}</td>
                  <td class="acciones">
                    <button type="button" class="btn btn-ghost btn-sm" (click)="editar(t)">Editar</button>
                    <button type="button" class="btn btn-danger btn-sm" (click)="eliminar(t)">Eliminar</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
})
export class AdminTareas implements OnInit {
  private api = inject(AdminService);
  ofertas = signal<Oferta[]>([]);
  tareas = signal<Tarea[]>([]);
  filtroOfertaId = signal<number | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  mostrarForm = signal(false);
  editandoId = signal<number | null>(null);
  form = vacio();
  flash = new Flash();

  ngOnInit() {
    forkJoin({ o: this.api.ofertas(), t: this.api.tareas() }).subscribe({
      next: (r) => { this.ofertas.set(r.o); this.tareas.set(r.t); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudo cargar la información.')); },
    });
  }

  etiqueta(ofertaId: number): string {
    const o = this.ofertas().find((x) => x.id === ofertaId);
    return o ? `${o.periodoNombre} · ${o.cursoCodigo} ${o.cursoNombre}` : '—';
  }

  cargarTareas() {
    this.api.tareas(this.filtroOfertaId() ?? undefined).subscribe({
      next: (t) => this.tareas.set(t),
      error: (e) => this.flash.err(errMsg(e, 'No se pudo cargar las tareas.')),
    });
  }

  cambiarFiltro(id: number | null) {
    this.filtroOfertaId.set(id);
    this.cargarTareas();
  }

  alternarForm() {
    if (this.mostrarForm()) { this.cerrar(); return; }
    this.editandoId.set(null);
    this.form = vacio(this.filtroOfertaId());
    this.mostrarForm.set(true);
  }

  editar(t: Tarea) {
    this.editandoId.set(t.id);
    this.form = { ofertaId: t.ofertaId, titulo: t.titulo, descripcion: t.descripcion, fechaLimite: t.fechaLimite };
    this.mostrarForm.set(true);
  }

  guardar(f: NgForm) {
    if (f.invalid || this.form.ofertaId == null) {
      f.control.markAllAsTouched();
      this.flash.err('Elige el curso y completa el título y la fecha límite.');
      return;
    }
    const id = this.editandoId();
    const { ofertaId, ...datos } = this.form;
    this.guardando.set(true);
    const req = id !== null ? this.api.actualizarTarea(id, datos) : this.api.crearTarea(ofertaId, datos);
    req.subscribe({
      next: (t) => {
        this.guardando.set(false);
        this.flash.ok(id !== null ? `Tarea "${t.titulo}" actualizada.` : `Tarea "${t.titulo}" creada.`);
        this.cancelar(f);
        this.cargarTareas();
      },
      error: (e) => { this.guardando.set(false); this.flash.err(errMsg(e, 'No se pudo guardar la tarea.')); },
    });
  }

  eliminar(t: Tarea) {
    if (!confirm(`¿Eliminar la tarea "${t.titulo}"? Esta acción no se puede deshacer.`)) return;
    this.api.eliminarTarea(t.id).subscribe({
      next: () => { this.flash.ok(`Tarea "${t.titulo}" eliminada.`); if (this.editandoId() === t.id) this.cerrar(); this.cargarTareas(); },
      error: (e) => this.flash.err(errMsg(e, 'No se pudo eliminar la tarea.')),
    });
  }

  cancelar(f: NgForm) {
    f.resetForm();
    this.cerrar();
  }

  private cerrar() {
    this.form = vacio(this.filtroOfertaId());
    this.editandoId.set(null);
    this.mostrarForm.set(false);
  }
}
