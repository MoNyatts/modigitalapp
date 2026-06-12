/**
 * @format
 */

import { safeParseJSON } from '../lib/storage';

describe('safeParseJSON', () => {
  test('parses valid JSON objects', () => {
    expect(safeParseJSON('{"a":1}', null)).toEqual({ a: 1 });
  });

  test('returns the fallback for invalid input', () => {
    expect(safeParseJSON('not json', 'fallback')).toBe('fallback');
    expect(safeParseJSON(null, [])).toEqual([]);
    expect(safeParseJSON('undefined', 0)).toBe(0);
  });
});
