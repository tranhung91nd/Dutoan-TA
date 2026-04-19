# Dự Toán AI

Công cụ web app hỗ trợ phân tích đề tài nghiên cứu khoa học Việt Nam:
- Tìm **căn cứ pháp lý** áp dụng (trích điều/khoản/mục + footnote)
- Đánh giá **dự toán chi tiêu** theo 3 tầng (tổng / từng dòng / tỷ lệ)
- Điền **phiếu MẪU 05** (chuẩn hành chính) + phiếu **trao đổi họp** (freestyle)
- Cảnh báo rủi ro khi bị thanh tra/kiểm toán

**Lĩnh vực:** KHCN · Chuyển đổi số · Bảo vệ môi trường

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | HTML/CSS/Vanilla JS (style HC Agency) |
| Backend | Vercel Serverless Functions (Node.js 18) |
| AI | Anthropic Claude (Sonnet 4.6) với prompt caching |
| Database | Supabase PostgreSQL (pgcrypto) |
| File Storage | Supabase Storage |
| File Parsing | mammoth (DOCX), pdf-parse (PDF), xlsx (Excel) |
| Output | docx (xuất Word) |

---

## Deploy lên Vercel

### Bước 1: Chuẩn bị tài khoản

1. **Anthropic API key**: https://console.anthropic.com/settings/keys
2. **Supabase project mới**: https://supabase.com/dashboard
   - Tạo project → copy `Project URL`, `anon public key`, `service_role key`
3. **Vercel account**: https://vercel.com (đăng nhập bằng GitHub)

### Bước 2: Tạo Supabase Database

Vào Supabase Dashboard → SQL Editor → chạy lần lượt:

```sql
-- File 1: supabase/schema.sql
-- File 2: supabase/seed_legal_docs.sql
```

Sau đó tạo Storage bucket:
- Vào **Storage** → **Create new bucket**
- Tên: `de-tai-files`
- Public: **Off** (private)

### Bước 3: Deploy lên Vercel

**Cách 1 — Qua Git (khuyến nghị):**
```bash
cd /Users/hungcoaching/Downloads/du-toan-ai
git init
git add .
git commit -m "Initial"
# Push lên GitHub, rồi Import project ở vercel.com
```

**Cách 2 — Vercel CLI:**
```bash
cd /Users/hungcoaching/Downloads/du-toan-ai
npm install
npx vercel login
npx vercel        # deploy preview
npx vercel --prod # deploy production
```

### Bước 4: Cấu hình Environment Variables

Vercel Dashboard → Project → Settings → **Environment Variables** → thêm:

| Biến | Giá trị |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGc...` (anon public) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (service_role, KHÔNG expose client) |
| `SUPABASE_BUCKET` | `de-tai-files` |

Sau khi thêm → **Redeploy** để biến có hiệu lực.

---

## Chạy local (dev)

```bash
cd /Users/hungcoaching/Downloads/du-toan-ai
npm install
cp .env.example .env.local   # điền giá trị thật
npx vercel dev               # http://localhost:3000
```

---

## Cấu trúc project

```
du-toan-ai/
├── public/                 # Static frontend
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── api.js          # API layer + utilities
│       ├── app.js          # Router
│       └── pages/          # Mỗi page 1 file JS
├── api/                    # Vercel serverless functions
│   ├── config.js           # GET config công khai
│   ├── upload.js           # POST multipart upload
│   ├── analyze.js          # POST chạy AI phân tích
│   └── generate-form.js    # POST xuất .docx
├── lib/                    # Shared modules
│   ├── claude.js           # Claude API wrapper + pricing
│   ├── parsers.js          # DOCX/PDF/XLSX parsers
│   ├── prompts.js          # Prompts tiếng Việt
│   └── supabase.js         # Supabase server client
├── supabase/
│   ├── schema.sql          # Bảng + RLS + triggers
│   └── seed_legal_docs.sql # 8 văn bản + định mức mẫu
├── templates/              # Word templates (tuỳ chọn)
├── vercel.json
├── package.json
├── .env.example
└── README.md
```

---

## Workflow người dùng

1. Vào web app → **Đề tài** → **+ Upload đề tài mới**
2. Nhập metadata (tên, mã, chủ nhiệm, tổng kinh phí) + chọn lĩnh vực
3. Upload **Thuyết minh.pdf/docx** + **Dự toán.xlsx**
4. Bấm **Tạo đề tài & phân tích** → hệ thống parse file + lưu DB
5. Vào chi tiết đề tài → 4 tab phân tích:
   - **Căn cứ pháp lý** → bấm *Chạy phân tích* (Claude trả JSON có trích dẫn điều/khoản + footnote)
   - **Đánh giá dự toán** → 3 tầng (tổng/dòng/tỷ lệ) + cảnh báo vượt định mức
   - **Phiếu MẪU 05** → điền form hành chính → xuất Word
   - **Phiếu trao đổi họp** → gợi ý 5-10 câu hỏi sắc bén cho cuộc họp
6. Mỗi phiếu có nút **📄 Xuất Word**

---

## Chi phí vận hành

**Mỗi đề tài ~30 trang thuyết minh + dự toán 50 dòng:**

| Module | Model | ~Input tokens | ~Output | VND |
|---|---|---|---|---|
| Phân tích pháp lý | Sonnet 4.6 | 15K | 5K | ~8.000 |
| Đánh giá dự toán | Sonnet 4.6 | 20K | 8K | ~13.000 |
| Phiếu MẪU 05 | Sonnet 4.6 | 25K | 6K | ~13.000 |
| Phiếu trao đổi | Sonnet 4.6 | 20K | 4K | ~9.000 |
| **TỔNG/đề tài** | | | | **~43.000 VND** |

Với **prompt caching**, lần phân tích thứ 2+ trong cùng session sẽ giảm ~70-90% chi phí input tokens.

**Vercel:** Hobby plan miễn phí (100GB bandwidth/tháng, serverless function 10s timeout — cần Pro $20/tháng cho timeout 60s, khuyến nghị cho file to).

**Supabase:** Free tier 500MB DB + 1GB Storage đủ cho ~100 đề tài.

---

## Mở rộng sau

- [ ] Auth (Supabase Auth): mời bạn bè bằng email, phân quyền xem/sửa
- [ ] Tích hợp định mức nội bộ (của viện/cơ quan)
- [ ] So sánh nhiều đề tài cùng chủ đề (phát hiện trùng lặp)
- [ ] Export toàn bộ dossier ra 1 file PDF
- [ ] Mã hoá column-level: `total_budget`, `owner_name` với `pgp_sym_encrypt`
- [ ] Chatbot AI hỏi-đáp theo đề tài (giống HC AI FAB trong index.html)

---

## License

Private — nội bộ.
