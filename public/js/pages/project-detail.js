window.Pages = window.Pages || {};

Pages._currentTab = 'legal';

Pages.ProjectDetail = async function (id) {
  const [p, analyses] = await Promise.all([API.projectById(id), API.analysesByProject(id)]);
  if (!p) return `<div class="error-box">Không tìm thấy đề tài</div>`;

  const tabs = ['legal', 'budget', 'form_05', 'freestyle'];
  const tabLabels = {
    legal:     'Căn cứ pháp lý',
    budget:    'Đánh giá dự toán',
    form_05:   'Phiếu MẪU 05',
    freestyle: 'Phiếu trao đổi họp'
  };

  // Mới nhất của mỗi loại
  const byType = {};
  analyses.forEach(a => { if (!byType[a.analysis_type]) byType[a.analysis_type] = a; });

  const curTab = Pages._currentTab;

  let tabContent = '';
  const a = byType[curTab];

  if (!a) {
    tabContent = `
      <div class="empty">
        <div class="ei">🤖</div>
        <div class="et">Chưa có phân tích</div>
        <div class="es">Bấm "Chạy phân tích" để AI xử lý</div>
        <div style="margin-top:16px;"><button class="btn btn-primary" onclick="Pages.runAnalysis('${id}','${curTab}')">▶ Chạy phân tích ${tabLabels[curTab]}</button></div>
      </div>
    `;
  } else {
    tabContent = Pages.renderAnalysis(a);
  }

  return `
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
      <button class="btn btn-ghost btn-sm" onclick="App.go('projects')">← Đề tài</button>
      ${U.statusBadge(p.status)}
    </div>
    <div class="page-title">${U.esc(p.title)}</div>
    <div class="page-sub">
      <span class="mono" style="font-weight:600;">${U.esc(p.project_code || '—')}</span>
      · <span class="badge b-${U.fieldColor(p.field_code)}">${U.fieldName(p.field_code)}</span>
      · ${U.esc(p.owner_name || 'Chưa có chủ nhiệm')}
      · ${U.esc(p.organization || '')}
    </div>

    <div class="kpi-grid kpi-3">
      <div class="kpi">
        <div class="kpi-label">Tổng kinh phí</div>
        <div class="kpi-value">${U.fmtShort(p.total_budget)}</div>
        <div class="kpi-note">${U.fmt(p.total_budget)} VND</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Thời gian</div>
        <div class="kpi-value">${p.duration_months || '—'}</div>
        <div class="kpi-note">Tháng</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Đã phân tích</div>
        <div class="kpi-value">${Object.keys(byType).length}/4</div>
        <div class="kpi-note">Module AI</div>
      </div>
    </div>

    <div class="tab-bar" style="margin-top:20px;">
      ${tabs.map(t => `
        <button class="${t === curTab ? 'active' : ''}" onclick="Pages.switchTab('${id}','${t}')">
          ${tabLabels[t]}${byType[t] ? ' ✓' : ''}
        </button>
      `).join('')}
    </div>

    <div class="card">${tabContent}</div>
  `;
};

Pages.switchTab = function (id, tab) {
  Pages._currentTab = tab;
  App.go('projectDetail', { id });
};

Pages.renderAnalysis = function (a) {
  const r = a.result_json || {};
  const md = a.result_markdown || '';
  const citations = a.citations || [];
  const warnings = a.warnings || [];

  let html = '';

  // Warnings ở đầu
  if (warnings.length) {
    html += warnings.map(w => `
      <div class="${w.level === 'error' ? 'error-box' : 'warning'}">
        <strong>${w.level === 'error' ? '❌ Lỗi' : '⚠ Cảnh báo'}:</strong> ${U.esc(w.message)}
        ${w.source ? `<div style="font-size:11px;margin-top:4px;opacity:0.8;">Nguồn: ${U.esc(w.source)}</div>` : ''}
      </div>
    `).join('');
  }

  // Markdown content (AI output)
  if (md) {
    html += `<div class="prose">${marked.parse(md)}</div>`;
  }

  // Budget table (nếu là budget analysis)
  if (a.analysis_type === 'budget' && r.rows && Array.isArray(r.rows)) {
    html += `
      <div class="section-title" style="font-size:14px;margin-top:24px;">Chi tiết dự toán theo dòng</div>
      <div class="table-wrap">
        <table class="budget-table">
          <thead><tr>
            <th>Mục</th><th>Đơn vị</th><th>SL</th>
            <th>Đơn giá</th><th>Thành tiền</th>
            <th>Căn cứ</th><th>Đánh giá</th>
          </tr></thead>
          <tbody>
            ${r.rows.map(x => {
              const cls = x.status === 'error' ? 'budget-row-err' : (x.status === 'warn' ? 'budget-row-warn' : '');
              return `<tr class="${cls}">
                <td>${U.esc(x.item || '')}</td>
                <td>${U.esc(x.unit || '')}</td>
                <td class="mono">${U.esc(x.qty || '')}</td>
                <td class="mono">${U.fmt(x.unit_price)}</td>
                <td class="mono" style="font-weight:600;">${U.fmt(x.total)}</td>
                <td style="font-size:11px;color:var(--tx3);">${U.esc(x.basis || '')}</td>
                <td style="font-size:12px;">${U.esc(x.note || '')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Citations/footnotes
  if (citations.length) {
    html += `
      <div class="footnotes">
        <strong>Căn cứ pháp lý đã trích dẫn:</strong>
        <ol>
          ${citations.map(c => `
            <li>
              <strong>${U.esc(c.doc)}</strong>${c.article ? ', ' + U.esc(c.article) : ''}${c.clause ? ', ' + U.esc(c.clause) : ''}${c.point ? ', ' + U.esc(c.point) : ''}
              ${c.text ? `<div style="color:var(--tx3);margin-top:2px;">"${U.esc(c.text)}"</div>` : ''}
            </li>
          `).join('')}
        </ol>
      </div>
    `;
  }

  // Actions
  html += `
    <div class="btn-row" style="margin-top:20px;">
      <button class="btn btn-ghost btn-sm" onclick="Pages.runAnalysis('${a.project_id}','${a.analysis_type}')">↻ Chạy lại</button>
      ${(a.analysis_type === 'form_05' || a.analysis_type === 'freestyle')
        ? `<button class="btn btn-green btn-sm" onclick="Pages.exportForm('${a.project_id}','${a.analysis_type}')">📄 Xuất Word</button>` : ''}
      <span style="margin-left:auto;font-size:11px;color:var(--tx3);align-self:center;">
        ${a.model || ''} · ${a.input_tokens || 0}+${a.output_tokens || 0} tokens · ${U.fmt(a.cost_vnd)} VND
      </span>
    </div>
  `;

  return html;
};

Pages.runAnalysis = async function (projectId, type) {
  const pageEl = document.getElementById('page');
  pageEl.innerHTML = `<div class="loading">Đang gọi AI phân tích (${type}). Có thể mất 30-60 giây...</div>`;
  try {
    await API.analyze(projectId, type);
    U.toast('Phân tích xong!');
    App.go('projectDetail', { id: projectId });
  } catch (e) {
    U.toast('Lỗi: ' + e.message, false);
    App.go('projectDetail', { id: projectId });
  }
};

Pages.exportForm = async function (projectId, formType) {
  U.toast('Đang tạo file Word...');
  try {
    const blob = await API.generateForm(projectId, formType);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phieu_${formType}_${projectId}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    U.toast('Đã tải xuống!');
  } catch (e) {
    U.toast('Lỗi: ' + e.message, false);
  }
};
