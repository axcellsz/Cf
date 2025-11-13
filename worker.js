// worker.js
// Single-file Cloudflare Worker -> UI + client logic (no external deps)
// Copy-paste to Cloudflare Workers (Save & Deploy)

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
    --danger: #fb7185;
    --card-shadow: 0 8px 24px rgba(9,30,63,0.06);
    --radius: 12px;
    --summary-height: 96px; /* reserved height for fixed summary */
  }
  html,body{
    height:100%;
    margin:0;
    font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    background:var(--bg);
    color:var(--text);
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
    font-size:14px;
  }

  /* Fixed summary at top */
  header.summary{
    position:fixed;
    top:0;
    left:0;
    right:0;
    z-index:1200;
    background: #b3e9ff;
    padding:12px 16px;
    box-shadow: var(--card-shadow);
    border-bottom:2px solid rgba(0,0,0,0.08); /* underline */
  }

  /* make sure main content doesn't go under fixed header */
  .content-wrap{
    padding-top: calc(var(--summary-height) + 12px); /* reserve space (summary height + gap) */
    max-width:920px;
    margin:0 auto;
    padding-left:12px;
    padding-right:12px;
    box-sizing:border-box;
  }

  /* SUMMARY: three lines, label left and number right aligned */
  .summary-lines{
    display:flex;
    flex-direction:column;
    gap:6px;
    max-width:900px;
    margin:0 auto;
  }
  .summary-line{
    display:flex;
    align-items:center;
    gap:12px;
    justify-content:space-between;
  }
  .sum-left{
    color:var(--muted);
    font-weight:700;
    font-size:0.95rem;
    flex:0 0 220px; /* label column width */
  }
  .sum-colon{
    color:var(--muted);
    width:18px;
    text-align:center;
    flex:0 0 18px;
  }
  .sum-right{
    text-align:right;
    font-weight:900;
    color:var(--text);
    min-width:120px;
    font-size:0.95rem;
  }

  /* Card list */
  .wrap-card{
    margin-top:8px;
  }
  .list-card{ margin-top:12px; background:var(--surface); border-radius:12px; padding:10px; box-shadow:var(--card-shadow); min-height:300px; }
  .empty{ padding:24px 12px; color:var(--muted); text-align:center; }

  .tx-item{
    background: linear-gradient(180deg, #fff, #fff6e6);
    border-radius:10px;
    padding:10px;
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:10px;
    margin-bottom:10px;
    border:1px solid rgba(11,18,20,0.04);
    line-height:1.12; /* reduced spacing */
    font-size:0.92rem; /* slightly smaller overall */
  }
  .tx-left{ flex:1; }
  .tx-title{ font-weight:800; font-size:1.00rem; margin-bottom:6px; display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
  .tx-name{ font-weight:800; line-height:1.02; }
  .tx-meta{ color:var(--muted); font-size:0.86rem; }

  /* NEW: values grid - labels left, values right, includes Waktu as last row */
  .tx-values{
    display:grid;
    grid-template-columns: 1fr auto;
    column-gap:12px;
    row-gap:6px;
    align-items:center;
    font-size:0.88rem; /* smaller per request */
    color:var(--muted);
    margin-top:6px;
  }
  .tx-values .label{ text-align:left; font-weight:700; color:var(--muted); }
  .tx-values .value{ text-align:right; font-weight:800; color:var(--text); min-width:80px; }

  .tx-right{ display:flex; flex-direction:column; gap:6px; align-items:flex-end; }
  .btn-small{
    background:transparent;
    border:0;
    color:var(--danger);
    font-weight:700;
    padding:6px 8px;
    border-radius:8px;
    cursor:pointer;
    box-shadow:none;
    font-size:0.86rem;
  }

  /* Floating + */
  .fab{
    position:fixed;
    right:18px;
    bottom:18px;
    width:66px;
    height:66px;
    border-radius:12px;
    background:var(--accent);
    display:flex;
    align-items:center;
    justify-content:center;
    box-shadow: 0 8px 18px rgba(0,0,0,0.30); /* subtle black shadow */
    color:white;
    font-weight:800;
    font-size:34px;
    z-index:1200;
    cursor:pointer;
    border:0; /* remove outline */
    outline: none;
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
    width:calc(100% - 36px);
    max-width:520px;
    background:var(--accent);
    border-radius:12px 12px 10px 10px;
    padding:12px;
    box-sizing:border-box;
    margin-bottom:14px; /* sits above keyboard */
    box-shadow:0 10px 28px rgba(6,182,212,0.18);
  }
  .modal h3{ margin:0 0 8px 0; text-align:center; color:#053047; font-weight:800; font-size:1.02rem; }

  .form-field{ background:#fff; border-radius:10px; padding:10px; margin-bottom:8px; display:flex; align-items:center; gap:10px; border:1px solid rgba(0,0,0,0.04); }
  .form-field input[type="text"], .form-field input[type="number"]{
    border:0; outline:none; font-size:14px; flex:1; background:transparent;
    padding:6px 4px;
  }
  .form-actions{ display:flex; gap:10px; justify-content:center; margin-top:6px; }
  .btn-main{
    background:#0369a1; color:#fff; border:0; padding:10px 18px; border-radius:10px; font-weight:800; cursor:pointer; min-width:110px;
    font-size:0.95rem;
  }
  .btn-cancel{ background:transparent; color:#053047; border:2px solid rgba(0,0,0,0.06); padding:8px 14px; border-radius:10px; cursor:pointer; font-weight:700; font-size:0.92rem; }

  /* responsive tweaks */
  @media (max-width:420px){
    :root{ --summary-height: 110px; }
    .sum-left{ flex:0 0 140px; font-size:0.88rem; }
    .sum-right{ min-width:84px; font-size:0.92rem; }
    .modal{ width:calc(100% - 28px); margin-bottom:10px; padding:12px; border-radius:10px; }
    .fab{ width:62px; height:62px; font-size:30px; right:12px; bottom:12px; border-radius:10px; }
    .tx-values{ font-size:0.82rem; }
  }
</style>
</head>
<body>
  <!-- Fixed summary -->
  <header class="summary" aria-hidden="false">
    <div class="summary-lines" role="region" aria-label="Ringkasan total">
      <div class="summary-line">
        <div class="sum-left">Total modal</div>
        <div class="sum-colon">:</div>
        <div class="sum-right" id="totalModal">0</div>
      </div>
      <div class="summary-line">
        <div class="sum-left">Total penjualan</div>
        <div class="sum-colon">:</div>
        <div class="sum-right" id="totalJual">0</div>
      </div>
      <div class="summary-line">
        <div class="sum-left">Total laba</div>
        <div class="sum-colon">:</div>
        <div class="sum-right" id="totalUntung">0</div>
      </div>
    </div>
  </header>

  <div class="content-wrap">
    <div class="wrap-card">
      <section class="list-card" id="listCard" aria-live="polite">
        <ol id="txList" style="list-style:none; padding:8px; margin:0;"></ol>
        <div id="emptyHint" class="empty">Belum ada catatan penjualan. Tekan tombol <strong>+</strong> untuk menambah transaksi.</div>
      </section>
    </div>
  </div>

  <!-- Floating add -->
  <button class="fab" id="fab" aria-label="Tambah transaksi">+</button>

  <!-- Modal -->
  <div class="modal-wrap" id="modalWrap" aria-hidden="true">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="formTitle">
      <h3>Tambah Transaksi</h3>

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

/* moneyDisplay: integer -> thousand separator with dots, fractional -> 2 decimals with dot */
function moneyDisplay(n){
  if (n === null || n === undefined || isNaN(Number(n))) return '0';
  const num = Number(n);
  if (Number.isInteger(num)) {
    return num.toLocaleString('id-ID').replace(/,/g, '.');
  } else {
    return num.toFixed(2);
  }
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

      // title row: name on left, delete on right (time moved to values)
      const title = document.createElement('div'); title.className = 'tx-title';
      const name = document.createElement('div'); name.className = 'tx-name'; name.textContent = (idx+1) + '. ' + it.name;
      title.appendChild(name);

      // delete button at right top
      const delBtnTop = document.createElement('button');
      delBtnTop.className = 'btn-small';
      delBtnTop.textContent = 'hapus transaksi';
      delBtnTop.addEventListener('click', function(){
        if (!confirm('Hapus transaksi \"' + it.name + '\" ?')) return;
        items.splice(idx,1); saveAll(); render();
      });

      // values grid: labels left, values right, includes Waktu
      const meta = document.createElement('div'); meta.className = 'tx-values';
      // create rows
      const labels = ['Modal', 'Jual', 'Laba', 'Waktu'];
      const vals = [ moneyDisplay(it.cost), moneyDisplay(it.sell), moneyDisplay(it.profit), it.displayDate ];
      for (let i=0;i<labels.length;i++){
        const lab = document.createElement('div'); lab.className='label'; lab.textContent = labels[i] + ' :';
        const val = document.createElement('div'); val.className='value'; val.textContent = vals[i];
        meta.appendChild(lab);
        meta.appendChild(val);
      }

      left.appendChild(title);
      left.appendChild(meta);
      right.appendChild(delBtnTop);

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

  totalModalEl.textContent = moneyDisplay(totals.cost);
  totalJualEl.textContent = moneyDisplay(totals.sell);
  totalUntungEl.textContent = moneyDisplay(totals.profit);
}

function openForm(){
  // hide FAB
  fab.style.display = 'none';
  modalWrap.style.display = 'flex';
  modalWrap.setAttribute('aria-hidden','false');
  // clear fields
  fName.value = '';
  fSell.value = '';
  fCost.value = '';
  setTimeout(()=> {
    fName.focus();
    const rect = document.querySelector('.modal').getBoundingClientRect();
    if (rect) window.scrollTo({ top: Math.max(0, rect.top - 20), behavior: 'smooth' });
  }, 120);
}

function closeForm(){
  modalWrap.style.display = 'none';
  modalWrap.setAttribute('aria-hidden','true');
  // show FAB again
  fab.style.display = 'flex';
  try { fName.blur(); fSell.blur(); fCost.blur(); } catch(e){}
}

function formatDisplayDate(d){
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

</script>
</body>
</html>`;
