import { describe, expect, it } from 'vitest';
import { ListTicketsQuery, parseListTicketsQuery } from './list-tickets.query.js';

const DEFAULTS: ListTicketsQuery = {
    statuses: ['open', 'pending'],
    priorities: null,
    assignee: null,
    sort: 'createdAt_desc',
    limit: 25,
    cursor: null,
};

const UUID = '0195a3f2-8c41-7d3e-9a1b-4c2f8e7d6a5b';

describe('parseListTicketsQuery', () => {
    it('applies every default when no params are given', () => {
       expect(parseListTicketsQuery({})).toEqual({ ok: true , value: DEFAULTS});
    });

    describe('accepts and normalizes valid input', () => {
        it.each<[string, Record<string,unknown>, Partial<ListTicketsQuery>]>([
            // status
            ['a single status' , { status:'open' }, { statuses: ['open'] }],
            ['statuses in canonical order', { status: 'pending,open' }, { statuses: ['open', 'pending'] }],
            ['duplicate statuses once', { status: 'open,open' }, { statuses: ['open'] }],
            ['all statuses', { status: 'closed,solved,pending,open' }, { statuses: ['open', 'pending', 'solved', 'closed'] }],
            // priority
            ['a single priority', { priority: 'urgent' }, { priorities: ['urgent'] }],
            ['priorities in canonical order', { priority: 'urgent,low' }, { priorities: ['low', 'urgent'] }],
            // assignee
            ['assignee=me', { assignee: 'me' }, { assignee: { kind: 'me' } }],
            ['assignee=unassigned', { assignee: 'unassigned' }, { assignee: { kind: 'unassigned' } }],
            ['a user id', { assignee: UUID }, { assignee: { kind: 'user', userId: UUID } }],
            ['an upper-case user id, lower-cased', { assignee: UUID.toUpperCase() }, { assignee: { kind: 'user', userId: UUID } }],
            // sort
            ['sort=-createdAt', { sort: '-createdAt' }, { sort: 'createdAt_desc' }],
            ['sort=createdAt', { sort: 'createdAt' }, { sort: 'createdAt_asc' }],
            ['sort=-updatedAt', { sort: '-updatedAt' }, { sort: 'updatedAt_desc' }],
            // limit
            ['the minimum limit', { limit: '1' }, { limit: 1 }],
            ['the maximum limit', { limit: '100' }, { limit: 100 }],
            // cursor
            ['a base64url cursor', { cursor: 'eyJ2IjoxfQ_-x' }, { cursor: 'eyJ2IjoxfQ_-x' }],
            ['a cursor of exactly 512 chars', { cursor: 'a'.repeat(512) }, { cursor: 'a'.repeat(512) }],
            // combined
            ['several params together', { status: 'open', priority: 'urgent', assignee: 'me', limit: '10' },{ statuses: ['open'], priorities: ['urgent'], assignee: { kind: 'me' }, limit: 10 }],
          ])('%s', (_name, input, override) => {
            expect(parseListTicketsQuery(input)).toEqual({ ok: true, value: { ...DEFAULTS, ...override}});
        });
    });


    describe('rejects invalid input and names the offending field', () => {
        it.each<[string, unknown, string]>([
            // status
            ['empty status', { status: '' }, 'status'],
            ['an empty segment', { status: 'open,,pending' }, 'status'],
            ['a trailing comma', { status: 'open,' }, 'status'],
            ['wrong case', { status: 'Open' }, 'status'],
            ['an unknown status', { status: 'opne' }, 'status'],
            ['a repeated status param', { status: ['open', 'pending'] }, 'status'],
            ['a nested object', { status: { a: 'b' } }, 'status'],
            // priority
            ['empty priority', { priority: '' }, 'priority'],
            ['wrong-case priority', { priority: 'URGENT' }, 'priority'],
            ['an unknown priority', { priority: 'critical' }, 'priority'],
            // assignee
            ['empty assignee', { assignee: '' }, 'assignee'],
            ['upper-case ME', { assignee: 'ME' }, 'assignee'],
            ['a made-up keyword', { assignee: 'nobody' }, 'assignee'],
            ['a number', { assignee: '123' }, 'assignee'],
            ['a malformed uuid', { assignee: '0195a3f2-8c41-7d3e-9a1b' }, 'assignee'],
            // sort
            ['wrong case in sort', { sort: '-createdat' }, 'sort'],
            ['a direction not in the contract', { sort: 'updatedAt' }, 'sort'],
            ['an arbitrary column', { sort: 'subject' }, 'sort'],
            ['empty sort', { sort: '' }, 'sort'],
            // limit
            ['limit=0', { limit: '0' }, 'limit'],
            ['limit=101', { limit: '101' }, 'limit'],
            ['limit=abc', { limit: 'abc' }, 'limit'],
            ['a decimal', { limit: '1.5' }, 'limit'],
            ['digits then garbage', { limit: '10abc' }, 'limit'],
            ['a plus sign', { limit: '+10' }, 'limit'],
            ['leading whitespace', { limit: ' 10' }, 'limit'],
            ['scientific notation', { limit: '1e1' }, 'limit'],
            ['hexadecimal', { limit: '0x10' }, 'limit'],
            ['leading zeros', { limit: '007' }, 'limit'],
            ['empty limit', { limit: '' }, 'limit'],
            ['a repeated limit', { limit: ['10', '20'] }, 'limit'],
            // cursor
            ['an empty cursor', { cursor: '' }, 'cursor'],
            ['a 513-char cursor', { cursor: 'a'.repeat(513) }, 'cursor'],
            ['base64 padding', { cursor: 'abc==' }, 'cursor'],
            ['standard base64 characters', { cursor: 'ab/c+d' }, 'cursor'],
            ['a space', { cursor: 'a b' }, 'cursor'],
            // global rule
            ['an unknown param (typo)', { stauts: 'open' }, 'stauts'],
            ['an orgId param', { orgId: UUID }, 'orgId'],
            ['a non-object query', null, 'query'],
            ['an array as the whole query', ['status'], 'query'],
        ])('%s', (_name, input, field) => {
            expect(parseListTicketsQuery(input)).toMatchObject({ ok: false, error: { field }});
        });
    });
});
