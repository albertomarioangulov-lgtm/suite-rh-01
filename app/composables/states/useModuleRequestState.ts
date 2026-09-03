import { API_BASE } from '~/utils/api-paths'
import type { FeatureFlag } from '~~/shared/feature-flags'

/**
 * Solicitud de activación de módulos desde la UI. La solicitud queda
 * registrada para que el superadmin (AMAV) la resuelva.
 */
export const useModuleRequestState = () => {
  const { authFetch } = useAuthState()
  const snackbar = useSnackbarState()

  const open = useState<boolean>('module-request-open', () => false)
  const module = useState<FeatureFlag | null>('module-request-module', () => null)
  const message = useState<string>('module-request-message', () => '')
  const sending = useState<boolean>('module-request-sending', () => false)

  const openRequest = (selected?: FeatureFlag | null) => {
    module.value = selected ?? null
    message.value = ''
    open.value = true
  }

  const closeRequest = () => {
    if (sending.value) return
    open.value = false
  }

  const sendRequest = async () => {
    if (!module.value) return
    sending.value = true
    try {
      await authFetch(`${API_BASE}/module-requests`, {
        method: 'POST',
        body: {
          module: module.value,
          message: message.value.trim(),
        },
      })
      snackbar.success('Solicitud enviada. AMAV la revisará.')
      open.value = false
    } catch {
      snackbar.error('No se pudo enviar la solicitud.')
    } finally {
      sending.value = false
    }
  }

  return {
    open,
    module,
    message,
    sending,
    openRequest,
    closeRequest,
    sendRequest,
  }
}
