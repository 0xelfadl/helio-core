import { describe, expect, it } from 'vitest';
import {
  parseListTicketsQuery,
  ListTicketsQuery,
} from './list-tickets.query.js';
import {
  decodeCursor,
  encodeCursor,
  CursorContext,
  CursorPosition,
  DecodeResult,
  sealCursor,
} from './ticket-cursor.js';

const SECRET = 'super-secret';

const ORG_1 = '11111111-1111-4111-8111-111111111111';
const ORG_2 = '22222222-2222-4222-8222-222222222222';

const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const BASE_POSITION: CursorPosition = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  sortValue: new Date('2026-11-15T07:00:00.123Z'),
};

const BASE_CONTEXT: CursorContext = {
  orgId: ORG_1,
  sort: 'createdAt_desc',
  filters: {
    statuses: ['open', 'pending'],
    priorities: ['low', 'medium'],
    assignee: {
      kind: 'user',
      userId: USER_A,
    },
  },
};

function expectDecodeOk(result: DecodeResult): CursorPosition {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return result.position;
}

function expectDecodeRejected(
  cursor: string,
  context: CursorContext = BASE_CONTEXT,
  secret: string = SECRET,
): void {
  const result = decodeCursor(cursor, context, secret);
  expect(result.ok).toBe(false);
}

function flipOneChar(cursor: string): string {
  if (cursor.length === 0) return 'A';
  const index = Math.floor(cursor.length / 2);
  const current = cursor[index];
  const replacement = current === 'A' ? 'B' : 'A';
  return cursor.slice(0, index) + replacement + cursor.slice(index + 1);
}

function flipFirstChar(cursor: string): string {
  if (cursor.length === 0) {
    return 'A';
  }

  const replacement = cursor[0] === 'A' ? 'B' : 'A';

  return replacement + cursor.slice(1);
}

function toCursorContext(
  query: ListTicketsQuery,
  orgId = ORG_1,
): CursorContext {
  return {
    orgId,
    sort: query.sort,
    filters: {
      statuses: query.statuses,
      priorities: query.priorities,
      assignee: query.assignee,
    },
  };
}

describe('ticket-cursor', () => {
  describe('positive controls', () => {
    it('encodes then decodes back to the exact same position', () => {
      const cursor = encodeCursor(BASE_POSITION, BASE_CONTEXT, SECRET);
      const result = expectDecodeOk(decodeCursor(cursor, BASE_CONTEXT, SECRET));

      expect(result.id).toBe(BASE_POSITION.id);
      expect(result.sortValue.getTime()).toBe(
        BASE_POSITION.sortValue.getTime(),
      );
    });

    it('preserves milliseconds exactly', () => {
      const cursor = encodeCursor(BASE_POSITION, BASE_CONTEXT, SECRET);
      const result = expectDecodeOk(decodeCursor(cursor, BASE_CONTEXT, SECRET));

      expect(result.sortValue.getMilliseconds()).toBe(123);
      expect(result.sortValue.getTime()).toBe(
        BASE_POSITION.sortValue.getTime(),
      );
    });

    it('produces a URL-safe cursor with a maximum length of 512 characters', () => {
      const cursor = encodeCursor(BASE_POSITION, BASE_CONTEXT, SECRET);

      expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(cursor.length).toBeLessThanOrEqual(512);
    });

    it('is deterministic for the same inputs', () => {
      const cursor1 = encodeCursor(BASE_POSITION, BASE_CONTEXT, SECRET);
      const cursor2 = encodeCursor(BASE_POSITION, BASE_CONTEXT, SECRET);
      const cursor3 = encodeCursor(BASE_POSITION, BASE_CONTEXT, SECRET);

      expect(cursor1).toBe(cursor2);
      expect(cursor2).toBe(cursor3);
    });

    it('also works when equivalent filters are provided in a different order', () => {
      const parsedA = parseListTicketsQuery({
        status: 'pending,open',
        priority: 'high,low',
        assignee: 'me',
        sort: '-createdAt',
        limit: '25',
      });

      const parsedB = parseListTicketsQuery({
        status: 'open,pending',
        priority: 'low,high',
        assignee: 'me',
        sort: '-createdAt',
        limit: '25',
      });

      expect(parsedA.ok).toBe(true);
      expect(parsedB.ok).toBe(true);

      if (!parsedA.ok || !parsedB.ok) {
        throw new Error('Expected parser to accept both equivalent queries');
      }

      const contextA = toCursorContext(parsedA.value);
      const contextB = toCursorContext(parsedB.value);

      const cursorA = encodeCursor(BASE_POSITION, contextA, SECRET);
      const cursorB = encodeCursor(BASE_POSITION, contextB, SECRET);

      expect(cursorA).toBe(cursorB);
    });
  });

  describe('rejection controls', () => {
    it.each([
      [
        'sort changes',
        (context: CursorContext): CursorContext => ({
          ...context,
          sort: 'createdAt_asc' as const,
        }),
      ],
      [
        'status filters changes',
        (context: CursorContext): CursorContext => ({
          ...context,
          filters: {
            ...context.filters,
            statuses: ['solved', 'closed'],
          },
        }),
      ],
      [
        'priority filters changes',
        (context: CursorContext): CursorContext => ({
          ...context,
          filters: {
            ...context.filters,
            priorities: ['urgent'],
          },
        }),
      ],
      [
        'assignee filter changes',
        (context: CursorContext): CursorContext => ({
          ...context,
          filters: {
            ...context.filters,
            assignee: { kind: 'unassigned' as const },
          },
        }),
      ],
      [
        'assignee user changes',
        (context: CursorContext): CursorContext => ({
          ...context,
          filters: {
            ...context.filters,
            assignee: {
              kind: 'user',
              userId: USER_B,
            },
          },
        }),
      ],
      [
        'org changes',
        (context: CursorContext): CursorContext => ({
          ...context,
          orgId: ORG_2,
        }),
      ],
    ])('rejects when %s', (_unused, mutateContext) => {
      const cursor = encodeCursor(BASE_POSITION, BASE_CONTEXT, SECRET);

      expectDecodeRejected(cursor, mutateContext(BASE_CONTEXT), SECRET);
    });

    it('rejects when secret changes', () => {
      const cursor = encodeCursor(BASE_POSITION, BASE_CONTEXT, SECRET);

      expectDecodeRejected(cursor, BASE_CONTEXT, 'another-secret');
    });

    it.each([
      ['single character changed', (cursor: string) => flipOneChar(cursor)],
      ['tag character changed', (cursor: string) => flipFirstChar(cursor)],
      ['truncated', (cursor: string) => cursor.slice(0, -1)],
      ['empty string', () => ''],
      ["short cursor like 'abc'", () => 'abc'],
      ['invalid base64url', () => '!!!'],
    ])('rejects when %s', (_unused, mutateCursor) => {
      const cursor = encodeCursor(BASE_POSITION, BASE_CONTEXT, SECRET);
      expectDecodeRejected(mutateCursor(cursor));
    });

    const VALID_PAYLOAD = {
      v: 1,
      t: BASE_POSITION.sortValue.getTime(),
      id: BASE_POSITION.id,
    };
    it('accepts a sealed cursor whose payload is valid (control for forged payload tests)', () => {
      expectDecodeOk(
        decodeCursor(
          sealCursor(VALID_PAYLOAD, BASE_CONTEXT, SECRET),
          BASE_CONTEXT,
          SECRET,
        ),
      );
    });

    it.each([
      [
        'v is 2',
        {
          ...VALID_PAYLOAD,
          v: 2,
        },
      ],
      [
        't is a string',
        {
          ...VALID_PAYLOAD,
          t: '1793505007123',
        },
      ],
      [
        't is not an integer',
        {
          ...VALID_PAYLOAD,
          t: 1.5,
        },
      ],
      [
        'id is not a UUID',
        {
          ...VALID_PAYLOAD,
          id: 'not-a-uuid',
        },
      ],
      [
        'id is missing',
        {
          v: 1,
          t: VALID_PAYLOAD.t,
        },
      ],
      ['payload is a JSON array', [1, VALID_PAYLOAD.t, VALID_PAYLOAD.id]],
      ['payload is null', null],
    ])(
      'rejects a forged cursor with valid signature but invalid payload: %s',
      (_unused, payload) => {
        const forged = sealCursor(payload, BASE_CONTEXT, SECRET);

        expectDecodeRejected(forged);
      },
    );
  });
});
