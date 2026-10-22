import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../../auth/services/admin.service';
import { AuthService } from '../../auth/services/auth';
import { EdicionUsuario, NuevoUsuario, Rol, Usuario } from '../../core/models';
import { errMsg, nombreCompleto } from '../../core/util';
import { Flash } from '../../shared/flash';

const vacio = (): NuevoUsuario => ({ nombres: '', apellidos: '', username: '', email: '', password: '' });

const META: Record<Rol, { titulo: string; descripcion: string; boton: string; singular: string }> = {
  DOCENTE: { titulo: 'Docentes', descripcion: 'Registra a los profesores que dictarán los cursos.', boton: '+ Registrar docente', singular: 'Docente' },
  ALUMNO: { titulo: 'Alumnos', descripcion: 'Registra a los estudiantes de la plataforma.', boton: '+ Registrar alumno', singular: 'Alumno' },
  ADMIN: { titulo: 'Administradores', descripcion: 'Personas con acceso total al panel de administración.', boton: '+ Registrar administrador', singular: 'Administrador' },
};

/** Registro, edición y listado de docentes, alumnos o administradores (según data.rol de la ruta). */
@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>{{ meta.titulo }}</h1>
        <p>{{ meta.descripcion }}</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="alternarNuevo()">
        {{ mostrarForm() ? 'Cerrar formulario' : meta.boton }}
      </button>
    </div>

    @if (flash.m(); as m) { <div class="alert" [class.alert-ok]="m.tipo === 'ok'" [class.alert-err]="m.tipo === 'err'" role="status">{{ m.texto }}</div> }

    @if (editando(); as ed) {
      <form class="card form-card" #fe="ngForm" (ngSubmit)="guardarEdicion(fe)" novalidate>
        <strong>Editar a {{ nombre(ed) }}</strong>
        <div class="form-grid">
          <div class="field"><label for="e-nombres">Nombres</label>
            <input class="input" id="e-nombres" name="nombres" [(ngModel)]="formEdicion.nombres" required autocomplete="off" /></div>
          <div class="field"><label for="e-apellidos">Apellidos</label>
            <input class="input" id="e-apellidos" name="apellidos" [(ngModel)]="formEdicion.apellidos" required autocomplete="off" /></div>
          <div class="field"><label for="e-email">Correo</label>
            <input class="input" id="e-email" name="email" type="email" [(ngModel)]="formEdicion.email" required email autocomplete="off" /></div>
          <div class="field"><label for="e-username">Usuario</label>
            <input class="input" id="e-username" name="username" [(ngModel)]="formEdicion.username" required minlength="3" autocomplete="off" /></div>
          <div class="field"><label for="e-rol">Rol</label>
            <select class="select" id="e-rol" name="rol" [(ngModel)]="formEdicion.rol" [disabled]="esYo(editando()!)">
              @for (r of roles; track r.v) { <option [ngValue]="r.v">{{ r.l }}</option> }
            </select>
            <span class="hint">{{ esYo(editando()!) ? 'No puedes cambiar tu propio rol.' : 'Si cambias el rol, la persona pasará a la lista correspondiente.' }}</span></div>
          <div class="field"><label for="e-password">Nueva contraseña</label>
            <input class="input" id="e-password" name="password" type="password" [(ngModel)]="formEdicion.password" minlength="6" autocomplete="new-password" />
            <span class="hint">Déjala vacía para no cambiarla. Mínimo 6 caracteres.</span></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" (click)="cancelarEdicion()">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar cambios' }}</button>
        </div>
      </form>
    }

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
          <thead><tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Estado</th><th class="acciones">Acciones</th></tr></thead>
          <tbody>
            @for (u of filtrados(); track u.id) {
              <tr>
                <td class="strong">{{ nombre(u) }}</td><td>{{ u.username }}</td><td>{{ u.email }}</td>
                <td><span class="badge" [class.b-ok]="u.activo" [class.b-err]="!u.activo">{{ u.activo ? 'Activo' : 'Inactivo' }}</span></td>
                <td class="acciones">
                  <button type="button" class="btn btn-ghost btn-sm" (click)="editar(u)">Editar</button>
                  @if (!esYo(u)) { <button type="button" class="btn btn-danger btn-sm" (click)="eliminar(u)">Eliminar</button> }
                </td>
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
  private auth = inject(AuthService);
  rolLista: Rol = (inject(ActivatedRoute).snapshot.data['rol'] as Rol) ?? 'ALUMNO';
  meta = META[this.rolLista];

  lista = signal<Usuario[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  mostrarForm = signal(false);
  busqueda = signal('');
  form: NuevoUsuario = vacio();
  editando = signal<Usuario | null>(null);
  formEdicion: EdicionUsuario = { username: '', password: '', nombres: '', apellidos: '', email: '', rol: 'DOCENTE' };
  roles: { v: Rol; l: string }[] = [
    { v: 'ADMIN', l: META.ADMIN.singular }, { v: 'DOCENTE', l: META.DOCENTE.singular }, { v: 'ALUMNO', l: META.ALUMNO.singular },
  ];
  flash = new Flash();
  nombre = nombreCompleto;

  /** La sesión actual no puede borrarse ni quitarse el rol de administrador. */
  esYo(u: Usuario): boolean { return u.id === this.auth.currentUserSignal()?.id; }

  filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return q ? this.lista().filter((u) => `${nombreCompleto(u)} ${u.username} ${u.email}`.toLowerCase().includes(q)) : this.lista();
  });

  ngOnInit() { this.cargar(); }

  cargar() {
    const lista$ = this.rolLista === 'DOCENTE' ? this.api.docentes()
      : this.rolLista === 'ADMIN' ? this.api.administradores() : this.api.alumnos();
    lista$.subscribe({
      next: (l) => { this.lista.set(l); this.cargando.set(false); },
      error: (e) => { this.cargando.set(false); this.flash.err(errMsg(e, 'No se pudo cargar la lista.')); },
    });
  }

  guardar(f: NgForm) {
    if (f.invalid) { f.control.markAllAsTouched(); this.flash.err('Completa todos los campos correctamente.'); return; }
    this.guardando.set(true);
    const req = this.rolLista === 'DOCENTE' ? this.api.registrarDocente(this.form)
      : this.rolLista === 'ADMIN' ? this.api.registrarAdministrador(this.form) : this.api.registrarAlumno(this.form);
    req.subscribe({
      next: (u) => {
        this.guardando.set(false);
        this.flash.ok(`${this.meta.singular} ${nombreCompleto(u)} registrado correctamente.`);
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

  alternarNuevo() {
    this.editando.set(null);
    this.mostrarForm.set(!this.mostrarForm());
  }

  /* ---- editar ---- */
  editar(u: Usuario) {
    this.mostrarForm.set(false);
    this.formEdicion = {
      username: u.username, password: '', nombres: u.nombres, apellidos: u.apellidos, email: u.email, rol: u.rol,
    };
    this.editando.set(u);
  }

  cancelarEdicion() {
    this.editando.set(null);
  }

  guardarEdicion(f: NgForm) {
    const u = this.editando();
    if (!u) return;
    if (f.invalid) { f.control.markAllAsTouched(); this.flash.err('Completa todos los campos correctamente.'); return; }
    const d = this.formEdicion;
    const repetido = this.lista().some((x) => x.id !== u.id
      && (x.username.toLowerCase() === d.username.trim().toLowerCase() || x.email.toLowerCase() === d.email.trim().toLowerCase()));
    if (repetido) { this.flash.err('Ya existe otra persona con ese usuario o correo.'); return; }

    this.guardando.set(true);
    this.api.actualizarUsuario(u.id, { ...d, username: d.username.trim(), email: d.email.trim() }).subscribe({
      next: (r) => {
        this.guardando.set(false);
        const cambioRol = r.rol !== u.rol;
        this.flash.ok(cambioRol
          ? `${nombreCompleto(r)} ahora es ${META[r.rol].singular.toLowerCase()} y pasó a esa lista.`
          : `Datos de ${nombreCompleto(r)} actualizados.`);
        this.editando.set(null);
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.flash.err(errMsg(e, 'No se pudo guardar. Revisa que el usuario o el correo no estén repetidos.'));
      },
    });
  }

  /* ---- eliminar ---- */
  eliminar(u: Usuario) {
    if (this.esYo(u)) { this.flash.err('No puedes eliminar tu propia cuenta.'); return; }
    const aviso = u.rol === 'DOCENTE' ? ' Los cursos que tenga asignados quedarán sin docente.' : '';
    if (!confirm(`¿Eliminar a ${nombreCompleto(u)} (${u.username})? Esta acción no se puede deshacer.${aviso}`)) return;
    this.api.eliminarUsuario(u.id).subscribe({
      next: () => {
        this.flash.ok(`${nombreCompleto(u)} fue eliminado.`);
        if (this.editando()?.id === u.id) this.editando.set(null);
        this.cargar();
      },
      error: (e) => this.flash.err(errMsg(e, 'No se pudo eliminar.')),
    });
  }
}
