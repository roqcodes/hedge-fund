import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export type CsvRow = Record<string, string | number | null | undefined>;

export type ExportColumn = { key: string; label: string; align?: 'left' | 'right' };

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsv(filename: string, rows: CsvRow[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(row => headers.map(h => escapeCsvCell(row[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

const PDF_STYLES = `
  body { font-family: system-ui, sans-serif; font-size: 12px; color: #0f172a; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
  td.num { text-align: right; font-family: monospace; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
  .kpi-value { font-size: 16px; font-weight: 700; margin-top: 4px; }
  @media print { body { padding: 0; } }
`;

export function downloadPdfReport(title: string, subtitle: string, bodyHtml: string): void {
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title><style>${PDF_STYLES}</style></head>
<body>
  <h1>${title}</h1>
  <p class="meta">${subtitle} · Generated ${new Date().toLocaleString()}</p>
  ${bodyHtml}
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function buildTableHtml(
  headers: { key: string; label: string; align?: 'left' | 'right' }[],
  rows: CsvRow[],
  title?: string,
): string {
  const head = headers.map(h => `<th>${h.label}</th>`).join('');
  const body = rows
    .map(row => {
      const cells = headers
        .map(h => {
          const val = row[h.key];
          const cls = h.align === 'right' ? ' class="num"' : '';
          return `<td${cls}>${val ?? ''}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `${title ? `<h2>${title}</h2>` : ''}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function buildKpiHtml(items: { label: string; value: string }[]): string {
  const cards = items
    .map(
      i => `<div class="kpi"><div class="kpi-label">${i.label}</div><div class="kpi-value">${i.value}</div></div>`,
    )
    .join('');
  return `<div class="kpi-grid">${cards}</div>`;
}

export async function downloadExcel(
  filename: string,
  sheetName: string,
  columns: ExportColumn[],
  rows: CsvRow[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));

  sheet.addRow(columns.map(c => c.label));
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6EAF8' } };

  rows.forEach(row => {
    sheet.addRow(columns.map(c => row[c.key] ?? ''));
  });

  columns.forEach((col, i) => {
    const column = sheet.getColumn(i + 1);
    column.width = Math.max(col.label.length + 2, 14);
    if (col.align === 'right') column.alignment = { horizontal: 'right' };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
