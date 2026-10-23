import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AdminService } from '../../auth/services/admin.service';
import { SeguimientoService } from '../../auth/services/seguimiento.service';
import { Matricula, Oferta, Usuario } from '../../core/models';
import { errMsg, hoyISO, nombreCompleto } from '../../core/util';
import { Flash } from '../../shared/flash';

interface MatriculaVista {
  matricula: Matricula;
  alumnoNombre: string;
  cursoCodigo: string;
  cursoNombre: string;
  periodoNombre: string;
}

@Component({
  selector: 'app-admin-matriculas',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Matrículas</h1>
        <p>Consulta y registra alumnos en los cursos de cada periodo.</p>
      </div>

      <button
        type="button"
        class="btn btn-primary"
        (click)="alternarFormulario()">
        {{ mostrarFormulario() ? 'Cerrar formulario' : '+ Matricular alumno' }}
      </button>
    </div>

    @if (flash.m(); as m) {
      <div
        class="alert"
        [class.alert-ok]="m.tipo === 'ok'"
        [class.alert-err]="m.tipo === 'err'"
        role="status">
        {{ m.texto }}
      </div>
    }

    @if (mostrarFormulario()) {
      <form
        class="card form-card"
        #f="ngForm"
        (ngSubmit)="guardar(f)"
        novalidate>

        <strong>
          {{ editandoId() !== null ? 'Editar matrícula' : 'Nueva matrícula' }}
        </strong>

        <div class="form-grid">
          <div class="field">
            <label for="alumno">Alumno</label>

            <select
              id="alumno"
              name="alumno"
              class="select"
              [(ngModel)]="form.alumnoId"
              required>

              <option [ngValue]="null">Selecciona un alumno</option>

              @for (alumno of alumnos(); track alumno.id) {
                <option [ngValue]="alumno.id">
                  {{ nombre(alumno) || alumno.username }}
                </option>
              }
            </select>
          </div>

          <div class="field">
            <label for="oferta">Curso del periodo</label>

            <select
              id="oferta"
              name="oferta"
              class="select"
              [(ngModel)]="form.ofertaId"
              required>

              <option [ngValue]="null">Selecciona un curso</option>

              @for (oferta of ofertas(); track oferta.id) {
                <option [ngValue]="oferta.id">
                  {{ oferta.periodoNombre }} ·
                  {{ oferta.cursoCodigo }} ·
                  {{ oferta.cursoNombre }}
                </option>
              }
            </select>
          </div>

          <div class="field">
            <label for="fecha">Fecha de matrícula</label>

            <input
              id="fecha"
              name="fecha"
              type="date"
              class="input"
              [(ngModel)]="form.fechaMatricula"
              required />
          </div>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="btn btn-ghost"
            (click)="cancelar(f)">
            Cancelar
          </button>

          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="guardando()">
            {{
              guardando()
                ? 'Guardando…'
                : editandoId() !== null
                  ? 'Guardar cambios'
                  : 'Matricular alumno'
            }}
          </button>
        </div>
      </form>
    }

    @if (cargando()) {
      <div class="loading">Cargando matrículas…</div>
    } @else if (matriculas().length === 0) {
      <div class="empty">No hay matrículas registradas.</div>
    } @else {
      <div class="tabla-wrap">
        <table class="tabla">
          <thead>
          <tr>
            <th>ID</th>
            <th>Alumno</th>
            <th>Curso</th>
            <th>Periodo</th>
            <th>Fecha de matrícula</th>
            <th>Estado</th>
            <th class="acciones">Acciones</th>
          </tr>
          </thead>

          <tbody>
            @for (item of matriculas(); track item.matricula.id) {
              <tr>
                <td>{{ item.matricula.id }}</td>

                <td class="strong">
                  {{ item.alumnoNombre }}
                </td>

                <td>
                  {{ item.cursoCodigo }} · {{ item.cursoNombre }}
                </td>

                <td>
                  {{ item.periodoNombre }}
                </td>

                <td>
                  {{ item.matricula.fechaMatricula | date: 'dd/MM/yyyy' }}
                </td>

                <td>
                  {{ item.matricula.activo ? 'Activa' : 'Inactiva' }}
                </td>

                <td class="acciones">
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    (click)="editar(item.matricula)">
                    Editar
                  </button>

                  <button
                    type="button"
                    class="btn btn-danger btn-sm"
                    (click)="eliminar(item)">
                    Eliminar
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class AdminMatriculas implements OnInit {
  private seguimiento = inject(SeguimientoService);
  private admin = inject(AdminService);

  matriculas = signal<MatriculaVista[]>([]);
  alumnos = signal<Usuario[]>([]);
  ofertas = signal<Oferta[]>([]);

  cargando = signal(true);
  guardando = signal(false);
  mostrarFormulario = signal(false);
  editandoId = signal<number | null>(null);

  form: {
    alumnoId: number | null;
    ofertaId: number | null;
    fechaMatricula: string;
  } = {
    alumnoId: null,
    ofertaId: null,
    fechaMatricula: hoyISO(),
  };

  flash = new Flash();
  nombre = nombreCompleto;

  ngOnInit(): void {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    this.cargando.set(true);

    forkJoin({
      matriculas: this.seguimiento.matriculas(),
      alumnos: this.admin.alumnos(),
      ofertas: this.admin.ofertas(),
    }).subscribe({
      next: ({ matriculas, alumnos, ofertas }) => {
        this.alumnos.set(alumnos);
        this.ofertas.set(ofertas);

        this.matriculas.set(
          matriculas.map((matricula) =>
            this.construirVista(matricula, alumnos, ofertas)
          )
        );

        this.cargando.set(false);
      },

      error: (e) => {
        this.cargando.set(false);
        this.flash.err(
          errMsg(e, 'No se pudieron cargar las matrículas.')
        );
      },
    });
  }

  alternarFormulario(): void {
    if (this.mostrarFormulario()) {
      this.cerrarFormulario();
      return;
    }

    this.editandoId.set(null);
    this.limpiarForm();
    this.mostrarFormulario.set(true);
  }

  editar(matricula: Matricula): void {
    this.editandoId.set(matricula.id);

    this.form = {
      alumnoId: matricula.alumnoId,
      ofertaId: matricula.ofertaId,
      fechaMatricula: matricula.fechaMatricula,
    };

    this.mostrarFormulario.set(true);
  }

  guardar(f: NgForm): void {
    if (
      f.invalid ||
      this.form.alumnoId === null ||
      this.form.ofertaId === null
    ) {
      f.control.markAllAsTouched();
      this.flash.err('Completa todos los datos de la matrícula.');
      return;
    }

    this.guardando.set(true);

    const datos = {
      alumnoId: this.form.alumnoId,
      ofertaId: this.form.ofertaId,
      fechaMatricula: this.form.fechaMatricula,
    };

    const id = this.editandoId();

    const request =
      id === null
        ? this.seguimiento.registrarMatricula(datos)
        : this.seguimiento.actualizarMatricula(id, datos);

    request.subscribe({
      next: () => {
        this.guardando.set(false);

        this.flash.ok(
          id === null
            ? 'Alumno matriculado correctamente.'
            : 'Matrícula actualizada correctamente.'
        );

        this.cancelar(f);
        this.cargarDatos();
      },

      error: (e) => {
        this.guardando.set(false);

        this.flash.err(
          errMsg(e, 'No se pudo guardar la matrícula.')
        );
      },
    });
  }

  eliminar(item: MatriculaVista): void {
    if (
      !confirm(
        `¿Eliminar la matrícula de ${item.alumnoNombre} en ${item.cursoCodigo}?`
      )
    ) {
      return;
    }

    this.seguimiento.eliminarMatricula(item.matricula.id).subscribe({
      next: () => {
        this.flash.ok('Matrícula eliminada correctamente.');

        if (this.editandoId() === item.matricula.id) {
          this.cerrarFormulario();
        }

        this.cargarDatos();
      },

      error: (e) => {
        this.flash.err(
          errMsg(e, 'No se pudo eliminar la matrícula.')
        );
      },
    });
  }

  cancelar(f: NgForm): void {
    f.resetForm();
    this.cerrarFormulario();
  }

  private cerrarFormulario(): void {
    this.editandoId.set(null);
    this.limpiarForm();
    this.mostrarFormulario.set(false);
  }

  private limpiarForm(): void {
    this.form = {
      alumnoId: null,
      ofertaId: null,
      fechaMatricula: hoyISO(),
    };
  }

  private construirVista(
    matricula: Matricula,
    alumnos: Usuario[],
    ofertas: Oferta[]
  ): MatriculaVista {
    const alumno = alumnos.find(
      (u) => u.id === matricula.alumnoId
    );

    const oferta = ofertas.find(
      (o) => o.id === matricula.ofertaId
    );

    return {
      matricula,

      alumnoNombre: alumno
        ? nombreCompleto(alumno) || alumno.username
        : `Alumno #${matricula.alumnoId}`,

      cursoCodigo: oferta?.cursoCodigo ?? '—',

      cursoNombre:
        oferta?.cursoNombre ??
        `Asignación #${matricula.ofertaId}`,

      periodoNombre: oferta?.periodoNombre ?? '—',
    };
  }
}
