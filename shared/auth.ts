// ============================================================
// Roles y tipos compartidos de autenticación (cliente + servidor)
// ============================================================

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  HR: 'hr',
  EMPLOYEE: 'employee',
} as const

export type UserRole = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  hr: 'Recursos Humanos',
  employee: 'Empleado',
}

export interface IUser {
  _id: string
  email: string
  name: string
  role: UserRole
  active: boolean
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
