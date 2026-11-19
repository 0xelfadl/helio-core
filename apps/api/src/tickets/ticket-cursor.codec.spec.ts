import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ApiException } from '../common/errors/api.exception.js';
import { TicketCursorCodec } from './ticket-cursor.codec.js';
import type { CursorContext } from './ticket-cursor.js';

const CONTEXT: CursorContext = {
  orgId: '11111111-1111-4111-8111-111111111111',
  sort: 'createdAt_desc',
  filters: { statuses: ['open', 'pending'], priorities: null, assignee: null },
};

const codecWith = (secret: string) =>
  new TicketCursorCodec(new ConfigService({ CURSOR_SECRET: secret }));

describe('TicketCursorCodec', () => {
  it('refuses to start with a secret shorter than 32 bytes', () => {
    expect(() => codecWith('too-short')).toThrow(/CURSOR_SECRET/);
  });

  it('round-trips a position', () => {
    const codec = codecWith('x'.repeat(32));
    const position = {
      sortValue: new Date(1793505007123),
      id: '0195a3f2-8c41-7d3e-9a1b-4c2f8e7d6a5b',
    };
    expect(codec.decode(codec.encoded(position, CONTEXT), CONTEXT)).toEqual(
      position,
    );
  });

  it('turns an invalid cursor into a 400 INVALID_CURSOR', () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const codec = codecWith('x'.repeat(32));
    try {
      codec.decode('abc', CONTEXT);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);

      const apiError = error as ApiException;
      expect(apiError.code).toBe('INVALID_CURSOR');
      expect(apiError.getStatus()).toBe(400);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('too short'));
    } finally {
      warn.mockRestore();
    }
  });
});
