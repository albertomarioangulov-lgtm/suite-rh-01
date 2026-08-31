// ============================================================
// Generación del PDF de evaluación con pdfmake (como competentia-01)
// ============================================================

const NIVELES = [
  { valor: 1, label: '1', descripcion: 'Deficiente' },
  { valor: 2, label: '2', descripcion: 'Regular' },
  { valor: 3, label: '3', descripcion: 'Bueno' },
  { valor: 4, label: '4', descripcion: 'Muy bueno' },
  { valor: 5, label: '5', descripcion: 'Excelente' },
]

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  completed: 'Completada',
  approved: 'Aprobada',
}

export type EvalPaperSize = 'carta' | 'oficio' | 'a4' | 'auto'

const PAGE_SIZES: Record<EvalPaperSize, { size: string; width: number }> = {
  carta: { size: 'LETTER', width: 612 },
  oficio: { size: 'LEGAL', width: 612 },
  a4: { size: 'A4', width: 595.28 },
  auto: { size: 'AUTO', width: 612 },
}

export const useEvaluationPdf = () => {
  const generating = ref(false)

  /**
   * Detecta el objeto de fuentes (vfs) sin importar cómo el bundler
   * exponga el módulo (patrón de bis-sw-01 / Boston).
   */
  const extractVfs = (mod: any): any => {
    const candidates = [
      mod?.default?.pdfMake?.vfs,
      mod?.pdfMake?.vfs,
      mod?.default?.vfs,
      mod?.vfs,
      mod?.default,
      mod,
    ]
    for (const candidate of candidates) {
      if (
        candidate &&
        typeof candidate === 'object' &&
        Object.keys(candidate).some((key) => /\.(ttf|woff2?)$/i.test(key))
      ) {
        return candidate
      }
    }
    return undefined
  }

  /**
   * pdfmake solo soporta imágenes raster (PNG/JPEG). Acepta data URLs de
   * PNG/JPEG; cualquier otra imagen (SVG, http) se convierte a PNG vía
   * canvas. Devuelve '' si no se puede cargar.
   */
  const loadImageAsPng = async (url: string): Promise<string> => {
    try {
      if (url.startsWith('data:image/png') || url.startsWith('data:image/jpeg')) {
        return url
      }
      const res = await fetch(url)
      if (!res.ok) return ''
      const blob = await res.blob()
      if (blob.type === 'image/png' || blob.type === 'image/jpeg') {
        return await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(String(reader.result ?? ''))
          reader.readAsDataURL(blob)
        })
      }
      const objectUrl = URL.createObjectURL(blob)
      const image = new Image()
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('Imagen no cargable'))
        image.src = objectUrl
      })
      const canvas = document.createElement('canvas')
      const width = image.naturalWidth || 172
      const height = image.naturalHeight || 42
      canvas.width = width * 2
      canvas.height = height * 2
      const context = canvas.getContext('2d')
      if (!context) return ''
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectUrl)
      return canvas.toDataURL('image/png')
    } catch {
      return ''
    }
  }

  const nivelLabel = (score: number | null): string => {
    if (score === null) return '—'
    const nivel = NIVELES.find((item) => item.valor === score)
    return nivel ? `${nivel.label} — ${nivel.descripcion}` : String(score)
  }

  const downloadPdf = async (
    evaluation: Record<string, any>,
    companyLogoUrl?: string,
    paperSize: EvalPaperSize = 'carta',
  ) => {
    generating.value = true
    try {
      // Patrón de ceosw-04: carga dinámica en cliente con fallos de vfs.
      // @ts-expect-error pdfmake sin tipos
      const pdfModule = await import('pdfmake/build/pdfmake')
      // @ts-expect-error vfs_fonts sin tipos
      const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
      const pdfMake = (pdfModule as any).default || pdfModule
      const vfs = extractVfs(pdfFontsModule)
      if (!pdfMake?.createPdf) {
        throw new Error('No se pudo cargar pdfmake en el navegador.')
      }
      if (!vfs) {
        throw new Error(
          'No se pudieron cargar las fuentes del PDF. Revisa la instalación de pdfmake.',
        )
      }
      pdfMake.vfs = vfs

      // Asegura el mapeo de la fuente Roboto (evita errores si falta).
      if (!pdfMake.fonts || !pdfMake.fonts.Roboto) {
        pdfMake.fonts = {
          Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-Italic.ttf',
          },
        }
      }

      const suiteLogo = await loadImageAsPng('/images/logo-suite-rh.svg')
      const companyLogo = companyLogoUrl
        ? await loadImageAsPng(companyLogoUrl)
        : ''
      // Encabezado: logo de la empresa; respaldo al logo demo o al de Suite RH.
      const logoBase64 =
        companyLogo ||
        (await loadImageAsPng('/images/logo-empresa-demo.png')) ||
        suiteLogo

      const sectionRows: Array<Array<Record<string, unknown> | string>> = []
      for (const section of evaluation.sections ?? []) {
        sectionRows.push([
          {
            text: `${section.sectionTitle ?? ''} — Peso ${section.sectionWeight ?? 0}%`,
            bold: true,
            colSpan: 3,
            fillColor: '#E8F0FE',
          },
          {},
          {},
        ])
        for (const item of section.items ?? []) {
          sectionRows.push([
            { text: item.description ?? '', margin: [0, 2, 0, 2] },
            { text: nivelLabel(item.score ?? null), alignment: 'center' },
            '',
          ])
        }
      }

      const score = Number(evaluation.overallScore ?? 0)
      const level =
        score >= 90
          ? { label: 'Excelente', color: '#16A34A' }
          : score >= 75
            ? { label: 'Muy bueno', color: '#48A9A6' }
            : score >= 60
              ? { label: 'Bueno', color: '#FB8C00' }
              : score >= 45
                ? { label: 'Regular', color: '#E65100' }
                : { label: 'Deficiente', color: '#DC2626' }

      const generatedAt = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      const headerColumns: Array<Record<string, unknown>> = []
      if (logoBase64) {
        headerColumns.push({ image: logoBase64, width: 110, alignment: 'left' })
      }
      headerColumns.push({
        width: '*',
        stack: [
          {
            text: 'SUITE RH',
            fontSize: 12,
            bold: true,
            color: '#0F2440',
            alignment: 'right',
          },
          {
            text: 'Gestión de Recursos Humanos',
            fontSize: 6.5,
            color: '#64748B',
            alignment: 'right',
            margin: [0, 1, 0, 0],
          },
          {
            text: 'EVALUACIÓN DE DESEMPEÑO',
            fontSize: 14,
            bold: true,
            color: '#1867C0',
            alignment: 'right',
            margin: [0, 3, 0, 0],
          },
        ],
      })

      const infoCell = (label: string, value: string) => ({
        stack: [
          {
            text: label.toUpperCase(),
            fontSize: 6,
            bold: true,
            color: '#64748B',
          },
          { text: value || '—', fontSize: 9, bold: true, color: '#0F2440', margin: [0, 1, 0, 0] },
        ],
        fillColor: '#F8FAFC',
        margin: [4, 3, 4, 3],
      })

      const docDefinition: Record<string, any> = {
        pageSize: PAGE_SIZES[paperSize]?.size ?? 'LETTER',
        pageMargins: [40, 42, 40, 60],
        info: {
          title: `Evaluación de Desempeño — ${evaluation.employeeName ?? ''}`,
          author: 'Suite RH',
        },
        images: suiteLogo ? { suiteLogo } : undefined,
        footer: (currentPage: number, pageCount: number) => ({
          columns: [
            ...(suiteLogo
              ? [
                  {
                    image: 'suiteLogo',
                    width: 46,
                    margin: [0, 0, 6, 0],
                  },
                ]
              : []),
            {
              text: 'Generado por Suite RH',
              fontSize: 8,
              color: '#94A3B8',
              margin: [0, 2, 0, 0],
            },
            {
              text: '',
              width: '*',
            },
            {
              text: `Página ${currentPage} de ${pageCount}`,
              fontSize: 8,
              color: '#94A3B8',
              alignment: 'right',
              margin: [0, 2, 0, 0],
            },
          ],
          margin: [40, 12, 40, 0],
        }),
        content: [
          { columns: headerColumns },
          { text: '', fontSize: 2, background: '#1867C0', margin: [0, 4, 0, 10] },

          // Ficha del evaluado
          {
            table: {
              widths: ['*', '*'],
              body: [
                [
                  infoCell('Empleado', evaluation.employeeName),
                  infoCell('Período', evaluation.periodLabel),
                ],
                [
                  infoCell('Cargo', evaluation.employeePosition),
                  infoCell('Evaluador', evaluation.evaluator),
                ],
                [
                  infoCell('Estado', STATUS_LABELS[evaluation.status ?? ''] ?? evaluation.status ?? '—'),
                  infoCell('Fecha', generatedAt),
                ],
              ],
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 12],
          },

          // Resumen del puntaje
          {
            table: {
              widths: ['*', 'auto', 'auto'],
              body: [
                [
                  {
                    text: 'PUNTUACIÓN TOTAL',
                    fontSize: 10,
                    bold: true,
                    color: '#0F2440',
                    margin: [10, 12, 0, 12],
                  },
                  {
                    text: `${score.toFixed(1)} / 100`,
                    fontSize: 22,
                    bold: true,
                    color: '#1867C0',
                    alignment: 'right',
                    margin: [0, 6, 10, 6],
                  },
                  {
                    text: level.label,
                    fontSize: 11,
                    bold: true,
                    color: '#FFFFFF',
                    alignment: 'center',
                    fillColor: level.color,
                    margin: [8, 12, 8, 12],
                  },
                ],
              ],
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 16],
          },

          // Resultados por sección
          { text: 'RESULTADOS POR SECCIÓN', style: 'sectionTitle' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 100, 60],
              body: [
                [
                  { text: 'Criterio', bold: true, color: '#FFFFFF', fillColor: '#1867C0', margin: [4, 4, 0, 4] },
                  { text: 'Puntaje', bold: true, color: '#FFFFFF', fillColor: '#1867C0', alignment: 'center', margin: [0, 4, 0, 4] },
                  { text: '', fillColor: '#1867C0' },
                ],
                ...sectionRows,
              ],
            },
            layout: 'lightHorizontalLines',
            margin: [0, 6, 0, 16],
          },

          // Recomendaciones y plan de acción
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: 'RECOMENDACIONES', style: 'boxTitle' },
                  { text: evaluation.recommendations || '—', style: 'boxBody' },
                ],
              },
              {
                width: '*',
                stack: [
                  { text: 'PLAN DE ACCIÓN', style: 'boxTitle' },
                  { text: evaluation.actionPlan || '—', style: 'boxBody' },
                ],
                margin: [8, 0, 0, 0],
              },
            ],
            margin: [0, 0, 0, 24],
          },

          // Firmas
          {
            columns: [
              {
                width: '*',
                stack: [
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.7, lineColor: '#94A3B8' }] },
                  { text: 'Evaluador', fontSize: 8, color: '#64748B', margin: [0, 4, 0, 0] },
                  { text: evaluation.evaluator || '', fontSize: 9, color: '#0F2440', margin: [0, 2, 0, 0] },
                ],
              },
              {
                width: '*',
                stack: [
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.7, lineColor: '#94A3B8' }] },
                  { text: evaluation.approvedBy ? 'Aprobación' : '', fontSize: 8, color: '#64748B', margin: [0, 4, 0, 0] },
                  {
                    text: evaluation.approvedBy || '',
                    fontSize: 9,
                    color: '#0F2440',
                    margin: [0, 2, 0, 0],
                  },
                ],
              },
            ],
          },
        ],
        styles: {
          sectionTitle: {
            fontSize: 12,
            bold: true,
            color: '#0F2440',
            margin: [0, 4, 0, 8],
            decoration: 'underline',
            decorationColor: '#1867C0',
          },
          boxTitle: {
            fontSize: 10,
            bold: true,
            color: '#0F2440',
            background: '#E8F0FE',
            margin: [8, 8, 8, 6],
          },
          boxBody: {
            fontSize: 9,
            color: '#334155',
            margin: [8, 0, 8, 8],
          },
        },
        defaultStyle: { fontSize: 10, color: '#1E293B' },
      }

      const fileName = `evaluacion-${(evaluation.employeeName ?? 'desempeno')
        .toLowerCase()
        .replace(/\s+/g, '-')}.pdf`
      pdfMake.createPdf(docDefinition).download(fileName)
    } catch (error) {
      console.error('Error al generar PDF:', error)
      throw error
    } finally {
      generating.value = false
    }
  }

  return { generating, downloadPdf }
}
