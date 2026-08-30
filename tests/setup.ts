import { vi } from 'vitest'
import { createError } from 'h3'

// Los utils del server usan `createError` como auto-import de Nitro; en
// Vitest se expone globalmente para que los tests de schemas funcionen.
vi.stubGlobal('createError', createError)
