// ════════════════════════════════════════════════════════════
// App router & bootstrap
// ════════════════════════════════════════════════════════════

window.App = (function () {
  let state = { page: 'overview', params: {} };

  const pages = {
    overview:       () => Pages.Overview(),
    projects:       () => Pages.Projects(),
    projectDetail:  (p) => Pages.ProjectDetail(p.id),
    legal:          () => Pages.Legal(),
    fields:         () => Pages.Fields(),
    norms:          () => Pages.Norms(),
    logs:           () => Pages.Logs(),
    admin:          () => Pages.Admin()
  };

  function go(page, params = {}) {
    state.page = page;
    state.params = params;
    document.querySelectorAll('.nav-item[data-page]').forEach(n => {
      n.classList.toggle('active', n.getAttribute('data-page') === page);
    });
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('overlay').classList.remove('show');
    }
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    const el = document.getElementById('page');
    el.innerHTML = '<div class="loading">Đang tải</div>';
    const fn = pages[state.page] || pages.overview;
    Promise.resolve(fn(state.params)).then(html => {
      el.innerHTML = html;
      // Gắn event nếu page có afterRender
      const afterKey = 'after_' + state.page;
      if (typeof window[afterKey] === 'function') window[afterKey](state.params);
    }).catch(err => {
      console.error(err);
      el.innerHTML = `<div class="error-box">Lỗi: ${U.esc(err.message)}</div>`;
    });
  }

  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('show');
  }

  async function boot() {
    await API.init();
    if (!API.hasDB()) {
      // demo mode banner
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:200;background:linear-gradient(180deg,#f59e0b 0%,#d97706 100%);color:#fff;padding:8px 20px;font-size:12px;font-weight:600;text-align:center;box-shadow:0 4px 12px rgba(217,119,6,0.25);';
      banner.innerHTML = '⚠ Chạy chế độ DEMO (chưa kết nối Supabase). Cấu hình SUPABASE_URL & SUPABASE_ANON_KEY trong .env.local để dùng thật.';
      document.body.prepend(banner);
      document.querySelector('.app').style.marginTop = '32px';
    }
    go('overview');
  }

  return { go, render, toggleSidebar, state };
})();

document.addEventListener('DOMContentLoaded', App.boot || (() => {
  // boot có thể chưa định nghĩa khi App được tạo; fallback:
  if (typeof App.boot === 'function') App.boot();
}));

// Trigger boot ngay
(async function bootNow() {
  await API.init();
  if (!API.hasDB()) {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:200;background:linear-gradient(180deg,#f59e0b 0%,#d97706 100%);color:#fff;padding:8px 20px;font-size:12px;font-weight:600;text-align:center;';
    banner.innerHTML = '⚠ Chạy chế độ DEMO (chưa kết nối Supabase). Cấu hình SUPABASE_URL & SUPABASE_ANON_KEY để dùng thật.';
    document.body.prepend(banner);
    document.querySelector('.app').style.marginTop = '32px';
  }
  App.go('overview');
})();
