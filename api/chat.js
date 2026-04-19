// POST /api/chat { messages, model, projectId? }
// Trợ lý AI dạng hội thoại nhiều lượt, có thể kèm ngữ cảnh 1 đề tài cụ thể.
const ai = require('../lib/ai');
const { sb, logAI } = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'Chưa cấu hình OPENAI_API_KEY' });

  const { messages = [], model = 'gpt-5-mini', projectId = null } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Thiếu messages' });
  }

  let systemPrompt = `Bạn là TRỢ LÝ AI của web "Dự Toán AI" — hỗ trợ phân tích đề tài NCKH Việt Nam.

CHUYÊN MÔN:
- Văn bản pháp lý: 94/2024/TT-BTC (cơ chế tài chính KHCN), 31/2023/TT-BTC, 02/2015/TT-BLĐTBXH, 04/2025/TT-BNV, Luật NSNN 83/2015/QH13, NĐ 163/2016/NĐ-CP, Luật BVMT 72/2020/QH14, NĐ 08/2022/NĐ-CP.
- Định mức chi thù lao, hội thảo, nghiệm thu, khoán chi.
- Cách điền phiếu MẪU 05, phiếu trao đổi hội đồng.
- Phản biện dự toán, phát hiện rủi ro thanh tra/kiểm toán.

NGUYÊN TẮC:
1. Trích dẫn CHÍNH XÁC số văn bản, Điều, Khoản, Mục, Điểm. Ví dụ: "Thông tư 94/2024/TT-BTC, Điều 6 khoản 2 điểm a".
2. KHÔNG bịa văn bản, điều khoản. Nếu không chắc → nói rõ "cần tra cứu thêm".
3. Ngôn ngữ: hành chính, súc tích, đi thẳng vấn đề. Dùng markdown gọn.
4. Khi có rủi ro → ghi rõ mức độ: [CẢNH BÁO ĐỎ] / [CẢNH BÁO VÀNG] / [LƯU Ý].`;

  if (projectId) {
    try {
      const supabase = sb();
      if (supabase) {
        const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
        if (project) {
          const { data: analyses } = await supabase.from('analyses')
            .select('analysis_type,result_json').eq('project_id', projectId)
            .order('created_at', { ascending: false });
          const legal = (analyses || []).find(a => a.analysis_type === 'legal')?.result_json;
          const budget = (analyses || []).find(a => a.analysis_type === 'budget')?.result_json;

          systemPrompt += `\n\n═══ NGỮ CẢNH ĐỀ TÀI HIỆN TẠI ═══
Tên: ${project.title}
Mã: ${project.project_code || '—'}
Lĩnh vực: ${project.field_code}
Chủ nhiệm: ${project.owner_name || '—'} — ${project.organization || '—'}
Tổng kinh phí: ${project.total_budget?.toLocaleString('vi-VN') || '—'} VND
Thời gian: ${project.duration_months || '—'} tháng

TÓM TẮT THUYẾT MINH: ${String(project.proposal_text || '').slice(0, 3000)}`;
          if (legal) systemPrompt += `\n\nTÓM TẮT PHÂN TÍCH PHÁP LÝ ĐÃ CÓ: ${JSON.stringify(legal).slice(0, 2000)}`;
          if (budget) systemPrompt += `\n\nTÓM TẮT PHÂN TÍCH DỰ TOÁN ĐÃ CÓ: ${JSON.stringify(budget).slice(0, 2000)}`;
        }
      }
    } catch (e) { /* ignore context errors */ }
  }

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.filter(m => m && m.role && m.content).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content).slice(0, 8000)
    }))
  ];

  try {
    const result = await ai.call({
      messages: fullMessages,
      model,
      expectJson: false,
      maxTokens: 2000
    });

    await logAI({
      projectId,
      endpoint: 'chat',
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costVnd: result.costVnd,
      durationMs: result.durationMs
    });

    res.status(200).json({
      ok: true,
      reply: result.text,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costVnd: result.costVnd
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
