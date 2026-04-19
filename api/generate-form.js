// POST /api/generate-form { projectId, formType }
// Tạo file .docx từ kết quả phân tích form_05 / freestyle
const { sb } = require('../lib/supabase');
const { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { projectId, formType } = req.body || {};
  if (!projectId || !formType) return res.status(400).json({ error: 'Thiếu projectId hoặc formType' });

  const supabase = sb();
  if (!supabase) return res.status(500).json({ error: 'Chưa cấu hình Supabase' });

  try {
    const [{ data: project }, { data: analyses }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('analyses').select('*').eq('project_id', projectId).eq('analysis_type', formType).order('created_at', { ascending: false }).limit(1)
    ]);

    if (!project) return res.status(404).json({ error: 'Không tìm thấy đề tài' });
    const analysis = (analyses || [])[0];
    if (!analysis) return res.status(400).json({ error: 'Chưa có phân tích ' + formType + '. Chạy phân tích trước.' });

    const data = analysis.result_json || {};
    const doc = formType === 'form_05' ? buildForm05(project, data) : buildFreestyle(project, data);

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="phieu_${formType}_${projectId}.docx"`);
    res.status(200).send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};

// ─────────────── FORM 05 ───────────────
function buildForm05(project, d) {
  const P = (text, opts = {}) => new Paragraph({
    children: [new TextRun({ text, font: 'Times New Roman', size: opts.size || 26, bold: opts.bold, italics: opts.italic })],
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after || 120 }
  });

  const H = (text, level = HeadingLevel.HEADING_2) => new Paragraph({
    children: [new TextRun({ text, font: 'Times New Roman', size: 28, bold: true })],
    heading: level, spacing: { before: 240, after: 120 }
  });

  const section = (title, block) => {
    const b = block || {};
    return [
      H(title, HeadingLevel.HEADING_3),
      P(`Đánh giá: ${b.danh_gia || '—'}`, { bold: true }),
      P(b.nhan_xet || '—')
    ];
  };

  const children = [
    new Paragraph({
      children: [new TextRun({ text: 'MẪU 05 — PHIẾU ĐÁNH GIÁ ĐỀ TÀI', font: 'Times New Roman', size: 32, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 }
    }),
    new Paragraph({
      children: [new TextRun({ text: '(Kèm theo Thông tư/Quy định...)', font: 'Times New Roman', size: 22, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 }
    }),

    H('I. THÔNG TIN ĐỀ TÀI'),
    P(`Tên đề tài: ${project.title || ''}`, { bold: true }),
    P(`Mã đề tài: ${project.project_code || '—'}`),
    P(`Chủ nhiệm: ${project.owner_name || '—'}`),
    P(`Cơ quan chủ trì: ${project.organization || '—'}`),
    P(`Tổng kinh phí: ${(project.total_budget || 0).toLocaleString('vi-VN')} VND`),
    P(`Thời gian thực hiện: ${project.duration_months || '—'} tháng`),

    H('II. ĐÁNH GIÁ THEO TỪNG TIÊU CHÍ'),
    ...section('1. Tính cấp thiết',        d.tinh_cap_thiet),
    ...section('2. Mục tiêu',              d.muc_tieu),
    ...section('3. Nội dung nghiên cứu',   d.noi_dung),
    ...section('4. Phương pháp',           d.phuong_phap),
    ...section('5. Dự kiến sản phẩm',      d.san_pham),
    ...section('6. Khả năng thực hiện',    d.kha_nang_thuc_hien),
    ...section('7. Kinh phí',              d.kinh_phi),

    H('III. CÁC ĐIỂM CẦN BỔ SUNG / ĐIỀU CHỈNH'),
    ...(d.cac_diem_can_bo_sung || []).map((x, i) => P(`${i + 1}. ${x}`))
  ];

  if (d.can_cu_phap_ly && d.can_cu_phap_ly.length) {
    children.push(H('IV. CĂN CỨ PHÁP LÝ ÁP DỤNG'));
    d.can_cu_phap_ly.forEach((c, i) => {
      children.push(P(`${i + 1}. ${c.doc || ''}${c.article ? ', ' + c.article : ''} — ${c.relevance || ''}`));
    });
  }

  children.push(H('V. KẾT LUẬN'));
  children.push(P(d.ket_luan_chung || '—', { bold: true }));

  // Signature block
  children.push(new Paragraph({
    children: [new TextRun({ text: '\nNgày …… tháng …… năm ……', font: 'Times New Roman', size: 26, italics: true })],
    alignment: AlignmentType.RIGHT,
    spacing: { before: 400 }
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'NGƯỜI ĐÁNH GIÁ', font: 'Times New Roman', size: 26, bold: true })],
    alignment: AlignmentType.RIGHT,
    spacing: { before: 100, after: 800 }
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', font: 'Times New Roman', size: 22, italics: true })],
    alignment: AlignmentType.RIGHT
  }));

  return new Document({ sections: [{ children }] });
}

// ─────────────── FREESTYLE ───────────────
function buildFreestyle(project, d) {
  const P = (text, opts = {}) => new Paragraph({
    children: [new TextRun({ text, font: 'Times New Roman', size: opts.size || 26, bold: opts.bold, italics: opts.italic, color: opts.color })],
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after || 120 }
  });

  const H = (text, level = HeadingLevel.HEADING_2) => new Paragraph({
    children: [new TextRun({ text, font: 'Times New Roman', size: 28, bold: true })],
    heading: level, spacing: { before: 240, after: 120 }
  });

  const children = [
    new Paragraph({
      children: [new TextRun({ text: 'PHIẾU VẤN ĐỀ CẦN TRAO ĐỔI TẠI CUỘC HỌP', font: 'Times New Roman', size: 32, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Đề tài: ${project.title || ''}`, font: 'Times New Roman', size: 26, italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 }
    })
  ];

  (d.van_de || []).forEach((v, i) => {
    const colorByLevel = { 'nghiêm trọng': 'C00000', 'đáng lưu ý': 'BF8F00', 'tham khảo': '404040' };
    children.push(H(`Vấn đề ${v.stt || (i + 1)}: [${v.chu_de || ''}] — ${v.muc_do || ''}`, HeadingLevel.HEADING_3));
    children.push(P(`Câu hỏi: ${v.cau_hoi || ''}`, { bold: true, color: colorByLevel[v.muc_do] || '000000' }));
    children.push(P(`Lý do: ${v.ly_do || ''}`));
    if (v.goi_y_tra_loi) children.push(P(`Gợi ý điều chỉnh: ${v.goi_y_tra_loi}`, { italic: true }));
  });

  if (d.tong_ket) {
    children.push(H('Tổng kết'));
    children.push(P(d.tong_ket, { bold: true }));
  }

  return new Document({ sections: [{ children }] });
}
