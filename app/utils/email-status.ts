export type EmailStatus =
  | 'none'
  | 'pending'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'blocked'
  | 'invalid'
  | 'failed'
  | 'unknown'

export const EMAIL_STATUS_META: Record<EmailStatus, { label: string; color: string }> = {
  none: { label: 'Sin enviar', color: 'grey' },
  pending: { label: 'Enviando…', color: 'warning' },
  delivered: { label: 'Entregado', color: 'primary' },
  opened: { label: 'Leído', color: 'success' },
  clicked: { label: 'Aceptado', color: 'success' },
  bounced: { label: 'Rebotado', color: 'error' },
  blocked: { label: 'Bloqueado', color: 'error' },
  invalid: { label: 'Inválido', color: 'error' },
  failed: { label: 'Falló', color: 'error' },
  unknown: { label: 'Desconocido', color: 'grey' },
}

export const emailStatusMeta = (status?: string) =>
  EMAIL_STATUS_META[(status as EmailStatus) || 'none'] ?? EMAIL_STATUS_META.none
