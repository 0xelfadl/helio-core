import { AuthPrincipal,ROLES ,Role } from "./auth.types.js";
import { isUuid } from "../common/validation/uuid.js"

function isRole(value: unknown): value is Role {
  return (
    typeof value === 'string' && (ROLES as readonly string[]).includes(value)
  );
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token, ...rest] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
    return null;
  }
  return token;
}

export function toPrincipal(payload: unknown): AuthPrincipal | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { sub, org_id, role, exp } = payload as Record<string, unknown>;

  if (typeof exp !== 'number') return null;
  if (!isUuid(sub) || !isUuid(org_id) || !isRole(role)) return null;

  return { userId: sub, orgId: org_id, role };
}
