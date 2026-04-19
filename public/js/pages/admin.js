window.Pages = window.Pages || {};

Pages.Admin = async function () {
  const cfg = await API.init();
  const hasKey = cfg && cfg.hasOpenAIKey;
  const hasDB = API.hasDB();

  const USD_VND = 25500;
  const ENDPOINT_LABELS = {
    'analyze.legal':     { name: 'Căn cứ pháp lý',    color: 'teal'   },
    'analyze.budget':    { name: 'Đánh giá dự toán',  color: 'blue'   },
    'analyze.form_05':   { name: 'Phiếu MẪU 05',      color: 'purple' },
    'analyze.freestyle': { name: 'Phiếu trao đổi họp', color: 'pink'   },
    'chat':              { name: 'Trợ lý AI (chat)',  color: 'amber'  }
  };

  // Aggregate logs theo endpoint
  const stats = {};
  let totalCost = 0, totalCalls = 0, totalTokens = 0;
  if (hasDB) {
    try {
      const { data: logs } = await API.getClient().from('ai_logs')
        .select('endpoint, cost_vnd, input_tokens, output_tokens, duration_ms, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
      for (const l of (logs || [])) {
        const key = l.endpoint || 'unknown';
        if (!stats[key]) stats[key] = { count: 0, cost: 0, input: 0, output: 0, duration: 0, last: null };
        const cost = Number(l.cost_vnd) || 0;
        const inp  = Number(l.input_tokens) || 0;
        const out  = Number(l.output_tokens) || 0;
        stats[key].count++;
        stats[key].cost += cost;
        stats[key].input += inp;
        stats[key].output += out;
        stats[key].duration += Number(l.duration_ms) || 0;
        if (!stats[key].last) stats[key].last = l.created_at;
        totalCost += cost; totalCalls++; totalTokens += inp + out;
      }
    } catch (e) { /* no table yet */ }
  }

  const totalUsd = totalCost / USD_VND;

  const MODELS = [
    { value: 'gpt-5',        label: 'gpt-5 — $1.25/$10 · cao cấp' },
    { value: 'gpt-5-mini',   label: 'gpt-5-mini — $0.25/$2 · mặc định' },
    { value: 'gpt-5-nano',   label: 'gpt-5-nano — $0.05/$0.40 · siêu rẻ' },
    { value: 'gpt-5.4',      label: 'gpt-5.4 — $2.5/$15 · flagship mới' },
    { value: 'gpt-5.4-mini', label: 'gpt-5.4-mini — $0.75/$4.50 · ctx 400K' },
    { value: 'gpt-4o',       label: 'gpt-4o — $2.5/$10' },
    { value: 'gpt-4o-mini',  label: 'gpt-4o-mini — $0.15/$0.60' },
    { value: 'gpt-4.1',      label: 'gpt-4.1 — $2/$8' },
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini — $0.40/$1.60' }
  ];

  const MODULES = [
    { key: 'legal',     name: 'Căn cứ pháp lý',   desc: 'Trích điều/khoản chính xác, cần chất lượng cao' },
    { key: 'budget',    name: 'Đánh giá dự toán', desc: 'Phân tích số liệu + định mức, context lớn' },
    { key: 'form_05',   name: 'Phiếu MẪU 05',     desc: 'Văn phong hành chính chuẩn' },
    { key: 'freestyle', name: 'Phiếu trao đổi họp', desc: 'Câu hỏi sắc bén, có thể dùng model rẻ' },
    { key: 'chat',      name: 'Trợ lý AI (chat)', desc: 'Hội thoại ngắn, ưu tiên tốc độ & giá' }
  ];

  const selectOptions = (current) => MODELS.map(m =>
    `<option value="${m.value}" ${m.value === current ? 'selected' : ''}>${U.esc(m.label)}</option>`
  ).join('');

  return `
    <div class="page-title">Cài đặt</div>
    <div class="page-sub">Trạng thái hệ thống, kết nối, và chọn model AI cho từng module.</div>

    <div class="section-title" style="font-size:14px;">Kết nối</div>
    <div class="kpi-grid kpi-2">
      <div class="card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <div style="width:10px;height:10px;border-radius:50%;background:var(--${hasDB ? 'green' : 'red'});"></div>
          <div style="font-weight:700;">Supabase</div>
        </div>
        <div style="font-size:12px;color:var(--tx2);">
          ${hasDB
            ? `Đã kết nối: <span class="mono">${U.esc(cfg.supabaseUrl)}</span>`
            : 'Chưa cấu hình. Cần set <span class="mono">SUPABASE_URL</span> và <span class="mono">SUPABASE_ANON_KEY</span> trong Vercel Environment.'}
        </div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <div style="width:10px;height:10px;border-radius:50%;background:var(--${hasKey ? 'green' : 'red'});"></div>
          <div style="font-weight:700;">OpenAI</div>
        </div>
        <div style="font-size:12px;color:var(--tx2);">
          ${hasKey
            ? `API key đã cấu hình (chỉ lưu ở server, không expose ra client).`
            : 'Chưa có API key. Set <span class="mono">OPENAI_API_KEY</span> trong Vercel Environment.'}
        </div>
      </div>
    </div>

    <div class="section-title" style="font-size:14px;margin-top:24px;">Chi phí OpenAI theo từng module</div>
    <div class="kpi-grid kpi-3" style="margin-bottom:12px;">
      <div class="kpi">
        <div class="kpi-label">Tổng chi phí</div>
        <div class="kpi-value">${U.fmt(Math.round(totalCost))}</div>
        <div class="kpi-note">VND · ≈ $${totalUsd.toFixed(4)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Tổng lượt gọi</div>
        <div class="kpi-value">${U.fmt(totalCalls)}</div>
        <div class="kpi-note">${totalCalls > 0 ? 'TB ' + U.fmt(Math.round(totalCost / totalCalls)) + ' VND/lần' : 'chưa có dữ liệu'}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Tổng token</div>
        <div class="kpi-value">${U.fmtShort(totalTokens)}</div>
        <div class="kpi-note">Input + Output</div>
      </div>
    </div>

    <div class="table-wrap" style="margin-bottom:20px;">
      <table>
        <thead><tr>
          <th>Module</th>
          <th style="text-align:right;width:80px;">Số lần</th>
          <th style="text-align:right;width:130px;">Tổng chi phí</th>
          <th style="text-align:right;width:130px;">TB/lần</th>
          <th style="text-align:right;width:100px;">USD</th>
          <th style="text-align:right;width:120px;">Tokens (in/out)</th>
          <th style="text-align:right;width:100px;">TB thời gian</th>
        </tr></thead>
        <tbody>
          ${Object.keys(ENDPOINT_LABELS).map(key => {
            const s = stats[key] || { count: 0, cost: 0, input: 0, output: 0, duration: 0 };
            const label = ENDPOINT_LABELS[key];
            const avg = s.count ? Math.round(s.cost / s.count) : 0;
            const avgMs = s.count ? Math.round(s.duration / s.count) : 0;
            return `
              <tr>
                <td><span class="badge b-${label.color}">${U.esc(label.name)}</span></td>
                <td class="mono" style="text-align:right;">${U.fmt(s.count)}</td>
                <td class="mono" style="text-align:right;font-weight:600;">${U.fmt(Math.round(s.cost))}</td>
                <td class="mono" style="text-align:right;">${s.count ? U.fmt(avg) : '—'}</td>
                <td class="mono" style="text-align:right;color:var(--tx3);">${s.cost ? '$' + (s.cost / USD_VND).toFixed(4) : '—'}</td>
                <td class="mono" style="text-align:right;font-size:11px;">${U.fmtShort(s.input)} / ${U.fmtShort(s.output)}</td>
                <td class="mono" style="text-align:right;color:var(--tx3);">${avgMs ? (avgMs / 1000).toFixed(1) + 's' : '—'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="font-size:11px;color:var(--tx3);margin-bottom:20px;">
      Tỷ giá quy đổi: 1 USD = ${U.fmt(USD_VND)} VND. Cập nhật từ Supabase table <code>ai_logs</code>. Xem log chi tiết ở trang <strong>Logs AI</strong>.
    </div>

    <div class="section-title" style="font-size:14px;margin-top:24px;">Chọn model AI cho từng module</div>
    <div class="card" style="margin-bottom:16px;">
      <div style="font-size:12px;color:var(--tx2);margin-bottom:12px;">
        Thay đổi áp dụng ngay cho các lần chạy sau. Lưu trong trình duyệt của bạn.
      </div>
      <div class="model-grid" id="model-grid">
        ${MODULES.map(mod => `
          <div class="model-row">
            <div class="model-row-label">${U.esc(mod.name)}</div>
            <div class="model-row-desc">${U.esc(mod.desc)}</div>
            <select data-module="${mod.key}" onchange="API.Settings.setModel(this.dataset.module, this.value); U.toast('Đã lưu: ' + this.value);">
              ${selectOptions(API.Settings.getModel(mod.key))}
            </select>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:12px;text-align:right;">
        <button class="btn btn-ghost" onclick="if(confirm('Reset tất cả về gpt-5-mini?')){API.Settings.resetAll();App.go('admin');U.toast('Đã reset');}">Reset mặc định</button>
      </div>
    </div>

    <div class="section-title" style="font-size:14px;margin-top:24px;">Hướng dẫn cấu hình Vercel</div>
    <div class="card">
      <div class="prose">
        <ol>
          <li>Vào <strong>Vercel Dashboard</strong> → chọn project → <strong>Settings</strong> → <strong>Environment Variables</strong></li>
          <li>Thêm các biến:
            <ul>
              <li><code>OPENAI_API_KEY</code> — từ <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a></li>
              <li><code>SUPABASE_URL</code> — URL project Supabase</li>
              <li><code>SUPABASE_ANON_KEY</code> — anon public key</li>
              <li><code>SUPABASE_SERVICE_ROLE_KEY</code> — service role (dùng ở serverless function)</li>
            </ul>
          </li>
          <li>Sau khi thêm, bấm <strong>Redeploy</strong> để biến có hiệu lực</li>
        </ol>
      </div>
    </div>

    <div class="section-title" style="font-size:14px;margin-top:24px;">Giá OpenAI API (tham khảo 2025)</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Model</th><th>Dùng cho</th><th style="text-align:right;">Input / 1M tokens</th><th style="text-align:right;">Output / 1M tokens</th><th style="text-align:right;">VND/lần phân tích*</th></tr></thead>
        <tbody>
          <tr>
            <td class="mono">gpt-5-mini</td>
            <td>Phân tích pháp lý, dự toán (mặc định)</td>
            <td class="mono" style="text-align:right;">$0.25</td>
            <td class="mono" style="text-align:right;">$2</td>
            <td class="mono" style="text-align:right;font-weight:600;">~1-3K</td>
          </tr>
          <tr>
            <td class="mono">gpt-5</td>
            <td>Upgrade khi cần độ chính xác cao</td>
            <td class="mono" style="text-align:right;">$1.25</td>
            <td class="mono" style="text-align:right;">$10</td>
            <td class="mono" style="text-align:right;font-weight:600;">~5-10K</td>
          </tr>
          <tr>
            <td class="mono">gpt-4o-mini</td>
            <td>Phân loại lĩnh vực, tóm tắt</td>
            <td class="mono" style="text-align:right;">$0.15</td>
            <td class="mono" style="text-align:right;">$0.60</td>
            <td class="mono" style="text-align:right;font-weight:600;">~0.5-2K</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="font-size:11px;color:var(--tx3);margin-top:8px;">* Ước tính cho 1 đề tài ~30 trang thuyết minh + 1 dự toán. OpenAI tự động cache prompt ≥1024 tokens (giảm ~50% chi phí input khi gọi lại trong 5-10 phút).</div>
  `;
};
