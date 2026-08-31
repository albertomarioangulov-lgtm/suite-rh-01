import { API_PATHS } from '~/utils/api-paths'

export interface IEvaluationView {
  id: string
  employeeId: string
  employee: string
  document: string
  evaluator: string
  periodLabel: string
  status: 'draft' | 'completed' | 'approved'
  overallScore: number
  createdAt?: string
}

export interface IEvaluationTemplateView {
  id: string
  name: string
  description: string
  positionId: string
  position: string
  sections: Array<Record<string, any>>
  active: boolean
}

export const useEvaluationState = () => {
  const { authFetch } = useAuthState()

  const evaluations = useState<IEvaluationView[]>('evaluation-list', () => [])
  const templates = useState<IEvaluationTemplateView[]>(
    'evaluation-template-list',
    () => [],
  )
  const loading = useState<boolean>('evaluation-loading', () => false)
  const error = useState<string>('evaluation-error', () => '')

  const fetchEvaluations = async (
    query: Record<string, unknown> = {},
  ): Promise<IEvaluationView[]> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<{ items: IEvaluationView[] }>(
        API_PATHS.evaluations.list,
        { query },
      )
      evaluations.value = data.items
      return data.items
    } catch (err) {
      error.value =
        (err as { data?: { message?: string } })?.data?.message ??
        'Error al cargar evaluaciones'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createEvaluation = async (payload: Record<string, unknown>) =>
    authFetch<{ id: string }>(API_PATHS.evaluations.list, {
      method: 'POST',
      body: payload,
    })

  const updateEvaluation = async (
    id: string,
    payload: Record<string, unknown>,
  ) =>
    authFetch<{ success: boolean; overallScore: number }>(
      API_PATHS.evaluations.detail(id),
      { method: 'PUT', body: payload },
    )

  const approveEvaluation = async (id: string) =>
    authFetch<{ success: boolean }>(API_PATHS.evaluations.approve(id), {
      method: 'PUT',
    })

  const fetchTemplates = async (
    query: Record<string, unknown> = {},
  ): Promise<IEvaluationTemplateView[]> => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<{ items: IEvaluationTemplateView[] }>(
        API_PATHS.evaluations.templates,
        { query },
      )
      templates.value = data.items
      return data.items
    } catch (err) {
      error.value =
        (err as { data?: { message?: string } })?.data?.message ??
        'Error al cargar plantillas'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchTemplateByPosition = async (positionId: string) =>
    authFetch<IEvaluationTemplateView | null>(
      API_PATHS.evaluations.templateByPosition(positionId),
    )

  const createTemplate = async (payload: Record<string, unknown>) =>
    authFetch<{ id: string }>(API_PATHS.evaluations.templates, {
      method: 'POST',
      body: payload,
    })

  const updateTemplate = async (
    id: string,
    payload: Record<string, unknown>,
  ) =>
    authFetch<{ success: boolean }>(API_PATHS.evaluations.template(id), {
      method: 'PUT',
      body: payload,
    })

  const deleteTemplate = async (id: string) =>
    authFetch<{ success: boolean }>(API_PATHS.evaluations.template(id), {
      method: 'DELETE',
    })

  return {
    evaluations,
    templates,
    loading,
    error,
    fetchEvaluations,
    createEvaluation,
    updateEvaluation,
    approveEvaluation,
    fetchTemplates,
    fetchTemplateByPosition,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  }
}
