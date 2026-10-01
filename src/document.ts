import type { PDFFont } from 'pdf-lib';
export type Line = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
};
export type Draft = {
  kind: 'Quote' | 'Invoice';
  number: string;
  date: string;
  due: string;
  currency: 'EUR' | 'USD' | 'GBP';
  sender: string;
  senderDetails: string;
  client: string;
  clientDetails: string;
  project: string;
  lines: Line[];
  discount: number;
  tax: number;
  notes: string;
};
export const today = () => new Date().toLocaleDateString('en-CA');
export function fresh(): Draft {
  return {
    kind: 'Quote',
    number: 'Q-001',
    date: today(),
    due: '',
    currency: 'EUR',
    sender: '',
    senderDetails: '',
    client: '',
    clientDetails: '',
    project: '',
    lines: [{ id: crypto.randomUUID(), description: '', quantity: 1, rate: 0 }],
    discount: 0,
    tax: 0,
    notes: 'Thank you for considering working together.',
  };
}
export function example(): Draft {
  return {
    ...fresh(),
    sender: 'Alex Morgan',
    senderDetails: 'Independent designer\nhello@example.com\nBrussels, Belgium',
    client: 'Studio North',
    clientDetails: 'Attn. Jamie Lee\njamie@example.com\nAntwerp, Belgium',
    project: 'A fresh look for Studio North',
    lines: [
      {
        id: crypto.randomUUID(),
        description: 'Brand discovery & creative direction',
        quantity: 1,
        rate: 450,
      },
      {
        id: crypto.randomUUID(),
        description: 'Website design',
        quantity: 4,
        rate: 350,
      },
      {
        id: crypto.randomUUID(),
        description: 'Development & handover',
        quantity: 1,
        rate: 950,
      },
    ],
    tax: 21,
    notes:
      '50% deposit to begin. Remaining balance on completion.\nThis quote is valid for 30 days.',
  };
}
export function totals(d: Pick<Draft, 'lines' | 'discount' | 'tax'>) {
  const subtotal = d.lines.reduce(
      (a, l) => a + Math.round(l.quantity * l.rate * 100),
      0,
    ),
    discount = Math.round((subtotal * d.discount) / 100),
    tax = Math.round(((subtotal - discount) * d.tax) / 100);
  return { subtotal, discount, tax, total: subtotal - discount + tax };
}
export const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(
    cents / 100,
  );
export function validDraft(x: unknown): x is Draft {
  if (!x || typeof x !== 'object') return false;
  const d = x as Draft;
  return (
    ['Quote', 'Invoice'].includes(d.kind) &&
    ['EUR', 'USD', 'GBP'].includes(d.currency) &&
    [
      'number',
      'date',
      'due',
      'sender',
      'senderDetails',
      'client',
      'clientDetails',
      'project',
      'notes',
    ].every((k) => typeof d[k as keyof Draft] === 'string') &&
    Array.isArray(d.lines) &&
    d.lines.length > 0 &&
    d.lines.length <= 100 &&
    d.lines.every(
      (l) =>
        typeof l.id === 'string' &&
        typeof l.description === 'string' &&
        Number.isFinite(l.quantity) &&
        l.quantity >= 0 &&
        l.quantity <= 10000 &&
        Number.isFinite(l.rate) &&
        l.rate >= 0 &&
        l.rate <= 1000000,
    ) &&
    Number.isFinite(d.tax) &&
    d.tax >= 0 &&
    d.tax <= 100 &&
    Number.isFinite(d.discount) &&
    d.discount >= 0 &&
    d.discount <= 100
  );
}
export function validate(d: Draft) {
  if (!d.sender.trim() || !d.client.trim())
    throw new Error('Add your name or business and your client’s name.');
  if (!d.number.trim() || !d.date)
    throw new Error('Add a document number and date.');
  if (
    d.lines.some(
      (l) =>
        !l.description.trim() ||
        l.quantity <= 0 ||
        !Number.isFinite(l.rate) ||
        l.rate < 0,
    )
  )
    throw new Error(
      'Each item needs a description, a positive quantity and a valid rate.',
    );
  if ([d.senderDetails, d.clientDetails].some((s) => s.split('\n').length > 10))
    throw new Error('Keep each contact block to 10 lines or fewer.');
  if (!validDraft(d))
    throw new Error(
      'Check that amounts and percentages are within their allowed ranges.',
    );
}
export async function buildPdf(d: Draft) {
  validate(d);
  const [
    { PDFDocument, rgb },
    { default: fontkit },
    { default: regularUrl },
    { default: boldUrl },
  ] = await Promise.all([
    import('pdf-lib'),
    import('@pdf-lib/fontkit'),
    import('@fontsource/inter/files/inter-latin-400-normal.woff?url'),
    import('@fontsource/inter/files/inter-latin-600-normal.woff?url'),
  ]);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regular, bold] = await Promise.all([
    fetch(regularUrl).then((r) => {
      if (!r.ok) throw new Error('Could not load the PDF font.');
      return r.arrayBuffer();
    }),
    fetch(boldUrl).then((r) => r.arrayBuffer()),
  ]);
  const font = await doc.embedFont(regular, { subset: true }),
    strong = await doc.embedFont(bold, { subset: true });
  const charset = new Set(font.getCharacterSet());
  const content = [
    d.sender,
    d.senderDetails,
    d.client,
    d.clientDetails,
    d.project,
    d.notes,
    d.number,
    ...d.lines.map((l) => l.description),
  ].join('');
  const unsupported = [
    ...new Set(
      [...content].filter(
        (c) =>
          !['\n', '\r', '\t'].includes(c) && !charset.has(c.codePointAt(0)!),
      ),
    ),
  ];
  if (unsupported.length)
    throw new Error(
      `The PDF font cannot display: ${unsupported.slice(0, 8).join(' ')}. Please replace these characters before exporting.`,
    );
  doc.setTitle(`${d.kind} ${d.number}`);
  doc.setAuthor(d.sender);
  let page = doc.addPage([595.28, 841.89]),
    y = 786;
  const ink = rgb(0.22, 0.2, 0.18),
    muted = rgb(0.48, 0.46, 0.43),
    accent = rgb(0.66, 0.33, 0.24);
  function line(
    text: string,
    x: number,
    at: number,
    size = 10,
    f: PDFFont = font,
    color = ink,
  ) {
    page.drawText(text.replace(/[\t\r]/g, ' '), {
      x,
      y: at,
      size,
      font: f,
      color,
    });
  }
  function newPage() {
    page = doc.addPage([595.28, 841.89]);
    y = 790;
    line(`${d.kind} ${d.number} · continued`, 44, y, 10, strong, muted);
    y -= 35;
  }
  function ensure(h: number) {
    if (y - h < 55) newPage();
  }
  function wrap(text: string, width: number, size = 10) {
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
      let current = '';
      for (const word of paragraph.split(/\s+/)) {
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) {
          current = candidate;
          continue;
        }
        if (current) lines.push(current);
        current = '';
        for (const char of word) {
          if (font.widthOfTextAtSize(current + char, size) > width && current) {
            lines.push(current);
            current = char;
          } else current += char;
        }
      }
      lines.push(current);
    }
    return lines;
  }
  function block(text: string, x: number, width: number, size = 10) {
    const lines = wrap(text, width, size);
    for (const l of lines) {
      ensure(size + 7);
      line(l, x, y, size);
      y -= size + 7;
    }
    return lines.length;
  }
  function right(text: string, at: number, size = 10, f = font) {
    line(text, 551 - f.widthOfTextAtSize(text, size), at, size, f);
  }
  line(d.kind.toUpperCase(), 44, y, 10, strong, accent);
  right(d.number, y, 11, strong);
  y -= 42;
  block(d.project || `${d.kind} for ${d.client}`, 44, 507, 24);
  y -= 20;
  const partyY = y;
  line('FROM', 44, y, 8, strong, muted);
  line('PREPARED FOR', 310, y, 8, strong, muted);
  y -= 21;
  block(d.sender, 44, 230, 12);
  block(d.senderDetails, 44, 230, 9);
  const leftEnd = y;
  y = partyY - 21;
  block(d.client, 310, 240, 12);
  block(d.clientDetails, 310, 240, 9);
  y = Math.min(leftEnd, y) - 18;
  line(
    `Issued: ${d.date}${d.due ? `     ${d.kind === 'Quote' ? 'Valid until' : 'Due'}: ${d.due}` : ''}`,
    44,
    y,
    9,
    font,
    muted,
  );
  y -= 35;
  function tableHead() {
    ensure(55);
    page.drawRectangle({
      x: 44,
      y: y - 12,
      width: 507,
      height: 29,
      color: rgb(0.96, 0.94, 0.91),
    });
    line('DESCRIPTION', 54, y, 8, strong, muted);
    line('QTY', 355, y, 8, strong, muted);
    line('RATE', 412, y, 8, strong, muted);
    right('AMOUNT', y, 8, strong);
    y -= 36;
  }
  tableHead();
  for (const l of d.lines) {
    const texts = wrap(l.description, 285, 10);
    const h = Math.max(28, texts.length * 16 + 14);
    if (y - h < 55) {
      newPage();
      tableHead();
    }
    texts.forEach((t, i) => line(t, 54, y - i * 16));
    line(String(l.quantity), 355, y, 9);
    line(money(Math.round(l.rate * 100), d.currency), 400, y, 9);
    right(
      money(Math.round(l.quantity * l.rate * 100), d.currency),
      y,
      9,
      strong,
    );
    y -= h;
    page.drawLine({
      start: { x: 44, y: y + 14 },
      end: { x: 551, y: y + 14 },
      thickness: 0.5,
      color: rgb(0.87, 0.85, 0.82),
    });
  }
  y -= 13;
  ensure(125);
  const t = totals(d);
  for (const [label, value] of [
    ['Subtotal', t.subtotal],
    [`Discount (${d.discount}%)`, -t.discount],
    [`Tax (${d.tax}%)`, t.tax],
  ] as const) {
    if (label.startsWith('Discount') && d.discount === 0) continue;
    line(label, 340, y, 10, font, muted);
    right(money(value, d.currency), y);
    y -= 23;
  }
  line('Total', 340, y, 14, strong, accent);
  right(money(t.total, d.currency), y, 18, strong);
  y -= 48;
  if (d.notes) {
    ensure(45);
    line('NOTES & TERMS', 44, y, 8, strong, muted);
    y -= 20;
    block(d.notes, 44, 507, 10);
  }
  doc
    .getPages()
    .forEach((p, i) =>
      p.drawText(
        `${d.sender}  ·  ${d.kind} ${d.number}  ·  ${i + 1} / ${doc.getPageCount()}`,
        { x: 44, y: 25, size: 8, font, color: muted, maxWidth: 507 },
      ),
    );
  return new Blob([new Uint8Array(await doc.save())], {
    type: 'application/pdf',
  });
}
