// ============================================================
// PDF del recibo de nómina (pdfmake, mismo patrón que evaluaciones)
// ============================================================

interface IReceiptEntry {
  devengados: {
    baseSalary: number
    daysWorked: number
    paidAbsenceDays?: number
    absenceCompanyPaidValue?: number
    absenceEpsValue?: number
    absenceArlValue?: number
    transportAllowance: number
    overtimeDay: number
    overtimeNight: number
    nightSurcharge: number
    bonuses: number
    commissions: number
    total: number
  }
  deducciones: {
    employeeHealth: number
    employeePension: number
    sourceRetention: number
    garnishments: number
    loans: number
    total: number
  }
  seguridadSocial: {
    employerHealth: number
    employerPension: number
    arl: number
    sena: number
    icbf: number
    compensationFund: number
    total: number
  }
  totalToPay: number
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  approved: 'Aprobada',
  paid: 'Pagada',
  cancelled: 'Anulada',
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
  }).format(value ?? 0)

export const usePayrollReceiptPdf = () => {
  const generating = ref(false)

  /** Detecta el objeto de fuentes (vfs) sin importar cómo lo exponga el bundler. */
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

  /** pdfmake solo soporta PNG/JPEG: convierte cualquier imagen a data URL PNG. */
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
      canvas.width = (image.naturalWidth || 172) * 2
      canvas.height = (image.naturalHeight || 42) * 2
      const context = canvas.getContext('2d')
      if (!context) return ''
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectUrl)
      return canvas.toDataURL('image/png')
    } catch {
      return ''
    }
  }

  const downloadReceipt = async (
    receipt: IReceiptEntry & {
      periodLabel: string
      days: number
      status: string
    },
    profile: {
      firstName: string
      lastName: string
      document: string
      position: string
    },
  ) => {
    generating.value = true
    try {
      // @ts-expect-error pdfmake sin tipos
      const pdfModule = await import('pdfmake/build/pdfmake')
      // @ts-expect-error vfs_fonts sin tipos
      const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
      const pdfMake = (pdfModule as any).default || pdfModule
      const vfs = extractVfs(pdfFontsModule)
      if (!pdfMake?.createPdf || !vfs) {
        throw new Error('No se pudo cargar pdfmake en el navegador.')
      }
      pdfMake.vfs = vfs
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
      const companyLogo =
        (await loadImageAsPng('/images/logo-empresa-demo.png')) || suiteLogo

      const sectionTable = (
        title: string,
        lines: Array<{ label: string; value: number }>,
        total: number,
      ) => [
        {
          text: title,
          style: 'sectionTitle',
        },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              ...lines.map((line) => [
                { text: line.label, style: 'cellLabel' },
                { text: formatCOP(line.value), style: 'cellValue' },
              ]),
              [
                { text: `Total ${title}`, style: 'cellTotal' },
                { text: formatCOP(total), style: 'cellTotalValue' },
              ],
            ],
          },
          layout: 'noBorders',
          margin: [0, 2, 0, 8],
        },
      ]

      const dev = receipt.devengados
      const ded = receipt.deducciones
      const ss = receipt.seguridadSocial

      const docDefinition: any = {
        pageSize: 'LETTER',
        pageMargins: [40, 40, 40, 60],
        content: [
          {
            columns: [
              companyLogo
                ? { image: companyLogo, width: 130 }
                : { text: 'Suite RH', bold: true, fontSize: 16, color: '#0F2440' },
              {
                text: 'SUITE RH',
                alignment: 'right',
                bold: true,
                color: '#48A9A6',
                fontSize: 11,
                margin: [0, 4, 0, 0],
              },
            ],
          },
          {
            text: 'RECIBO DE NÓMINA',
            style: 'title',
            margin: [0, 12, 0, 2],
          },
          {
            text: `Período: ${receipt.periodLabel}`,
            style: 'subtitle',
          },
          {
            text: `Empleado: ${profile.firstName} ${profile.lastName} · Documento: ${profile.document} · Cargo: ${profile.position || '—'}`,
            style: 'subtitle',
          },
          {
            text: `Días trabajados: ${receipt.days} · Estado: ${STATUS_LABELS[receipt.status] ?? receipt.status}`,
            style: 'subtitle',
            margin: [0, 0, 0, 10],
          },
          {
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#CBD5E1' }],
            margin: [0, 0, 0, 10],
          },
          ...sectionTable('Devengado', [
            { label: `Salario base (${dev.daysWorked} día(s))`, value: dev.baseSalary },
            { label: 'Auxilio de transporte', value: dev.transportAllowance },
            { label: 'Horas extra diurnas (25%)', value: dev.overtimeDay },
            { label: 'Horas extra nocturnas (75%)', value: dev.overtimeNight },
            { label: 'Recargo nocturno (35%)', value: dev.nightSurcharge },
            { label: 'Bonificaciones', value: dev.bonuses },
            { label: 'Comisiones', value: dev.commissions },
            ...(dev.absenceCompanyPaidValue
              ? [{ label: 'Incapacidad común (pago empresa)', value: dev.absenceCompanyPaidValue }]
              : []),
            ...(dev.absenceEpsValue
              ? [{ label: 'Incapacidad común (cubre EPS)', value: dev.absenceEpsValue }]
              : []),
            ...(dev.absenceArlValue
              ? [{ label: 'Incapacidad laboral (cubre ARL)', value: dev.absenceArlValue }]
              : []),
          ], dev.total),
          ...sectionTable('Deducciones', [
            { label: 'Salud empleado (4%)', value: ded.employeeHealth },
            { label: 'Pensión empleado (4%)', value: ded.employeePension },
            { label: 'Retención en la fuente', value: ded.sourceRetention },
            { label: 'Embargos', value: ded.garnishments },
            { label: 'Préstamos', value: ded.loans },
          ], ded.total),
          ...sectionTable('Seguridad social (empleador)', [
            { label: 'Salud empleador (8,5%)', value: ss.employerHealth },
            { label: 'Pensión empleador (12%)', value: ss.employerPension },
            { label: 'ARL', value: ss.arl },
            { label: 'SENA (2%)', value: ss.sena },
            { label: 'ICBF (3%)', value: ss.icbf },
            { label: 'Caja de compensación (4%)', value: ss.compensationFund },
          ], ss.total),
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                [
                  {
                    text: 'NETO A PAGAR',
                    bold: true,
                    fontSize: 13,
                    color: '#0F2440',
                    fillColor: '#E3F2FD',
                    margin: [6, 6, 0, 6],
                  },
                  {
                    text: formatCOP(receipt.totalToPay),
                    bold: true,
                    fontSize: 13,
                    color: '#1867C0',
                    alignment: 'right',
                    fillColor: '#E3F2FD',
                    margin: [0, 6, 6, 6],
                  },
                ],
              ],
            },
            layout: 'noBorders',
            margin: [0, 8, 0, 0],
          },
        ],
        styles: {
          title: { fontSize: 16, bold: true, color: '#0F2440' },
          subtitle: { fontSize: 10, color: '#334155', margin: [0, 2, 0, 0] },
          sectionTitle: { fontSize: 11, bold: true, color: '#1867C0', margin: [0, 6, 0, 0] },
          cellLabel: { fontSize: 9.5, color: '#334155', margin: [0, 1, 0, 1] },
          cellValue: { fontSize: 9.5, color: '#0F2440', alignment: 'right', margin: [0, 1, 0, 1] },
          cellTotal: { fontSize: 9.5, bold: true, color: '#0F2440', margin: [0, 3, 0, 1] },
          cellTotalValue: { fontSize: 9.5, bold: true, color: '#0F2440', alignment: 'right', margin: [0, 3, 0, 1] },
        },
        footer: (currentPage: number) => ({
          columns: [
            { text: 'Generado por Suite RH', fontSize: 8, color: '#94A3B8', margin: [40, 0, 0, 0] },
            { text: `Página ${currentPage}`, fontSize: 8, color: '#94A3B8', alignment: 'right', margin: [0, 0, 40, 0] },
          ],
          margin: [0, 20, 0, 0],
        }),
      }

      pdfMake.createPdf(docDefinition).download(`recibo-nomina-${receipt.periodLabel.replace(/\//g, '-')}.pdf`)
    } finally {
      generating.value = false
    }
  }

  return { generating, downloadReceipt }
}

export default usePayrollReceiptPdf
