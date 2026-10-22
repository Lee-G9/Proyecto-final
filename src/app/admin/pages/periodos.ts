import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AdminService } from '../../auth/services/admin.service';
import { Periodo } from '../../core/models';
import { errMsg, hoyISO } from '../../core/util';
import { Flash } from '../../shared/flash';

const vacio = () => ({ nombre: '', fechaInicio: '', fechaFin: '' });

@Component({
  selector: 'app-admin-periodos',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-head">
      <div><h1>Periodos</h1><p>Periodos académicos (por ejemplo 2026-II). Los cursos se asignan a docentes dentro de un periodo.</p></div>
      <button type="button" class="btn btn-primary" (click)="alternarForm()">{{ mostrarForm() ? 'Cerrar formulario' : '+ Crear periodo' }}</button>
    </div>

    @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

    @if (mostrarForm()) {
      <form class="card form-card" #f="ngForm" (ngSubmit)="guardar(f)" novalidate>
        <strong>{{ editandoId() !== null ? 'Editar periodo' : 'Nuevo periodo' }}</strong>
        <div class="form-grid">
          <div class="field"><label for="nombre">Nombre del periodo</label>
            <input class="input" id="nombre" name="nombre" [(ngModel)]="form.nombre" required placeholder="2026-II" autocomplete="off" /></div>
          <div class="field"><label for="ini">Fecha de inicio</label>
            <input class="input" id="ini" name="ini" type="date" [(ngModel)]="form.fechaInicio" required /></div>
          <div class="field"><label for="fin">Fecha de fin</label>
            <input class="input" id="fin" name="fin" type="date" [(ngModel)]="form.fechaFin" required [min]="form.fechaInicio" /></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" (click)="cancelar(f)">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="guardando()">
            {{ guardando() ? 'Guardando…' : (editandoId() !== null ? 'Guardar cambios' : 'Crear periodo') }}</button>
        </div>
      </form>
    }

    @if (cargando()) { <div class="loading">Cargando…</div> }
    @else if (lista().length === 0) { <div class="empty">Todavía no hay periodos.</div> }
    @else {
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Periodo</th><th>Inicio</th><th>Fin</th><th>Estado</th><th class="acciones">Acciones</th></tr></thead>
          <tbody>
            @for (p of lista(); track p.id) {
              <tr>
                <td class="strong">{{ p.nombre }}</td>
                <td>{{ p.fechaInicio | date: 'dd/MM/yyyy' }}</td>
                <td>{{ p.fechaFin | date: 'dd/MM/yyyy' }}</td>
                <td>
                  @switch (estado(p)) {
                    @case ('Finalizado') { <span class="badge">Finalizado</span> }
                    @case ('Próximo') { <span class="badge b-info">Próximo</span> }
                    @default { <span class="badge b-ok">En curso</span> }
                  }
                </td>
                <td class="acciones">
                  <button type="button" class="btn btn-ghost btn-sm" (click)="editar(p)">Editar</button>
                  <button type="button" class="btn btn-danger btn-sm" (click)="eliminar(p)">Eliminar</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class AdminPeriodos implements OnInit {
  private api = inject(AdminService);
  lista = signal<Periodo[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  mostrarForm = signal(false);
  editandoId = signal<number | null>(null);
  form = vacio();
  flash = new Flash();

  ngOnInit() { this.cargar(); }

  estado(p: Periodo): 'Finalizado' | 'Próximo' | 'En curso' {
    const hoy = hoyISO();
    return p.fechaFin < hoy ? 'Finalizado' : p.fechaInicio > hoy ? 'Próximo' : 'En curso';
  }

  cargar() {
    this.api.periodos().subscribe({
      next: (l) => { this.lista.set(l); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudo cargar los periodos.')); },
    });
  }

  alternarForm() {
    if (this.mostrarForm()) { this.cerrar(); return; }
    this.editandoId.set(null);
    this.form = vacio();
    this.mostrarForm.set(true);
  }

  editar(p: Periodo) {
    this.editandoId.set(p.id);
    this.form = { nombre: p.nombre, fechaInicio: p.fechaInicio, fechaFin: p.fechaFin };
    this.mostrarForm.set(true);
  }

  guardar(f: NgForm) {
    if (f.invalid) { f.control.markAllAsTouched(); this.flash.err('Completa el nombre y las fechas.'); return; }
    if (this.form.fechaFin <= this.form.fechaInicio) { this.flash.err('La fecha de fin debe ser posterior a la de inicio.'); return; }
    const id = this.editandoId();
    const nombre = this.form.nombre.trim();
    if (this.lista().some((p) => p.id !== id && p.nombre.toLowerCase() === nombre.toLowerCase())) {
      this.flash.err(`El periodo ${nombre} ya existe.`);
      return;
    }
    const datos = { ...this.form, nombre };
    this.guardando.set(true);
    const req = id !== null ? this.api.actualizarPeriodo(id, datos) : this.api.crearPeriodo(datos);
    req.subscribe({
      next: (p) => {
        this.guardando.set(false);
        this.flash.ok(id !== null ? `Periodo ${p.nombre} actualizado.` : `Periodo ${p.nombre} creado.`);
        this.cerrar();
        this.cargar();
      },
      error: (e) => { this.guardando.set(false); this.flash.err(errMsg(e, 'No se pudo guardar el periodo.')); },
    });
  }

  eliminar(p: Periodo) {
    if (!confirm(`¿Eliminar el periodo ${p.nombre}? Esta acción no se puede deshacer.`)) return;
    this.api.eliminarPeriodo(p.id).subscribe({
      next: () => { this.flash.ok(`Periodo ${p.nombre} eliminado.`); if (this.editandoId() === p.id) this.cerrar(); this.cargar(); },
      error: (e) => this.flash.err(errMsg(e, 'No se pudo eliminar el periodo.')),
    });
  }

  cancelar(f: NgForm) {
    f.resetForm();
    this.cerrar();
  }

  private cerrar() {
    this.form = vacio();
    this.editandoId.set(null);
    this.mostrarForm.set(false);
  }
}
