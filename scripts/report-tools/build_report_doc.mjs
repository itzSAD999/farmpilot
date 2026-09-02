import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const SRC = process.argv[2] || 'docs/FarmPilot_MiniProject_Report.md';
const OUT = process.argv[3] || 'docs/FarmPilot_MiniProject_Report.html';
const IMG_DIR = 'docs';

const md = readFileSync(SRC, 'utf-8');

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function imgExt(path) {
  const m = path.match(/\.(png|jpe?g|gif|svg)$/i);
  if (!m) return 'png';
  const e = m[1].toLowerCase();
  return e === 'jpg' ? 'jpeg' : e;
}

let figureCount = 0;

function inline(text, suppressCaption = false) {
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, src) => {
    const p = join(IMG_DIR, src);
    if (!existsSync(p)) return `<em>[missing image: ${escapeHtml(src)}]</em>`;
    const b64 = readFileSync(p).toString('base64');
    const ext = imgExt(src);
    const img = `<img alt="${escapeHtml(alt)}" src="data:image/${ext};base64,${b64}" />`;
    // The KNUST seal is a masthead logo, not a numbered figure — leave it bare.
    // Likewise skip auto-captioning where the source already has its own
    // manually-numbered "*Figure N.M — ...*" caption right above it.
    if (!alt || alt === 'KNUST Seal' || suppressCaption) return `<div class="figure-wrap">${img}</div>`;
    figureCount += 1;
    return `<figure>${img}<figcaption>Figure ${figureCount} — ${escapeHtml(alt)}</figcaption></figure>`;
  });
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, href) => `<a href="${href}">${t}</a>`);
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/(^|[^"'>])(https?:\/\/[^\s<]+)/g, (m, pre, url) => `${pre}<a href="${url}">${url}</a>`);
  return text;
}

const lines = md.split('\n');
let html = [];
let i = 0;
let inCodeBlock = false;
let codeBuf = [];
let codeLang = '';
let inTable = false;
let tableRows = [];
let inList = null;
let inBlockquote = false;

function flushList() { if (inList) { html.push(`</${inList}>`); inList = null; } }
function flushBlockquote() { if (inBlockquote) { html.push('</blockquote>'); inBlockquote = false; } }
function flushTable() {
  if (!inTable) return;
  const [headerLine, , ...bodyLines] = tableRows;
  const headers = headerLine.split('|').map(s => s.trim()).filter((s, idx, arr) => !(idx === 0 && s === '') && !(idx === arr.length - 1 && s === ''));
  html.push('<table>');
  html.push('<thead><tr>' + headers.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead>');
  html.push('<tbody>');
  for (const row of bodyLines) {
    const cells = row.split('|').map(s => s.trim()).filter((s, idx, arr) => !(idx === 0 && s === '') && !(idx === arr.length - 1 && s === ''));
    html.push('<tr>' + cells.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>');
  }
  html.push('</tbody></table>');
  inTable = false; tableRows = [];
}

while (i < lines.length) {
  const line = lines[i];
  if (line.trim().startsWith('```')) {
    if (!inCodeBlock) { flushList(); flushBlockquote(); flushTable(); inCodeBlock = true; codeLang = line.trim().slice(3); codeBuf = []; }
    else {
      inCodeBlock = false;
      if (codeLang === 'mermaid') html.push(`<div class="diagram-note"><strong>[Diagram — rendered as Mermaid in the source .md; shown here as its source definition since Word does not execute diagram scripts]</strong></div>`);
      html.push(`<pre class="code"><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
    }
    i++; continue;
  }
  if (inCodeBlock) { codeBuf.push(line); i++; continue; }
  if (line.trim().startsWith('|')) { if (!inTable) { flushList(); flushBlockquote(); inTable = true; tableRows = []; } tableRows.push(line.trim()); i++; continue; }
  else if (inTable) flushTable();
  if (line.trim().startsWith('>')) { if (!inBlockquote) { flushList(); inBlockquote = true; html.push('<blockquote>'); } html.push(`<p>${inline(line.trim().replace(/^>\s?/, ''))}</p>`); i++; continue; }
  else if (inBlockquote) flushBlockquote();
  const h = line.match(/^(#{1,4})\s+(.*)$/);
  if (h) {
    flushList(); flushBlockquote(); flushTable();
    const level = h[1].length;
    const text = h[2].replace(/\s*\{#.*\}\s*$/, '');
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    html.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
    i++; continue;
  }
  if (line.trim() === '---') { flushList(); flushBlockquote(); flushTable(); html.push('<hr/>'); i++; continue; }
  const ol = line.match(/^(\d+)\.\s+(.*)$/);
  const ul = line.match(/^[-*]\s+(.*)$/);
  if (ol) { if (inList !== 'ol') { flushList(); inList = 'ol'; html.push('<ol>'); } html.push(`<li>${inline(ol[2])}</li>`); i++; continue; }
  if (ul) { if (inList !== 'ul') { flushList(); inList = 'ul'; html.push('<ul>'); } html.push(`<li>${inline(ul[1])}</li>`); i++; continue; }
  if (inList && line.trim() === '') {
    const next = lines.slice(i + 1).find(l => l.trim() !== '');
    if (next && (/^(\d+)\.\s+/.test(next) || /^[-*]\s+/.test(next))) { i++; continue; }
    flushList(); i++; continue;
  } else if (inList) flushList();
  if (line.trim() === '') { i++; continue; }
  // A line that is nothing but an image stands alone as a figure block,
  // not text inside a <p> — avoids nesting <figure> inside <p>. If the
  // previous line was already a manual "*Figure N.M — ...*" caption
  // (the main report's own chapter-scoped numbering), skip the
  // auto-generated caption so the image isn't captioned twice.
  if (/^!\[[^\]]*\]\([^)]+\)$/.test(line.trim())) {
    const prevWasManualCaption = i > 0 && /^\*Figure\s.+\*$/i.test(lines[i - 1].trim());
    html.push(inline(line.trim(), prevWasManualCaption));
    i++; continue;
  }
  html.push(`<p>${inline(line)}</p>`);
  i++;
}
flushList(); flushBlockquote(); flushTable();

const bodyHtml = html.join('\n');
const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${SRC.includes('Development_Log') ? 'FarmPilot Development Log' : 'FarmPilot Mini Project Report'}</title>
<style>
  @page { size: A4; margin: 2.5cm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.55; max-width: 850px; margin: 40px auto; padding: 0 20px; font-size: 12pt; }
  h1 { font-size: 21pt; margin-top: 1.4em; padding-bottom: 0.3em; border-bottom: 2.5px solid #1B5E20; letter-spacing: 0.02em; page-break-before: always; }
  h1:first-of-type { page-break-before: avoid; text-align: center; border-bottom: none; font-size: 19pt; line-height: 1.35; letter-spacing: 0.01em; }
  h2 { font-size: 16pt; margin-top: 1.6em; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  h3 { font-size: 13.5pt; margin-top: 1.3em; color: #14461a; }
  h4 { font-size: 12pt; margin-top: 1.1em; font-style: italic; }
  p { margin: 0.6em 0; text-align: justify; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 10.5pt; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #eef3ee; font-weight: bold; }
  code { background: #f2f2f2; padding: 1px 5px; border-radius: 3px; font-family: Consolas, monospace; font-size: 0.92em; }
  pre.code { background: #f7f7f7; border: 1px solid #ddd; border-radius: 6px; padding: 12px; overflow-x: auto; font-size: 9.5pt; line-height: 1.4; }
  pre.code code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #1B5E20; margin: 1em 0; padding: 0.4em 1em; background: #f4f9f4; color: #333; }
  img { display: block; margin: 10px auto; max-width: 100%; }
  figure { margin: 1.4em 0; text-align: center; page-break-inside: avoid; }
  figure img { border: 1px solid #ddd; border-radius: 6px; margin: 0 auto; }
  figcaption { margin-top: 0.5em; font-size: 10pt; font-style: italic; color: #555; }
  .figure-wrap { text-align: center; margin: 1.4em 0; page-break-inside: avoid; }
  .figure-wrap img { border: 1px solid #ddd; border-radius: 6px; margin: 0 auto; }
  /* A paragraph that is nothing but "*Figure N.M — ...*" is the report's
     own manually-numbered caption — style it like one, sitting just above
     its image (the caption line always precedes the image in the source). */
  p:has(> em:only-child) { text-align: center; font-size: 10pt; font-style: italic; color: #555; margin: 1.4em 0 -0.6em; }
  hr { border: none; border-top: 1px solid #ccc; margin: 2em 0; }
  .diagram-note { background: #fff8e6; border: 1px solid #e8d38a; padding: 8px 12px; border-radius: 6px; margin: 8px 0; font-size: 10.5pt; }
  ul, ol { margin: 0.5em 0; padding-left: 1.6em; }
  li { margin: 0.25em 0; }
  a { color: #1B5E20; }
  ${!SRC.includes('Development_Log') ? `
  /* Title page: the info table (Course/Supervisor/...) and Team table right
     after the H1, before the Abstract's H2, read like a cover page. */
  h1:first-of-type ~ table:nth-of-type(-n+2) { margin: 1.5em auto; max-width: 520px; }
  h1:first-of-type ~ table:nth-of-type(-n+2) td, h1:first-of-type ~ table:nth-of-type(-n+2) th { text-align: center; }
  h1:first-of-type ~ p:nth-of-type(-n+2) { text-align: center; font-size: 12.5pt; }` : ''}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;
writeFileSync(OUT, page, 'utf-8');
console.log('Wrote', OUT, `(${(page.length / 1024 / 1024).toFixed(2)} MB)`);
