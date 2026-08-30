export type SnackbarType = 'success' | 'error' | 'info' | 'warning'

export interface SnackbarOptions {
  color?: string
  icon?: string
  timeout?: number
}

export interface SnackbarState {
  id: number
  visible: boolean
  message: string
  color: string
  icon: string
  timeout: number
}

const baseState = (): SnackbarState => ({
  id: 0,
  visible: false,
  message: '',
  color: 'success',
  icon: 'mdi-check-circle-outline',
  timeout: 3000,
})

const ICONS: Record<SnackbarType, string> = {
  success: 'mdi-check-circle-outline',
  error: 'mdi-alert-circle-outline',
  info: 'mdi-information-outline',
  warning: 'mdi-alert-outline',
}

/**
 * Snackbar global (useState, sin Pinia). `id` cambia en cada notificación
 * para que el componente remonte y reinicie su timeout.
 */
export const useSnackbarState = () => {
  const state = useState<SnackbarState>('snackbar:state', baseState)

  const show = (message: string, options: SnackbarOptions = {}) => {
    state.value = {
      ...baseState(),
      id: state.value.id + 1,
      message,
      ...options,
      visible: true,
    }
  }

  const notify =
    (type: SnackbarType) =>
    (message: string, options: SnackbarOptions = {}) =>
      show(message, {
        color: type,
        icon: ICONS[type],
        ...options,
      })

  const hide = () => {
    state.value.visible = false
  }

  return {
    state,
    show,
    success: notify('success'),
    error: notify('error'),
    info: notify('info'),
    warning: notify('warning'),
    hide,
  }
}

export default useSnackbarState
