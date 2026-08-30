/**
 * Exporta un arreglo de objetos a un archivo CSV descargable.
 * El separador es ";" (compatible con Excel en español).
 */
export const exportToCsv = (
  filename: string,
  rows: Array<Record<string, string | number | null | undefined>>,
) => {
  if (!rows.length) return
  const headers = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row))),
  )
  const escapeCell = (value: string | number | null | undefined) => {
    const text = String(value ?? '')
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = [
    headers.join(';'),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(';')),
  ]
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
