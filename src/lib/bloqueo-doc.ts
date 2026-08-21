// Generates a Word (.docx) and PDF file for a bloqueo, using the real company
// template as reference. Ported from the Claude Design prototype's
// bloqueo-doc.js. The template parts live in public/bloqueo-template/ and are
// fetched at runtime; parts other than word/document.xml are copied through
// unmodified to preserve exact formatting.

export type BloqueoDocData = {
  hotel: string;
  hotelEmail: string;
  contacto: string;
  creado: string;
  pasajerosTxt: string;
  fechaInLabel: string;
  fechaOutLabel: string;
  noches: number;
  habitaciones: { tipo: string; cantidad: number }[];
  tarifas: { concepto: string; tarifa: string }[];
  notaTarifa: string;
};

let crc32Table: number[] | null = null;

function crc32(buf: Uint8Array): number {
  if (!crc32Table) {
    const t: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    crc32Table = t;
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crc32Table[(crc ^ buf[i]!) & 0xff]!;
  return (crc ^ -1) >>> 0;
}

function buildZipBlob(files: { name: string; data: Uint8Array }[], mimeType: string): Blob {
  const localParts: (Uint8Array | Uint8Array)[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  files.forEach((f) => {
    const nameBytes = new TextEncoder().encode(f.name);
    const data = f.data;
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0x21, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    const localHeaderOffset = offset;
    localParts.push(local, data);
    offset += local.length + data.length;

    const central = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(central.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0x21, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, data.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, localHeaderOffset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);
  });
  const centralOffset = offset;
  const centralSize = centralParts.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(8, files.length, true);
  edv.setUint16(10, files.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, centralOffset, true);
  return new Blob([...localParts, ...centralParts, eocd] as BlobPart[], { type: mimeType });
}

function xmlEsc(s: unknown): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const TEMPLATE_BASE = "/bloqueo-template/";
const TEMPLATE_PARTS: { archiveName: string; file: string; isDocument?: boolean }[] = [
  { archiveName: "[Content_Types].xml", file: "-Content_Types-.xml" },
  { archiveName: "_rels/.rels", file: "_rels/.rels" },
  { archiveName: "word/document.xml", file: "word/document.xml", isDocument: true },
  { archiveName: "word/_rels/document.xml.rels", file: "word/_rels/document.xml.rels" },
  { archiveName: "word/media/image1.jpeg", file: "word/media/image1.jpeg" },
  { archiveName: "word/theme/theme1.xml", file: "word/theme/theme1.xml" },
  { archiveName: "word/settings.xml", file: "word/settings.xml" },
  { archiveName: "word/numbering.xml", file: "word/numbering.xml" },
  { archiveName: "word/styles.xml", file: "word/styles.xml" },
  { archiveName: "word/webSettings.xml", file: "word/webSettings.xml" },
  { archiveName: "word/fontTable.xml", file: "word/fontTable.xml" },
  { archiveName: "docProps/core.xml", file: "docProps/core.xml" },
  { archiveName: "docProps/app.xml", file: "docProps/app.xml" },
];

function applyPlaceholders(xml: string, d: BloqueoDocData): string {
  xml = xml.replace(/<w:proofErr[^>]*\/>/g, "");
  const habitacionLines = (d.habitaciones || []).map((h) => `${h.cantidad} ${h.tipo}`);
  const tarifaLines = (d.tarifas || []).map((t) => `${t.concepto}: ${t.tarifa}`);
  if (d.notaTarifa) tarifaLines.push(d.notaTarifa);
  const valueFor = (name: string): string | string[] | null => {
    switch (name) {
      case "Hotel":
        return d.hotel;
      case "E-mail del hotel":
        return d.hotelEmail;
      case "Contacto":
        return d.contacto;
      case "Fecha":
        return d.creado;
      case "Pasajeros":
        return d.pasajerosTxt;
      case "Fecha IN":
        return d.fechaInLabel;
      case "Fecha OUT":
        return d.fechaOutLabel;
      case "Nro Noches":
        return `${d.noches} noches`;
      case "Habitaciones Solicitadas":
        return habitacionLines;
      case "Tarifas":
        return tarifaLines;
      default:
        return null;
    }
  };
  const buildRun = (rPr: string, value: string | string[]): string => {
    if (Array.isArray(value)) {
      // Each subsequent item starts on its own line, indented with a tab so
      // the list reads as a column instead of running into the margin.
      const parts = value
        .map(
          (line, i) =>
            (i > 0 ? "<w:br/><w:tab/>" : "") + `<w:t xml:space="preserve">${xmlEsc(line)}</w:t>`,
        )
        .join("");
      return `<w:r>${rPr}${parts}</w:r>`;
    }
    return `<w:r>${rPr}<w:t xml:space="preserve">${xmlEsc(value ?? "")}</w:t></w:r>`;
  };

  // Word sometimes splits a single {Placeholder} across more than two runs
  // (e.g. because of spell-check boundaries or a font change mid-word), so
  // walk the runs instead of relying on a fixed one- or two-run regex. This
  // finds a run containing "{", accumulates the text of however many runs it
  // takes to reach the run containing the matching "}", and replaces that
  // whole span with a single run built from the resolved value.
  const runRe = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g;
  type RunToken = { raw: string; isRun: boolean; prefix: string; text: string };
  const tokens: RunToken[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = runRe.exec(xml))) {
    if (m.index > lastIndex) {
      tokens.push({ raw: xml.slice(lastIndex, m.index), isRun: false, prefix: "", text: "" });
    }
    const runXml = m[0];
    const prefixMatch = runXml.match(/^<w:r\b[^>]*>([\s\S]*?)(?=<w:t\b)/);
    let text = "";
    const textRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = textRe.exec(runXml))) text += tm[1];
    tokens.push({ raw: runXml, isRun: true, prefix: prefixMatch ? prefixMatch[1]! : "", text });
    lastIndex = runRe.lastIndex;
  }
  if (lastIndex < xml.length) {
    tokens.push({ raw: xml.slice(lastIndex), isRun: false, prefix: "", text: "" });
  }

  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    const openIdx = t.isRun ? t.text.indexOf("{") : -1;
    if (openIdx !== -1) {
      const closeIdx = t.text.indexOf("}", openIdx + 1);
      if (closeIdx !== -1) {
        // Placeholder fully contained in a single run.
        const name = t.text.slice(openIdx + 1, closeIdx);
        const val = valueFor(name);
        out.push(val === null ? t.raw : buildRun(t.prefix, val));
        i++;
        continue;
      }
      // Placeholder opens here but its name and/or closing "}" are in later
      // runs (with possibly non-run content, like the proofErr tags already
      // stripped above, in between). Accumulate until a run closes it.
      let name = t.text.slice(openIdx + 1);
      let j = i + 1;
      let closed = false;
      while (j < tokens.length) {
        const nt = tokens[j]!;
        if (!nt.isRun) {
          j++;
          continue;
        }
        if (nt.text.includes("{")) break;
        const nClose = nt.text.indexOf("}");
        if (nClose !== -1) {
          name += nt.text.slice(0, nClose);
          closed = true;
          j++;
          break;
        }
        name += nt.text;
        j++;
      }
      if (closed) {
        const val = valueFor(name);
        if (val === null) {
          for (let k = i; k < j; k++) out.push(tokens[k]!.raw);
        } else {
          out.push(buildRun(t.prefix, val));
        }
        i = j;
        continue;
      }
    }
    out.push(t.raw);
    i++;
  }
  return out.join("");
}

export async function buildBloqueoDocxBlob(d: BloqueoDocData): Promise<Blob> {
  const files: { name: string; data: Uint8Array }[] = [];
  for (const part of TEMPLATE_PARTS) {
    const res = await fetch(TEMPLATE_BASE + part.file);
    let bytes = new Uint8Array(await res.arrayBuffer());
    if (part.isDocument) {
      const xml = new TextDecoder().decode(bytes);
      bytes = new TextEncoder().encode(applyPlaceholders(xml, d));
    }
    files.push({ name: part.archiveName, data: bytes });
  }
  return buildZipBlob(
    files,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
}

function toPdfText(s: unknown): string {
  const map: Record<string, string> = {
    "–": "-",
    "—": "-",
    "‘": "'",
    "’": "'",
    "“": '"',
    "”": '"',
    "…": "...",
  };
  return String(s)
    .normalize("NFC")
    .split("")
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if (code > 255) return map[ch] || "?";
      return ch;
    })
    .join("")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function toLatin1Bytes(str: string): Uint8Array {
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i) & 0xff;
  return buf;
}

export function buildBloqueoPdfBlob(d: BloqueoDocData): Blob {
  const lines: { text: string; size: number; gap: number; center: boolean }[] = [];
  const push = (text: string, opts: { size?: number; gap?: number; center?: boolean } = {}) =>
    lines.push({
      text: toPdfText(text),
      size: opts.size || 10,
      gap: opts.gap || 14,
      center: !!opts.center,
    });
  push(
    "P.O.BOX 17-11-5091 - Quito-Ecuador  Telf: (593 2) 2241866 - Fax: 2449608  Cel: (593 9) 7732692/ 7731267",
    {
      center: true,
    },
  );
  push("");
  push("B L O Q U E O", { size: 14, center: true, gap: 20 });
  push("");
  push(`PARA:  ${d.hotel}     E-MAIL: ${d.hotelEmail}`);
  push(`ATT:     ${d.contacto}     FECHA:  ${d.creado}`);
  push("");
  push(`Estimada/o ${d.contacto},`);
  push(
    "Por medio de la presente solicitamos realizar el siguiente bloqueo de espacios, bajo las siguientes especificaciones:",
  );
  push("");
  push(`PASAJEROS: ${d.pasajerosTxt}`);
  push(`FECHA:        IN:  ${d.fechaInLabel}      OUT: ${d.fechaOutLabel}`);
  push(`NOCHES:     ${d.noches} NOCHES`);
  push("SERVICIOS:");
  d.habitaciones.forEach((h) => push(`     ${h.cantidad} ${h.tipo}`));
  push("");
  push("TARIFA:");
  d.tarifas.forEach((t) => push(`     ${t.concepto}: ${t.tarifa}`));
  push(d.notaTarifa);
  push("");
  push(
    "Favor enviar la confirmacion de este bloqueo y el tiempo limite del mismo a Ecuador Nature Expeditions al e-mail: sales@enexpeditions.com",
  );
  push("Gracias por tu ayuda");
  push("Saludos,");
  push("");
  push("Sandra Jitala");
  push("Ecuador Nature Expeditions");
  push("");
  push("email:info@ecuadornaturexpeditions.com - web:www.ecuadornaturexpeditions.com", {
    center: true,
  });

  let y = 760;
  const parts = ["BT"];
  lines.forEach((l) => {
    if (l.text === "") {
      y -= l.gap;
      return;
    }
    const x = l.center ? Math.max(56, 306 - l.text.length * l.size * 0.27) : 56;
    parts.push(`/F1 ${l.size} Tf`);
    parts.push(`1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm`);
    parts.push(`(${l.text}) Tj`);
    y -= l.gap;
  });
  parts.push("ET");
  const contentStr = parts.join("\n");

  const objs: Record<number, string> = {};
  objs[1] = "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n";
  objs[2] = "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n";
  objs[3] =
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>endobj\n";
  objs[4] = `4 0 obj<< /Length ${contentStr.length} >>stream\n${contentStr}\nendstream endobj\n`;
  objs[5] =
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>endobj\n";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = pdf.length;
    pdf += objs[i];
  }
  const xrefOffset = pdf.length;
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  pdf += `trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([toLatin1Bytes(pdf)] as BlobPart[], { type: "application/pdf" });
}
