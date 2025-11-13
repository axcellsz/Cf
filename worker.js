// worker.js (FINAL - UI polished, localStorage persistence, extract remaining + expDate)
// DEV only: credentials embedded for learning/testing only.

const AUTH_BASIC = 'Basic c2lkb21wdWxhcGk6YXBpZ3drbXNw';
const X_API_KEY = '60ef29aa-a648-4668-90ae-20951ef90c55';
const X_APP_VERSION = '4.0.0';
const UPSTREAM_BASE = 'https://apigw.kmsp-store.com/sidompul/v4/cek_kuota';

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname || '/';

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }

      // Proxy endpoint: /cek?msisdn=...
      if (url.searchParams.has('msisdn') || pathname === '/cek' || pathname.startsWith('/cek/')) {
        let msisdn = url.searchParams.get('msisdn') || null;
        if (!msisdn) {
          const parts = pathname.split('/').filter(Boolean);
          const idx = parts.indexOf('cek');
          if (idx !== -1 && parts.length > idx + 1) msisdn = parts[idx + 1];
        }

        if (!msisdn) {
          return jsonResponse({ error: 'Missing parameter: msisdn' }, 400);
        }

        const upstreamUrl = UPSTREAM_BASE + '?msisdn=' + encodeURIComponent(msisdn) + '&isJSON=true';

        const resp = await fetch(upstreamUrl, {
          method: 'GET',
          headers: {
            'Authorization': AUTH_BASIC,
            'X-API-Key': X_API_KEY,
            'X-App-Version': X_APP_VERSION,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        const text = await resp.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch (e) { parsed = text; }

        return new Response(JSON.stringify(parsed, null, 2), {
          status: resp.status,
          headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders())
        });
      }

      // Serve UI
      if (pathname === '/' || pathname === '' || pathname === '/index.html') {
        return new Response(HTML_PAGE, {
          status: 200,
          headers: Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, corsHeaders())
        });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      return jsonResponse({ error: 'Internal Worker Error', detail: String(err) }, 500);
    }
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Vary': 'Origin'
  };
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, corsHeaders())
  });
}

// ===== HTML page (template literal) =====
// NOTE: do not include ${...} sequences inside this big template to avoid outer interpolation.
const HTML_PAGE = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<title>Daftar Pelanggan - Cek Kuota</title>
<style>
  :root{
    --bg:#f6f7fb;
    --card:#ffffff;
    --accent:#16a34a; /* hijau */
    --muted:#6b7280;
    --text:#0b1220;
    --success:#16a34a;
    --glass: rgba(11,18,32,0.04);
  }

  html,body{
    height:100%;
    margin:0;
    font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial;
    color:var(--text);
    background:var(--bg);
    font-size:14px; /* sedikit lebih kecil */
    -webkit-font-smoothing:antialiased;
  }

  .container{
    padding:16px;
    padding-bottom:120px;
    box-sizing:border-box;
    max-width:900px;
    margin:0 auto;
  }

  h1{ font-size:1.15rem; margin:0 0 6px 0; }
  p.lead{ margin:0 0 10px 0; color:var(--muted); font-size:0.88rem; }

  .result-box{
    background:var(--card);
    border-radius:10px;
    padding:10px;
    box-shadow:0 4px 14px rgba(16,24,40,0.05);
    border:1px solid var(--glass);
  }

  ol.pelanggan{ margin:0; padding-left:16px; font-size:0.95rem; line-height:1.6; color:var(--text); }
  .customer-row{ display:flex; justify-content:space-between; gap:10px; padding:10px 6px; border-bottom:1px dashed rgba(0,0,0,0.06); align-items:center; }
  .customer-row:last-child{ border-bottom:0; }

  .cust-left{ display:flex; flex-direction:column; }
  .cust-name{ font-weight:700; font-size:0.98rem; }
  .cust-phone{ color:var(--muted); font-size:0.86rem; margin-top:4px; }
  .cust-extra{ color:var(--muted); font-size:0.86rem; margin-top:6px; }

  /* Kuota hijau tebal (angka) */
  .quota-strong{
    font-weight:800;
    color:var(--success);
  }

  .badge{
    padding:4px 8px;
    border-radius:8px;
    font-size:0.75rem;
    color:#fff;
  }
  .badge.ok{ background:var(--success); }
  .badge.err{ background:#ef4444; }

  /* Bottom bar: tipis, hitam, lebih pendek */
  .bottom-bar{
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    background:#fff;
    border-top:1px solid #000; /* garis hitam tipis */
    padding:8px 10px; /* lebih rendah */
    box-sizing:border-box;
    z-index:999;
    box-shadow:0 -4px 16px rgba(0,0,0,0.04);
  }

  .bar-inner{
    max-width:1000px;
    margin:0 auto;
    display:flex;
    gap:10px;
    align-items:center;
    justify-content:space-between;
    padding:4px;
  }

  .inputs{ display:flex; gap:8px; align-items:center; flex:1; min-width:0; }
  .inputs .field{ display:flex; flex-direction:column; gap:6px; flex:1; min-width:0; }
  .inputs label{ font-size:0.72rem; color:var(--muted); }

  input[type="tel"], input[type="text"]{
    height:38px; /* lebih pendek */
    border-radius:8px;
    border:1px solid rgba(0,0,0,0.08);
    padding:0 10px;
    background:#fff;
    font-size:0.92rem;
    outline:none;
    box-sizing:border-box;
    width:100%;
  }

  .actions{ display:flex; gap:8px; align-items:center; }

  /* Semua tombol hijau dengan teks putih */
  .btn{
    border:0;
    border-radius:8px;
    padding:8px 10px;
    font-size:0.92rem;
    font-weight:800;
    display:inline-flex;
    gap:8px;
    align-items:center;
    justify-content:center;
    cursor:pointer;
    background:var(--accent); /* hijau */
    color:#fff; /* tulisan putih */
    box-shadow:0 8px 20px rgba(2,6,23,0.06);
    min-width:84px;
  }
  .btn svg{ width:14px; height:14px; opacity:0.95; }

  @media (max-width:640px){
    .bar-inner{ flex-direction:column; align-items:stretch; gap:8px; }
    .btn{ width:100%; }
  }

  .toast{ position:fixed; left:50%; transform:translateX(-50%); bottom:110px; background:#0b1220; color:#fff; padding:8px 12px; border-radius:8px; font-size:0.92rem; box-shadow:0 6px 20px rgba(11,18,32,0.2); z-index:1000; display:none; }
</style>
</head>
<body>

  <div class="container">
    <h1>Daftar pelanggan</h1>

   <div class="result-box">
      <ol id="customerList" class="pelanggan"></ol>
      <div id="emptyHint" class="hint" style="margin-top:8px; color:var(--muted); font-size:0.88rem;">Belum ada pelanggan. Tambahkan lewat form di bawah.</div>
    </div>

    <p style="margin-top:12px; color:var(--muted); font-size:0.86rem;">Catatan: contoh ini hanya untuk pembelajaran — kredensial dimasukkan di worker (dev).</p>
  </div>

  <div class="bottom-bar" role="region" aria-label="Kontrol utama">
    <div class="bar-inner">
      <div class="inputs">
        <div class="field" style="flex:1; min-width:0">
          <label for="msisdnInput">Nomor</label>
          <input id="msisdnInput" type="tel" placeholder="Contoh: 6281234567890" inputmode="tel" />
        </div>

        <div class="field" style="width:170px; max-width:34%;">
          <label for="nameInput">Nama</label>
          <input id="nameInput" type="text" placeholder="Nama pelanggan" />
        </div>
      </div>

      <div class="actions" role="group" aria-label="Tombol aksi">
        <button id="saveBtn" class="btn" title="SIMPAN (T1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4"></path>
            <path d="M5 10V3h14v7"></path>
            <path d="M12 3v11"></path>
          </svg>
          SIMPAN
        </button>

        <button id="checkBtn" class="btn" title="CEK KUOTA (T2)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 17l-4-4 6-6 4 4-6 6z"></path>
            <path d="M21 21l-4.35-4.35"></path>
          </svg>
          CEK KUOTA
        </button>

        <button id="deleteBtn" class="btn" title="HAPUS (T3)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
          </svg>
          HAPUS
        </button>
      </div>
    </div>
  </div>

  <div id="toast" class="toast" role="status" aria-live="polite"></div>

<script>
/* CLIENT-SIDE: localStorage persistence, UI logic */
/* No template interpolation markers inside HTML_PAGE */
const KEY = 'pelanggan_list_v1';
const msisdnInput = document.getElementById('msisdnInput');
const nameInput = document.getElementById('nameInput');
const saveBtn = document.getElementById('saveBtn');
const checkBtn = document.getElementById('checkBtn');
const deleteBtn = document.getElementById('deleteBtn');
const listEl = document.getElementById('customerList');
const emptyHint = document.getElementById('emptyHint');
const toast = document.getElementById('toast');

let customers = loadCustomers(); // do not auto-add sample data

function showToast(msg, ms=2200){ toast.textContent = msg; toast.style.display = 'block'; clearTimeout(showToast._t); showToast._t = setTimeout(()=> toast.style.display = 'none', ms); }
function loadCustomers(){ try{ const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : []; } catch(e){ console.error('load error', e); return []; } }
function saveCustomers(){ try{ localStorage.setItem(KEY, JSON.stringify(customers)); } catch(e){ console.error('save error', e); } }

function renderList(){
  listEl.innerHTML = '';
  if (!customers || customers.length === 0) { emptyHint.style.display = 'block'; return; }
  emptyHint.style.display = 'none';
  customers.forEach((c, idx) => {
    const li = document.createElement('li');
    li.className = 'customer-row';
    const left = document.createElement('div');
    left.className = 'cust-left';
    const meta = document.createElement('div');
    const nameEl = document.createElement('div');
    nameEl.className = 'cust-name';
    nameEl.textContent = (idx+1) + '.  ' + c.name;
    const phoneEl = document.createElement('div');
    phoneEl.className = 'cust-phone';
    phoneEl.textContent = c.phone;
    meta.appendChild(nameEl);
    meta.appendChild(phoneEl);
    left.appendChild(meta);

    // extra line for quota summary (if any)
    if (c.lastResult && c.lastResult.summary) {
      const extra = document.createElement('div');
      extra.className = 'cust-extra';
      // highlight quota number with green bold
      extra.innerHTML = highlightQuota(c.lastResult.summary);
      left.appendChild(extra);
    }

    const right = document.createElement('div');
    if (c.lastResult && c.lastResult.status) {
      const b = document.createElement('span');
      b.className = 'badge ' + (c.lastResult.ok ? 'ok' : 'err');
      b.textContent = c.lastResult.status;
      right.appendChild(b);
    } else {
      const b = document.createElement('span');
      b.className = 'small';
      b.textContent = 'Belum dicek';
      right.appendChild(b);
    }

    li.appendChild(left);
    li.appendChild(right);
    listEl.appendChild(li);
  });
}

// initial render
renderList();

function validatePhone(p){
  if (!p) return 'Nomor kosong';
  const cleaned = p.replace(/\s|\-/g, '');
  if (!/^[+0-9]{6,15}$/.test(cleaned)) return 'Format nomor tidak valid';
  return null;
}

// SIMPAN
saveBtn.addEventListener('click', function () {
  const phone = msisdnInput.value.trim();
  const name = nameInput.value.trim();
  const err = validatePhone(phone);
  if (err) { showToast(err); return; }
  if (!name) { showToast('Nama kosong'); return; }
  const exists = customers.find(function(c){ return c.phone === phone || c.name.toLowerCase() === name.toLowerCase(); });
  if (exists) { showToast('Nomor atau nama sudah ada'); return; }
  customers.push({ name: name, phone: phone, lastResult: null });
  saveCustomers();
  renderList();
  msisdnInput.value = '';
  nameInput.value = '';
  showToast('Tersimpan');
});

// small JSON preview fallback
function buildSummaryFromData(data, resp) {
  if (!data) return resp.ok ? 'OK' : 'HTTP ' + resp.status;
  if (typeof data === 'string' || typeof data === 'number') return String(data);
  if (data.message) return String(data.message);
  if (data.statusCode) return String(data.statusCode);
  try {
    var txt = JSON.stringify(data);
    return txt.length > 60 ? txt.slice(0,60) + '...' : txt;
  } catch(e) {
    return resp.ok ? 'OK' : 'HTTP ' + resp.status;
  }
}

// CEK KUOTA
checkBtn.addEventListener('click', async function () {
  if (!customers || customers.length === 0) { showToast('Belum ada pelanggan'); return; }
  showToast('Memeriksa semua...');
  checkBtn.disabled = true;
  try {
    for (var i = 0; i < customers.length; i++) {
      var c = customers[i];
      c.lastResult = { status: 'checking', ok: false, summary: 'memeriksa...' };
      renderList();

      try {
        var url = new URL(location.href);
        url.pathname = '/cek';
        url.searchParams.set('msisdn', c.phone);

        var resp = await fetch(url.toString(), { method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store' });
        var data;
        var ct = resp.headers.get('content-type') || '';
        if (ct.indexOf('application/json') !== -1) {
          data = await resp.json();
        } else {
          var txt = await resp.text();
          try { data = JSON.parse(txt); } catch(e) { data = txt; }
        }

        // extract remaining & expDate
        var quotaObj = extractQuota(data);
        var summaryText;
        if (quotaObj && typeof quotaObj === 'object' && quotaObj.remaining) {
          summaryText = 'Sisa ' + quotaObj.remaining + (quotaObj.expDate ? ' — Aktif s.d ' + quotaObj.expDate : '');
        } else if (typeof quotaObj === 'string') {
          summaryText = 'Sisa ' + quotaObj;
        } else {
          summaryText = buildSummaryFromData(data, resp);
        }

        c.lastResult = {
          status: resp.ok ? 'OK' : 'ERR ' + resp.status,
          ok: resp.ok,
          summary: summaryText
        };
      } catch (err) {
        c.lastResult = { status: 'ERR', ok: false, summary: String(err).slice(0,120) };
      }

      saveCustomers();
      renderList();
      await new Promise(function(r){ setTimeout(r, 380); });
    }
    showToast('Selesai');
  } catch(e) {
    showToast('Terjadi kesalahan saat cek');
  } finally {
    checkBtn.disabled = false;
  }
});

// HAPUS (by name)
deleteBtn.addEventListener('click', function () {
  var name = nameInput.value.trim();
  if (!name) { showToast('Masukkan Nama untuk menghapus'); return; }
  var idx = customers.findIndex(function(c){ return c.name.toLowerCase() === name.toLowerCase(); });
  if (idx === -1) { showToast('Nama tidak ditemukan'); return; }
  if (!confirm('Hapus pelanggan "' + customers[idx].name + '"?')) return;
  customers.splice(idx, 1);
  saveCustomers();
  renderList();
  showToast('Terhapus');
  nameInput.value = '';
});

/* extractQuota: returns { remaining: '7.3 GB', expDate: 'DD/MM/YYYY' } or string fallback */
function extractQuota(obj) {
  if (!obj) return null;
  try {
    // 1) Specific path from API: data.data_sp.quotas.value -> nested arrays
    if (obj && obj.data && obj.data.data_sp && obj.data.data_sp.quotas) {
      var val = obj.data.data_sp.quotas.value;
      if (Array.isArray(val)) {
        // flatten deeply
        var flat = val.flat(Infinity);
        for (var i = 0; i < flat.length; i++) {
          var item = flat[i];
          if (!item) continue;
          // item may contain packages & benefits
          if (item.benefits && item.packages) {
            var benefit = item.benefits[0];
            var pkg = item.packages;
            if (benefit && benefit.remaining) {
              var rem = benefit.remaining;
              var exp = pkg && pkg.expDate ? formatDate(pkg.expDate) : null;
              return { remaining: rem, expDate: exp };
            }
          }
          // nested array case
          if (Array.isArray(item)) {
            for (var j = 0; j < item.length; j++) {
              var it2 = item[j];
              if (it2 && it2.benefits && it2.packages) {
                var benefit2 = it2.benefits[0];
                var pkg2 = it2.packages;
                if (benefit2 && benefit2.remaining) {
                  var rem2 = benefit2.remaining;
                  var exp2 = pkg2 && pkg2.expDate ? formatDate(pkg2.expDate) : null;
                  return { remaining: rem2, expDate: exp2 };
                }
              }
            }
          }
        }
      }
    }

    // 2) Parse "hasil" HTML string if present
    if (obj && obj.data && typeof obj.data.hasil === 'string') {
      var html = obj.data.hasil;
      var m = html.match(/Sisa\\s*Kuota[:\\s]*([\\d.,]+\\s*[MGK]B?)/i);
      var rem = m ? m[1] : null;
      // try to find date in ISO or YYYY-MM-DD
      var me = html.match(/(Aktif\\s*(?:Hingga|sampai|s\\.d|s.d|sd)?[:\\s]*)([0-9]{4}-[0-9]{2}-[0-9]{2})(?:T[0-9:.]*)?/i);
      var exp = me ? formatDate(me[2]) : null;
      if (rem) return { remaining: rem, expDate: exp };
      // sometimes expDate present as ISO in packages within hasil -> try ISO search
      var isoMatch = html.match(/(202[0-9]-[01][0-9]-[0-3][0-9])/);
      if (!rem && isoMatch) {
        return { remaining: null, expDate: formatDate(isoMatch[1]) };
      }
    }

    // 3) fallback: search object keys for remaining/expDate/quota/kuota
    if (typeof obj === 'object') {
      for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        if (/remaining|sisa|quota|kuota|benefits|quotas|expDate|exp_date/i.test(k)) {
          var r = extractQuota(obj[k]);
          if (r) return r;
        }
      }
    }

    // 4) primitive string fallback: find GB/MB patterns
    if (typeof obj === 'string') {
      var rx = /(\\d+(?:[.,]\\d+)?\\s?(?:g|G|gb|GB|mb|MB|kb|KB))/g;
      var mm = obj.match(rx);
      if (mm && mm.length) return mm[0].replace(',', '.');
    }
  } catch (e) {
    console.warn('extractQuota error', e);
  }
  return null;
}

// format ISO or date-like string to DD/MM/YYYY (no time)
function formatDate(iso) {
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) {
      var m = String(iso).match(/(\\d{4})-(\\d{2})-(\\d{2})/);
      if (m) return m[3] + '/' + m[2] + '/' + m[1];
      return String(iso);
    }
    var day = String(d.getDate()).padStart(2, '0');
    var mon = String(d.getMonth() + 1).padStart(2, '0');
    var yr = d.getFullYear();
    return day + '/' + mon + '/' + yr;
  } catch (e) {
    return String(iso);
  }
}

// highlightQuota: replace "Sisa 7.3 GB" -> "Sisa <span class='quota-strong'>7.3 GB</span>"
function highlightQuota(text) {
  if (!text) return '';
  try {
    // look for pattern "Sisa <number unit>"
    var replaced = text.replace(/Sisa\\s*([\\d.,]+\\s*(?:GB|MB|KB|gb|mb|kb))/i, function(match, p1){
      return 'Sisa <span class="quota-strong">' + p1 + '</span>';
    });
    return replaced;
  } catch (e) {
    return text;
  }
}

// keyboard shortcuts
msisdnInput.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }});
nameInput.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }});
</script>
</body>
</html>`;
