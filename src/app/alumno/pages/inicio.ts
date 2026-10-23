import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../auth/services/auth';
import { SeguimientoService } from '../../auth/services/seguimiento.service';
import { CursoAlumno } from '../../core/models';
import { errMsg } from '../../core/util';
import { Flash } from '../../shared/flash';

@Component({
  selector: 'app-alumno-inicio',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page-head">
      <div>
        <h1>Hola, {{ nombre() }}</h1>
        <p>Consulta tus cursos, tareas y calificaciones.</p>
      </div>
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

    @if (cargando()) {

      <div class="loading">
        Cargando tu información…
      </div>

    } @else if (cursos().length === 0) {

      <div class="empty">
        Todavía no tienes cursos matriculados.
      </div>

    } @else {

      <div
        style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        ">

        <div class="card">
          <div class="muted">Cursos matriculados</div>
          <div
            class="strong"
            style="font-size: 28px; margin-top: 6px">
            {{ cursos().length }}
          </div>
        </div>

        <div class="card">
          <div class="muted">Tareas</div>
          <div
            class="strong"
            style="font-size: 28px; margin-top: 6px">
            {{ totalTareas() }}
          </div>
        </div>

        <div class="card">
          <div class="muted">Tareas calificadas</div>
          <div
            class="strong"
            style="font-size: 28px; margin-top: 6px">
            {{ totalCalificadas() }}
          </div>
        </div>

        <div class="card">
          <div class="muted">Promedio</div>
          <div
            class="strong"
            style="font-size: 28px; margin-top: 6px">
            {{
              promedio() !== null
                ? promedio()
                : '—'
            }}
          </div>
        </div>

      </div>

      @for (curso of cursos(); track curso.matriculaId) {

        <div
          class="card"
          style="margin-bottom: 20px">

          <div
            style="
              display: flex;
              justify-content: space-between;
              gap: 16px;
              align-items: flex-start;
              margin-bottom: 18px;
            ">

            <div>

              <div
                class="muted"
                style="margin-bottom: 4px">
                {{ curso.codigo }} · {{ curso.periodo }}
              </div>

              <h2
                style="margin: 0 0 6px">
                {{ curso.nombre }}
              </h2>

              <p
                class="muted"
                style="margin: 0">
                {{ curso.descripcion }}
              </p>

            </div>

          </div>

          <div
            style="
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 12px;
              margin-bottom: 18px;
            ">

            <div>
              <div class="muted">
                Fecha de matrícula
              </div>

              <div class="strong">
                {{
                  curso.fechaMatricula
                    | date: 'dd/MM/yyyy'
                }}
              </div>
            </div>

            <div>
              <div class="muted">
                Inicio del periodo
              </div>

              <div class="strong">
                {{
                  curso.fechaInicioPeriodo
                    | date: 'dd/MM/yyyy'
                }}
              </div>
            </div>

            <div>
              <div class="muted">
                Fin del periodo
              </div>

              <div class="strong">
                {{
                  curso.fechaFinPeriodo
                    | date: 'dd/MM/yyyy'
                }}
              </div>
            </div>

          </div>

          <h3>
            Tareas
          </h3>

          @if (curso.tareas.length === 0) {

            <div class="empty">
              Este curso todavía no tiene tareas.
            </div>

          } @else {

            <div class="tabla-wrap">

              <table class="tabla">

                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th>Fecha límite</th>
                    <th>Estado</th>
                    <th>Nota</th>
                  </tr>
                </thead>

                <tbody>

                  @for (tarea of curso.tareas; track tarea.id) {

                    <tr>

                      <td>

                        <div class="strong">
                          {{ tarea.titulo }}
                        </div>

                        <div class="muted">
                          {{ tarea.descripcion || '—' }}
                        </div>

                      </td>

                      <td>
                        {{
                          tarea.fechaEntrega
                            | date: 'dd/MM/yyyy HH:mm'
                        }}
                      </td>

                      <td>

                        @if (tarea.nota !== null) {
                          Calificada
                        } @else {
                          Pendiente de calificación
                        }

                      </td>

                      <td class="strong">

                        {{
                          tarea.nota !== null
                            ? tarea.nota
                            : '—'
                        }}

                      </td>

                    </tr>
                  }

                </tbody>

              </table>

            </div>
          }

        </div>
      }
    }
  `,
})
export class AlumnoInicio implements OnInit {

  private auth = inject(AuthService);
  private seguimiento = inject(SeguimientoService);

  nombre = computed(
    () =>
      this.auth.nombreMostrar() ||
      'alumno'
  );

  cursos = signal<CursoAlumno[]>([]);
  cargando = signal(true);

  flash = new Flash();

  totalTareas = computed(
    () =>
      this.cursos()
        .reduce(
          (total, curso) =>
            total + curso.tareas.length,
          0
        )
  );

  totalCalificadas = computed(
    () =>
      this.cursos()
        .reduce(
          (total, curso) =>
            total +
            curso.tareas.filter(
              (tarea) =>
                tarea.nota !== null
            ).length,
          0
        )
  );

  promedio = computed(() => {

    const notas =
      this.cursos()
        .flatMap(
          (curso) =>
            curso.tareas
        )
        .filter(
          (tarea) =>
            tarea.nota !== null
        )
        .map(
          (tarea) =>
            tarea.nota as number
        );

    if (notas.length === 0) {
      return null;
    }

    const suma =
      notas.reduce(
        (total, nota) =>
          total + nota,
        0
      );

    return (
      Math.round(
        (suma / notas.length) * 100
      ) / 100
    );
  });

  ngOnInit(): void {

    this.seguimiento
      .misCursos()
      .subscribe({

        next: (cursos) => {

          this.cursos.set(cursos);

          this.cargando.set(false);
        },

        error: (e) => {

          this.cargando.set(false);

          this.flash.err(
            errMsg(
              e,
              'No se pudo cargar tu información académica.'
            )
          );
        },

      });
  }
}
