// worker.js
// Simple Worker that serves a small UI and proxies API calls to your VPS origin.
// Expects these bindings/secrets set in Cloudflare Worker settings (or in wrangler.toml):
//   API_TOKEN (optional, UI token for browser -> worker auth)
//   ORIGIN_HOST (e.g. myxl.me)
//   ORIGIN_API_TOKEN (the secret token used to call your VPS API)

const API_TOKEN = typeof globalThis.API_TOKEN !== 'undefined' ? globalThis.API_TOKEN : '';
const ORIGIN_HOST = typeof globalThis.ORIGIN_HOST !== 'undefined' ? globalThis.ORIGIN_HOST : 'myxl.me';
const ORIGIN_API_TOKEN = typeof globalThis.ORIGIN_API_TOKEN !== 'undefined' ? globalThis.ORIGIN_API_TOKEN : '';

addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

async function handle(req) {
  const url = new URL(req.url);
  try {
    // Proxy endpoints
    if (url.pathname === '/api/list-users') return await proxyListUsers(req, url);
    if (url.pathname === '/api/create-user' && req.method === 'POST') return await proxyCreateUser(req);

    // otherwise serve UI
    if (url.pathname === '/' || url.pathname === '') return new Response(uiHtml(), { headers: { 'content-type': 'text/html; charset=utf-8' }});
    // static 404
    return new Response('Not found', { status: 404 });
  } catch (e) {
    return json(500, { error: 'worker_error', detail: String(e && e.message ? e.message : e) });
  }
}

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function proxyListUsers(req, url) {
  // enforce UI token from browser (optional)
  const uiToken = req.headers.get('authorization') || '';
  if (API_TOKEN && uiToken.indexOf('Bearer ') !== 0) return json(401, { error: 'unauthorized' });
  if (API_TOKEN && uiToken.split(' ')[1] !== API_TOKEN) return json(401, { error: 'unauthorized' });

  // pass query string
  const qs = url.search || '';
  const originUrl = `https://${ORIGIN_HOST}/api/list-users${qs}`;

  const res = await fetch(originUrl, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + ORIGIN_API_TOKEN }
  });

  // return origin body as-is (JSON)
  const text = await res.text();
  // try forward status and body
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function proxyCreateUser(req) {
  // enforce UI token
  const uiToken = req.headers.get('authorization') || '';
  if (API_TOKEN && uiToken.indexOf('Bearer ') !== 0) return json(401, { error: 'unauthorized' });
  if (API_TOKEN && uiToken.split(' ')[1] !== API_TOKEN) return json(401, { error: 'unauthorized' });

  const originUrl = `https://${ORIGIN_HOST}/api/create-user`;
  const body = await req.text();
  const res = await fetch(originUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + ORIGIN_API_TOKEN,
      'Content-Type': req.headers.get('Content-Type') || 'application/json'
    },
    body
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function uiHtml() {
  // Minimal UI. We avoid complicated template injection to prevent build escapes.
  return `
<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Xray Account Manager</title>
<style>
  :root { --card-bg:#fff; --muted:#6b6f76; --accent:#0b3b4a; --muted-bg:#eef6ff; }
  body { font-family: system-ui, Roboto, -apple-system; margin:0; background:#f4f6f8; color:#222; }
  .wrap{max-width:720px;margin:22px auto;padding:18px;}
  .card{background:var(--card-bg);border-radius:12px;padding:18px;box-shadow:0 6px 18px rgba(0,0,0,.06)}
  h1{margin:0 0 12px;font-size:26px}
  input,button{font-size:16px}
  .row{display:flex;gap:8px;flex-wrap:wrap}
  .row input{flex:1;padding:12px;border-radius:10px;border:1px solid #d7dbe0}
  .row .wide{flex-basis:220px}
  .actions{margin-top:10px;display:flex;gap:10px;flex-wrap:wrap}
  button{padding:10px 16px;border-radius:10px;border:0;background:#e8eef5}
  .primary{background:#0b3b4a;color:white}
  .note{color:var(--muted);text-align:center;margin-top:10px}
  .list{margin-top:16px}
  .user{background:var(--muted-bg);padding:12px;border-radius:8px;border:1px solid #e3effb;margin-bottom:12px}
  .meta{font-weight:600;margin-bottom:8px}
  pre{white-space:pre-wrap;word-break:break-all;background:white;padding:10px;border-radius:6px;border:1px solid #e6eef7}
  .copybtn{margin-top:8px;padding:8px;border-radius:8px;border:0;background:#e7eef7}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Xray Account Manager</h1>
      <div class="row">
        <input id="username" placeholder="Username">
        <input id="days" placeholder="Days" class="wide">
      </div>
      <div class="actions">
        <button id="createBtn" class="primary">Create</button>
        <button id="refreshBtn">Refresh</button>
        <button id="setTokenBtn">Set UI Token</button>
      </div>
      <p class="note">Note: UI calls this Worker. Keep tokens secret.</p>
      <div id="list" class="list"></div>
    </div>
  </div>

<script>
const UI_KEY = 'ui_token_worker';
function toast(s){
  const el = document.createElement('div');
  el.textContent = s;
  el.style.position='fixed';
  el.style.left='50%'; el.style.transform='translateX(-50%)';
  el.style.bottom='20px'; el.style.background='black'; el.style.color='white';
  el.style.padding='8px 12px'; el.style.borderRadius='18px'; document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
function getUiToken(){ return localStorage.getItem(UI_KEY) || ''; }
function setUiToken(v){ localStorage.setItem(UI_KEY, v); toast('UI token set'); }

async function apiFetch(path, opts = {}) {
  const headers = opts.headers || {};
  const token = getUiToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  opts.headers = headers;
  const r = await fetch(path, opts);

  // baca body sebagai text dulu (aman bila origin membalas HTML)
  const text = await r.text();

  // coba parse JSON jika content-type cocok atau body tampak JSON
  const ct = (r.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch (e) {
      // parsing JSON gagal, kembalikan object yang berisi raw agar UI bisa menampilkan
      return { success: false, _raw: text, _status: r.status, error: 'invalid_json' };
    }
  }

  // non-json response -> kembalikan informasi supaya UI bisa menampilkannya
  return { success: false, _raw: text, _status: r.status, error: 'non_json' };
}


function buildLinkFromUser(u){
  if (u.vmess_tls) return u.vmess_tls.trim();
  if (u.vmess_none) return u.vmess_none.trim();
  // try client object encode
  if (u.client && u.client.id){
    try {
      return 'vmess://' + btoa(JSON.stringify(u.client));
    } catch(e){}
  }
  // fallback: join any unknown fields
  return (u.link || '') + '';
}

function makeUserNode(u){
  const box = document.createElement('div'); box.className='user';
  const meta = document.createElement('div'); meta.className='meta';
  meta.textContent = (u.username || '') + ' — Exp: ' + (u.expired || '');
  box.appendChild(meta);

  const pre = document.createElement('pre');
  pre.textContent = buildLinkFromUser(u);
  box.appendChild(pre);

  const btn = document.createElement('button');
  btn.className='
