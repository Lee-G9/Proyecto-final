import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../auth/services/admin.service';
import { Oferta, Periodo, Sesion } from '../../core/models';
import { errMsg } from '../../core/util';
import { Flash } from '../../shared/flash';

const vacio = () => ({ titulo: '', fecha: '', descripcion: '', numero: 1 });

@Component({
  selector: 'app-admin-sesiones',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-head">
      <div><h1>Sesiones</h1><p>Crea y administra las sesiones (clases) de cada curso dentro de su periodo.</p></div>
    </div>

    @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

    @if (cargando()) { <div class="loading">Cargando…</div> }
    @else if (ofertas().length === 0) { <div class="empty">Primero asigna cursos a un periodo en «Cursos por periodo».</div> }
    @else {
      <div class="toolbar">
        <div class="field" style="min-width: 320px"><label for="of">Curso del periodo</label>
          <select class="select" id="of" [ngModel]="ofertaId()" (ngModelChange)="cambiarOferta($event)">
            @for (o of ofertas(); track o.id) { <option [ngValue]="o.id">{{ o.periodoNombre }} · {{ o.cursoCodigo }} {{ o.cursoNombre }}</option> }
          </select></div>
        <button type="button" class="btn btn-primary" (click)="alternarForm()">{{ mostrarForm() ? 'Cerrar formulario' : '+ Crear sesión' }}</button>
      </div>

      @if (mostrarForm()) {
        <form class="card form-card" #f="ngForm" (ngSubmit)="guardar(f)" novalidate>
          <strong>{{ editandoId() !== null ? 'Editar sesión' : 'Nueva sesión' }}</strong>
          <div class="form-grid">
            @if (editandoId() !== null) {
              <div class="field"><label for="numero">N.º de sesión</label>
                <input class="input" id="numero" name="numero" type="number" min="1" [(ngModel)]="form.numero" required /></div>
            }
            <div class="field"><label for="titulo">Título</label>
              <input class="input" id="titulo" name="titulo" [(ngModel)]="form.titulo" required placeholder="Funciones cuadráticas" autocomplete="off" /></div>
            <div class="field"><label for="fecha">Fecha</label>
              <input class="input" id="fecha" name="fecha" type="date" [(ngModel)]="form.fecha" required [min]="periodo()?.fechaInicio ?? null" [max]="periodo()?.fechaFin ?? null" />
              @if (periodo(); as p) { <span class="hint">Entre {{ p.fechaInicio | date: 'dd/MM/yyyy' }} y {{ p.fechaFin | date: 'dd/MM/yyyy' }}</span> }</div>
            <div class="field full"><label for="desc">Descripción (opcional)</label>
              <textarea class="textarea" id="desc" name="desc" [(ngModel)]="form.descripcion"></textarea></div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" (click)="cancelar(f)">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="guardando()">
              {{ guardando() ? 'Guardando…' : (editandoId() !== null ? 'Guardar cambios' : 'Crear sesión') }}</button>
          </div>
        </form>
      }

      @if (sesiones().length === 0) { <div class="empty">Este curso todavía no tiene sesiones.</div> }
      @else {
        <div class="tabla-wrap">
          <table class="tabla">
            <thead><tr><th class="num">N.º</th><th>Título</th><th>Fecha</th><th>Descripción</th><th class="acciones">Acciones</th></tr></thead>
            <tbody>
              @for (s of sesiones(); track s.id) {
                <tr>
                  <td class="num">{{ s.numero }}</td><td class="strong">{{ s.titulo }}</td><td>{{ s.fecha | date: 'dd/MM/yyyy' }}</td><td class="muted">{{ s.descripcion || '—' }}</td>
                  <td class="acciones">
                    <button type="button" class="btn btn-ghost btn-sm" (click)="editar(s)">Editar</button>
                    <button type="button" class="btn btn-danger btn-sm" (click)="eliminar(s)">Eliminar</button>
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
export class AdminSesiones implements OnInit {
  private api = inject(AdminService);
  ofertas = signal<Oferta[]>([]);
  periodos = signal<Periodo[]>([]);
  sesiones = signal<Sesion[]>([]);
  ofertaId = signal<number | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  mostrarForm = signal(false);
  editandoId = signal<number | null>(null);
  form = vacio();
  flash = new Flash();

  periodo = computed(() => {
    const o = this.ofertas().find((x) => x.id === this.ofertaId());
    return o ? this.periodos().find((p) => p.id === o.periodoId) ?? null : null;
  });

  ngOnInit() {
    forkJoin({ o: this.api.ofertas(), p: this.api.periodos() }).subscribe({
      next: (r) => {
        this.periodos.set(r.p);
        this.ofertas.set(r.o);
        this.cargando.set(false);
        if (r.o.length) this.cambiarOferta(r.o[0].id);
      },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudo cargar la información.')); },
    });
  }

  cambiarOferta(id: number) {
    this.ofertaId.set(id);
    this.cerrar();
    this.cargarSesiones();
  }

  cargarSesiones() {
    const id = this.ofertaId();
    if (id == null) return;
    this.api.sesiones(id).subscribe({
      next: (s) => this.sesiones.set(s),
      error: (e) => this.flash.err(errMsg(e, 'No se pudo cargar las sesiones.')),
    });
  }

  alternarForm() {
    if (this.mostrarForm()) { this.cerrar(); return; }
    this.editandoId.set(null);
    this.form = vacio();
    this.mostrarForm.set(true);
  }

  editar(s: Sesion) {
    this.editandoId.set(s.id);
    this.form = { titulo: s.titulo, fecha: s.fecha, descripcion: s.descripcion, numero: s.numero };
    this.mostrarForm.set(true);
  }

  guardar(f: NgForm) {
    const ofertaId = this.ofertaId();
    if (ofertaId == null) return;
    if (f.invalid) { f.control.markAllAsTouched(); this.flash.err('Completa el título y la fecha.'); return; }
    const id = this.editandoId();
    const { numero, ...datos } = this.form;
    if (id !== null && this.sesiones().some((s) => s.id !== id && s.numero === numero)) {
      this.flash.err(`Ya hay otra sesión con el número ${numero} en este curso.`);
      return;
    }
    this.guardando.set(true);
    const req = id !== null ? this.api.actualizarSesion(id, { ...datos, numero }) : this.api.crearSesion({ ofertaId, ...datos });
    req.subscribe({
      next: (s) => {
        this.guardando.set(false);
        this.flash.ok(id !== null ? `Sesión ${s.numero} actualizada.` : `Sesión ${s.numero} creada.`);
        this.cancelar(f);
        this.cargarSesiones();
      },
      error: (e) => { this.guardando.set(false); this.flash.err(errMsg(e, 'No se pudo guardar la sesión.')); },
    });
  }

  eliminar(s: Sesion) {
    if (!confirm(`¿Eliminar la sesión ${s.numero}: ${s.titulo}? Esta acción no se puede deshacer.`)) return;
    this.api.eliminarSesion(s.id).subscribe({
      next: () => { this.flash.ok(`Sesión ${s.numero} eliminada.`); if (this.editandoId() === s.id) this.cerrar(); this.cargarSesiones(); },
      error: (e) => this.flash.err(errMsg(e, 'No se pudo eliminar la sesión.')),
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
