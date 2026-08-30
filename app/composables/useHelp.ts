// ============================================================
// Estado global del Centro de Ayuda
// Permite abrir la ayuda contextual desde cualquier página.
// ============================================================

const PATH_SECTIONS: Record<string, string> = {
  '/': 'inicio',
  '/home': 'inicio',
  '/profile': 'perfil',
  '/admin/users': 'usuarios',
  '/admin/employees': 'empleados',
  '/admin/attendance': 'asistencia',
  '/admin/shifts': 'turnos',
  '/admin/ausencias': 'ausencias',
  '/admin/ausencias/calendario': 'calendario',
  '/admin/payroll': 'nomina',
  '/admin/configuration': 'configuracion',
  '/admin/configuration/legal-params': 'legal',
  '/reports': 'reportes',
  '/help': 'inicio',
}

/**
 * Devuelve el id de sección de ayuda correspondiente a una ruta.
 * También cubre rutas de detalle como /admin/employees/123.
 */
export const getSectionForPath = (path: string): string | null => {
  const normalized =
    path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path

  if (PATH_SECTIONS[normalized]) return PATH_SECTIONS[normalized]

  for (const [base, id] of Object.entries(PATH_SECTIONS)) {
    if (base !== '/' && normalized.startsWith(`${base}/`)) return id
  }

  return null
}

export const useHelp = () => {
  const helpDialogOpen = useState<boolean>('help-dialog-open', () => false)
  const helpSectionId = useState<string | null>('help-section-id', () => null)

  const openHelp = (sectionId?: string | null) => {
    helpSectionId.value = sectionId ?? null
    helpDialogOpen.value = true
  }

  const closeHelp = () => {
    helpDialogOpen.value = false
  }

  return {
    helpDialogOpen,
    helpSectionId,
    openHelp,
    closeHelp,
  }
}
