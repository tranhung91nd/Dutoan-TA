// ════════════════════════════════════════════════════════════
// API layer — Supabase client + backend calls
// ════════════════════════════════════════════════════════════

window.API = (function () {
  // Config từ /api/config (trả về PUBLIC keys)
  let sb = null;
  let cfg = null;

  async function init() {
    if (cfg) return cfg;
    try {
      const r = await fetch('/api/config');
      cfg = await r.json();
      if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
        sb = supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      }
    } catch (e) {
      console.warn('Chưa kết nối được backend', e);
      cfg = { demo: true };
    }
    return cfg;
  }

  const hasDB = () => !!sb;
  const getClient = () => sb;

  // ---- Fields ----
  async function fields() {
    if (!sb) return DEMO.fields;
    const { data, error } = await sb.from('fields').select('*').order('name');
    if (error) throw error;
    return data;
  }

  // ---- Projects ----
  async function projects() {
    if (!sb) return DEMO.projects;
    const { data, error } = await sb.from('projects').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async function projectById(id) {
    if (!sb) return DEMO.projects.find(p => p.id === id);
    const { data, error } = await sb.from('projects').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async function createProject(payload) {
    if (!sb) { payload.id = 'demo-' + Date.now(); DEMO.projects.unshift(payload); return payload; }
    const { data, error } = await sb.from('projects').insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  async function updateProject(id, patch) {
    if (!sb) { const p = DEMO.projects.find(x => x.id === id); Object.assign(p || {}, patch); return p; }
    const { data, error } = await sb.from('projects').update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteProject(id) {
    if (!sb) { DEMO.projects = DEMO.projects.filter(p => p.id !== id); return; }
    const { error } = await sb.from('projects').delete().eq('id', id);
    if (error) throw error;
  }

  // ---- Legal docs ----
  async function legalDocs() {
    if (!sb) return DEMO.legal;
    const { data, error } = await sb.from('legal_documents').select('*').eq('is_active', true).order('doc_number');
    if (error) throw error;
    return data;
  }

  async function createLegalDoc(payload) {
    if (!sb) { payload.id = 'demo-' + Date.now(); DEMO.legal.unshift(payload); return payload; }
    const { data, error } = await sb.from('legal_documents').insert(payload).select().single();
    if (error) throw error;
    return data;
  }

  // ---- Analyses ----
  async function analysesByProject(projectId) {
    if (!sb) return [];
    const { data, error } = await sb.from('analyses').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  // ---- Budget norms ----
  async function norms() {
    if (!sb) return DEMO.norms;
    const { data, error } = await sb.from('budget_norms').select('*').order('category');
    if (error) throw error;
    return data;
  }

  // ---- Backend calls ----
  async function upload(formData) {
    const r = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!r.ok) throw new Error((await r.json()).error || 'Upload thất bại');
    return r.json();
  }

  async function analyze(projectId, type) {
    const model = Settings.getModel(type);
    const r = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, type, model })
    });
    if (!r.ok) throw new Error((await r.json()).error || 'Phân tích thất bại');
    return r.json();
  }

  async function chat(messages, projectId = null) {
    const model = Settings.getModel('chat');
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, projectId })
    });
    if (!r.ok) throw new Error((await r.json()).error || 'Trợ lý lỗi');
    return r.json();
  }

  // ---- Settings (localStorage) ----
  const Settings = {
    DEFAULTS: {
      legal:     'gpt-5-mini',
      budget:    'gpt-5-mini',
      form_05:   'gpt-5-mini',
      freestyle: 'gpt-5-mini',
      chat:      'gpt-5-mini'
    },
    getModel(type) {
      try { return localStorage.getItem(`model.${type}`) || this.DEFAULTS[type] || 'gpt-5-mini'; }
      catch { return this.DEFAULTS[type] || 'gpt-5-mini'; }
    },
    setModel(type, model) {
      try { localStorage.setItem(`model.${type}`, model); } catch {}
    },
    resetAll() {
      try { Object.keys(this.DEFAULTS).forEach(t => localStorage.removeItem(`model.${t}`)); } catch {}
    }
  };

  async function generateForm(projectId, formType) {
    const r = await fetch('/api/generate-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, formType })
    });
    if (!r.ok) throw new Error((await r.json()).error || 'Xuất phiếu thất bại');
    return r.blob();
  }

  // ---- Demo data (khi chưa có Supabase) ----
  const DEMO = {
    fields: [
      { id: '1', code: 'khcn', name: 'Khoa học & Công nghệ' },
      { id: '2', code: 'cds',  name: 'Chuyển đổi số' },
      { id: '3', code: 'mt',   name: 'Bảo vệ môi trường' }
    ],
    projects: [
      {
        id: 'demo-1',
        project_code: 'NV-2025-001',
        title: 'Nghiên cứu ứng dụng AI trong quản lý hành chính công',
        field_code: 'cds',
        owner_name: 'Nguyễn Văn A',
        organization: 'Viện Nghiên cứu CĐS',
        total_budget: 850000000,
        duration_months: 18,
        status: 'analyzed',
        created_at: new Date().toISOString()
      }
    ],
    legal: [
      { id: '1', doc_number: '02/2015/TT-BLĐTBXH', doc_type: 'TT', title: 'Thông tư 02/2015/TT-BLĐTBXH', issuer: 'Bộ LĐTB&XH', applicable_fields: ['khcn','cds','mt'] },
      { id: '2', doc_number: '94/2024/TT-BTC',     doc_type: 'TT', title: 'Thông tư 94/2024/TT-BTC',     issuer: 'Bộ Tài chính', applicable_fields: ['khcn','cds'] },
      { id: '3', doc_number: '31/2023/TT-BTC',     doc_type: 'TT', title: 'Thông tư 31/2023/TT-BTC',     issuer: 'Bộ Tài chính', applicable_fields: ['khcn','cds','mt'] },
      { id: '4', doc_number: '08/2022/NĐ-CP',      doc_type: 'ND', title: 'Nghị định 08/2022/NĐ-CP',      issuer: 'Chính phủ', applicable_fields: ['mt'] },
      { id: '5', doc_number: '72/2020/QH14',       doc_type: 'QH', title: 'Luật Bảo vệ môi trường 2020',  issuer: 'Quốc hội', applicable_fields: ['mt'] },
      { id: '6', doc_number: '83/2015/QH13',       doc_type: 'QH', title: 'Luật NSNN 2015',               issuer: 'Quốc hội', applicable_fields: ['khcn','cds','mt'] },
      { id: '7', doc_number: '163/2016/NĐ-CP',     doc_type: 'ND', title: 'Nghị định 163/2016/NĐ-CP',     issuer: 'Chính phủ', applicable_fields: ['khcn','cds','mt'] },
      { id: '8', doc_number: '04/2025/TT-BNV',     doc_type: 'TT', title: 'Thông tư 04/2025/TT-BNV',      issuer: 'Bộ Nội vụ', applicable_fields: ['khcn','cds','mt'] }
    ],
    norms: [
      { id: '1', category: 'cong_lao_dong', description: 'Thù lao chủ nhiệm KHCN cấp cơ sở', amount_max: 15000000, unit: 'VND/người/tháng', source_doc: '94/2024/TT-BTC', source_article: 'Điều 6 khoản 1' },
      { id: '2', category: 'cong_lao_dong', description: 'Thù lao thành viên nghiên cứu',    amount_max: 10000000, unit: 'VND/người/tháng', source_doc: '94/2024/TT-BTC', source_article: 'Điều 6 khoản 2' },
      { id: '3', category: 'hoi_thao',      description: 'Tổ chức hội thảo khoa học',          amount_max:  5000000, unit: 'VND/cuộc',        source_doc: '94/2024/TT-BTC', source_article: 'Điều 8' }
    ]
  };

  return {
    init, hasDB, getClient,
    fields, projects, projectById, createProject, updateProject, deleteProject,
    legalDocs, createLegalDoc, analysesByProject, norms,
    upload, analyze, generateForm, chat, Settings
  };
})();

// ---- Utilities ----
window.U = {
  fmt: (n) => {
    if (!n && n !== 0) return '—';
    return Number(n).toLocaleString('vi-VN');
  },
  fmtShort: (n) => {
    if (!n) return '—';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + ' tỷ';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + ' tr';
    if (n >= 1e3) return Math.round(n / 1e3) + 'K';
    return n.toString();
  },
  fmtDate: (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return ('0' + dt.getDate()).slice(-2) + '/' + ('0' + (dt.getMonth() + 1)).slice(-2) + '/' + dt.getFullYear();
  },
  esc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  toast: (m, ok = true) => {
    const d = document.createElement('div');
    d.className = 'toast ' + (ok ? 'toast-ok' : 'toast-err');
    d.textContent = m;
    document.getElementById('toast-container').appendChild(d);
    setTimeout(() => d.remove(), 3000);
  },
  fieldName: (code) => ({ khcn: 'KHCN', cds: 'Chuyển đổi số', mt: 'Môi trường' }[code] || code),
  fieldColor: (code) => ({ khcn: 'purple', cds: 'blue', mt: 'green' }[code] || 'gray'),
  statusBadge: (s) => {
    const m = {
      draft:     ['b-gray',  'Nháp'],
      analyzing: ['b-amber', 'Đang phân tích'],
      analyzed:  ['b-blue',  'Đã phân tích'],
      reviewed:  ['b-green', 'Đã duyệt']
    };
    const [cls, txt] = m[s] || m.draft;
    return `<span class="badge ${cls}">${txt}</span>`;
  },
  modal: (title, body, footer = '') => {
    const html = `
      <div class="modal-bd" onclick="if(event.target===this)U.closeModal()">
        <div class="modal wide">
          <div class="modal-head">
            <h3>${title}</h3>
            <button class="modal-close" onclick="U.closeModal()">&times;</button>
          </div>
          <div class="modal-body">${body}</div>
          ${footer ? `<div class="modal-foot">${footer}</div>` : ''}
        </div>
      </div>`;
    document.getElementById('modal-root').innerHTML = html;
  },
  closeModal: () => { document.getElementById('modal-root').innerHTML = ''; }
};
