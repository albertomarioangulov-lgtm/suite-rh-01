import { createHash, randomBytes } from 'node:crypto'

export const INVITE_TTL_MS = 72 * 60 * 60 * 1000 // 72 horas

/** Genera un token de invitación aleatorio y su hash (para guardar en BD). */
export const generateInviteToken = () => {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    hash: hashInviteToken(token),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  }
}

export const hashInviteToken = (token: string) => createHash('sha256').update(token).digest('hex')
