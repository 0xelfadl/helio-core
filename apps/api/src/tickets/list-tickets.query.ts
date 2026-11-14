import { z } from 'zod';
import { isUuid } from '../common/validation/uuid.js';

const TICKET_STATUSES = ['open', 'pending', 'solved', 'closed'] as const;
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

// type ticket status
export type TicketStatus = (typeof TICKET_STATUSES)[number]; 
// type ticket priority
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
// type to sort them 
export type SortKey = 'createdAt_desc' | 'createdAt_asc' | 'updatedAt_desc';
// assigne filter
export type AssigneeFilter = | { kind: 'me'} | { kind: 'unassigned'} | { kind: 'user'; userId:string };
// how the list of tickets should look like 
export interface ListTicketsQuery {
    statuses: TicketStatus[];
    priorities: TicketPriority[] | null;
    assignee: AssigneeFilter | null;
    sort: SortKey;
    limit: number;
    cursor: string | null;
}
// if we have an error 
export interface QueryError {
    field: string;
    reason: string;
}
// the type that the parser could take 
export type ParseResult = | { ok: true ; value: ListTicketsQuery } | { ok: false ; error: QueryError };

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;
const MAX_CURSOR_LENGTH = 512;
const MAX_ECHOED_FIELD_LENGTH = 64;
const DEFAULT_STATUSES: readonly TicketStatus[] = ['open', 'pending'];
const DEFAULT_SORT: SortKey = 'createdAt_desc';

const SORT_PARAMS = ['-createdAt', 'createdAt', '-updatedAt'] as const;
type SortParam = (typeof SORT_PARAMS)[number];
const SORT_KEY_BY_PARAM: Record<SortParam, SortKey> = {
  '-createdAt': 'createdAt_desc',
  createdAt: 'createdAt_asc',
  '-updatedAt': 'updatedAt_desc',
};

const SINGLE_VALUE = { error: 'must be provided once, as a single value' };

function csvOf<T extends string>(allowed: readonly T[]) {
    return z.string(SINGLE_VALUE).transform((raw,ctx) =>{
        const parts = raw.split(',');
        const isValid = parts.every((part) => (allowed as readonly string []).includes(part));
        if(!isValid){
            ctx.issues.push({
                code: 'custom',
                message: `must be a comma-separated list of: ${allowed.join(', ')}`,
                input: raw,
            });
            return z.NEVER
        }
        return allowed.filter((value) => parts.includes(value));
    });
}

const assigneeSchema = z.string(SINGLE_VALUE).transform((raw, ctx): AssigneeFilter => {
  if (raw === 'me') return { kind: 'me' };
  if (raw === 'unassigned') return { kind: 'unassigned' };
  if (isUuid(raw)) return { kind: 'user', userId: raw.toLowerCase() };
  ctx.issues.push({
    code: 'custom',
    message: 'must be "me", "unassigned" or a user id',
    input: raw,
  });
  return z.NEVER;
});

const sortSchema = z
  .enum(SORT_PARAMS, { error: `must be one of: ${SORT_PARAMS.join(', ')}` })
  .transform((param) => SORT_KEY_BY_PARAM[param]);

const limitSchema = z
  .string(SINGLE_VALUE)
  .regex(/^[1-9]\d{0,2}$/, { error: `must be an integer from 1 to ${MAX_LIMIT}` })
  .transform(Number)
  .refine((n) => n <= MAX_LIMIT, { error: `must be an integer from 1 to ${MAX_LIMIT}` });

const cursorSchema = z
  .string(SINGLE_VALUE)
  .max(MAX_CURSOR_LENGTH, { error: 'is invalid' })
  .regex(/^[A-Za-z0-9_-]+$/, { error: 'is invalid' });

const querySchema = z.strictObject({
  status: csvOf(TICKET_STATUSES).optional(),
  priority: csvOf(TICKET_PRIORITIES).optional(),
  assignee: assigneeSchema.optional(),
  sort: sortSchema.optional(),
  limit: limitSchema.optional(),
  cursor: cursorSchema.optional(),
});

function toQueryError(error: z.ZodError): QueryError {
  const issue = error.issues[0];
  if (!issue) return { field: 'query', reason: 'is invalid' };

  if (issue.code === 'unrecognized_keys') {
    const key = issue.keys[0] ?? 'query';
    return { field: key.slice(0, MAX_ECHOED_FIELD_LENGTH), reason: 'is not a supported parameter' };
  }

  const field = issue.path[0];
  if (typeof field !== 'string') {
    return { field: 'query', reason: 'must be a set of query parameters' };
  }
  return { field, reason: issue.message };
}

// function that take the raw and what return
export function parseListTicketsQuery(raw: unknown): ParseResult {
    const result = querySchema.safeParse(raw);
    if(!result.success) return { ok:false, error:toQueryError(result.error)};

    const q= result.data;
    return {
        ok:true,
        value: {
           statuses: q.status ?? [...DEFAULT_STATUSES],
           priorities: q.priority ?? null,
           assignee: q.assignee ?? null,
           sort: q.sort ?? DEFAULT_SORT,
           limit: q.limit ?? DEFAULT_LIMIT,
           cursor: q.cursor ?? null,
        },
    };
}