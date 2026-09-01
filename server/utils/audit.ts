import { AuditLog } from '~~/server/models/AuditLog'

export type AuditModule =
  | 'company'
  | 'legal-params'
  | 'payroll'
  | 'payroll-cycle'
  | 'payroll-concept'
  | 'employee'
  | 'shift'
  | 'attendance'
  | 'absence'
  | 'loan'
  | 'evaluation'
  | 'evaluation-config'
  | 'evaluation-campaign'

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'activate'
  | 'recalculate'
  | 'approve'
  | 'pay'
  | 'cancel'
  | 'assign'
  | 'unassign'
  | 'move'
  | 'generate'

export const logAudit = (entry: {
  module: AuditModule
  action: AuditAction
  entityId?: string
  userId?: string
  userName?: string
  description?: string
  changes?: unknown
}) => AuditLog.create(entry)
