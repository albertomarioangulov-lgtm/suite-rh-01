/**
 * Cálculo de puntajes de evaluación de desempeño.
 * El total (0-100) usa el peso de cada sección y el promedio 1-5 de sus items.
 */

export interface EvaluationScoreItem {
  itemId: string
  score: number | null
}

export interface EvaluationScoreSection {
  sectionId: string
  sectionWeight: number
  items: EvaluationScoreItem[]
}

export const computeOverallScore = (
  sections: EvaluationScoreSection[],
): number => {
  let total = 0
  for (const section of sections) {
    const scores = (section.items ?? [])
      .map((item) => item.score)
      .filter((score): score is number => typeof score === 'number')
    if (scores.length === 0) continue
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
    total += (average / 5) * (section.sectionWeight ?? 0)
  }
  return Math.round(total * 100) / 100
}

/** Devuelve los itemId sin puntaje (para exigir completitud). */
export const getMissingItems = (
  sections: EvaluationScoreSection[],
): string[] => {
  const missing: string[] = []
  for (const section of sections) {
    for (const item of section.items ?? []) {
      if (item.score === null || typeof item.score !== 'number') {
        missing.push(item.itemId)
      }
    }
  }
  return missing
}
