import { crc32, deflateRawSync } from 'node:zlib';

// Generated, copyright-free package/PDF fixtures. No client documents involved.
export function makeZip(entries) {
  const local = []; const central = []; let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name); const data = Buffer.from(entry.text ?? '');
    const compressed = entry.deflate ? deflateRawSync(data) : data;
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4); header.writeUInt16LE(entry.encrypted ? 1 : 0, 6);
    header.writeUInt16LE(entry.deflate ? 8 : 0, 8); header.writeUInt32LE(entry.crc ?? crc32(data), 14);
    header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26);
    const index = Buffer.alloc(46); index.writeUInt32LE(0x02014b50);
    index.writeUInt16LE(20, 4); header.copy(index, 6, 4, 28); index.writeUInt32LE(offset, 42);
    local.push(header, name, compressed); central.push(index, name);
    offset += header.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central); const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

export const wordXml = (body, root = 'document') => `<?xml version="1.0"?><w:${root} xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${body}</w:${root}>`;
export const simpleDocx = () => makeZip([{ name: 'word/document.xml', text: wordXml('<w:body><w:p><w:r><w:t>Notify the incident owner.</w:t></w:r></w:p></w:body>') }]);

export function makePdf(pages = ['Notify the incident owner.']) {
  const kids = pages.map((_, index) => `${4 + index * 2} 0 R`).join(' ');
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  pages.forEach((text, index) => {
    const content = text === null ? '' : `BT /F1 12 Tf 72 720 Td (${text.replace(/[()\\]/g, '\\$&')}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`,
      `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  });
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
