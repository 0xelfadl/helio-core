import { describe, expect, it, vi } from 'vitest';
import { buildPage } from './build-page.js';

describe('buildPage', () => {
  it('returns an empty page when there are no rows', () => {
    const rows: string[] = [];
    const limit = 10;
    const cursorFor = vi.fn((item: string) => `cursor-${item}`);
    const page = buildPage(rows, limit, cursorFor);
    expect(page).toEqual({
      items: [],
      pageInfo: {
        nextCursor: null,
        hasNextPage: false,
      },
    });
    expect(cursorFor).not.toHaveBeenCalled();
  });

  it('returns all rows when fewer than the limit', () => {
    const rows = [1, 2, 3];
    const limit = 5;
    const cursorFor = vi.fn((item: number) => `cursor-${item}`);
    const page = buildPage(rows, limit, cursorFor);
    expect(page).toEqual({
      items: [1, 2, 3],
      pageInfo: {
        hasNextPage: false,
        nextCursor: null,
      },
    });
    expect(cursorFor).not.toHaveBeenCalled();
  });

  it('returns all rows when the number of rows equals the limit', () => {
    const rows = [1, 2, 3];
    const limit = 3;
    const cursorFor = vi.fn((item: number) => `cursor-${item}`);
    const page = buildPage(rows, limit, cursorFor);
    expect(page).toEqual({
      items: [1, 2, 3],
      pageInfo: {
        hasNextPage: false,
        nextCursor: null,
      },
    });
    expect(cursorFor).not.toHaveBeenCalled();
  });

  it('returns the first limit rows and indicates there is a next page', () => {
    const rows = [1, 2, 3, 4];
    const limit = 3;
    const cursorFor = vi.fn((item: number) => `cursor-${item}`);
    const page = buildPage(rows, limit, cursorFor);
    expect(page).toEqual({
      items: [1, 2, 3],
      pageInfo: {
        hasNextPage: true,
        nextCursor: 'cursor-3',
      },
    });
    expect(cursorFor).toHaveBeenCalledTimes(1);
    expect(cursorFor).toHaveBeenCalledWith(3);
    expect(cursorFor).not.toHaveBeenCalledWith(4);
  });

  it('throws when limit is not a positive integer', () => {
    const rows = [1];
    const limit = 0;
    const cursorFor = vi.fn((item: number) => `cursor-${item}`);
    expect(() => buildPage(rows, limit, cursorFor)).toThrow(
      'limit must be a positive integer, got 0',
    );
  });
});
