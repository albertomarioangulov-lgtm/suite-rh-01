import { describe, expect, it } from 'vitest'
import {
  betweenRule,
  emailRule,
  matchRule,
  minLengthRule,
  requiredRule,
  validNIT,
  validTime,
} from '~/utils/validation-rules'

describe('requiredRule', () => {
  it('retorna mensaje si el valor está vacío', () => {
    expect(requiredRule('Requerido')('')).toBe('Requerido')
    expect(requiredRule()(null)).toBe('Campo requerido')
  })

  it('retorna true si hay valor', () => {
    expect(requiredRule()('algo')).toBe(true)
  })
})

describe('emailRule', () => {
  it('acepta emails válidos y vacíos', () => {
    expect(emailRule()('user@test.com')).toBe(true)
    expect(emailRule()('')).toBe(true)
  })

  it('rechaza emails inválidos', () => {
    expect(emailRule()('no-es-email')).toBe('Ingresa un email válido')
  })
})

describe('minLengthRule', () => {
  it('valida longitud mínima', () => {
    expect(minLengthRule(6)('clave123')).toBe(true)
    expect(minLengthRule(6)('123')).toBe('Mínimo 6 caracteres')
  })

  it('ignora valores vacíos', () => {
    expect(minLengthRule(6)('')).toBe(true)
  })
})

describe('matchRule', () => {
  it('compara contra el valor objetivo', () => {
    expect(matchRule(() => 'abc')('abc')).toBe(true)
    expect(matchRule(() => 'abc')('xyz')).toBe('Las contraseñas no coinciden')
  })
})

describe('validNIT', () => {
  it('acepta NITs de 8 a 10 dígitos (ignora separadores)', () => {
    expect(validNIT()('901.234.567-8')).toBe(true)
    expect(validNIT()('12345678')).toBe(true)
  })

  it('rechaza NITs muy cortos', () => {
    expect(validNIT()('123')).toBe('NIT inválido')
  })
})

describe('validTime', () => {
  it('acepta horas HH:mm de 24h', () => {
    expect(validTime()('19:00')).toBe(true)
    expect(validTime()('06:30')).toBe(true)
  })

  it('rechaza horas inválidas', () => {
    expect(validTime()('25:00')).toBe('Hora inválida (HH:mm)')
    expect(validTime()('7:00')).toBe('Hora inválida (HH:mm)')
  })
})

describe('betweenRule', () => {
  it('valida rangos numéricos', () => {
    expect(betweenRule(1, 168)(42)).toBe(true)
    expect(betweenRule(1, 24)(25)).toBe('Debe estar entre 1 y 24')
  })
})
