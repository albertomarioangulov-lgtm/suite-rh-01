import { AuditLog } from '~~/server/models/AuditLog'

export const logAudit = (entry: {
  module: 'company' | 'legal-params'
  action: 'create' | 'update' | 'activate'
  entityId?: string
  userId?: string
  userName?: string
  description?: string
  changes?: unknown
}) => AuditLog.create(entry)
