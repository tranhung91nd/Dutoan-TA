window.Pages = window.Pages || {};

Pages.Overview = async function () {
  const [projects, legal, fields] = await Promise.all([
    API.projects(), API.legalDocs(), API.fields()
  ]);

  const total = projects.length;
  const analyzing = projects.filter(p => p.status === 'analyzing').length;
  const analyzed = projects.filter(p => p.status === 'analyzed' || p.status === 'reviewed').length;
  const totalBudget = projects.reduce((s, p) => s + (Number(p.total_budget) || 0), 0);

  const recent = projects.slice(0, 5);

  return `
    <div class="page-title">Tổng quan</div>
    <div class="page-sub">Hệ thống hỗ trợ phân tích đề tài NCKH: căn cứ pháp lý, đánh giá dự toán và xuất phiếu đánh giá theo mẫu.</div>

    <div class="kpi-grid kpi-4">
      <div class="kpi">
        <div class="kpi-label">Tổng đề tài</div>
        <div class="kpi-value">${total}</div>
        <div class="kpi-note">${analyzing} đang phân tích · ${analyzed} đã xong</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Tổng kinh phí</div>
        <div class="kpi-value">${U.fmtShort(totalBudget)}</div>
        <div class="kpi-note">${U.fmt(totalBudget)} VND</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Văn bản pháp lý</div>
        <div class="kpi-value">${legal.length}</div>
        <div class="kpi-note">Thư viện đang áp dụng</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Lĩnh vực</div>
        <div class="kpi-value">${fields.length}</div>
        <div class="kpi-note">KHCN · CĐS · Môi trường</div>
      </div>
    </div>

    <div class="section-title">
      <span>Đề tài gần đây</span>
      <button class="btn btn-primary btn-sm" onclick="App.go('projects')">+ Đề tài mới</button>
    </div>

    ${recent.length === 0 ? `
      <div class="card">
        <div class="empty">
          <div class="ei">📋</div>
          <div class="et">Chưa có đề tài nào</div>
          <div class="es">Bấm "+ Đề tài mới" để bắt đầu phân tích</div>
        </div>
      </div>
    ` : `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Mã</th><th>Tên đề tài</th><th>Lĩnh vực</th>
            <th style="text-align:right;">Kinh phí</th>
            <th>Tình trạng</th><th>Ngày tạo</th>
          </tr></thead>
          <tbody>
            ${recent.map(p => `
              <tr style="cursor:pointer;" onclick="App.go('projectDetail',{id:'${p.id}'})">
                <td class="mono" style="font-weight:600;">${U.esc(p.project_code || '—')}</td>
                <td style="max-width:360px;">${U.esc(p.title)}</td>
                <td><span class="badge b-${U.fieldColor(p.field_code)}">${U.fieldName(p.field_code)}</span></td>
                <td class="mono" style="text-align:right;font-weight:600;">${U.fmtShort(p.total_budget)}</td>
                <td>${U.statusBadge(p.status)}</td>
                <td class="mono">${U.fmtDate(p.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}

    <div class="section-title" style="margin-top:28px;">Quy trình 4 bước</div>
    <div class="kpi-grid kpi-4">
      <div class="card">
        <div style="font-size:11px;color:var(--blue-tx);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Bước 1</div>
        <div style="font-size:15px;font-weight:700;margin:6px 0 4px;">Upload đề tài</div>
        <div style="font-size:12px;color:var(--tx3);">Thuyết minh (PDF/DOCX) + Dự toán (XLSX)</div>
      </div>
      <div class="card">
        <div style="font-size:11px;color:var(--blue-tx);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Bước 2</div>
        <div style="font-size:15px;font-weight:700;margin:6px 0 4px;">Phân tích pháp lý</div>
        <div style="font-size:12px;color:var(--tx3);">Trích dẫn điều/khoản + footnote</div>
      </div>
      <div class="card">
        <div style="font-size:11px;color:var(--blue-tx);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Bước 3</div>
        <div style="font-size:15px;font-weight:700;margin:6px 0 4px;">Đánh giá dự toán</div>
        <div style="font-size:12px;color:var(--tx3);">Tổng · từng dòng · tỷ lệ</div>
      </div>
      <div class="card">
        <div style="font-size:11px;color:var(--blue-tx);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Bước 4</div>
        <div style="font-size:15px;font-weight:700;margin:6px 0 4px;">Xuất phiếu đánh giá</div>
        <div style="font-size:12px;color:var(--tx3);">MẪU 05 + Freestyle họp</div>
      </div>
    </div>
  `;
};
