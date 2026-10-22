import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AdminService } from '../../auth/services/admin.service';
import { Curso } from '../../core/models';
import { errMsg } from '../../core/util';
import { Flash } from '../../shared/flash';

@Component({
  selector: 'app-admin-cursos',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div><h1>Cursos</h1><p>Catálogo de cursos. Luego se asignan a un periodo y a un docente en «Cursos por periodo».</p></div>
      <button type="button" class="btn btn-primary" (click)="mostrarForm.set(!mostrarForm())">{{ mostrarForm() ? 'Cerrar formulario' : '+ Crear curso' }}</button>
    </div>

    @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

    @if (mostrarForm()) {
      <form class="card form-card" #f="ngForm" (ngSubmit)="guardar(f)" novalidate>
        <div class="form-grid">
          <div class="field"><label for="codigo">Código</label>
            <input class="input" id="codigo" name="codigo" [(ngModel)]="form.codigo" required placeholder="MAT101" autocomplete="off" /></div>
          <div class="field"><label for="nombre">Nombre del curso</label>
            <input class="input" id="nombre" name="nombre" [(ngModel)]="form.nombre" required placeholder="Matemática 1" autocomplete="off" /></div>
          <div class="field full"><label for="desc">Descripción (opcional)</label>
            <textarea class="textarea" id="desc" name="desc" [(ngModel)]="form.descripcion"></textarea></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" (click)="cancelar(f)">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Crear curso' }}</button>
        </div>
      </form>
    }

    @if (cargando()) { <div class="loading">Cargando…</div> }
    @else if (lista().length === 0) { <div class="empty">Todavía no hay cursos.</div> }
    @else {
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th></tr></thead>
          <tbody>
            @for (c of lista(); track c.id) {
              <tr><td>{{ c.codigo }}</td><td class="strong">{{ c.nombre }}</td><td class="muted">{{ c.descripcion || '—' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class AdminCursos implements OnInit {
  private api = inject(AdminService);
  lista = signal<Curso[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  mostrarForm = signal(false);
  form = { codigo: '', nombre: '', descripcion: '' };
  flash = new Flash();

  ngOnInit() { this.cargar(); }

  cargar() {
    this.api.cursos().subscribe({
      next: (l) => { this.lista.set(l); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudo cargar los cursos.')); },
    });
  }

  guardar(f: NgForm) {
    if (f.invalid) { f.control.markAllAsTouched(); this.flash.err('Completa el código y el nombre.'); return; }
    this.guardando.set(true);
    this.api.crearCurso(this.form).subscribe({
      next: (c) => { this.guardando.set(false); this.flash.ok(`Curso ${c.nombre} creado.`); this.cancelar(f); this.cargar(); },
      error: (e) => { this.guardando.set(false); this.flash.err(errMsg(e, 'No se pudo crear el curso.')); },
    });
  }

  cancelar(f: NgForm) {
    f.resetForm();
    this.form = { codigo: '', nombre: '', descripcion: '' };
    this.mostrarForm.set(false);
  }
}
