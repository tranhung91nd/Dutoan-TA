// POST /api/upload - nhận multipart, parse file, lưu DB
const Busboy = require('busboy');
const { parseFile } = require('../lib/parsers');
const { sb } = require('../lib/supabase');

module.exports.config = {
  api: { bodyParser: false }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { fields, files } = await parseMultipart(req);

    // Parse các file
    let proposalText = '';
    let budgetJson = null;
    let proposalFileName = null;
    let budgetFileName = null;

    if (files.proposal) {
      const parsed = await parseFile(files.proposal.buffer, files.proposal.filename);
      proposalText = parsed.text || '';
      proposalFileName = files.proposal.filename;
    }
    if (files.budget) {
      const parsed = await parseFile(files.budget.buffer, files.budget.filename);
      budgetJson = parsed.json || null;
      budgetFileName = files.budget.filename;
    }

    const supabase = sb();
    if (!supabase) {
      return res.status(500).json({ error: 'Chưa cấu hình Supabase (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)' });
    }

    // Upload file lên Supabase Storage (tùy chọn)
    const bucket = process.env.SUPABASE_BUCKET || 'de-tai-files';
    let proposalPath = null, budgetPath = null;
    const ts = Date.now();

    if (files.proposal) {
      proposalPath = `proposals/${ts}_${sanitize(files.proposal.filename)}`;
      const { error } = await supabase.storage.from(bucket).upload(proposalPath, files.proposal.buffer, {
        contentType: files.proposal.mimeType,
        upsert: true
      });
      if (error) console.warn('upload proposal storage fail:', error.message);
    }
    if (files.budget) {
      budgetPath = `budgets/${ts}_${sanitize(files.budget.filename)}`;
      const { error } = await supabase.storage.from(bucket).upload(budgetPath, files.budget.buffer, {
        contentType: files.budget.mimeType,
        upsert: true
      });
      if (error) console.warn('upload budget storage fail:', error.message);
    }

    // Tạo record project
    const { data: project, error: insErr } = await supabase.from('projects').insert({
      project_code: fields.project_code || null,
      title: fields.title,
      field_code: fields.field_code || 'khcn',
      owner_name: fields.owner_name || null,
      organization: fields.organization || null,
      total_budget: fields.total_budget ? Number(fields.total_budget) : null,
      duration_months: fields.duration_months ? Number(fields.duration_months) : null,
      proposal_file_path: proposalPath,
      budget_file_path: budgetPath,
      proposal_text: proposalText,
      budget_json: budgetJson,
      status: 'draft'
    }).select().single();

    if (insErr) throw insErr;

    res.status(200).json({
      ok: true,
      projectId: project.id,
      project,
      parsed: {
        proposalChars: proposalText.length,
        budgetSheets: budgetJson ? Object.keys(budgetJson).length : 0
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers, limits: { fileSize: 30 * 1024 * 1024 } });
    const fields = {}, files = {};

    bb.on('field', (name, val) => { fields[name] = val; });

    bb.on('file', (name, stream, info) => {
      const chunks = [];
      stream.on('data', c => chunks.push(c));
      stream.on('end', () => {
        files[name] = {
          buffer: Buffer.concat(chunks),
          filename: info.filename,
          mimeType: info.mimeType
        };
      });
    });

    bb.on('close', () => resolve({ fields, files }));
    bb.on('error', reject);
    req.pipe(bb);
  });
}

function sanitize(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}
