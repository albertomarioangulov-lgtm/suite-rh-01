/**
 * Guard para errores HTTP de h3: permite re-lanzar createError sin perder
 * el statusCode/mensaje originales.
 */
export const isHttpError = (error: unknown): error is { statusCode?: number } =>
  typeof error === 'object' && error !== null && 'statusCode' in error
