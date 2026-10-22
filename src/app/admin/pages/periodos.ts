import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AdminService } from '../../auth/services/admin.service';
import { Periodo } from '../../core/models';
import { errMsg, hoyISO } from '../../core/util';
import { Flash } from '../../shared/flash';

@Component({
  selector: 'app-admin-periodos',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-head">
      <div><h1>Periodos</h1><p>Periodos académicos (por ejemplo 2026-II). Los cursos y las matrículas se organizan dentro de un periodo.</p></div>
      <button type="button" class="btn btn-primary" (click)="mostrarForm.set(!mostrarForm())">{{ mostrarForm() ? 'Cerrar formulario' : '+ Crear periodo' }}</button>
    </div>

    @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

    @if (mostrarForm()) {
      <form class="card form-card" #f="ngForm" (ngSubmit)="guardar(f)" novalidate>
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
          <button type="submit" class="btn btn-primary" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Crear periodo' }}</button>
        </div>
      </form>
    }

    @if (cargando()) { <div class="loading">Cargando…</div> }
    @else if (lista().length === 0) { <div class="empty">Todavía no hay periodos.</div> }
    @else {
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Periodo</th><th>Inicio</th><th>Fin</th><th>Estado</th></tr></thead>
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
  form = { nombre: '', fechaInicio: '', fechaFin: '' };
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

  guardar(f: NgForm) {
    if (f.invalid) { f.control.markAllAsTouched(); this.flash.err('Completa el nombre y las fechas.'); return; }
    if (this.form.fechaFin <= this.form.fechaInicio) { this.flash.err('La fecha de fin debe ser posterior a la de inicio.'); return; }
    this.guardando.set(true);
    this.api.crearPeriodo(this.form).subscribe({
      next: (p) => { this.guardando.set(false); this.flash.ok(`Periodo ${p.nombre} creado.`); this.cancelar(f); this.cargar(); },
      error: (e) => { this.guardando.set(false); this.flash.err(errMsg(e, 'No se pudo crear el periodo.')); },
    });
  }

  cancelar(f: NgForm) {
    f.resetForm();
    this.form = { nombre: '', fechaInicio: '', fechaFin: '' };
    this.mostrarForm.set(false);
  }
}
