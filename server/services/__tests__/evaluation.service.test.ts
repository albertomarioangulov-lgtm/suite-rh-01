import { describe, expect, it } from 'vitest'
import {
  computeOverallScore,
  getMissingItems,
} from '~~/server/services/evaluation.service'

describe('computeOverallScore', () => {
  it('sin secciones → 0', () => {
    expect(computeOverallScore([])).toBe(0)
  })

  it('sección 100% con promedio 5 → 100', () => {
    expect(
      computeOverallScore([
        {
          sectionId: 's1',
          sectionWeight: 100,
          items: [
            { itemId: 'a', score: 5 },
            { itemId: 'b', score: 5 },
          ],
        },
      ]),
    ).toBe(100)
  })

  it('sección 100% con promedio 3.5 → 70', () => {
    expect(
      computeOverallScore([
        {
          sectionId: 's1',
          sectionWeight: 100,
          items: [
            { itemId: 'a', score: 3 },
            { itemId: 'b', score: 4 },
          ],
        },
      ]),
    ).toBe(70)
  })

  it('pondera secciones: 60% (prom 5) + 40% (prom 2.5) → 80', () => {
    expect(
      computeOverallScore([
        {
          sectionId: 's1',
          sectionWeight: 60,
          items: [{ itemId: 'a', score: 5 }],
        },
        {
          sectionId: 's2',
          sectionWeight: 40,
          items: [{ itemId: 'b', score: 2.5 }],
        },
      ]),
    ).toBe(80)
  })

  it('ignora items sin puntaje (null) al promediar', () => {
    expect(
      computeOverallScore([
        {
          sectionId: 's1',
          sectionWeight: 100,
          items: [
            { itemId: 'a', score: null },
            { itemId: 'b', score: 5 },
          ],
        },
      ]),
    ).toBe(100)
  })

  it('salta secciones sin items puntuados', () => {
    expect(
      computeOverallScore([
        { sectionId: 's1', sectionWeight: 100, items: [] },
        { sectionId: 's2', sectionWeight: 100, items: [{ itemId: 'a', score: null }] },
      ]),
    ).toBe(0)
  })

  it('redondea a 2 decimales (prom 4.333 en 100%)', () => {
    expect(
      computeOverallScore([
        {
          sectionId: 's1',
          sectionWeight: 100,
          items: [{ itemId: 'a', score: 4 }, { itemId: 'b', score: 4.5 }, { itemId: 'c', score: 4.5 }],
        },
      ]),
    ).toBe(86.67)
  })
})

describe('getMissingItems', () => {
  it('devuelve solo los itemId sin puntaje', () => {
    expect(
      getMissingItems([
        {
          sectionId: 's1',
          sectionWeight: 50,
          items: [
            { itemId: 'a', score: 4 },
            { itemId: 'b', score: null },
          ],
        },
        {
          sectionId: 's2',
          sectionWeight: 50,
          items: [{ itemId: 'c', score: undefined as unknown as null }],
        },
      ]),
    ).toEqual(['b', 'c'])
  })

  it('todo puntuado → lista vacía', () => {
    expect(
      getMissingItems([
        {
          sectionId: 's1',
          sectionWeight: 100,
          items: [{ itemId: 'a', score: 5 }],
        },
      ]),
    ).toEqual([])
  })
})
