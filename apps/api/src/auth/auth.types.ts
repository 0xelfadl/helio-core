import type { Request } from 'express';

export const ROLES = ['admin', 'agent', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export interface AuthPrincipal{
    userId: string;
    orgId: string;
    role: Role;
}

export interface AuthenticatedRequest extends Request {
    principal?: AuthPrincipal;
}