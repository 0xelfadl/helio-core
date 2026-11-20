import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  SortKey,
  ListTicketsQuery,
  AssigneeFilter,
} from './list-tickets.query.js';
import { isUuid } from '../common/validation/uuid.js';

const CURSOR_VERSION = 1;
const TAG_LENGTH = 32;

export interface CursorPosition {
  sortValue: Date;
  id: string;
}
/**
 * Filters must be canonical, as produced by parseListTicketsQuery().
 */
export interface CursorContext {
  orgId: string;
  sort: SortKey;
  filters: Pick<ListTicketsQuery, 'statuses' | 'priorities' | 'assignee'>;
}

export type DecodeResult =
  { ok: true; position: CursorPosition } | { ok: false; reason: string };

function canonicalAssignee(
  assignee: AssigneeFilter | null,
): readonly string[] | null {
  if (assignee === null) return null;
  switch (assignee.kind) {
    case 'me':
    case 'unassigned':
      return [assignee.kind];
    case 'user':
      return ['user', assignee.userId];
    default: {
      const unhandled: never = assignee;
      throw new Error(
        `Unhandled assignee filter: ${JSON.stringify(unhandled)}`,
      );
    }
  }
}

function canonicalContext(context: CursorContext): string {
  const assignee = context.filters.assignee;
  const assigneeCanonical = canonicalAssignee(assignee);
  // why i'am building an array instaed of signing i'do that for the key order
  const contextArray = [
    context.orgId,
    context.sort,
    context.filters.statuses,
    context.filters.priorities,
    assigneeCanonical,
  ];
  return JSON.stringify(contextArray);
}

function computeTag(
  context: CursorContext,
  payloadBytes: Buffer,
  secret: string,
): Buffer {
  const contextLine = canonicalContext(context);
  const tag = createHmac('sha256', secret)
    .update(contextLine)
    .update('\n')
    .update(payloadBytes)
    .digest();
  return tag;
}

export function encodeCursor(
  position: CursorPosition,
  context: CursorContext,
  secret: string,
): string {
  const payload = {
    v: CURSOR_VERSION,
    t: position.sortValue.getTime(),
    id: position.id,
  };
  return sealCursor(payload, context, secret);
}

export function sealCursor(
  payload: unknown,
  context: CursorContext,
  secret: string,
): string {
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
  const tag = computeTag(context, payloadBytes, secret);
  const cursor = Buffer.concat([tag, payloadBytes]).toString('base64url');
  return cursor;
}

export function decodeCursor(
  cursor: string,
  context: CursorContext,
  secret: string,
): DecodeResult {
  // why validate the signing before parsing cuzz we don't parse the data unauthenticated so we validate first and process later
  if (!/^[A-Za-z0-9_-]+$/.test(cursor)) {
    return {
      ok: false,
      reason: 'invalid characters',
    };
  }
  const bytes = Buffer.from(cursor, 'base64url');
  if (bytes.length <= TAG_LENGTH) {
    return {
      ok: false,
      reason: 'too short',
    };
  }
  const receivedTag = bytes.subarray(0, TAG_LENGTH);
  const payloadBytes = bytes.subarray(TAG_LENGTH);
  const expectedTag = computeTag(context, payloadBytes, secret);
  if (!timingSafeEqual(receivedTag, expectedTag)) {
    return {
      ok: false,
      reason: 'bad signature',
    };
  }
  let payload: unknown;
  try {
    payload = JSON.parse(payloadBytes.toString('utf8'));
  } catch {
    return {
      ok: false,
      reason: 'invalid json',
    };
  }
  if (
    payload == null ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    return {
      ok: false,
      reason: 'invalid payload',
    };
  }
  const { v, t, id } = payload as Record<string, unknown>;
  if (
    v !== CURSOR_VERSION ||
    typeof t !== 'number' ||
    !Number.isSafeInteger(t) ||
    t < 0 ||
    !isUuid(id)
  ) {
    return { ok: false, reason: 'invalid payload' };
  }

  return { ok: true, position: { sortValue: new Date(t), id } };
}
