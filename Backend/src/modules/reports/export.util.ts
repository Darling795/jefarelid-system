import { HttpStatus } from '@nestjs/common';
import ExcelJS from 'exceljs';

import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

export interface ReportTable {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
}

export async function toXlsx(report: ReportTable): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report');

  ws.mergeCells(1, 1, 1, report.columns.length);
  ws.getCell(1, 1).value = report.title;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  if (report.subtitle) {
    ws.mergeCells(2, 1, 2, report.columns.length);
    ws.getCell(2, 1).value = report.subtitle;
  }

  const headerRow = ws.addRow(report.columns.map((c) => c.label));
  headerRow.font = { bold: true };

  for (const row of report.rows) {
    ws.addRow(report.columns.map((c) => row[c.key] ?? ''));
  }
  report.columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = Math.max(c.label.length + 2, 16);
  });

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
}

function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function toHtml(report: ReportTable): string {
  const head = report.columns
    .map((c) => `<th style="text-align:${c.align ?? 'left'}">${escapeHtml(c.label)}</th>`)
    .join('');
  const body = report.rows
    .map(
      (r) =>
        `<tr>${report.columns
          .map((c) => `<td style="text-align:${c.align ?? 'left'}">${escapeHtml(r[c.key])}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;padding:32px;color:#111}
    h1{font-size:18px;margin:0 0 4px} .sub{color:#666;margin:0 0 16px;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border-bottom:1px solid #ddd;padding:6px 8px}
    th{border-bottom:2px solid #333}
  </style></head><body>
    <h1>${escapeHtml(report.title)}</h1>
    ${report.subtitle ? `<p class="sub">${escapeHtml(report.subtitle)}</p>` : ''}
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  </body></html>`;
}

/**
 * PDF via Puppeteer (SPEC stack). Puppeteer is imported lazily so the server
 * runs even when Chromium is not installed; the pdf format then returns a clear
 * error instead of crashing at boot.
 */
export async function toPdf(report: ReportTable): Promise<Buffer> {
  // Variable specifier keeps this a runtime-only dependency so the project
  // builds and runs without puppeteer installed.
  const moduleName = 'puppeteer';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let puppeteer: any;
  try {
    puppeteer = await import(moduleName);
    puppeteer = puppeteer.default ?? puppeteer;
  } catch {
    throw new AppException(
      ApiCode.INTERNAL,
      'PDF export is unavailable: Puppeteer/Chromium is not installed. Use format=xlsx or install puppeteer.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(toHtml(report), { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '12mm', right: '12mm' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
