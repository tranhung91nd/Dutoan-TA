window.Pages = window.Pages || {};

Pages.Projects = async function () {
  const [projects, fields] = await Promise.all([API.projects(), API.fields()]);

  return `
    <div class="page-title">Đề tài nghiên cứu</div>
    <div class="page-sub">Quản lý đề tài: upload thuyết minh & dự toán để AI phân tích pháp lý và định mức.</div>

    <div class="btn-row" style="margin-bottom:16px;">
      <button class="btn btn-primary" onclick="Pages.openUploadModal()">+ Upload đề tài mới</button>
      <button class="btn btn-ghost btn-sm" onclick="App.render()">↻ Làm mới</button>
    </div>

    ${projects.length === 0 ? `
      <div class="card">
        <div class="empty">
          <div class="ei">📁</div>
          <div class="et">Chưa có đề tài nào</div>
          <div class="es">Bấm "+ Upload đề tài mới" để bắt đầu</div>
        </div>
      </div>
    ` : `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th style="width:110px;">Mã</th>
            <th>Tên đề tài</th>
            <th style="width:140px;">Lĩnh vực</th>
            <th style="width:140px;text-align:right;">Kinh phí</th>
            <th style="width:80px;text-align:center;">Tháng</th>
            <th style="width:130px;">Tình trạng</th>
            <th style="width:100px;">Ngày tạo</th>
            <th style="width:80px;"></th>
          </tr></thead>
          <tbody>
            ${projects.map(p => `
              <tr>
                <td class="mono" style="font-weight:600;">${U.esc(p.project_code || '—')}</td>
                <td style="cursor:pointer;" onclick="App.go('projectDetail',{id:'${p.id}'})">
                  <div style="font-weight:600;color:var(--blue);">${U.esc(p.title)}</div>
                  <div style="font-size:11px;color:var(--tx3);margin-top:2px;">${U.esc(p.owner_name || '')} · ${U.esc(p.organization || '')}</div>
                </td>
                <td><span class="badge b-${U.fieldColor(p.field_code)}">${U.fieldName(p.field_code)}</span></td>
                <td class="mono" style="text-align:right;font-weight:600;">${U.fmt(p.total_budget)}</td>
                <td class="mono" style="text-align:center;">${p.duration_months || '—'}</td>
                <td>${U.statusBadge(p.status)}</td>
                <td class="mono">${U.fmtDate(p.created_at)}</td>
                <td><button class="btn btn-ghost btn-sm" onclick="App.go('projectDetail',{id:'${p.id}'})">Xem</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
};

Pages.openUploadModal = async function () {
  const fields = await API.fields();
  const fieldOpts = fields.map(f => `<option value="${f.code}">${U.esc(f.name)}</option>`).join('');
  U.modal('Upload đề tài mới', `
    <form id="upload-form">
      <div class="form-row">
        <div class="form-group">
          <label>Mã đề tài</label>
          <input type="text" name="project_code" placeholder="NV-2025-001" required>
        </div>
        <div class="form-group">
          <label>Lĩnh vực <span style="color:var(--red);">*</span></label>
          <select name="field_code" required>${fieldOpts}</select>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label>Tên đề tài <span style="color:var(--red);">*</span></label>
        <input type="text" name="title" required placeholder="Nghiên cứu ứng dụng...">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Chủ nhiệm</label>
          <input type="text" name="owner_name">
        </div>
        <div class="form-group">
          <label>Cơ quan chủ trì</label>
          <input type="text" name="organization">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Tổng kinh phí (VND)</label>
          <input type="number" name="total_budget" placeholder="850000000">
        </div>
        <div class="form-group">
          <label>Thời gian (tháng)</label>
          <input type="number" name="duration_months" placeholder="18">
        </div>
      </div>

      <div class="section-title" style="font-size:14px;margin-top:20px;">Tệp đính kèm</div>
      <div class="form-group" style="margin-bottom:10px;">
        <label>Thuyết minh đề tài (PDF hoặc DOCX)</label>
        <input type="file" name="proposal" accept=".pdf,.docx">
      </div>
      <div class="form-group" style="margin-bottom:10px;">
        <label>Dự toán chi tiết (XLSX)</label>
        <input type="file" name="budget" accept=".xlsx,.xls">
      </div>
    </form>
  `, `
    <button class="btn btn-ghost" onclick="U.closeModal()">Huỷ</button>
    <button class="btn btn-primary" id="btn-upload" onclick="Pages.submitUpload()">Tạo đề tài & phân tích</button>
  `);
};

Pages.submitUpload = async function () {
  const form = document.getElementById('upload-form');
  const fd = new FormData(form);
  const btn = document.getElementById('btn-upload');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Đang tạo...';

  try {
    // Nếu có API backend → upload qua /api/upload
    // Nếu không → tạo record với Supabase client trực tiếp (hoặc demo)
    if (API.hasDB() && (fd.get('proposal').size > 0 || fd.get('budget').size > 0)) {
      const res = await API.upload(fd);
      U.toast('Upload thành công! Đang phân tích...');
      U.closeModal();
      App.go('projectDetail', { id: res.projectId });
    } else {
      // Không có file → chỉ tạo record
      const payload = {
        project_code: fd.get('project_code'),
        title: fd.get('title'),
        field_code: fd.get('field_code'),
        owner_name: fd.get('owner_name'),
        organization: fd.get('organization'),
        total_budget: fd.get('total_budget') ? Number(fd.get('total_budget')) : null,
        duration_months: fd.get('duration_months') ? Number(fd.get('duration_months')) : null,
        status: 'draft'
      };
      const p = await API.createProject(payload);
      U.toast('Tạo đề tài thành công');
      U.closeModal();
      App.go('projectDetail', { id: p.id });
    }
  } catch (e) {
    console.error(e);
    U.toast('Lỗi: ' + e.message, false);
    btn.disabled = false;
    btn.textContent = 'Tạo đề tài & phân tích';
  }
};
