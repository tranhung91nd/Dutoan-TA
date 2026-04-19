window.Pages = window.Pages || {};

Pages.Legal = async function () {
  const docs = await API.legalDocs();

  const byType = { QH: [], ND: [], TT: [], QD: [] };
  docs.forEach(d => { (byType[d.doc_type] || (byType[d.doc_type] = [])).push(d); });

  const typeLabel = { QH: 'Luật (Quốc hội)', ND: 'Nghị định', TT: 'Thông tư', QD: 'Quyết định' };

  return `
    <div class="page-title">Thư viện pháp lý</div>
    <div class="page-sub">Các văn bản AI sử dụng để đối chiếu và trích dẫn khi phân tích đề tài.</div>

    <div class="btn-row" style="margin-bottom:16px;">
      <button class="btn btn-primary" onclick="Pages.openLegalModal()">+ Thêm văn bản</button>
      <button class="btn btn-ghost btn-sm" onclick="App.render()">↻ Làm mới</button>
    </div>

    ${Object.entries(byType).filter(([, v]) => v.length).map(([type, list]) => `
      <div class="section-title" style="font-size:14px;">${typeLabel[type] || type} <span style="color:var(--tx3);font-weight:400;">(${list.length})</span></div>
      <div class="table-wrap" style="margin-bottom:16px;">
        <table>
          <thead><tr>
            <th style="width:140px;">Số văn bản</th>
            <th>Tiêu đề</th>
            <th style="width:160px;">Cơ quan ban hành</th>
            <th style="width:110px;">Ngày</th>
            <th style="width:180px;">Áp dụng cho</th>
            <th style="width:80px;"></th>
          </tr></thead>
          <tbody>
            ${list.map(d => `
              <tr>
                <td class="mono" style="font-weight:600;">${U.esc(d.doc_number)}</td>
                <td>${U.esc(d.title)}</td>
                <td>${U.esc(d.issuer || '—')}</td>
                <td class="mono">${U.fmtDate(d.issue_date)}</td>
                <td>
                  <div class="chips">
                    ${(d.applicable_fields || []).map(f => `<span class="chip">${U.fieldName(f)}</span>`).join('')}
                  </div>
                </td>
                <td>
                  ${d.file_path ? `<button class="btn btn-ghost btn-sm" onclick="Pages.viewLegal('${d.id}')">Xem</button>` : '<span style="font-size:11px;color:var(--tx3);">chưa có file</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  `;
};

Pages.openLegalModal = function () {
  U.modal('Thêm văn bản pháp lý', `
    <form id="legal-form">
      <div class="form-row">
        <div class="form-group">
          <label>Số văn bản *</label>
          <input type="text" name="doc_number" placeholder="02/2015/TT-BLĐTBXH" required>
        </div>
        <div class="form-group">
          <label>Loại *</label>
          <select name="doc_type" required>
            <option value="TT">Thông tư</option>
            <option value="ND">Nghị định</option>
            <option value="QH">Luật (Quốc hội)</option>
            <option value="QD">Quyết định</option>
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>Tiêu đề *</label>
        <input type="text" name="title" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Cơ quan ban hành</label>
          <input type="text" name="issuer" placeholder="Bộ Tài chính">
        </div>
        <div class="form-group">
          <label>Ngày ban hành</label>
          <input type="date" name="issue_date">
        </div>
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>Áp dụng cho lĩnh vực</label>
        <div class="chips">
          <label class="chip"><input type="checkbox" name="fields" value="khcn" style="margin-right:4px;">KHCN</label>
          <label class="chip"><input type="checkbox" name="fields" value="cds" style="margin-right:4px;">Chuyển đổi số</label>
          <label class="chip"><input type="checkbox" name="fields" value="mt" style="margin-right:4px;">Môi trường</label>
        </div>
      </div>
      <div class="form-group">
        <label>File văn bản (PDF/DOCX)</label>
        <input type="file" name="file" accept=".pdf,.docx">
      </div>
    </form>
  `, `
    <button class="btn btn-ghost" onclick="U.closeModal()">Huỷ</button>
    <button class="btn btn-primary" onclick="Pages.submitLegal()">Thêm</button>
  `);
};

Pages.submitLegal = async function () {
  const form = document.getElementById('legal-form');
  const fd = new FormData(form);
  const fields = Array.from(form.querySelectorAll('[name=fields]:checked')).map(x => x.value);
  const payload = {
    doc_number: fd.get('doc_number'),
    doc_type: fd.get('doc_type'),
    title: fd.get('title'),
    issuer: fd.get('issuer'),
    issue_date: fd.get('issue_date') || null,
    applicable_fields: fields
  };
  try {
    await API.createLegalDoc(payload);
    U.toast('Đã thêm văn bản');
    U.closeModal();
    App.render();
  } catch (e) {
    U.toast('Lỗi: ' + e.message, false);
  }
};

Pages.viewLegal = function (id) {
  U.toast('Tính năng xem file đang phát triển');
};
