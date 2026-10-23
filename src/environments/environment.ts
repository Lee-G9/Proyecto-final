/** URL del API Gateway (servidor-gateway). Todas las peticiones a los microservicios pasan por aquí. */
const gateway = 'http://localhost:8080/api/v1';

export const environment = {
  /** Base de servicio-usuarios (login y usuarios), vía gateway. */
  usuariosUrl: gateway,
  /** Base de servicio-academico (cursos, periodos, asignaciones, sesiones, tareas), vía gateway. */
  academicoUrl: gateway,
  /** Base de servicio-seguimiento (matrículas y calificaciones), vía gateway. */
  seguimientoUrl: gateway,
};
