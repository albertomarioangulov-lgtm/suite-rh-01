/**
 * Reglas reutilizables de validación para formularios Vuetify.
 * Cada regla recibe el valor del campo y devuelve `true` o un mensaje de error.
 */

type ValidationRule = (value: unknown) => true | string

export const requiredRule =
  (message = 'Campo requerido'): ValidationRule =>
  (value) =>
    !!value || message

export const emailRule =
  (message = 'Ingresa un email válido'): ValidationRule =>
  (value) =>
    !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) || message

export const minLengthRule =
  (min: number, message?: string): ValidationRule =>
  (value) =>
    !value || String(value).length >= min || (message ?? `Mínimo ${min} caracteres`)

export const matchRule =
  (target: () => string, message = 'Las contraseñas no coinciden'): ValidationRule =>
  (value) =>
    !value || value === target() || message

/** Valida un NIT colombiano: entre 8 y 10 dígitos (ignora puntos/guiones). */
export const validNIT =
  (message = 'NIT inválido'): ValidationRule =>
  (value) => {
    if (!value) return true
    const digits = String(value).replace(/\D/g, '')
    return (digits.length >= 8 && digits.length <= 10) || message
  }

/** Valida el código de municipio DIVIPOLA (5 dígitos, vacío permitido). */
export const validMunicipalityCode =
  (message = 'Código de municipio inválido (5 dígitos)'): ValidationRule =>
  (value) =>
    !value || /^\d{5}$/.test(String(value)) || message

/** Valida el formato de hora HH:mm (24h). */
export const validTime =
  (message = 'Hora inválida (HH:mm)'): ValidationRule =>
  (value) =>
    !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) || message

/** Valida que un valor numérico esté dentro de un rango. */
export const betweenRule =
  (min: number, max: number, message?: string): ValidationRule =>
  (value) => {
    if (!value) return true
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return message ?? 'Valor numérico inválido'
    return (numeric >= min && numeric <= max) || (message ?? `Debe estar entre ${min} y ${max}`)
  }
