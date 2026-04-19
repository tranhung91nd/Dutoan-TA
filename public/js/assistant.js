// ════════════════════════════════════════════════════════════
// Trợ lý AI — floating chat widget
// ════════════════════════════════════════════════════════════
window.Assistant = (function () {
  let open = false;
  let messages = []; // [{role, content}]
  let loading = false;

  const LS_KEY = 'assistant.history';

  function loadHistory() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) messages = JSON.parse(raw);
    } catch {}
    if (!Array.isArray(messages) || messages.length === 0) {
      messages = [{
        role: 'assistant',
        content: 'Xin chào! Tôi là **Trợ lý AI** của Dự Toán AI.\n\nTôi có thể giúp bạn:\n- Tra cứu định mức, điều khoản văn bản pháp lý\n- Phản biện dự toán, gợi ý điền phiếu MẪU 05\n- Gợi ý câu hỏi cho hội đồng đánh giá\n\nBạn hỏi gì cũng được 👇'
      }];
    }
  }

  function saveHistory() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(messages.slice(-30))); } catch {}
  }

  function currentProjectId() {
    const s = window.App?.state;
    if (s?.page === 'projectDetail') return s.params?.id || null;
    return null;
  }

  function mount() {
    if (document.getElementById('assistant-root')) return;
    loadHistory();
    const root = document.createElement('div');
    root.id = 'assistant-root';
    root.innerHTML = `
      <button class="assistant-fab" id="assistant-fab" title="Trợ lý AI">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
        </svg>
      </button>
      <div class="assistant-panel" id="assistant-panel">
        <div class="assistant-head">
          <div>
            <div style="font-weight:700;font-size:14px;">Trợ lý AI</div>
            <div style="font-size:11px;color:var(--tx3);" id="assistant-model-label">${U.esc(API.Settings.getModel('chat'))}</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="assistant-btn" id="assistant-clear" title="Xoá hội thoại">⟲</button>
            <button class="assistant-btn" id="assistant-close" title="Đóng">×</button>
          </div>
        </div>
        <div class="assistant-body" id="assistant-body"></div>
        <form class="assistant-input" id="assistant-form">
          <textarea id="assistant-text" rows="1" placeholder="Nhập câu hỏi… (Enter để gửi, Shift+Enter xuống dòng)"></textarea>
          <button type="submit" id="assistant-send">Gửi</button>
        </form>
      </div>
    `;
    document.body.appendChild(root);

    document.getElementById('assistant-fab').onclick = toggle;
    document.getElementById('assistant-close').onclick = toggle;
    document.getElementById('assistant-clear').onclick = clearChat;
    document.getElementById('assistant-form').onsubmit = (e) => { e.preventDefault(); send(); };
    const ta = document.getElementById('assistant-text');
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    });
    render();
  }

  function toggle() {
    open = !open;
    document.getElementById('assistant-panel').classList.toggle('open', open);
    if (open) {
      document.getElementById('assistant-model-label').textContent = API.Settings.getModel('chat');
      setTimeout(() => document.getElementById('assistant-text')?.focus(), 100);
      scrollBottom();
    }
  }

  function clearChat() {
    if (!confirm('Xoá toàn bộ lịch sử trò chuyện?')) return;
    messages = [];
    loadHistory();
    saveHistory();
    render();
  }

  function renderMsg(m) {
    const cls = m.role === 'user' ? 'msg-user' : 'msg-assistant';
    const html = m.role === 'assistant' && window.marked
      ? window.marked.parse(m.content || '')
      : U.esc(m.content || '').replace(/\n/g, '<br>');
    return `<div class="msg ${cls}"><div class="msg-bubble">${html}</div></div>`;
  }

  function render() {
    const body = document.getElementById('assistant-body');
    if (!body) return;
    body.innerHTML = messages.map(renderMsg).join('') +
      (loading ? `<div class="msg msg-assistant"><div class="msg-bubble msg-loading">Đang suy nghĩ<span>.</span><span>.</span><span>.</span></div></div>` : '');
    scrollBottom();
  }

  function scrollBottom() {
    const body = document.getElementById('assistant-body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  async function send() {
    if (loading) return;
    const ta = document.getElementById('assistant-text');
    const text = (ta.value || '').trim();
    if (!text) return;
    messages.push({ role: 'user', content: text });
    ta.value = '';
    ta.style.height = 'auto';
    loading = true;
    render();

    try {
      const pid = currentProjectId();
      const recent = messages.slice(-12); // giữ ~12 lượt gần nhất
      const resp = await API.chat(recent, pid);
      messages.push({ role: 'assistant', content: resp.reply || '(trống)' });
    } catch (e) {
      messages.push({ role: 'assistant', content: `❌ Lỗi: ${e.message}` });
    } finally {
      loading = false;
      saveHistory();
      render();
    }
  }

  return { mount, toggle };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (window.Assistant) window.Assistant.mount();
});
setTimeout(() => { if (window.Assistant) window.Assistant.mount(); }, 300);
