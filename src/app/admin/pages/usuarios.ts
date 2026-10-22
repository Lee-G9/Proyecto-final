import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../../auth/services/admin.service';
import { NuevoUsuario, Usuario } from '../../core/models';
import { errMsg, nombreCompleto } from '../../core/util';
import { Flash } from '../../shared/flash';

const vacio = (): NuevoUsuario => ({ nombres: '', apellidos: '', username: '', email: '', password: '' });

/** Registro y listado de docentes o alumnos (según data.rol de la ruta). */
@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ esDocente ? 'Docentes' : 'Alumnos' }}</h1>
        <p>{{ esDocente ? 'Registra a los profesores que dictarán los cursos.' : 'Registra a los estudiantes que podrán matricularse en los cursos.' }}</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="mostrarForm.set(!mostrarForm())">
        {{ mostrarForm() ? 'Cerrar formulario' : (esDocente ? '+ Registrar docente' : '+ Registrar alumno') }}
      </button>
    </div>

    @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

    @if (mostrarForm()) {
      <form class="card form-card" #f="ngForm" (ngSubmit)="guardar(f)" novalidate>
        <div class="form-grid">
          <div class="field"><label for="nombres">Nombres</label>
            <input class="input" id="nombres" name="nombres" [(ngModel)]="form.nombres" required autocomplete="off" /></div>
          <div class="field"><label for="apellidos">Apellidos</label>
            <input class="input" id="apellidos" name="apellidos" [(ngModel)]="form.apellidos" required autocomplete="off" /></div>
          <div class="field"><label for="email">Correo</label>
            <input class="input" id="email" name="email" type="email" [(ngModel)]="form.email" required email autocomplete="off" /></div>
          <div class="field"><label for="username">Usuario</label>
            <input class="input" id="username" name="username" [(ngModel)]="form.username" required minlength="3" autocomplete="off" />
            <span class="hint">Con este usuario iniciará sesión.</span></div>
          <div class="field"><label for="password">Contraseña inicial</label>
            <input class="input" id="password" name="password" type="password" [(ngModel)]="form.password" required minlength="6" autocomplete="new-password" />
            <span class="hint">Mínimo 6 caracteres.</span></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" (click)="cancelar(f)">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Registrar' }}</button>
        </div>
      </form>
    }

    <div class="toolbar">
      <div class="field"><label for="q">Buscar</label>
        <input class="input" id="q" placeholder="Nombre, usuario o correo" [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)" /></div>
    </div>

    @if (cargando()) { <div class="loading">Cargando…</div> }
    @else if (filtrados().length === 0) {
      <div class="empty">{{ lista().length === 0 ? 'Todavía no hay registros.' : 'Ningún resultado para la búsqueda.' }}</div>
    } @else {
      <div class="tabla-wrap">
        <table class="tabla">
          <thead><tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Estado</th></tr></thead>
          <tbody>
            @for (u of filtrados(); track u.id) {
              <tr>
                <td class="strong">{{ nombre(u) }}</td><td>{{ u.username }}</td><td>{{ u.email }}</td>
                <td><span class="badge" [class.b-ok]="u.activo" [class.b-err]="!u.activo">{{ u.activo ? 'Activo' : 'Inactivo' }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class AdminUsuarios implements OnInit {
  private api = inject(AdminService);
  esDocente = inject(ActivatedRoute).snapshot.data['rol'] === 'DOCENTE';

  lista = signal<Usuario[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  mostrarForm = signal(false);
  busqueda = signal('');
  form: NuevoUsuario = vacio();
  flash = new Flash();
  nombre = nombreCompleto;

  filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return q ? this.lista().filter((u) => `${nombreCompleto(u)} ${u.username} ${u.email}`.toLowerCase().includes(q)) : this.lista();
  });

  ngOnInit() { this.cargar(); }

  cargar() {
    (this.esDocente ? this.api.docentes() : this.api.alumnos()).subscribe({
      next: (l) => { this.lista.set(l); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudo cargar la lista.')); },
    });
  }

  guardar(f: NgForm) {
    if (f.invalid) { f.control.markAllAsTouched(); this.flash.err('Completa todos los campos correctamente.'); return; }
    this.guardando.set(true);
    const req = this.esDocente ? this.api.registrarDocente(this.form) : this.api.registrarAlumno(this.form);
    req.subscribe({
      next: (u) => {
        this.guardando.set(false);
        this.flash.ok(`${this.esDocente ? 'Docente' : 'Alumno'} ${nombreCompleto(u)} registrado correctamente.`);
        this.cancelar(f);
        this.cargar();
      },
      error: (e) => { this.guardando.set(false); this.flash.err(errMsg(e, 'No se pudo registrar.')); },
    });
  }

  cancelar(f: NgForm) {
    f.resetForm();
    this.form = vacio();
    this.mostrarForm.set(false);
  }
}
