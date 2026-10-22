import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AdminService } from '../../auth/services/admin.service';
import { Curso } from '../../core/models';
import { errMsg } from '../../core/util';
import { Flash } from '../../shared/flash';

const vacio = () => ({ codigo: '', nombre: '', descripcion: '' });

@Component({
  selector: 'app-admin-cursos',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div><h1>Cursos</h1><p>Catálogo de cursos. Luego se asignan a un periodo y a un docente en «Cursos por periodo».</p></div>
      <button type="button" class="btn btn-primary" (click)="alternarForm()">{{ mostrarForm() ? 'Cerrar formulario' : '+ Crear curso' }}</button>
    </div>

    @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

    @if (mostrarForm()) {
      <form class="card form-card" #f="ngForm" (ngSubmit)="guardar(f)" novalidate>
        <strong>{{ editandoId() !== null ? 'Editar curso' : 'Nuevo curso' }}</strong>
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
          <button type="submit" class="btn btn-primary" [disabled]="guardando()">
            {{ guardando() ? 'Guardando…' : (editandoId() !== null ? 'Guardar cambios' : 'Crear curso') }}</button>
        </div>
      </form>
    }

    @if (cargando()) { <div class="loading">Cargando…</div> }
    @else if (lista().length === 0) { <div class="empty">Todavía no hay cursos.</div> }
    @else {
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th><th class="acciones">Acciones</th></tr></thead>
          <tbody>
            @for (c of lista(); track c.id) {
              <tr>
                <td>{{ c.codigo }}</td><td class="strong">{{ c.nombre }}</td><td class="muted">{{ c.descripcion || '—' }}</td>
                <td class="acciones">
                  <button type="button" class="btn btn-ghost btn-sm" (click)="editar(c)">Editar</button>
                  <button type="button" class="btn btn-danger btn-sm" (click)="eliminar(c)">Eliminar</button>
                </td>
              </tr>
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
  editandoId = signal<number | null>(null);
  form = vacio();
  flash = new Flash();

  ngOnInit() { this.cargar(); }

  cargar() {
    this.api.cursos().subscribe({
      next: (l) => { this.lista.set(l); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudo cargar los cursos.')); },
    });
  }

  alternarForm() {
    if (this.mostrarForm()) { this.cerrar(); return; }
    this.editandoId.set(null);
    this.form = vacio();
    this.mostrarForm.set(true);
  }

  editar(c: Curso) {
    this.editandoId.set(c.id);
    this.form = { codigo: c.codigo, nombre: c.nombre, descripcion: c.descripcion };
    this.mostrarForm.set(true);
  }

  guardar(f: NgForm) {
    if (f.invalid) { f.control.markAllAsTouched(); this.flash.err('Completa el código y el nombre.'); return; }
    const id = this.editandoId();
    const codigo = this.form.codigo.trim().toUpperCase();
    if (this.lista().some((c) => c.id !== id && c.codigo.toUpperCase() === codigo)) {
      this.flash.err(`Ya existe un curso con el código ${codigo}.`);
      return;
    }
    const datos = { ...this.form, codigo };
    this.guardando.set(true);
    const req = id !== null ? this.api.actualizarCurso(id, datos) : this.api.crearCurso(datos);
    req.subscribe({
      next: (c) => {
        this.guardando.set(false);
        this.flash.ok(id !== null ? `Curso ${c.nombre} actualizado.` : `Curso ${c.nombre} creado.`);
        this.cerrar();
        this.cargar();
      },
      error: (e) => { this.guardando.set(false); this.flash.err(errMsg(e, 'No se pudo guardar el curso.')); },
    });
  }

  eliminar(c: Curso) {
    if (!confirm(`¿Eliminar el curso ${c.codigo} · ${c.nombre}? Esta acción no se puede deshacer.`)) return;
    this.api.eliminarCurso(c.id).subscribe({
      next: () => { this.flash.ok(`Curso ${c.nombre} eliminado.`); if (this.editandoId() === c.id) this.cerrar(); this.cargar(); },
      error: (e) => this.flash.err(errMsg(e, 'No se pudo eliminar el curso.')),
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
