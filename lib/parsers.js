// ═══════════════════════════════════════════════════════════════
// File parsers: DOCX, PDF, XLSX → text/JSON
// ═══════════════════════════════════════════════════════════════
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');

async function parseDocx(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

async function parsePdf(buffer) {
  const { text } = await pdfParse(buffer);
  return text;
}

/**
 * Parse XLSX file → JSON array theo sheet
 * Cố gắng nhận diện header + normalize số tiền VND
 */
async function parseXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const result = {};

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    // Convert sang array of arrays để giữ structure
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
    // Convert sang array of objects (cố gắng detect header)
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    result[sheetName] = {
      raw_rows: aoa.slice(0, 200),          // giới hạn để không quá lớn
      records: json.slice(0, 200),
      row_count: aoa.length
    };
  }

  return result;
}

/**
 * Parse file bất kỳ dựa trên mimetype / filename
 */
async function parseFile(buffer, filename) {
  const name = (filename || '').toLowerCase();
  if (name.endsWith('.docx')) return { type: 'docx', text: await parseDocx(buffer) };
  if (name.endsWith('.pdf'))  return { type: 'pdf',  text: await parsePdf(buffer) };
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return { type: 'xlsx', json: await parseXlsx(buffer) };
  }
  throw new Error('Định dạng file không hỗ trợ: ' + filename);
}

module.exports = { parseDocx, parsePdf, parseXlsx, parseFile };
