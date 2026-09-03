// ============================================================
// Roles y tipos compartidos de autenticación (cliente + servidor)
// ============================================================

export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  HR: 'hr',
  EMPLOYEE: 'employee',
} as const

export type UserRole = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super administrador (plataforma)',
  admin: 'Administrador',
  manager: 'Gerente',
  hr: 'Recursos Humanos',
  employee: 'Empleado',
}

/**
 * El super administrador (AMAV/plataforma) pasa cualquier guard de rol:
 * opera sobre tenants, licencias y configuración global.
 */
export const roleIsAllowed = (
  role: UserRole | undefined | null,
  allowedRoles: UserRole[],
): boolean =>
  !!role && (allowedRoles.includes(role) || role === ROLES.SUPERADMIN)

export interface IUser {
  _id: string
  email: string
  name: string
  role: UserRole
  active: boolean
  /** Ficha de empleado vinculada (si existe): habilita el portal de autoservicio. */
  employeeId?: string | null
  createdAt?: string
  updatedAt?: string
  emailStatus?: string
  emailStatusUpdatedAt?: string
  /** Multi-tenant: empresas a las que pertenece el usuario. */
  tenantIds?: string[]
  /** Empresa activa en la sesión actual. */
  tenantActivo?: string | null
}

/** Alias de compatibilidad con el tipado existente. */
export type AuthUser = IUser
