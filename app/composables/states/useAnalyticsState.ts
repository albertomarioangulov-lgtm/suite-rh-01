import { API_BASE } from '~/utils/api-paths'

export interface IHeadcountBreakdown {
  type: string
  count: number
}

export interface IAbsenceByType {
  type: string
  days: number
  count: number
}

export interface IMonthlyPayrollPoint {
  month: string
  label: string
  totalEarned: number
  totalToPay: number
  totalDeducted: number
  draftTotalToPay?: number
}

export interface IDailyAttendancePoint {
  date: string
  hoursWorked: number
  overtimeDayHours: number
  overtimeNightHours: number
}

export interface IPayrollPerEmployee {
  employeeId: string
  name: string
  position: string
  baseSalary: number
  devengados: Record<string, number>
  deducciones: Record<string, number>
  seguridadSocial: Record<string, number>
  totalToPay: number
}

export type AttendanceDayState =
  | 'present'
  | 'justified'
  | 'missing'
  | 'nonworking'

export interface IHeatmapDay {
  date: string
  weekday: number
  state: AttendanceDayState
}

export interface IHeatmapEmployee {
  employeeId: string
  name: string
  days: IHeatmapDay[]
}

export interface IAnalyticsOverview {
  companyConfigured: boolean
  period: { month: number; year: number }
  headcount: {
    totalEmployees: number
    activeEmployees: number
    terminations: number
    rotationRate: number
    byContractType: IHeadcountBreakdown[]
    byPosition: IHeadcountBreakdown[]
    byDepartment: IHeadcountBreakdown[]
  } | null
  payroll: {
    totalEarned: number
    totalDeducted: number
    totalSocialSecurity: number
    totalToPay: number
    employeeCount: number
    averageNet: number
    previousTotalToPay: number
    previousTotalEarned: number
    netVariation: number | null
    earnedVariation: number | null
  } | null
  alerts: {
    active: number
  }
  overtime: {
    weekOvertimeHours: number
    legalLimit: number
  }
  topAbsences: Array<{
    employeeId: string
    name: string
    days: number
    count: number
  }>
  heatmap: IHeatmapEmployee[]
  draftPayrolls: Array<{
    _id: string
    periodStart?: string
    periodEnd?: string
    totalToPay: number
    employeeCount: number
  }>
  absences: {
    totalApproved: number
    totalDays: number
    incapacityDays: number
    rate: number
    byType: IAbsenceByType[]
    incapacityBreakdown: {
      comun: { days: number; count: number }
      laboral: { days: number; count: number }
    }
  } | null
  attendance: {
    days: number
    hoursWorked: number
    overtimeDayHours: number
    overtimeNightHours: number
    nightSurcharge: number
    dailySeries: IDailyAttendancePoint[]
  } | null
  payrollPerEmployee: IPayrollPerEmployee[]
  monthlySeries: IMonthlyPayrollPoint[]
}

/**
 * Estado global del dashboard de analítica (useState, sin Pinia).
 */
export const useAnalyticsState = () => {
  const { authFetch } = useAuthState()

  const overview = useState<IAnalyticsOverview | null>('analytics-overview', () => null)
  const loading = useState<boolean>('analytics-loading', () => false)
  const error = useState<string>('analytics-error', () => '')

  const setError = (err: unknown, fallback: string) => {
    const apiError = err as
      | { data?: { message?: string }; message?: string }
      | null
    error.value = apiError?.data?.message || apiError?.message || fallback
  }

  const fetchOverview = async (month?: number, year?: number) => {
    loading.value = true
    error.value = ''
    try {
      const data = await authFetch<IAnalyticsOverview>(
        `${API_BASE}/analytics/overview`,
        {
          query: {
            ...(month ? { month } : {}),
            ...(year ? { year } : {}),
          },
        },
      )
      overview.value = data
      return data
    } catch (err) {
      setError(err, 'Error al cargar los indicadores')
      throw err
    } finally {
      loading.value = false
    }
  }

  const resetState = () => {
    overview.value = null
    error.value = ''
    loading.value = false
  }

  return {
    overview,
    loading,
    error,
    fetchOverview,
    resetState,
  }
}

export default useAnalyticsState
