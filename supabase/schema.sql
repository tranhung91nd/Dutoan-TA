-- ═══════════════════════════════════════════════════════════════
-- Du Toan AI - Schema Supabase
-- Chạy trong Supabase SQL Editor theo thứ tự
-- ═══════════════════════════════════════════════════════════════

-- 1. Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- 2. Lĩnh vực nghiên cứu (KHCN, CĐS, Môi trường)
create table if not exists fields (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,          -- 'khcn', 'cds', 'moi_truong'
  name text not null,                 -- 'Khoa học Công nghệ'
  description text,
  system_prompt text,                 -- prompt riêng cho lĩnh vực này
  created_at timestamptz default now()
);

insert into fields (code, name, description) values
  ('khcn', 'Khoa học & Công nghệ', 'Nghiên cứu KHCN, phát triển công nghệ mới'),
  ('cds',  'Chuyển đổi số',         'Chuyển đổi số trong quản lý nhà nước, doanh nghiệp'),
  ('mt',   'Bảo vệ môi trường',     'Nghiên cứu môi trường, biến đổi khí hậu, tài nguyên')
on conflict (code) do nothing;

-- 3. Thư viện văn bản pháp lý
create table if not exists legal_documents (
  id uuid primary key default uuid_generate_v4(),
  doc_number text not null,           -- '02/2015/TT-BLDTBXH'
  doc_type text not null,             -- 'TT', 'ND', 'QH', 'QD'
  title text not null,
  issue_date date,
  issuer text,                        -- 'Bộ LĐTB&XH', 'Chính phủ'
  file_path text,                     -- đường dẫn trong Supabase Storage
  full_text text,                     -- nội dung đã parse
  summary text,                       -- tóm tắt AI
  applicable_fields text[] default '{}', -- ['khcn', 'cds']
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_legal_docs_fields on legal_documents using gin(applicable_fields);
create index if not exists idx_legal_docs_active on legal_documents(is_active);

-- 4. Đề tài nghiên cứu
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  project_code text,                  -- mã đề tài
  title text not null,                -- tên đề tài
  field_code text references fields(code),
  owner_name text,                    -- chủ nhiệm
  organization text,                  -- cơ quan chủ trì
  total_budget numeric,               -- tổng kinh phí (VND)
  duration_months integer,
  proposal_file_path text,            -- Thuyết minh .pdf
  budget_file_path text,              -- Dự toán .xlsx
  proposal_text text,                 -- text đã parse từ thuyết minh
  budget_json jsonb,                  -- dự toán đã parse sang JSON
  status text default 'draft',        -- draft | analyzing | analyzed | reviewed
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_projects_field on projects(field_code);
create index if not exists idx_projects_status on projects(status);

-- 5. Kết quả phân tích (lưu mỗi lần AI chạy)
create table if not exists analyses (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  analysis_type text not null,        -- 'legal' | 'budget' | 'form_05' | 'freestyle'
  model text,                         -- 'claude-sonnet-4-6'
  input_tokens integer,
  output_tokens integer,
  cost_vnd numeric,
  result_json jsonb,                  -- dữ liệu cấu trúc
  result_markdown text,               -- output hiển thị
  citations jsonb,                    -- [{doc, article, clause, point, text}, ...]
  warnings jsonb,                     -- [{level, message, source}, ...]
  created_at timestamptz default now()
);

create index if not exists idx_analyses_project on analyses(project_id);
create index if not exists idx_analyses_type on analyses(analysis_type);

-- 6. Phiếu đánh giá đã điền
create table if not exists evaluation_forms (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  form_type text not null,            -- 'mau_05' | 'freestyle'
  content_json jsonb,                 -- dữ liệu điền vào form
  generated_file_path text,           -- file Word đã tạo
  version integer default 1,
  notes text,
  created_at timestamptz default now()
);

-- 7. Định mức chi tiêu (lấy từ TT 02/2015, 03/2023, 94/2024...)
create table if not exists budget_norms (
  id uuid primary key default uuid_generate_v4(),
  category text not null,             -- 'cong_lao_dong', 'van_phong_pham', 'hoi_thao'
  subcategory text,
  description text,
  amount_min numeric,
  amount_max numeric,
  unit text,                          -- 'VND/người/tháng', 'VND/cuộc'
  source_doc text,                    -- '02/2015/TT-BLDTBXH, Điều 5'
  source_article text,
  applicable_fields text[] default '{}',
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_budget_norms_category on budget_norms(category);

-- 8. Logs AI calls (audit + chi phí)
create table if not exists ai_logs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete set null,
  endpoint text,
  model text,
  input_tokens integer,
  output_tokens integer,
  cost_vnd numeric,
  duration_ms integer,
  error text,
  created_at timestamptz default now()
);

-- 9. RLS — tạm thời mở cho tất cả (như yêu cầu)
alter table fields enable row level security;
alter table legal_documents enable row level security;
alter table projects enable row level security;
alter table analyses enable row level security;
alter table evaluation_forms enable row level security;
alter table budget_norms enable row level security;
alter table ai_logs enable row level security;

-- Policy "open access" - sẽ siết lại sau
do $$ begin
  create policy "open_read_fields"       on fields            for select using (true);
  create policy "open_write_fields"      on fields            for all    using (true) with check (true);
  create policy "open_read_legal"        on legal_documents   for select using (true);
  create policy "open_write_legal"       on legal_documents   for all    using (true) with check (true);
  create policy "open_read_projects"     on projects          for select using (true);
  create policy "open_write_projects"    on projects          for all    using (true) with check (true);
  create policy "open_read_analyses"     on analyses          for select using (true);
  create policy "open_write_analyses"    on analyses          for all    using (true) with check (true);
  create policy "open_read_forms"        on evaluation_forms  for select using (true);
  create policy "open_write_forms"       on evaluation_forms  for all    using (true) with check (true);
  create policy "open_read_norms"        on budget_norms      for select using (true);
  create policy "open_write_norms"       on budget_norms      for all    using (true) with check (true);
  create policy "open_read_logs"         on ai_logs           for select using (true);
  create policy "open_write_logs"        on ai_logs           for all    using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- 10. Trigger tự update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_legal_docs_updated on legal_documents;
create trigger trg_legal_docs_updated before update on legal_documents
  for each row execute function set_updated_at();

drop trigger if exists trg_projects_updated on projects;
create trigger trg_projects_updated before update on projects
  for each row execute function set_updated_at();
