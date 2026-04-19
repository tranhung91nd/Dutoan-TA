window.Pages = window.Pages || {};

Pages.Fields = async function () {
  const [fields, legal] = await Promise.all([API.fields(), API.legalDocs()]);

  return `
    <div class="page-title">Lĩnh vực nghiên cứu</div>
    <div class="page-sub">3 lĩnh vực cơ bản của hệ thống. Mỗi lĩnh vực có prompt AI riêng và bộ văn bản pháp lý áp dụng.</div>

    <div class="kpi-grid kpi-3">
      ${fields.map(f => {
        const docs = legal.filter(d => (d.applicable_fields || []).includes(f.code));
        const color = U.fieldColor(f.code);
        return `
          <div class="card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <div style="width:10px;height:10px;border-radius:50%;background:var(--${color});"></div>
              <div style="font-size:16px;font-weight:700;">${U.esc(f.name)}</div>
            </div>
            <div style="font-size:12px;color:var(--tx3);margin-bottom:10px;">${U.esc(f.description || '')}</div>
            <div style="font-size:11px;color:var(--tx2);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Văn bản áp dụng (${docs.length})</div>
            <div style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto;">
              ${docs.map(d => `<div class="mono" style="font-size:12px;padding:4px 8px;background:var(--bg2);border-radius:8px;">${U.esc(d.doc_number)}</div>`).join('') || '<div style="font-size:12px;color:var(--tx3);">Chưa gán văn bản nào</div>'}
            </div>
            <div class="btn-row">
              <button class="btn btn-ghost btn-sm" onclick="Pages.editField('${f.code}')">Chỉnh prompt AI</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="section-title" style="margin-top:24px;">Gợi ý phân loại AI</div>
    <div class="card">
      <div class="prose">
        <p>Khi bạn upload đề tài mới, AI sẽ tự động phân loại vào 1 trong 3 lĩnh vực dựa vào:</p>
        <ul>
          <li><strong>KHCN</strong>: có từ khóa công nghệ, kỹ thuật, phát minh, sáng chế, R&D, nghiên cứu cơ bản/ứng dụng</li>
          <li><strong>Chuyển đổi số</strong>: có từ khóa số hóa, dữ liệu, hệ thống thông tin, chính phủ điện tử, AI, blockchain</li>
          <li><strong>Môi trường</strong>: có từ khóa ô nhiễm, khí thải, đa dạng sinh học, biến đổi khí hậu, tài nguyên, xử lý chất thải</li>
        </ul>
        <p>Nếu đề tài nằm ở ranh giới (ví dụ: "AI cảnh báo ô nhiễm" — vừa CĐS vừa MT), AI sẽ chọn lĩnh vực chính và gợi ý áp dụng văn bản chéo.</p>
      </div>
    </div>
  `;
};

Pages.editField = function (code) {
  U.toast('Tính năng chỉnh prompt AI đang phát triển');
};
