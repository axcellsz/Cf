// worker.js
const API_TOKEN = API_TOKEN_BINDING || 'axdotnet'; // binding name (see wrangler.toml or Dashboard Secrets)
const ORIGIN_HOST = ORIGIN_HOST_BINDING || 'myxl.me'; // origin domain
const ORIGIN_API_TOKEN = ORIGIN_API_TOKEN_BINDING || 'oriaxdotnet'; // token to call origin

// small helper to respond JSON
function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

// serve minimal UI (you can replace with full UI later)
function uiHtml() {
  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Xray Account Manager</title>
<style>
  body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:0;background:#f4f6f8}
  .card{max-width:680px;margin:30px auto;padding:20px;background:white;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.06)}
  h1{margin:0 0 16px;font-size:28px}
  input,button{display:block;width:100%;padding:12px;border-radius:10px;border:1px solid #d7dbe0;margin:8px 0;box-sizing:border-box}
  .row{display:flex;gap:8px}
  .row input{flex:1}
  .row button{flex:0 0 130px}
  .note{color:#6b6f76;margin-top:10px;text-align:center}
  .list{margin-top:16px}
  .user{background:#fbfdff;padding:12px;border-radius:10px;border:1px solid #e7eef7;margin-bottom:12px}
  pre{white-space:pre-wrap;word-break:break-all;background:#eef6ff;padding:10px;border-radius:8px}
  .copybtn{margin-top:8px;background:#e7eef7;padding:8px;border-radius:8px;border:0}
</style>
</head>
<body>
  <div class="card">
    <h1>Xray Account Manager</h1>
    <div class="row">
      <input id="username" placeholder="Username">
      <input id="days" placeholder="Days">
    </div>
    <div class="row" style="margin-top:8px">
      <button id="createBtn">Create</button>
      <button id="refreshBtn">Refresh</button>
      <button id="setTokenBtn">Set UI Token</button>
    </div>
    <p class="note">Note: UI calls this Worker. Keep tokens secret.</p>
    <div id="list" class="list"></div>
  </div>

<script>
const UI_TOKEN_KEY = 'ui_token';
function getUiToken(){ return localStorage.getItem(UI_TOKEN_KEY) || ''; }
function setUiToken(t){ localStorage.setItem(UI_TOKEN_KEY, t); toast('UI token set'); }
function toast(s){ const el=document.createElement('div'); el.textContent=s; el.style.position='fixed'; el.style.left='50%'; el.style.transform='translateX(-50%)'; el.style.bottom='28px'; el.style.background='black'; el.style.color='white'; el.style.padding='8px 14px'; el.style.borderRadius='20px'; document.body.appendChild(el); setTimeout(()=>el.remove(),2000); }

async function fetchList(){
  const token = getUiToken();
  const headers = token ? { Authorization: 'Bearer '+token } : {};
  try{
    const r = await fetch(`/api/list-users?limit=50`, { headers });
    if(r.status===401) { toast('unauthorized'); return []; }
    const j = await r.json();
    if(!j.success) { toast('error'); return []; }
    return j.users || [];
  }catch(e){console.error(e); toast('fetch error'); return [];}
}

function makeUserCard(u){
  const el = document.createElement('div'); el.className='user';
  el.innerHTML = `<strong>${escapeHtml(u.username)} — Exp: ${escapeHtml(u.expired || '')}</strong>
  <div style="margin-top:8px">UUID: ${escapeHtml(u.uuid || '')}</div>`;
  const pre = document.createElement('pre'); pre.textContent = u.vmess_tls || u.vmess_none || (u.client && u.client.id ? 'vmess://'+btoa(JSON.stringify(u.client)) : '');
  el.appendChild(pre);
  const b = document.createElement('button'); b.textContent='Copy'; b.className='copybtn';
  b.onclick = ()=>{ navigator.clipboard.writeText(pre.textContent).then(()=>toast('copied')); };
  el.appendChild(b);
  return el;
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

async function refresh(){
  const list = document.getElementById('list'); list.innerHTML = '';
  const users = await fetchList();
  users.forEach(u => {
    list.appendChild(makeUserCard(u));
  });
}

document.getElementById('refreshBtn').addEventListener('click', refresh);
document.getElementById('setTokenBtn').addEventListener('click', ()=> {
  const t = prompt('Enter UI token (origin API token used by this UI):');
  if(t) setUiToken(t);
});
document.getElementById('createBtn').addEventListener('click', async ()=>{
  const u = document.getElementById('username').value.trim();
  const d = document.getElementById('days').value.trim();
  if(!u || !d) { toast('username & days required'); return; }
  const token = getUiToken();
  try{
    const res = await fetch('/api/create-user', {
      method:'POST',
      headers: { 'Content-Type':'application/json', ...(token?{Authorization:'Bearer '+token}: {}) },
      body: JSON.stringify({ username: u, days: Number(d) })
    });
    const j = await res.json();
    if(j.success) { toast('created'); refresh(); } else { toast('error '+(j.error||'')); console.log(j); }
  }catch(e){console.error(e); toast('create failed');}
});

refresh();
</script>
</body>
</html>`;
}

// proxy helper to forward /api/* to origin (pass authorization)
async function proxyApi(request) {
  const url = new URL(request.url);
  // build origin URL (keep path/query)
  const path = url.pathname + url.search;
  const originUrl = `https://${ORIGIN_HOST}${path}`;
  const headers = new Headers(request.headers);
  // If origin API requires token, override Authorization header:
  if (ORIGIN_API_TOKEN) headers.set('Authorization', 'Bearer ' + ORIGIN_API_TOKEN);
  // forward request method and body
  const init = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.clone().arrayBuffer();
  }
  const resp = await fetch(originUrl, init);
  // return response as-is
  const newHeaders = new Headers(resp.headers);
  // prevent Cloudflare attaching errors page
  newHeaders.set('x-proxy-by', 'worker');
  return new Response(await resp.arrayBuffer(), { status: resp.status, headers: newHeaders });
}

addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(proxyApi(req));
    return;
  }
  // serve UI
  event.respondWith(new Response(uiHtml(), { headers: { 'content-type': 'text/html; charset=utf-8' } }));
});
