import PDFDocument from 'pdfkit';

// ─── Brand ───────────────────────────────────────────────────────────────────

const BRAND = {
  primary: '#1E40AF',
  accent: '#3B82F6',
  danger: '#DC2626',
  success: '#059669',
  warning: '#D97706',
  bg: '#F8FAFC',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  white: '#FFFFFF',
} as const;

// ─── Layout ──────────────────────────────────────────────────────────────────

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = { left: 48, right: 48 };
const CW = PAGE.width - MARGIN.left - MARGIN.right; // usable width

// ─── Low-level drawing helpers ───────────────────────────────────────────────

function fillRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  radius = 0,
) {
  doc.save().fillColor(color);
  if (radius > 0) {
    doc.roundedRect(x, y, w, h, radius).fill();
  } else {
    doc.rect(x, y, w, h).fill();
  }
  doc.restore();
}

function line(
  doc: PDFKit.PDFDocument,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth = 0.5,
) {
  doc
    .save()
    .strokeColor(color)
    .lineWidth(lineWidth)
    .moveTo(x1, y1)
    .lineTo(x2, y2)
    .stroke()
    .restore();
}

function text(
  doc: PDFKit.PDFDocument,
  content: string,
  x: number,
  y: number,
  opts: PDFKit.Mixins.TextOptions & {
    color?: string;
    fontSize?: number;
    font?: 'regular' | 'bold' | 'mono';
    opacity?: number;
  } = {},
) {
  const {
    color = BRAND.textPrimary,
    fontSize = 9,
    font = 'regular',
    opacity = 1,
    ...rest
  } = opts;
  const fontName =
    font === 'bold'
      ? 'Helvetica-Bold'
      : font === 'mono'
        ? 'Courier'
        : 'Helvetica';
  doc
    .save()
    .fillColor(color)
    .opacity(opacity)
    .fontSize(fontSize)
    .font(fontName)
    .text(content, x, y, rest)
    .restore();
}

// ─── Page chrome ─────────────────────────────────────────────────────────────

/**
 * Draw the top header band. Returns Y coordinate just below the band.
 */
function drawHeader(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle: string,
  chip: string,
): number {
  const H = 118;

  // Background
  fillRect(doc, 0, 0, PAGE.width, H, BRAND.primary);

  // Decorative circles (top-right)
  doc
    .save()
    .fillColor(BRAND.accent)
    .opacity(0.25)
    .circle(PAGE.width - 36, 36, 66)
    .fill()
    .restore();
  doc
    .save()
    .fillColor(BRAND.accent)
    .opacity(0.12)
    .circle(PAGE.width + 8, -8, 88)
    .fill()
    .restore();

  // ── Logo mark ──
  const lx = MARGIN.left;
  const ly = 26;
  fillRect(doc, lx, ly, 40, 40, BRAND.white, 7);
  text(doc, 'Q', lx, ly + 8, {
    color: BRAND.primary,
    fontSize: 22,
    font: 'bold',
    width: 40,
    align: 'center',
  });

  // ── Chip ──
  const cx = lx + 52;
  const cy = ly + 1;
  fillRect(doc, cx, cy, 74, 15, BRAND.accent, 7);
  text(doc, chip.toUpperCase(), cx, cy + 3, {
    color: BRAND.white,
    fontSize: 6.5,
    font: 'bold',
    width: 74,
    align: 'center',
    characterSpacing: 0.9,
  });

  // ── Title ──
  text(doc, title, cx, ly + 20, {
    color: BRAND.white,
    fontSize: 16,
    font: 'bold',
    width: CW - 52,
  });

  // ── Subtitle ──
  text(doc, subtitle, cx, ly + 42, {
    color: BRAND.accent,
    fontSize: 8.5,
    opacity: 0.9,
    width: CW - 52,
  });

  // ── Date (right-aligned) ──
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  text(doc, `Generated ${now}`, MARGIN.left, ly + 42, {
    color: BRAND.white,
    fontSize: 8,
    opacity: 0.6,
    width: CW,
    align: 'right',
  });

  return H;
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  pageNum: number,
  totalPages: number,
) {
  const fy = PAGE.height - 38;
  line(doc, MARGIN.left, fy, PAGE.width - MARGIN.right, fy, BRAND.border, 0.5);
  text(doc, 'Confidential · QA Automation Platform', MARGIN.left, fy + 8, {
    color: BRAND.textLight,
    fontSize: 7.5,
  });
  text(doc, `Page ${pageNum} of ${totalPages}`, MARGIN.left, fy + 8, {
    color: BRAND.textLight,
    fontSize: 7.5,
    width: CW,
    align: 'right',
  });
}

// ─── Section heading ─────────────────────────────────────────────────────────

function sectionHeading(
  doc: PDFKit.PDFDocument,
  label: string,
  y: number,
): number {
  fillRect(doc, MARGIN.left, y, 3, 13, BRAND.accent, 1);
  text(doc, label, MARGIN.left + 11, y + 1, {
    color: BRAND.textPrimary,
    fontSize: 9.5,
    font: 'bold',
  });
  line(
    doc,
    MARGIN.left + 11,
    y + 15,
    PAGE.width - MARGIN.right,
    y + 15,
    BRAND.border,
    0.4,
  );
  return y + 24;
}

// ─── Info-grid ───────────────────────────────────────────────────────────────

interface GridItem {
  label: string;
  value: string | number | null | undefined;
  accent?: string;
}

function infoGrid(
  doc: PDFKit.PDFDocument,
  items: GridItem[],
  startY: number,
): number {
  const colW = (CW - 8) / 2;
  const rowH = 38;

  items.forEach(({ label, value, accent }, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = MARGIN.left + col * (colW + 8);
    const y = startY + row * (rowH + 6);

    fillRect(doc, x, y, colW, rowH, BRAND.bg, 4);
    if (accent) fillRect(doc, x, y, 2.5, rowH, accent);

    text(doc, label.toUpperCase(), x + 10, y + 8, {
      color: BRAND.textMuted,
      fontSize: 6.5,
      characterSpacing: 0.5,
      width: colW - 16,
    });
    text(doc, String(value ?? '—'), x + 10, y + 20, {
      color: BRAND.textPrimary,
      fontSize: 9,
      font: 'bold',
      width: colW - 16,
      ellipsis: true,
    });
  });

  const rows = Math.ceil(items.length / 2);
  return startY + rows * (rowH + 6);
}

// ─── Inline badge ────────────────────────────────────────────────────────────

function inlineBadge(
  doc: PDFKit.PDFDocument,
  label: string,
  x: number,
  y: number,
  color: string,
): number {
  const w = doc.fontSize(7.5).font('Helvetica-Bold').widthOfString(label) + 16;
  fillRect(doc, x, y - 1, w, 14, color + '22', 7);
  doc
    .save()
    .fillColor(color)
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .text(label, x + 8, y + 2)
    .restore();
  return x + w + 6;
}

// ─── Code block ──────────────────────────────────────────────────────────────

function codeBlock(
  doc: PDFKit.PDFDocument,
  content: string | null | undefined,
  y: number,
  opts: { maxLines?: number; tone?: 'neutral' | 'error' } = {},
): number {
  const { maxLines = 20, tone = 'neutral' } = opts;
  const lines = (content || '—').split('\n').slice(0, maxLines);
  const blockH = Math.max(28, lines.length * 12 + 16);
  const bg = tone === 'error' ? '#1E1010' : '#0F172A';
  const fg = tone === 'error' ? '#FCA5A5' : '#94A3B8';

  fillRect(doc, MARGIN.left, y, CW, blockH, bg, 4);
  text(doc, lines.join('\n'), MARGIN.left + 12, y + 10, {
    color: fg,
    fontSize: 7.5,
    font: 'mono',
    width: CW - 24,
    lineGap: 2,
  });

  return y + blockH + 8;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function severityColor(s: string): string {
  if (s === 'CRITICAL') return '#DC2626';
  if (s === 'HIGH') return '#EA580C';
  if (s === 'MEDIUM') return '#D97706';
  return '#059669';
}

function statusColor(s: string): string {
  if (s === 'FAILED' || s === 'TIMED_OUT') return '#DC2626';
  if (s === 'PASSED') return '#059669';
  if (s === 'PARTIAL') return '#D97706';
  return '#64748B';
}

// ─── Exported PDF builders ───────────────────────────────────────────────────

export interface DefectReportData {
  id: string;
  executionId: string;
  projectId: string;
  title: string;
  status: string;
  severity: string;
  summary?: string | null;
  failureReason?: string | null;
  environment?: string | null;
  browser?: string | null;
  targetUrl?: string | null;
  exitCode?: number | null;
  command?: string | null;
  stderrExcerpt?: string | null;
  stdoutExcerpt?: string | null;
  createdAt?: Date | null;
}

export interface SuiteReportItemData {
  executionId: string;
  status: string;
  durationMs?: number | null;
  errorMessage?: string | null;
}

export interface SuiteReportData {
  id: string;
  projectId: string;
  title: string;
  status: string;
  total: number;
  passed: number;
  failed: number;
  timedOut: number;
  canceled: number;
  running: number;
  queued: number;
  passRate: number;
  durationMs?: number | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  items: SuiteReportItemData[];
}

// ─── Defect / Bug Report PDF ──────────────────────────────────────────────────

export function buildDefectReportPdf(
  report: DefectReportData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ──────────────────────────────────────────────────
    let y =
      drawHeader(
        doc,
        report.title,
        `Execution ID: ${report.executionId}`,
        'Bug Report',
      ) + 22;

    // ── Status + Severity badges ─────────────────────────────────
    let bx = MARGIN.left;
    bx = inlineBadge(doc, report.status, bx, y, statusColor(report.status));
    inlineBadge(doc, report.severity, bx, y, severityColor(report.severity));
    y += 22;

    // ── Overview grid ────────────────────────────────────────────
    y = sectionHeading(doc, 'Overview', y);
    y = infoGrid(
      doc,
      [
        {
          label: 'Environment',
          value: report.environment,
          accent: BRAND.accent,
        },
        { label: 'Browser', value: report.browser, accent: BRAND.accent },
        { label: 'Target URL', value: report.targetUrl, accent: BRAND.primary },
        {
          label: 'Exit Code',
          value: report.exitCode ?? '—',
          accent: report.exitCode === 0 ? BRAND.success : BRAND.danger,
        },
        {
          label: 'Created',
          value: report.createdAt
            ? new Date(report.createdAt).toLocaleString()
            : '—',
          accent: BRAND.textMuted,
        },
        { label: 'Report ID', value: report.id, accent: BRAND.textMuted },
      ],
      y,
    );
    y += 14;

    // ── Summary ──────────────────────────────────────────────────
    y = sectionHeading(doc, 'Summary', y);
    text(doc, report.summary || '—', MARGIN.left + 11, y, {
      color: BRAND.textPrimary,
      fontSize: 9,
      lineGap: 3,
      width: CW - 11,
    });
    y = doc.y + 14;

    // ── Failure Reason ───────────────────────────────────────────
    y = sectionHeading(doc, 'Failure Reason', y);
    fillRect(doc, MARGIN.left, y, CW, 2, BRAND.danger);
    y += 6;
    text(doc, report.failureReason || '—', MARGIN.left + 11, y, {
      color: '#7F1D1D',
      fontSize: 9,
      lineGap: 3,
      width: CW - 11,
    });
    y = doc.y + 14;

    // ── Command ──────────────────────────────────────────────────
    y = sectionHeading(doc, 'Execution Command', y);
    y = codeBlock(doc, report.command, y, { maxLines: 4 });

    // ── STDERR ───────────────────────────────────────────────────
    y = sectionHeading(doc, 'STDERR Excerpt', y);
    y = codeBlock(doc, report.stderrExcerpt, y, {
      maxLines: 16,
      tone: 'error',
    });

    // ── STDOUT (abbreviated) ─────────────────────────────────────
    if (report.stdoutExcerpt) {
      y = sectionHeading(doc, 'STDOUT Excerpt', y);
      y = codeBlock(doc, report.stdoutExcerpt, y, { maxLines: 10 });
    }

    // ── Footers ──────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      drawFooter(doc, i + 1, range.count);
    }

    doc.end();
  });
}

// ─── Suite / Test Run Report PDF ──────────────────────────────────────────────

export function buildSuiteReportPdf(report: SuiteReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ──────────────────────────────────────────────────
    let y =
      drawHeader(
        doc,
        report.title,
        `${report.total} executions · Pass rate ${report.passRate}%`,
        'Suite Report',
      ) + 22;

    // ── Status badge ─────────────────────────────────────────────
    inlineBadge(doc, report.status, MARGIN.left, y, statusColor(report.status));
    y += 22;

    // ── KPI strip ────────────────────────────────────────────────
    const kpis: Array<{
      label: string;
      value: string | number;
      color: string;
    }> = [
      { label: 'Total', value: report.total, color: BRAND.primary },
      { label: 'Passed', value: report.passed, color: BRAND.success },
      { label: 'Failed', value: report.failed, color: BRAND.danger },
      { label: 'Timed Out', value: report.timedOut, color: '#EA580C' },
      { label: 'Canceled', value: report.canceled, color: BRAND.textMuted },
      { label: 'Pass Rate', value: `${report.passRate}%`, color: BRAND.accent },
    ];

    const kpiW = CW / kpis.length;
    kpis.forEach(({ label, value, color }, i) => {
      const kx = MARGIN.left + i * kpiW;
      fillRect(doc, kx + 1, y, kpiW - 2, 52, BRAND.bg, 4);
      fillRect(doc, kx + 1, y, kpiW - 2, 3, color);
      text(doc, String(value), kx + 1, y + 11, {
        color,
        fontSize: 19,
        font: 'bold',
        width: kpiW - 2,
        align: 'center',
      });
      text(doc, label, kx + 1, y + 35, {
        color: BRAND.textMuted,
        fontSize: 7,
        width: kpiW - 2,
        align: 'center',
      });
    });
    y += 62;

    // ── Pass-rate progress bar ───────────────────────────────────
    y = sectionHeading(doc, 'Pass Rate', y);
    const barW = CW - 50;
    const passW = Math.max(0, (report.passRate / 100) * barW);
    fillRect(doc, MARGIN.left + 11, y, barW, 10, BRAND.border, 5);
    if (passW > 0)
      fillRect(doc, MARGIN.left + 11, y, passW, 10, BRAND.success, 5);
    text(doc, `${report.passRate}%`, MARGIN.left + 11 + barW + 8, y, {
      color: BRAND.textMuted,
      fontSize: 8,
      font: 'bold',
    });
    y += 20;

    // ── Timing grid ──────────────────────────────────────────────
    y = infoGrid(
      doc,
      [
        {
          label: 'Duration',
          value: report.durationMs
            ? `${(report.durationMs / 1000).toFixed(1)}s`
            : '—',
          accent: BRAND.accent,
        },
        { label: 'Report ID', value: report.id, accent: BRAND.textMuted },
        {
          label: 'Started',
          value: report.startedAt
            ? new Date(report.startedAt).toLocaleString()
            : '—',
          accent: BRAND.accent,
        },
        {
          label: 'Completed',
          value: report.completedAt
            ? new Date(report.completedAt).toLocaleString()
            : '—',
          accent: BRAND.accent,
        },
      ],
      y,
    );
    y += 16;

    // ── Execution table ──────────────────────────────────────────
    y = sectionHeading(doc, `Execution Results (${report.items.length})`, y);

    const COL = {
      num: 24,
      status: 82,
      duration: 66,
      get error() {
        return CW - this.num - this.status - this.duration;
      },
    };

    // Table header row
    fillRect(doc, MARGIN.left, y, CW, 18, BRAND.primary);
    (['#', 'Status', 'Duration', 'Error / Execution ID'] as const).forEach(
      (h, i) => {
        const colOffsets = [
          0,
          COL.num,
          COL.num + COL.status,
          COL.num + COL.status + COL.duration,
        ];
        const colWidths = [
          COL.num - 4,
          COL.status - 4,
          COL.duration - 4,
          COL.error - 10,
        ];
        text(doc, h, MARGIN.left + colOffsets[i] + 6, y + 5, {
          color: BRAND.white,
          fontSize: 7.5,
          font: 'bold',
          width: colWidths[i],
        });
      },
    );
    y += 18;

    report.items.forEach((item, idx) => {
      if (y > PAGE.height - 90) {
        doc.addPage();
        y = 28;
      }

      const rowH = item.errorMessage ? 28 : 20;
      const bg = idx % 2 === 0 ? BRAND.white : BRAND.bg;
      fillRect(doc, MARGIN.left, y, CW, rowH, bg);

      const cy2 = y + (rowH - 9) / 2;

      // # index
      text(doc, String(idx + 1), MARGIN.left + 6, cy2, {
        color: BRAND.textMuted,
        fontSize: 7.5,
      });

      // Status chip
      const sc = statusColor(item.status);
      const sw =
        doc.fontSize(7.5).font('Helvetica-Bold').widthOfString(item.status) +
        12;
      fillRect(
        doc,
        MARGIN.left + COL.num + 4,
        y + (rowH - 13) / 2,
        sw,
        13,
        sc + '20',
        6,
      );
      text(doc, item.status, MARGIN.left + COL.num + 10, cy2, {
        color: sc,
        fontSize: 7.5,
        font: 'bold',
      });

      // Duration
      const dur = item.durationMs
        ? `${(item.durationMs / 1000).toFixed(1)}s`
        : '—';
      text(doc, dur, MARGIN.left + COL.num + COL.status + 6, cy2, {
        color: BRAND.textPrimary,
        fontSize: 7.5,
      });

      // Error or ID
      const ex = MARGIN.left + COL.num + COL.status + COL.duration + 6;
      if (item.errorMessage) {
        text(doc, item.errorMessage, ex, y + 5, {
          color: '#B91C1C',
          fontSize: 7,
          width: COL.error - 14,
          ellipsis: true,
          height: 18,
        });
      } else {
        text(doc, item.executionId.slice(0, 28) + '…', ex, cy2, {
          color: BRAND.textLight,
          fontSize: 7,
          font: 'mono',
          width: COL.error - 14,
        });
      }

      line(
        doc,
        MARGIN.left,
        y + rowH,
        MARGIN.left + CW,
        y + rowH,
        BRAND.border,
        0.3,
      );
      y += rowH;
    });

    // ── Footers ──────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      drawFooter(doc, i + 1, range.count);
    }

    doc.end();
  });
}
