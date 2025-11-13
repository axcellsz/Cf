// worker.js
// Single-file Cloudflare Worker -> UI + client logic (no external deps)
// Persistance: localStorage (browser)
// Copy-paste ke Cloudflare Workers (Save & Deploy)

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname || '/';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (pathname === '/' || pathname === '' || pathname === '/index.html') {
      return new Response(HTML_PAGE, {
        status: 200,
        headers: Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, corsHeaders())
      });
    }
    return new Response('Not found', { status: 404, headers: corsHeaders() });
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

const HTML_PAGE = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<title>Catatan Penjualan</title>
<style>
  :root{
    --bg: #f3f6f8;
    --surface: #ffffff;
    --muted: #6b7280;
    --text: #0f1720;
    --accent: #38bdf8; /* soft cyan */
    --accent-2: #06b6d4; /* teal */
    --danger: #fb7185;
    --card-shadow: 0 8px 24px rgba(9,30,63,0.06);
    --radius: 14px;
  }
  html,body{
    height:100%;
    margin:0;
    font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    background:var(--bg);
    color:var(--text);
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
    font-size:15px;
  }

  /* Layout */
  .wrap{ max-width:820px; margin:12px auto 110px; padding:12px; box-sizing:border-box; }
  header.summary{
    background: linear-gradient(180deg, rgba(56,189,248,0.12), rgba(56,189,248,0.06));
    border-radius:12px; padding:12px 18px; display:flex; gap:16px; align-items:center; box-shadow: var(--card-shadow);
  }
  .summary-left{ flex:1; }
  .summary-row{ display:flex; gap:12px; align-items:center; }
  .sum-list{ list-style:none; padding:0; margin:0; display:flex; gap:22px; flex-wrap:wrap; }
  .sum-list li{ color:var(--muted); font-size:0.95rem; }
  .sum-label{ color:var(--muted); font-weight:600; margin-right:6px; }
  .sum-number{ font-weight:800; color:var(--text); }

  /* Card list */
  .list-card{ margin-top:14px; background:var(--surface); border-radius:14px; padding:12px; box-shadow:var(--card-shadow); min-height:360px; }
  .empty{ padding:36px 12px; color:var(--muted); text-align:center; }

  .tx-item{
    background: linear-gradient(180deg, #fff, #fffbeb);
    border-radius:12px;
    padding:12px;
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:12px;
    margin-bottom:12px;
    border:1px solid rgba(11,18,20,0.04);
  }
  .tx-left{ flex:1; }
  .tx-title{ font-weight:800; font-size:1.05rem; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; gap:12px; }
  .tx-meta{ color:var(--muted); font-size:0.92rem; }
  .tx-values{ margin-top:8px; color:var(--muted); font-size:0.92rem; line-height:1.5; }

  .tx-right{ display:flex; flex-direction:column; gap:8px; align-items:flex-end; }
  .btn-small{
    background:transparent;
    border:0;
    color:var(--danger);
    font-weight:700;
    padding:8px 10px;
    border-radius:8px;
    cursor:pointer;
    box-shadow:none;
  }

  /* Floating + */
  .fab{
    position:fixed;
    right:18px;
    bottom:18px;
    width:72px;
    height:72px;
    border-radius:14px;
    background:var(--accent);
    display:flex;
    align-items:center;
    justify-content:center;
    box-shadow: 0 14px 30px rgba(6,182,212,0.18);
    color:white;
    font-weight:800;
    font-size:34px;
    z-index:1200;
    cursor:pointer;
  }

  /* Modal form */
  .modal-wrap{
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    top:0;
    display:none;
    align-items:flex-end; /* appear from bottom */
    justify-content:center;
    z-index:1100;
    background:rgba(7,10,15,0.28);
  }
  .modal{
    width:calc(100% - 40px);
    max-width:520px;
    background:var(--accent);
    border-radius:14px 14px 10px 10px;
    padding:14px;
    box-sizing:border-box;
    margin-bottom:20px; /* sits above keyboard */
    box-shadow:0 10px 28px rgba(6,182,212,0.18);
  }
  .form-field{ background:#fff; border-radius:10px; padding:12px; margin-bottom:10px; display:flex; align-items:center; gap:10px; border:1px solid rgba(0,0,0,0.04); }
  .form-field input[type="text"], .form-field input[type="number"]{
    border:0; outline:none; font-size:15px; flex:1; background:transparent;
  }
  .form-actions{ display:flex; gap:10px; justify-content:center; margin-top:6px; }
  .btn-main{
    background:#0369a1; color:#fff; border:0; padding:10px 18px; border-radius:10px; font-weight:800; cursor:pointer; min-width:120px;
  }
  .btn-cancel{ background:transparent; color:#083344; border:2px solid rgba(0,0,0,0.06); padding:10px 16px; border-radius:10px; cursor:pointer; font-weight:700; }

  /* responsive tweaks */
  @media (max-width:420px){
    .fab{ width:64px; height:64px; font-size:30px; right:12px; bottom:12px; border-radius:12px; }
    .modal{ width:calc(100% - 30px); margin-bottom:12px; padding:12px; border-radius:12px; }
  }
</style>
</head>
<body>
  <div class="wrap" id="app">
    <header class="summary" aria-hidden="false">
      <div class="summary-left">
        <ul class="sum-list" id="summaryList">
          <li><span class="sum-label">Total modal</span> : <span class="sum-number" id="totalModal">0</span></li>
          <li><span class="sum-label">Total penjualan.</span> : <span class="sum-number" id="totalJual">0</span></li>
          <li><span class="sum-label">Total Keuntungan</span> : <span class="sum-number" id="totalUntung">0</span></li>
        </ul>
      </div>
    </header>

    <section class="list-card" id="listCard" aria-live="polite">
      <ol id="txList" style="list-style:none; padding:0; margin:0;"></ol>
      <div id="emptyHint" class="empty">Belum ada catatan penjualan. Tekan tombol <strong>+</strong> untuk menambah transaksi.</div>
    </section>
  </div>

  <!-- Floating add -->
  <button class="fab" id="fab" aria-label="Tambah transaksi">+</button>

  <!-- Modal -->
  <div class="modal-wrap" id="modalWrap" aria-hidden="true">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="formTitle">
      <div style="text-align:center; margin-bottom:6px; color:#053047; font-weight:800;">Tambah Transaksi</div>

      <div class="form-field">
        <input id="fName" type="text" placeholder="Tulis jenis barang" autocomplete="off" />
      </div>

      <div class="form-field">
        <input id="fSell" type="number" placeholder="Masukan Harga jual" inputmode="numeric" />
      </div>

      <div class="form-field">
        <input id="fCost" type="number" placeholder="Masukan harga modal" inputmode="numeric" />
      </div>

      <div class="form-actions">
        <button class="btn-cancel" id="cancelBtn" type="button">BATAL</button>
        <button class="btn-main" id="saveBtn" type="button">SIMPAN</button>
      </div>
    </div>
  </div>

<script>
/* Client logic: storage + UI */
const KEY = 'sales_notes_v1';
const fab = document.getElementById('fab');
const modalWrap = document.getElementById('modalWrap');
const fName = document.getElementById('fName');
const fSell = document.getElementById('fSell');
const fCost = document.getElementById('fCost');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const txList = document.getElementById('txList');
const emptyHint = document.getElementById('emptyHint');
const totalModalEl = document.getElementById('totalModal');
const totalJualEl = document.getElementById('totalJual');
const totalUntungEl = document.getElementById('totalUntung');

let items = load();

function load(){
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : [];
  } catch(e){ console.error(e); return []; }
}

function saveAll(){
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch(e){ console.error(e); }
}

function moneyFormat(n){
  if (n === null || n === undefined || isNaN(Number(n))) return '0';
  // Indonesian locale formatting, no decimals if integer else shows up to 2 decimals
  const num = Number(n);
  return num.toLocaleString('id-ID');
}

function render(){
  txList.innerHTML = '';
  if (!items || items.length === 0) {
    emptyHint.style.display = 'block';
  } else {
    emptyHint.style.display = 'none';
    items.forEach((it, idx) => {
      const li = document.createElement('li');
      li.className = 'tx-item';
      const left = document.createElement('div'); left.className = 'tx-left';
      const right = document.createElement('div'); right.className = 'tx-right';

      const title = document.createElement('div'); title.className = 'tx-title';
      const name = document.createElement('div'); name.textContent = (idx+1) + '. ' + it.name;
      const date = document.createElement('div'); date.style.fontSize='0.86rem'; date.style.color='var(--muted)';
      date.textContent = it.displayDate;
      title.appendChild(name);
      title.appendChild(date);

      const meta = document.createElement('div'); meta.className = 'tx-values';
      meta.innerHTML = 
        '<div>Modal : <strong>' + moneyFormat(it.cost) + '</strong></div>' +
        '<div>Jual  : <strong>' + moneyFormat(it.sell) + '</strong></div>' +
        '<div>Keuntungan : <strong>' + moneyFormat(it.profit) + '</strong></div>';

      left.appendChild(title);
      left.appendChild(meta);

      // right: delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-small';
      delBtn.textContent = 'hapus transaksi';
      delBtn.addEventListener('click', function(){
        if (!confirm('Hapus transaksi "' + it.name + '" ?')) return;
        items.splice(idx,1); saveAll(); render();
      });

      right.appendChild(delBtn);

      li.appendChild(left);
      li.appendChild(right);
      txList.appendChild(li);
    });
  }
  // update totals
  const totals = items.reduce((acc, it) => {
    acc.cost += Number(it.cost) || 0;
    acc.sell += Number(it.sell) || 0;
    acc.profit += Number(it.profit) || 0;
    return acc;
  }, {cost:0, sell:0, profit:0});

  totalModalEl.textContent = moneyFormat(totals.cost);
  totalJualEl.textContent = moneyFormat(totals.sell);
  totalUntungEl.textContent = moneyFormat(totals.profit);
}

function openForm(){
  modalWrap.style.display = 'flex';
  modalWrap.setAttribute('aria-hidden','false');
  // clear fields
  fName.value = '';
  fSell.value = '';
  fCost.value = '';
  // focus input after slight delay so keyboard appears and modal sits above it
  setTimeout(()=> {
    fName.focus();
    // on mobile try to scroll modal into view
    const rect = document.querySelector('.modal').getBoundingClientRect();
    if (rect) window.scrollTo({ top: Math.max(0, rect.top - 20), behavior: 'smooth' });
  }, 120);
}

function closeForm(){
  modalWrap.style.display = 'none';
  modalWrap.setAttribute('aria-hidden','true');
  // blur inputs to close keyboard
  try { fName.blur(); fSell.blur(); fCost.blur(); } catch(e){}
}

function formatDisplayDate(d){
  // d is Date or timestamp
  const date = new Date(d);
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const day = String(date.getDate()).padStart(2,'0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2,'0');
  const mm = String(date.getMinutes()).padStart(2,'0');
  return day + ' ' + month + ' ' + year + ' / ' + hh + ':' + mm;
}

fab.addEventListener('click', function(){
  openForm();
});

cancelBtn.addEventListener('click', function(){ closeForm(); });

saveBtn.addEventListener('click', function(){
  const name = fName.value.trim();
  const sell = fSell.value.trim();
  const cost = fCost.value.trim();

  if (!name) { alert('Isi nama barang'); fName.focus(); return; }
  if (!sell || isNaN(Number(sell))) { alert('Isi harga jual yang valid'); fSell.focus(); return; }
  if (!cost || isNaN(Number(cost))) { alert('Isi harga modal yang valid'); fCost.focus(); return; }

  const s = Number(sell);
  const c = Number(cost);
  const profit = s - c;

  const item = {
    id: Date.now() + Math.random().toString(36).slice(2,6),
    name: name,
    sell: s,
    cost: c,
    profit: profit,
    ts: Date.now(),
    displayDate: formatDisplayDate(Date.now())
  };

  items.unshift(item); // newest first
  saveAll();
  render();
  closeForm();
});

window.addEventListener('load', function(){ render(); });

/* optional: prevent page zoom/change size on double-tap - mobile browsers vary; we already set viewport user-scalable=no */
</script>
</body>
</html>`;
