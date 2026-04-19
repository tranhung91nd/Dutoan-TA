window.Pages = window.Pages || {};

Pages.Norms = async function () {
  const norms = await API.norms();

  const byCategory = {};
  norms.forEach(n => { (byCategory[n.category] || (byCategory[n.category] = [])).push(n); });

  const catLabel = {
    cong_lao_dong:  'Công lao động / Thù lao',
    hoi_thao:       'Hội thảo / Họp',
    cong_tac_phi:   'Công tác phí',
    van_phong_pham: 'Văn phòng phẩm / Vật tư',
    thiet_bi:       'Thiết bị / Máy móc',
    khac:           'Khác'
  };

  return `
    <div class="page-title">Định mức chi tiêu</div>
    <div class="page-sub">Định mức chi theo văn bản nhà nước (Thông tư 94/2024, 31/2023, 02/2015...). AI dùng các mức này để đánh giá dự toán.</div>

    <div class="btn-row" style="margin-bottom:16px;">
      <button class="btn btn-primary btn-sm">+ Thêm định mức</button>
      <button class="btn btn-ghost btn-sm">↻ Đồng bộ từ văn bản</button>
    </div>

    ${norms.length === 0 ? `
      <div class="card"><div class="empty">
        <div class="ei">💰</div>
        <div class="et">Chưa có định mức</div>
        <div class="es">Chạy seed_legal_docs.sql để load định mức mẫu</div>
      </div></div>
    ` : Object.entries(byCategory).map(([cat, list]) => `
      <div class="section-title" style="font-size:14px;">${catLabel[cat] || cat} <span style="color:var(--tx3);font-weight:400;">(${list.length})</span></div>
      <div class="table-wrap" style="margin-bottom:16px;">
        <table>
          <thead><tr>
            <th>Mô tả</th>
            <th style="text-align:right;width:140px;">Mức tối đa</th>
            <th style="width:160px;">Đơn vị</th>
            <th style="width:200px;">Nguồn</th>
            <th style="width:200px;">Áp dụng</th>
          </tr></thead>
          <tbody>
            ${list.map(n => `
              <tr>
                <td>${U.esc(n.description)}</td>
                <td class="mono" style="text-align:right;font-weight:600;color:var(--green-tx);">${U.fmt(n.amount_max)}</td>
                <td style="font-size:12px;color:var(--tx2);">${U.esc(n.unit)}</td>
                <td class="mono" style="font-size:12px;">
                  <div style="font-weight:600;">${U.esc(n.source_doc)}</div>
                  <div style="color:var(--tx3);">${U.esc(n.source_article || '')}</div>
                </td>
                <td>
                  <div class="chips">
                    ${(n.applicable_fields || []).map(f => `<span class="chip">${U.fieldName(f)}</span>`).join('') || '<span style="font-size:11px;color:var(--tx3);">Tất cả</span>'}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  `;
};
