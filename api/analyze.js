// POST /api/analyze { projectId, type }
// Chạy phân tích AI cho 1 đề tài
const ai = require('../lib/ai');
const { sb, logAI } = require('../lib/supabase');
const P = require('../lib/prompts');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { projectId, type, model } = req.body || {};
  if (!projectId || !type) return res.status(400).json({ error: 'Thiếu projectId hoặc type' });

  const VALID = ['legal', 'budget', 'form_05', 'freestyle'];
  if (!VALID.includes(type)) return res.status(400).json({ error: 'type không hợp lệ' });

  const ALLOWED_MODELS = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini'];
  const pickedModel = ALLOWED_MODELS.includes(model) ? model : 'gpt-5-mini';

  const supabase = sb();
  if (!supabase) return res.status(500).json({ error: 'Chưa cấu hình Supabase' });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'Chưa cấu hình OPENAI_API_KEY' });

  try {
    // Lấy project
    const { data: project, error: pErr } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if (pErr) throw pErr;
    if (!project) return res.status(404).json({ error: 'Không tìm thấy đề tài' });

    // Update status
    await supabase.from('projects').update({ status: 'analyzing' }).eq('id', projectId);

    let result;
    switch (type) {
      case 'legal':     result = await runLegal(project, supabase, pickedModel); break;
      case 'budget':    result = await runBudget(project, supabase, pickedModel); break;
      case 'form_05':   result = await runForm05(project, supabase, pickedModel); break;
      case 'freestyle': result = await runFreestyle(project, supabase, pickedModel); break;
    }

    // Lưu kết quả
    const { data: saved, error: insErr } = await supabase.from('analyses').insert({
      project_id: projectId,
      analysis_type: type,
      model: result.model,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      cost_vnd: result.costVnd,
      result_json: result.parsed || {},
      result_markdown: (result.parsed && result.parsed.markdown_report) || result.text || '',
      citations: (result.parsed && (result.parsed.citations || result.parsed.required_citations)) || [],
      warnings: (result.parsed && result.parsed.warnings) || []
    }).select().single();

    if (insErr) console.warn('insert analysis fail:', insErr.message);

    await supabase.from('projects').update({ status: 'analyzed' }).eq('id', projectId);

    await logAI({
      projectId, endpoint: `analyze.${type}`,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costVnd: result.costVnd,
      durationMs: result.durationMs
    });

    res.status(200).json({ ok: true, analysis: saved, ...result });
  } catch (e) {
    console.error(e);
    await logAI({ projectId, endpoint: `analyze.${type}`, error: e.message });
    await supabase.from('projects').update({ status: 'draft' }).eq('id', projectId);
    res.status(500).json({ error: e.message });
  }
};

async function runLegal(project, supabase, model) {
  // Lấy văn bản pháp lý phù hợp với lĩnh vực
  const { data: docs } = await supabase.from('legal_documents')
    .select('*')
    .eq('is_active', true)
    .contains('applicable_fields', [project.field_code]);

  const system = P.systemPrompt(project.field_code);
  const user = P.legalPrompt(project.proposal_text || '(chưa có thuyết minh)', docs || []);

  return ai.call({ system, user, model });
}

async function runBudget(project, supabase, model) {
  const { data: norms } = await supabase.from('budget_norms')
    .select('*')
    .or(`applicable_fields.cs.{${project.field_code}},applicable_fields.eq.{}`);

  const system = P.systemPrompt(project.field_code);
  const user = P.budgetPrompt(
    project.proposal_text || '',
    project.budget_json || {},
    norms || [],
    project.total_budget,
    project.duration_months
  );

  return ai.call({ system, user, model, maxTokens: 12000 });
}

async function runForm05(project, supabase, model) {
  // Lấy 2 phân tích trước đó (legal + budget) để làm input
  const { data: analyses } = await supabase.from('analyses')
    .select('*').eq('project_id', project.id)
    .in('analysis_type', ['legal', 'budget'])
    .order('created_at', { ascending: false });

  const legal  = (analyses || []).find(a => a.analysis_type === 'legal')?.result_json || {};
  const budget = (analyses || []).find(a => a.analysis_type === 'budget')?.result_json || {};

  const system = P.systemPrompt(project.field_code);
  const user = P.form05Prompt(
    project.proposal_text || '',
    legal, budget,
    {
      title: project.title,
      owner_name: project.owner_name,
      organization: project.organization,
      total_budget: project.total_budget,
      duration_months: project.duration_months,
      field_code: project.field_code
    }
  );

  return ai.call({ system, user, model, maxTokens: 10000 });
}

async function runFreestyle(project, supabase, model) {
  const { data: analyses } = await supabase.from('analyses')
    .select('*').eq('project_id', project.id)
    .in('analysis_type', ['legal', 'budget'])
    .order('created_at', { ascending: false });

  const legal  = (analyses || []).find(a => a.analysis_type === 'legal')?.result_json || {};
  const budget = (analyses || []).find(a => a.analysis_type === 'budget')?.result_json || {};

  const system = P.systemPrompt(project.field_code);
  const user = P.freestylePrompt(project.proposal_text || '', legal, budget);

  return ai.call({ system, user, model, maxTokens: 6000 });
}
