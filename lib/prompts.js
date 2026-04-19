// ═══════════════════════════════════════════════════════════════
// Prompts tiếng Việt cho Claude — phân tích đề tài NCKH
// ═══════════════════════════════════════════════════════════════

const FIELD_CONTEXT = {
  khcn: `Lĩnh vực: Khoa học & Công nghệ
Văn bản áp dụng chính: Thông tư 94/2024/TT-BTC (cơ chế tài chính KHCN), Thông tư 02/2015/TT-BLĐTBXH, Luật NSNN 83/2015/QH13, Nghị định 163/2016/NĐ-CP, Thông tư 04/2025/TT-BNV.
Lưu ý: định mức thù lao chủ nhiệm/thành viên, chi hội thảo, nghiệm thu, khoán chi.`,
  cds: `Lĩnh vực: Chuyển đổi số
Văn bản áp dụng chính: Thông tư 94/2024/TT-BTC, Thông tư 31/2023/TT-BTC (quản lý chi NSNN), Luật NSNN 83/2015/QH13, Nghị định 163/2016/NĐ-CP.
Lưu ý: chi đầu tư hạ tầng CNTT, thuê dịch vụ CNTT, đào tạo nhân lực số, định mức CNTT.`,
  mt: `Lĩnh vực: Bảo vệ môi trường
Văn bản áp dụng chính: Luật Bảo vệ môi trường 72/2020/QH14, Nghị định 08/2022/NĐ-CP, Thông tư 31/2023/TT-BTC, Luật NSNN 83/2015/QH13.
Lưu ý: đánh giá tác động môi trường, quan trắc, xử lý chất thải, bảo tồn đa dạng sinh học.`
};

// ─────────────────────────────────────────────────────────────────
// SYSTEM PROMPT (dùng chung — có prompt caching)
// ─────────────────────────────────────────────────────────────────
function systemPrompt(fieldCode) {
  return `Bạn là chuyên gia tư vấn pháp lý và tài chính cho các đề tài nghiên cứu khoa học ở Việt Nam, có kinh nghiệm làm việc với thanh tra, kiểm toán nhà nước.

${FIELD_CONTEXT[fieldCode] || FIELD_CONTEXT.khcn}

NGUYÊN TẮC:
1. Luôn trích dẫn chính xác: Số văn bản, Điều, Khoản, Mục, Điểm. Ví dụ: "Thông tư 94/2024/TT-BTC, Điều 6, khoản 2, điểm a"
2. Không được bịa văn bản hoặc điều khoản. Nếu không chắc → nói rõ "cần tra cứu thêm".
3. Ngôn ngữ: hành chính, súc tích, khách quan. Dùng thuật ngữ pháp lý chuẩn.
4. Khi phát hiện rủi ro → cảnh báo rõ mức độ: [CẢNH BÁO ĐỎ] vi phạm định mức / [CẢNH BÁO VÀNG] cần bổ sung giải trình / [LƯU Ý] khuyến nghị.
5. Trả lời theo đúng cấu trúc JSON được yêu cầu — không thêm markdown bọc ngoài.`;
}

// ─────────────────────────────────────────────────────────────────
// 1. PHÂN TÍCH PHÁP LÝ
// ─────────────────────────────────────────────────────────────────
function legalPrompt(proposalText, legalDocsList) {
  const docs = legalDocsList.map(d => `- ${d.doc_number}: ${d.title}`).join('\n');
  return `NHIỆM VỤ: Phân tích đề tài dưới đây và xác định căn cứ pháp lý áp dụng.

THUYẾT MINH ĐỀ TÀI:
${String(proposalText || '').slice(0, 15000)}

DANH MỤC VĂN BẢN PHÁP LÝ CÓ TRONG HỆ THỐNG:
${docs}

YÊU CẦU:
1. Xác định **các căn cứ pháp lý** đề tài NÊN viện dẫn (trích đúng điều/khoản/mục).
2. Đánh giá đề tài **đã viện dẫn đủ** chưa. Văn bản nào thiếu?
3. Có căn cứ nào **lỗi thời / đã bị thay thế** không?
4. Đánh giá mức độ tuân thủ tổng thể.

Trả về JSON THUẦN (không markdown bọc):
{
  "summary": "tóm tắt đánh giá chung 3-5 câu",
  "compliance_level": "tốt" | "khá" | "cần bổ sung" | "có rủi ro",
  "required_citations": [
    {
      "doc": "94/2024/TT-BTC",
      "article": "Điều 6",
      "clause": "khoản 1",
      "point": "điểm a",
      "reason": "cơ sở pháp lý cho định mức thù lao chủ nhiệm",
      "quote": "trích nguyên văn nếu biết"
    }
  ],
  "missing_citations": [
    { "doc": "...", "reason": "thiếu căn cứ xác định...", "severity": "cao|trung bình|thấp" }
  ],
  "outdated_citations": [
    { "doc": "...", "replaced_by": "...", "note": "..." }
  ],
  "warnings": [
    { "level": "error|warn|info", "message": "...", "source": "..." }
  ],
  "markdown_report": "báo cáo gọn 300-500 từ, có footnote [^1] cuối bài"
}`;
}

// ─────────────────────────────────────────────────────────────────
// 2. ĐÁNH GIÁ DỰ TOÁN
// ─────────────────────────────────────────────────────────────────
function budgetPrompt(proposalText, budgetJson, norms, totalBudget, durationMonths) {
  const normsTxt = norms.map(n =>
    `- ${n.category} | ${n.description} | tối đa ${n.amount_max?.toLocaleString('vi-VN')} ${n.unit} | nguồn: ${n.source_doc} ${n.source_article || ''}`
  ).join('\n');

  return `NHIỆM VỤ: Đánh giá dự toán chi tiêu của đề tài.

THÔNG TIN ĐỀ TÀI:
- Tổng kinh phí: ${totalBudget?.toLocaleString('vi-VN') || '?'} VND
- Thời gian: ${durationMonths || '?'} tháng

TÓM TẮT THUYẾT MINH (để đánh giá tương thích):
${String(proposalText || '').slice(0, 4000)}

DỰ TOÁN CHI TIẾT (JSON):
${JSON.stringify(budgetJson, null, 2).slice(0, 12000)}

ĐỊNH MỨC ÁP DỤNG (theo TT 94/2024, 31/2023, 02/2015, 04/2025...):
${normsTxt}

YÊU CẦU PHÂN TÍCH 3 TẦNG:

**Tầng 1 — Tổng thể:**
- Tổng kinh phí có **khả thi** với quy mô nhiệm vụ không? Có lãng phí / thừa thãi / thiếu hụt không?
- Phân bổ giữa các hạng mục chính (nhân công / vật tư / hội thảo / quản lý) có hợp lý không? Tỷ lệ %.

**Tầng 2 — Từng dòng dự toán:**
- Với mỗi dòng: đưa ra **căn cứ lập** (đúng định mức → trích Thông tư/Điều/Khoản).
- Nếu **vượt định mức** → cảnh báo đỏ + đề xuất mức đúng.
- Nếu **thiếu căn cứ** → cảnh báo vàng + gợi ý bổ sung.
- Nếu **đúng** → xác nhận căn cứ.

**Tầng 3 — Tỷ lệ & logic nghiệp vụ:**
- Các mục có **kinh phí** vs **không có kinh phí** (ví dụ: thuyết minh nói sẽ khảo sát nhưng dự toán không có mục khảo sát).
- Hạng mục nào **thừa** so với nội dung công việc?
- Tỷ lệ kinh phí trên từng hạng mục công việc có **hợp lý**?

Trả về JSON THUẦN:
{
  "overall": {
    "feasible": true|false,
    "total_vs_scope": "phù hợp|thừa|thiếu",
    "main_allocation": { "nhan_cong": 60, "vat_tu": 10, "hoi_thao": 5, "quan_ly": 10, "khac": 15 },
    "notes": "nhận xét tổng thể"
  },
  "rows": [
    {
      "item": "Thù lao chủ nhiệm",
      "unit": "tháng",
      "qty": "18",
      "unit_price": 15000000,
      "total": 270000000,
      "basis": "94/2024/TT-BTC Điều 6 khoản 1",
      "status": "ok|warn|error",
      "note": "đúng mức tối đa"
    }
  ],
  "missing_items": [ { "item": "...", "reason": "thuyết minh có đề cập nhưng dự toán không có" } ],
  "redundant_items": [ { "item": "...", "reason": "..." } ],
  "warnings": [ { "level": "error|warn|info", "message": "...", "source": "..." } ],
  "citations": [ { "doc": "...", "article": "...", "clause": "...", "point": "...", "text": "..." } ],
  "markdown_report": "báo cáo gọn 400-600 từ tiếng Việt hành chính, có số liệu + footnote [^1]"
}`;
}

// ─────────────────────────────────────────────────────────────────
// 3. PHIẾU MẪU 05 (hành chính chuẩn)
// ─────────────────────────────────────────────────────────────────
function form05Prompt(proposalText, legalAnalysis, budgetAnalysis, projectInfo) {
  return `NHIỆM VỤ: Điền phiếu đánh giá đề tài theo MẪU 05, ngôn ngữ hành chính chuẩn, đảm bảo an toàn khi thanh tra/kiểm toán.

THÔNG TIN ĐỀ TÀI:
${JSON.stringify(projectInfo, null, 2)}

TÓM TẮT THUYẾT MINH:
${String(proposalText || '').slice(0, 5000)}

KẾT QUẢ PHÂN TÍCH PHÁP LÝ:
${JSON.stringify(legalAnalysis, null, 2).slice(0, 4000)}

KẾT QUẢ PHÂN TÍCH DỰ TOÁN:
${JSON.stringify(budgetAnalysis, null, 2).slice(0, 4000)}

YÊU CẦU:
- Điền từng mục theo cấu trúc phiếu MẪU 05 (tính cấp thiết, mục tiêu, nội dung, phương pháp, khả thi, kinh phí, dự kiến sản phẩm...)
- Ngôn ngữ hành chính, trung lập, có **luận cứ rõ ràng**.
- Ở phần **kết luận**: khi có điểm chưa ổn → ghi "đề nghị bổ sung/điều chỉnh X" thay vì phủ nhận gay gắt.
- Luôn kèm **căn cứ pháp lý** khi nhận xét về định mức/quy trình.

Trả về JSON THUẦN:
{
  "tinh_cap_thiet": { "danh_gia": "Đạt|Đạt có điều chỉnh|Chưa đạt", "nhan_xet": "..." },
  "muc_tieu": { "danh_gia": "...", "nhan_xet": "..." },
  "noi_dung": { "danh_gia": "...", "nhan_xet": "..." },
  "phuong_phap": { "danh_gia": "...", "nhan_xet": "..." },
  "san_pham": { "danh_gia": "...", "nhan_xet": "..." },
  "kha_nang_thuc_hien": { "danh_gia": "...", "nhan_xet": "..." },
  "kinh_phi": { "danh_gia": "...", "nhan_xet": "...", "kien_nghi_dieu_chinh": "..." },
  "ket_luan_chung": "Đề nghị: PHÊ DUYỆT|PHÊ DUYỆT có điều chỉnh|TRẢ LẠI để hoàn thiện",
  "cac_diem_can_bo_sung": ["...", "..."],
  "can_cu_phap_ly": [ { "doc": "...", "article": "...", "relevance": "..." } ]
}`;
}

// ─────────────────────────────────────────────────────────────────
// 4. PHIẾU TRAO ĐỔI HỌP (freestyle)
// ─────────────────────────────────────────────────────────────────
function freestylePrompt(proposalText, legalAnalysis, budgetAnalysis) {
  return `NHIỆM VỤ: Soạn phiếu CÁC VẤN ĐỀ CẦN TRAO ĐỔI TẠI CUỘC HỌP hội đồng đánh giá đề tài — phong cách tự do, đặt câu hỏi sắc bén để người chủ trì phản biện tại chỗ.

THUYẾT MINH (tóm tắt):
${String(proposalText || '').slice(0, 4000)}

PHÂN TÍCH PHÁP LÝ:
${JSON.stringify(legalAnalysis, null, 2).slice(0, 3000)}

PHÂN TÍCH DỰ TOÁN:
${JSON.stringify(budgetAnalysis, null, 2).slice(0, 3000)}

YÊU CẦU:
- Đưa ra **5-10 vấn đề thực sự đáng trao đổi** — không liệt kê sáo rỗng.
- Mỗi vấn đề: **Câu hỏi trực tiếp** + **Lý do** (ngắn gọn) + **Gợi ý trả lời/điều chỉnh** (nếu có).
- Ưu tiên:
  * Điểm rủi ro pháp lý có thể bị thanh tra soi.
  * Điểm dự toán nghi vấn (thừa/thiếu/không khớp thuyết minh).
  * Điểm logic kỹ thuật chưa chặt.
- Ngôn ngữ: đời thường, sắc, không rào đón.

Trả về JSON THUẦN:
{
  "van_de": [
    {
      "stt": 1,
      "chu_de": "Dự toán / Pháp lý / Nội dung / Khả thi / Sản phẩm",
      "cau_hoi": "Tại sao mục X lại dự toán Y trong khi thuyết minh chỉ nói Z?",
      "ly_do": "Theo định mức Thông tư 94/2024 Điều 6, mức này vượt trần",
      "goi_y_tra_loi": "Hoặc giảm xuống mức A, hoặc giải trình thêm B",
      "muc_do": "nghiêm trọng|đáng lưu ý|tham khảo"
    }
  ],
  "tong_ket": "một câu kết luận về tinh thần chính của buổi họp"
}`;
}

module.exports = {
  systemPrompt,
  legalPrompt,
  budgetPrompt,
  form05Prompt,
  freestylePrompt,
  FIELD_CONTEXT
};
