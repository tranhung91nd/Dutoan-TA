// ═══════════════════════════════════════════════════════════════
// Claude API client wrapper
// ═══════════════════════════════════════════════════════════════
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Giá USD / 1M tokens (Anthropic public pricing)
const PRICING = {
  'claude-sonnet-4-6':        { input: 3,   output: 15 },
  'claude-haiku-4-5-20251001':{ input: 1,   output: 5  }
};

const USD_TO_VND = 25500;

function estimateCost(model, inputTokens, outputTokens) {
  const p = PRICING[model] || PRICING['claude-sonnet-4-6'];
  const usd = (inputTokens / 1e6) * p.input + (outputTokens / 1e6) * p.output;
  return Math.round(usd * USD_TO_VND);
}

/**
 * Gọi Claude với prompt caching cho system prompt (giảm 90% chi phí lần 2+)
 * @returns { text, parsed, inputTokens, outputTokens, costVnd, durationMs, model }
 */
async function call({
  system,
  user,
  model = 'claude-sonnet-4-6',
  maxTokens = 8000,
  expectJson = true,
  useCaching = true
}) {
  const start = Date.now();

  const sysBlock = useCaching && system.length > 1024
    ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
    : system;

  const resp = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: sysBlock,
    messages: [{ role: 'user', content: user }]
  });

  const text = resp.content.map(b => b.text || '').join('').trim();
  const inputTokens = (resp.usage.input_tokens || 0) + (resp.usage.cache_creation_input_tokens || 0);
  const outputTokens = resp.usage.output_tokens || 0;
  const costVnd = estimateCost(model, inputTokens, outputTokens);

  let parsed = null;
  if (expectJson) {
    // Cố gắng parse JSON — strip ```json nếu có
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      // Tìm object JSON đầu tiên
      const m = clean.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch {}
      }
    }
  }

  return {
    text,
    parsed,
    inputTokens,
    outputTokens,
    costVnd,
    durationMs: Date.now() - start,
    model,
    cacheReadTokens: resp.usage.cache_read_input_tokens || 0
  };
}

module.exports = { call, estimateCost, PRICING };
