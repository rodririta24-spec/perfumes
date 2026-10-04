import { describe, it, expect } from 'vitest';
import { chunk } from '../../src/lib/chunk.js';

describe('chunk', () => {
  it('splits into fixed-size parts', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('empty input gives no parts', () => {
    expect(chunk([], 3)).toEqual([]);
  });
});
