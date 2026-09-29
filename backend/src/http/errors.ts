import { authorize } from '@/http/authorize'

export const validation = 'validation'
export const unauthenticated = 'unauthenticated'
export const forbidden = 'forbidden'
export const not_found = 'not_found'
export const conflict = 'conflict'
export const rate_limited = 'rate_limited'
export const business_rule = 'business_rule'
export const provider_error = 'provider_error'
export const internal_error = 'internal_error'

export type ErrorCode =
  | typeof validation
  | typeof unauthenticated
  | typeof forbidden
  | typeof not_found
  | typeof conflict
  | typeof rate_limited
  | typeof business_rule
  | typeof provider_error
  | typeof internal_error

export function buildError(input: {
  code: ErrorCode
  message: string
  request_id: string
  issues?: unknown
}): { code: ErrorCode; message: string; request_id: string; issues?: unknown } {
  const body: { code: ErrorCode; message: string; request_id: string; issues?: unknown } = {
    code: input.code,
    message: input.message,
    request_id: input.request_id,
  }
  if (input.issues !== undefined) {
    body.issues = input.issues
  }
  return body
}

export type AuthorizeContext = {
  actorId: string
  tenantId: string
  ownerId: string
  resourceTenantId: string
  role: 'USER' | 'ADMIN'
  action: string
}

export function authorizeDenialCode(input: AuthorizeContext): typeof forbidden | typeof not_found {
  if (authorize(input)) {
    throw new Error('acesso permitido')
  }
  if (input.tenantId !== input.resourceTenantId) return forbidden
  return not_found
}
