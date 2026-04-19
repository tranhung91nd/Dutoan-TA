// ═══════════════════════════════════════════════════════════════
// Supabase client (server-side, dùng service role)
// ═══════════════════════════════════════════════════════════════
const { createClient } = require('@supabase/supabase-js');

let _client = null;

function sb() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return _client;
}

async function logAI({ projectId, endpoint, model, inputTokens, outputTokens, costVnd, durationMs, error }) {
  const c = sb();
  if (!c) return;
  try {
    await c.from('ai_logs').insert({
      project_id: projectId || null,
      endpoint, model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_vnd: costVnd,
      duration_ms: durationMs,
      error: error || null
    });
  } catch (e) {
    console.warn('log AI failed', e.message);
  }
}

module.exports = { sb, logAI };
