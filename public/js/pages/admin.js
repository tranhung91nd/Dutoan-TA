window.Pages = window.Pages || {};

Pages.Admin = async function () {
  const cfg = await API.init();
  const hasKey = cfg && cfg.hasOpenAIKey;
  const hasDB = API.hasDB();

  return `
    <div class="page-title">Cài đặt</div>
    <div class="page-sub">Trạng thái hệ thống & kết nối.</div>

    <div class="section-title" style="font-size:14px;">Kết nối</div>
    <div class="kpi-grid kpi-2">
      <div class="card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <div style="width:10px;height:10px;border-radius:50%;background:var(--${hasDB ? 'green' : 'red'});"></div>
          <div style="font-weight:700;">Supabase</div>
        </div>
        <div style="font-size:12px;color:var(--tx2);">
          ${hasDB
            ? `Đã kết nối: <span class="mono">${U.esc(cfg.supabaseUrl)}</span>`
            : 'Chưa cấu hình. Cần set <span class="mono">SUPABASE_URL</span> và <span class="mono">SUPABASE_ANON_KEY</span> trong Vercel Environment.'}
        </div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <div style="width:10px;height:10px;border-radius:50%;background:var(--${hasKey ? 'green' : 'red'});"></div>
          <div style="font-weight:700;">OpenAI</div>
        </div>
        <div style="font-size:12px;color:var(--tx2);">
          ${hasKey
            ? `API key đã cấu hình (chỉ lưu ở server, không expose ra client).`
            : 'Chưa có API key. Set <span class="mono">OPENAI_API_KEY</span> trong Vercel Environment.'}
        </div>
      </div>
    </div>

    <div class="section-title" style="font-size:14px;margin-top:24px;">Hướng dẫn cấu hình Vercel</div>
    <div class="card">
      <div class="prose">
        <ol>
          <li>Vào <strong>Vercel Dashboard</strong> → chọn project → <strong>Settings</strong> → <strong>Environment Variables</strong></li>
          <li>Thêm các biến:
            <ul>
              <li><code>OPENAI_API_KEY</code> — từ <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a></li>
              <li><code>SUPABASE_URL</code> — URL project Supabase</li>
              <li><code>SUPABASE_ANON_KEY</code> — anon public key</li>
              <li><code>SUPABASE_SERVICE_ROLE_KEY</code> — service role (dùng ở serverless function)</li>
            </ul>
          </li>
          <li>Sau khi thêm, bấm <strong>Redeploy</strong> để biến có hiệu lực</li>
        </ol>
      </div>
    </div>

    <div class="section-title" style="font-size:14px;margin-top:24px;">Giá OpenAI API (tham khảo 2025)</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Model</th><th>Dùng cho</th><th style="text-align:right;">Input / 1M tokens</th><th style="text-align:right;">Output / 1M tokens</th><th style="text-align:right;">VND/lần phân tích*</th></tr></thead>
        <tbody>
          <tr>
            <td class="mono">gpt-5-mini</td>
            <td>Phân tích pháp lý, dự toán (mặc định)</td>
            <td class="mono" style="text-align:right;">$0.25</td>
            <td class="mono" style="text-align:right;">$2</td>
            <td class="mono" style="text-align:right;font-weight:600;">~1-3K</td>
          </tr>
          <tr>
            <td class="mono">gpt-5</td>
            <td>Upgrade khi cần độ chính xác cao</td>
            <td class="mono" style="text-align:right;">$1.25</td>
            <td class="mono" style="text-align:right;">$10</td>
            <td class="mono" style="text-align:right;font-weight:600;">~5-10K</td>
          </tr>
          <tr>
            <td class="mono">gpt-4o-mini</td>
            <td>Phân loại lĩnh vực, tóm tắt</td>
            <td class="mono" style="text-align:right;">$0.15</td>
            <td class="mono" style="text-align:right;">$0.60</td>
            <td class="mono" style="text-align:right;font-weight:600;">~0.5-2K</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="font-size:11px;color:var(--tx3);margin-top:8px;">* Ước tính cho 1 đề tài ~30 trang thuyết minh + 1 dự toán. OpenAI tự động cache prompt ≥1024 tokens (giảm ~50% chi phí input khi gọi lại trong 5-10 phút).</div>
  `;
};
