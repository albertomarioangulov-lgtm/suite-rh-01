export type ViewMode = 'table' | 'cards'

/**
 * Alterna entre vista de tabla y tarjetas, con preferencia persistida en
 * localStorage y default responsive (tarjetas en móvil, tabla en escritorio).
 * Reutilizable en cualquier página con listas.
 */
export const useViewMode = (storageKey: string) => {
  const viewMode = ref<ViewMode>('table')

  const readStored = (): ViewMode | null => {
    if (!import.meta.client) return null
    try {
      const stored = localStorage.getItem(storageKey)
      return stored === 'table' || stored === 'cards' ? stored : null
    } catch {
      return null
    }
  }

  const responsiveDefault = (): ViewMode => (window.innerWidth < 768 ? 'cards' : 'table')

  const initializeViewMode = () => {
    if (!import.meta.client) return
    viewMode.value = readStored() ?? responsiveDefault()
  }

  const toggleView = () => {
    viewMode.value = viewMode.value === 'table' ? 'cards' : 'table'
    try {
      localStorage.setItem(storageKey, viewMode.value)
    } catch {
      // localStorage no disponible (modo privado): se ignora la persistencia.
    }
  }

  // Si el usuario no eligió manualmente, se adapta al ancho de pantalla.
  const handleResize = () => {
    if (!readStored()) viewMode.value = responsiveDefault()
  }

  onMounted(() => {
    initializeViewMode()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return { viewMode, toggleView }
}

export default useViewMode
