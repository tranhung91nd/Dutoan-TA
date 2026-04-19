window.Pages = window.Pages || {};

Pages.Logs = async function () {
  let logs = [];
  try {
    if (API.hasDB()) {
      const { data } = await API.getClient().from('ai_logs').select('*').order('created_at', { ascending: false }).limit(100);
      logs = data || [];
    }
  } catch (e) {}

  const total_cost = logs.reduce((s, l) => s + (Number(l.cost_vnd) || 0), 0);
  const total_tokens = logs.reduce((s, l) => s + (Number(l.input_tokens) || 0) + (Number(l.output_tokens) || 0), 0);

  return `
    <div class="page-title">Logs AI</div>
    <div class="page-sub">Theo dõi các lần gọi OpenAI API: chi phí, token, thời gian.</div>

    <div class="kpi-grid kpi-3">
      <div class="kpi">
        <div class="kpi-label">Lượt gọi AI</div>
        <div class="kpi-value">${logs.length}</div>
        <div class="kpi-note">100 gần nhất</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Tổng token</div>
        <div class="kpi-value">${U.fmtShort(total_tokens)}</div>
        <div class="kpi-note">Input + Output</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Chi phí ước tính</div>
        <div class="kpi-value">${U.fmt(total_cost)}</div>
        <div class="kpi-note">VND</div>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr>
          <th style="width:140px;">Thời gian</th>
          <th>Endpoint</th>
          <th style="width:160px;">Model</th>
          <th style="width:100px;text-align:right;">Input</th>
          <th style="width:100px;text-align:right;">Output</th>
          <th style="width:120px;text-align:right;">Chi phí</th>
          <th style="width:80px;text-align:right;">ms</th>
        </tr></thead>
        <tbody>
          ${logs.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:var(--tx3);padding:40px;">Chưa có log nào</td></tr>` :
          logs.map(l => `
            <tr>
              <td class="mono" style="font-size:11px;">${U.fmtDate(l.created_at)} ${new Date(l.created_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</td>
              <td class="mono" style="font-size:12px;">${U.esc(l.endpoint)}</td>
              <td style="font-size:12px;">${U.esc(l.model)}</td>
              <td class="mono" style="text-align:right;">${U.fmt(l.input_tokens)}</td>
              <td class="mono" style="text-align:right;">${U.fmt(l.output_tokens)}</td>
              <td class="mono" style="text-align:right;font-weight:600;">${U.fmt(l.cost_vnd)}</td>
              <td class="mono" style="text-align:right;color:var(--tx3);">${l.duration_ms || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};
