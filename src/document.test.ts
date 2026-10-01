import { it, expect } from 'vitest';
import { totals, validDraft, example, validate } from './document';
it('rounds money in cents and applies discount before tax', () => {
  expect(
    totals({
      lines: [{ id: '1', description: 'Work', quantity: 3, rate: 19.99 }],
      discount: 10,
      tax: 21,
    }),
  ).toEqual({ subtotal: 5997, discount: 600, tax: 1133, total: 6530 });
});
it('rejects corrupt drafts and incomplete documents', () => {
  expect(validDraft({ lines: [] })).toBe(false);
  const d = example();
  d.lines[0].quantity = NaN;
  expect(validDraft(d)).toBe(false);
  expect(() => validate({ ...example(), sender: '' })).toThrow('name');
});
it('accepts an example draft', () => {
  expect(validDraft(example())).toBe(true);
  expect(() => validate(example())).not.toThrow();
});
