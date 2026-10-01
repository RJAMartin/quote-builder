# Goodwork — portfolio case study

## Problem

Independent professionals need a clear way to communicate scope and price. Goodwork pairs an editable document with a live preview, keeping attention on the client-facing result.

## Delivered workflow

- Quote and invoice modes
- Editable sender, client, project and line items
- EUR, USD and GBP formatting
- Discounts and tax with cent-based total calculations
- Live document preview and downloadable, multipage A4 PDFs
- Automatic current-draft storage and up to 30 saved drafts on the same device

## Engineering decisions

- Amounts are rounded to integer cents at the line level. Discounts are applied before tax.
- Drafts stay in browser localStorage. Saved drafts are validated before loading, and storage failures are surfaced to the user.
- PDFs contain real text, embedded fonts and repeated continuation headings rather than screenshots of the UI.
- PDF generation and font libraries load only when exporting. Font files are bundled locally.

## Validation

Tests cover cent rounding, discount-before-tax calculations, incomplete forms and corrupt stored drafts. Browser verification checks actual PDF export, accented client names, reload persistence and responsive layout.

The application was checked in Chromium at desktop and 390 px mobile widths. Screenshots document the implemented product, not a mockup. Real exported files were inspected during development.

## Tradeoffs

- Drafts are local to the browser and can be lost if site data is cleared. There is no account sync.
- 100 line items; contact blocks support up to 10 lines each.
- The bundled PDF font supports Latin text; unsupported characters produce a clear export error.
- This is a document builder, not accounting software or jurisdiction-specific e-invoicing. Add the business identifiers and terms required for your use.
- The HTML preview is a live content preview; the downloaded PDF is paginated separately.

## What this demonstrates

A complete product flow from input through validation to a useful output; responsive UI; clear failure states; local processing; reproducible builds; and independently deployable source. This is a portfolio project, not a commissioned client project. No adoption or business-impact metrics are claimed.
