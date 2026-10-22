export const environment = {
  /** URL base del backend Spring Boot (sin barra final). */
  apiUrl: 'http://localhost:8080/api',
  /**
   * true  -> usa un backend simulado en memoria (localStorage). No necesita Spring Boot.
   * false -> llama al backend real en apiUrl.
   */
  useMock: true,
};
