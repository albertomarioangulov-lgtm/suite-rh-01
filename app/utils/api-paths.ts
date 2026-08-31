/**
 * Rutas de la API (v1), centralizadas para evitar repetir URLs en los
 * composables y facilitar un cambio de versión (p. ej. /api/v2) en un
 * solo lugar.
 */

export const API_BASE = '/api/v1'

export const API_PATHS = {
  auth: {
    login: `${API_BASE}/auth/login`,
    logout: `${API_BASE}/auth/logout`,
    me: `${API_BASE}/auth/me`,
    password: `${API_BASE}/auth/password`,
    invite: `${API_BASE}/auth/invite`,
  },
  users: {
    list: `${API_BASE}/users`,
    detail: (id: string) => `${API_BASE}/users/${id}`,
    invite: (id: string) => `${API_BASE}/users/${id}/invite`,
  },
  emails: {
    list: `${API_BASE}/emails`,
  },
  company: {
    config: `${API_BASE}/company`,
    audit: `${API_BASE}/company/audit`,
  },
  legalParams: {
    current: `${API_BASE}/legal-params`,
    historical: `${API_BASE}/legal-params/historical`,
    activate: (id: string) => `${API_BASE}/legal-params/${id}/activate`,
  },
  employees: {
    list: `${API_BASE}/employees`,
    detail: (id: string) => `${API_BASE}/employees/${id}`,
    assignShift: (id: string) => `${API_BASE}/employees/${id}/turno`,
    availableUsers: `${API_BASE}/employees/users-available`,
  },
  attendance: {
    list: `${API_BASE}/attendance`,
    dashboard: `${API_BASE}/attendance/dashboard`,
    detail: (id: string) => `${API_BASE}/attendance/${id}`,
    approve: (id: string) => `${API_BASE}/attendance/${id}/approve`,
    reject: (id: string) => `${API_BASE}/attendance/${id}/reject`,
    weekly: (employeeId: string) => `${API_BASE}/attendance/weekly/${employeeId}`,
    monthly: (employeeId: string) => `${API_BASE}/attendance/monthly/${employeeId}`,
  },
  shifts: {
    list: `${API_BASE}/shifts`,
    detail: (id: string) => `${API_BASE}/shifts/${id}`,
    employees: (id: string) => `${API_BASE}/shifts/${id}/employees`,
    assign: (id: string) => `${API_BASE}/shifts/${id}/assign`,
    unassign: (id: string) => `${API_BASE}/shifts/${id}/unassign`,
    history: (id: string) => `${API_BASE}/shifts/${id}/history`,
  },
  payroll: {
    list: `${API_BASE}/payroll`,
    dashboard: `${API_BASE}/payroll/dashboard`,
    detail: (id: string) => `${API_BASE}/payroll/${id}`,
    approve: (id: string) => `${API_BASE}/payroll/${id}/approve`,
    pay: (id: string) => `${API_BASE}/payroll/${id}/pay`,
    cancel: (id: string) => `${API_BASE}/payroll/${id}/cancel`,
    recalculate: (id: string) => `${API_BASE}/payroll/${id}/recalculate`,
    employees: (id: string) => `${API_BASE}/payroll/${id}/employees`,
    history: (id: string) => `${API_BASE}/payroll/${id}/history`,
    employeeHistory: (employeeId: string) =>
      `${API_BASE}/payroll/employee/${employeeId}`,
  },
  absences: {
    list: `${API_BASE}/absences`,
    detail: (id: string) => `${API_BASE}/absences/${id}`,
    approve: (id: string) => `${API_BASE}/absences/${id}/approve`,
    reject: (id: string) => `${API_BASE}/absences/${id}/reject`,
  },
  loans: {
    list: `${API_BASE}/loans`,
    detail: (id: string) => `${API_BASE}/loans/${id}`,
    payment: (id: string) => `${API_BASE}/loans/${id}/payment`,
  },
  contracts: {
    list: `${API_BASE}/contracts`,
  },
  organization: {
    departments: `${API_BASE}/departments`,
    department: (id: string) => `${API_BASE}/departments/${id}`,
    positions: `${API_BASE}/positions`,
    position: (id: string) => `${API_BASE}/positions/${id}`,
  },
  evaluations: {
    list: `${API_BASE}/evaluations`,
    detail: (id: string) => `${API_BASE}/evaluations/${id}`,
    approve: (id: string) => `${API_BASE}/evaluations/${id}/approve`,
    templates: `${API_BASE}/evaluation-templates`,
    template: (id: string) => `${API_BASE}/evaluation-templates/${id}`,
    templateByPosition: (positionId: string) =>
      `${API_BASE}/evaluation-templates/by-position/${positionId}`,
    config: `${API_BASE}/evaluation-config`,
    configHistory: `${API_BASE}/evaluation-config/history`,
    campaigns: `${API_BASE}/evaluation-campaigns`,
    campaign: (id: string) => `${API_BASE}/evaluation-campaigns/${id}`,
    campaignGenerate: (id: string) =>
      `${API_BASE}/evaluation-campaigns/${id}/generate`,
    campaignHistory: (id: string) =>
      `${API_BASE}/evaluation-campaigns/${id}/history`,
  },
} as const
