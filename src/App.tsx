import { useEffect, useState } from 'react';
import {
  PenTool,
  ArrowDownToLine,
  Plus,
  Trash2,
  Save,
  FileText,
  LoaderCircle,
  Check,
  FolderOpen,
} from 'lucide-react';
import { Header, Footer, download } from './ui';
import {
  type Draft,
  fresh,
  example,
  totals,
  money,
  buildPdf,
  validDraft,
} from './document';
const KEY = 'goodwork-current-v1',
  SAVED = 'goodwork-drafts-v1';
function read(): Draft {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (validDraft(x)) return x;
  } catch {}
  return example();
}
export default function App() {
  const [d, setD] = useState<Draft>(read),
    [section, setSection] = useState('Details'),
    [message, setMessage] = useState(''),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState<{ id: string; draft: Draft }[]>(() => {
      try {
        const a = JSON.parse(localStorage.getItem(SAVED) || '[]');
        return Array.isArray(a)
          ? a.filter((x) => typeof x.id === 'string' && validDraft(x.draft))
          : [];
      } catch {
        return [];
      }
    }),
    [draftId, setDraftId] = useState(''),
    [autosaved, setAutosaved] = useState(false);
  const t = totals(d);
  useEffect(() => {
    setAutosaved(false);
    const id = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(d));
        setAutosaved(true);
      } catch {
        setError(true);
        setMessage(
          'Local storage is unavailable. Export your PDF before closing this tab.',
        );
      }
    }, 500);
    return () => clearTimeout(id);
  }, [d]);
  const update = (p: Partial<Draft>) => {
    setD((v) => ({ ...v, ...p }));
    setMessage('');
  };
  function save() {
    try {
      const id = draftId || crypto.randomUUID();
      const next = [
        { id, draft: d },
        ...saved.filter((x) => x.id !== id),
      ].slice(0, 30);
      localStorage.setItem(SAVED, JSON.stringify(next));
      setSaved(next);
      setDraftId(id);
      setError(false);
      setMessage('Draft saved on this device.');
    } catch {
      setError(true);
      setMessage('Could not save locally. Export your PDF to keep a copy.');
    }
  }
  async function exportPdf() {
    setBusy(true);
    setMessage('');
    setError(false);
    try {
      download(
        await buildPdf(d),
        `${d.kind.toLowerCase()}-${d.number.replace(/[^\w-]/g, '-')}.pdf`,
      );
      setMessage('Your PDF is ready.');
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : 'Could not export the PDF.');
    } finally {
      setBusy(false);
    }
  }
  function newDoc() {
    save();
    update(fresh());
    setDraftId('');
  }
  const textField = (label: string, key: keyof Draft, area = false) => (
    <label>
      {label}
      {area ? (
        <textarea
          maxLength={key === 'notes' ? 2000 : 400}
          value={String(d[key])}
          onChange={(e) => update({ [key]: e.target.value })}
        />
      ) : (
        <input
          maxLength={100}
          value={String(d[key])}
          onChange={(e) => update({ [key]: e.target.value })}
        />
      )}
    </label>
  );
  return (
    <>
      <Header name="goodwork" icon={<PenTool size={20} />} />
      <main className="shell">
        <section className="intro">
          <div>
            <div className="eyebrow">For the independently minded</div>
            <h1>
              Good work deserves
              <br />a good first impression.
            </h1>
            <p>Thoughtful quotes and invoices, without the paperwork.</p>
          </div>
          <div className="row">
            <button onClick={newDoc}>
              <Plus size={16} />
              New document
            </button>
            <button className="primary" disabled={busy} onClick={exportPdf}>
              {busy ? (
                <LoaderCircle size={16} className="spinner" />
              ) : (
                <ArrowDownToLine size={16} />
              )}
              Export PDF
            </button>
          </div>
        </section>
        <div className="quote-workspace">
          <section className="panel editor">
            <div
              className="editor-tabs"
              role="tablist"
              aria-label="Document editor"
            >
              {['Details', 'People', 'Items', 'Terms'].map((s) => (
                <button
                  key={s}
                  role="tab"
                  aria-selected={section === s}
                  className={section === s ? 'active' : ''}
                  onClick={() => setSection(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <div
              className="panel-body stack"
              role="tabpanel"
              aria-label={section}
            >
              {section === 'Details' && (
                <>
                  <div className="section-label">Start with the essentials</div>
                  <div className="segmented">
                    {(['Quote', 'Invoice'] as const).map((kind) => (
                      <button
                        key={kind}
                        className={kind === d.kind ? 'active' : ''}
                        onClick={() => update({ kind })}
                      >
                        {kind}
                      </button>
                    ))}
                  </div>
                  {textField('Project or document title', 'project')}
                  <div className="field-row">
                    {textField('Document number', 'number')}
                    <label>
                      Currency
                      <select
                        value={d.currency}
                        onChange={(e) =>
                          update({
                            currency: e.target.value as Draft['currency'],
                          })
                        }
                      >
                        <option value="EUR">EUR · Euro</option>
                        <option value="USD">USD · US dollar</option>
                        <option value="GBP">GBP · Pound</option>
                      </select>
                    </label>
                  </div>
                  <div className="field-row">
                    <label>
                      Issue date
                      <input
                        type="date"
                        value={d.date}
                        onChange={(e) => update({ date: e.target.value })}
                      />
                    </label>
                    <label>
                      {d.kind === 'Quote' ? 'Valid until' : 'Payment due'}
                      <input
                        type="date"
                        value={d.due}
                        onChange={(e) => update({ due: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="notice">
                    Your draft saves automatically in this browser. Save named
                    drafts below to keep several projects.
                  </div>
                  <button
                    onClick={() => {
                      save();
                      update(example());
                      setDraftId('');
                    }}
                  >
                    Load example document
                  </button>
                </>
              )}
              {section === 'People' && (
                <>
                  <div className="section-label">From you</div>
                  {textField('Your name or business', 'sender')}
                  {textField(
                    'Address, email & business details',
                    'senderDetails',
                    true,
                  )}
                  <div className="divider" />
                  <div className="section-label">To your client</div>
                  {textField('Client name or business', 'client')}
                  {textField(
                    'Client address & contact details',
                    'clientDetails',
                    true,
                  )}
                </>
              )}
              {section === 'Items' && (
                <>
                  <div className="section-label">The work, line by line</div>
                  {d.lines.map((l, i) => (
                    <div className="line-editor" key={l.id}>
                      <div className="line-heading">
                        <small>ITEM {String(i + 1).padStart(2, '0')}</small>
                        <button
                          className="icon ghost danger"
                          aria-label={`Remove item ${i + 1}`}
                          disabled={d.lines.length === 1}
                          onClick={() =>
                            update({
                              lines: d.lines.filter((x) => x.id !== l.id),
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <label>
                        Description
                        <input
                          maxLength={160}
                          value={l.description}
                          onChange={(e) =>
                            update({
                              lines: d.lines.map((x) =>
                                x.id === l.id
                                  ? { ...x, description: e.target.value }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <div className="field-row">
                        <label>
                          Quantity
                          <input
                            type="number"
                            min="0.01"
                            max="10000"
                            step="0.25"
                            value={l.quantity}
                            onChange={(e) =>
                              update({
                                lines: d.lines.map((x) =>
                                  x.id === l.id
                                    ? {
                                        ...x,
                                        quantity: Math.max(
                                          0,
                                          Math.min(10000, +e.target.value),
                                        ),
                                      }
                                    : x,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Unit rate
                          <input
                            type="number"
                            min="0"
                            max="1000000"
                            step="0.01"
                            value={l.rate}
                            onChange={(e) =>
                              update({
                                lines: d.lines.map((x) =>
                                  x.id === l.id
                                    ? {
                                        ...x,
                                        rate: Math.max(
                                          0,
                                          Math.min(1000000, +e.target.value),
                                        ),
                                      }
                                    : x,
                                ),
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                  <button
                    disabled={d.lines.length >= 100}
                    onClick={() =>
                      update({
                        lines: [
                          ...d.lines,
                          {
                            id: crypto.randomUUID(),
                            description: '',
                            quantity: 1,
                            rate: 0,
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={16} />
                    Add line item
                  </button>
                </>
              )}
              {section === 'Terms' && (
                <>
                  <div className="section-label">The final details</div>
                  <div className="field-row">
                    <label>
                      Discount (%)
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={d.discount}
                        onChange={(e) =>
                          update({
                            discount: Math.max(
                              0,
                              Math.min(100, +e.target.value),
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Tax (%)
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={d.tax}
                        onChange={(e) =>
                          update({
                            tax: Math.max(0, Math.min(100, +e.target.value)),
                          })
                        }
                      />
                    </label>
                  </div>
                  {textField('Notes & payment terms', 'notes', true)}
                  <p className="hint">
                    Tax is applied after the discount. Add any business
                    identifiers and payment details your document needs under
                    People or in the notes.
                  </p>
                </>
              )}
            </div>
            <div className="draft-bar">
              <span>
                <Check size={13} />
                {autosaved ? 'Saved in this browser' : 'Saving…'}
              </span>
              <button className="ghost" onClick={save}>
                <Save size={14} />
                Save draft
              </button>
            </div>
            <div className="saved-drafts">
              <label className="row">
                <FolderOpen size={15} />
                Your saved drafts
              </label>
              <select
                aria-label="Load saved draft"
                value={draftId}
                onChange={(e) => {
                  const x = saved.find((v) => v.id === e.target.value);
                  if (x) {
                    update(x.draft);
                    setDraftId(x.id);
                  }
                }}
              >
                <option value="">Select a saved document</option>
                {saved.map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.draft.number} · {x.draft.client || 'Untitled'}
                  </option>
                ))}
              </select>
            </div>
          </section>
          <section className="document-preview">
            <div className="preview-heading">
              <span>
                <FileText size={14} />
                Live document preview
              </span>
              <span>A4 · PDF export</span>
            </div>
            <article className="paper">
              <div className="paper-top">
                <span className="document-type">{d.kind}</span>
                <span className="mono">{d.number || '—'}</span>
              </div>
              <h2>
                {d.project || `${d.kind} for ${d.client || 'your client'}`}
              </h2>
              <div className="paper-people">
                <div>
                  <div className="paper-label">From</div>
                  <strong>{d.sender || 'Your name'}</strong>
                  <p>{d.senderDetails || 'Your contact details'}</p>
                </div>
                <div>
                  <div className="paper-label">Prepared for</div>
                  <strong>{d.client || 'Client name'}</strong>
                  <p>{d.clientDetails || 'Client contact details'}</p>
                </div>
              </div>
              <div className="paper-dates">
                <span>
                  Issued <strong>{d.date}</strong>
                </span>
                {d.due && (
                  <span>
                    {d.kind === 'Quote' ? 'Valid until' : 'Due'}{' '}
                    <strong>{d.due}</strong>
                  </span>
                )}
              </div>
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {d.lines.map((l) => (
                    <tr key={l.id}>
                      <td>{l.description || 'Describe your work'}</td>
                      <td>{l.quantity}</td>
                      <td>{money(Math.round(l.rate * 100), d.currency)}</td>
                      <td>
                        {money(
                          Math.round(l.rate * l.quantity * 100),
                          d.currency,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="paper-totals">
                <div>
                  <span>Subtotal</span>
                  <span>{money(t.subtotal, d.currency)}</span>
                </div>
                {d.discount > 0 && (
                  <div>
                    <span>Discount ({d.discount}%)</span>
                    <span>−{money(t.discount, d.currency)}</span>
                  </div>
                )}
                <div>
                  <span>Tax ({d.tax}%)</span>
                  <span>{money(t.tax, d.currency)}</span>
                </div>
                <div className="grand-total">
                  <strong>Total</strong>
                  <strong>{money(t.total, d.currency)}</strong>
                </div>
              </div>
              {d.notes && (
                <div className="paper-notes">
                  <div className="paper-label">Notes & terms</div>
                  <p>{d.notes}</p>
                </div>
              )}
              <div className="paper-end">Thank you for your trust.</div>
            </article>
          </section>
        </div>
        <div
          className={'status ' + (error ? 'error' : '')}
          role={error ? 'alert' : 'status'}
        >
          {message}
        </div>
        <Footer />
      </main>
    </>
  );
}
