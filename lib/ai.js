// ═══════════════════════════════════════════════════════════════
// OpenAI API client wrapper (drop-in thay cho Claude)
// ═══════════════════════════════════════════════════════════════
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Giá USD / 1M tokens (OpenAI public pricing, tham khảo 2025)
const PRICING = {
  'gpt-5':        { input: 1.25, output: 10   },
  'gpt-5-mini':   { input: 0.25, output: 2    },
  'gpt-5-nano':   { input: 0.05, output: 0.4  },
  'gpt-5.4':      { input: 2.5,  output: 15   },
  'gpt-5.4-mini': { input: 0.75, output: 4.5  },
  'gpt-4o':       { input: 2.5,  output: 10   },
  'gpt-4o-mini':  { input: 0.15, output: 0.6  },
  'gpt-4.1':      { input: 2,    output: 8    },
  'gpt-4.1-mini': { input: 0.4,  output: 1.6  }
};

const USD_TO_VND = 25500;

function estimateCost(model, inputTokens, outputTokens) {
  const p = PRICING[model] || PRICING['gpt-5-mini'];
  const usd = (inputTokens / 1e6) * p.input + (outputTokens / 1e6) * p.output;
  return Math.round(usd * USD_TO_VND);
}

/**
 * Gọi OpenAI Chat Completions.
 * OpenAI tự động cache prompt ≥1024 tokens (không cần cache_control thủ công).
 * @returns { text, parsed, inputTokens, outputTokens, costVnd, durationMs, model }
 */
async function call({
  system,
  user,
  model = 'gpt-5-mini',
  maxTokens = 8000,
  expectJson = true
}) {
  const start = Date.now();

  const resp = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user',   content: user   }
    ],
    ...(expectJson ? { response_format: { type: 'json_object' } } : {})
  });

  const text = (resp.choices?.[0]?.message?.content || '').trim();
  const inputTokens  = resp.usage?.prompt_tokens     || 0;
  const outputTokens = resp.usage?.completion_tokens || 0;
  const cacheReadTokens = resp.usage?.prompt_tokens_details?.cached_tokens || 0;
  const costVnd = estimateCost(model, inputTokens, outputTokens);

  let parsed = null;
  if (expectJson) {
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      const m = clean.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
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
    cacheReadTokens
  };
}

module.exports = { call, estimateCost, PRICING };
