  // Minimal Worker safe for Wrangler/Cloudflare editor
// Bind via Dashboard: API_TOKEN, ORIGIN_HOST, ORIGIN_API_TOKEN

const API_TOKEN = typeof API_TOKEN !== "undefined" ? API_TOKEN : "tokenui"; // binding name in Settings
const ORIGIN_HOST = typeof ORIGIN_HOST !== "undefined" ? ORIGIN_HOST : "myxl.me";
const ORIGIN_API_TOKEN = typeof ORIGIN_API_TOKEN !== "undefined" ? ORIGIN_API_TOKEN : "tokenrahasia";

addEventListener("fetch", event => event.respondWith(handle(event.request)));

function textResponse(s){ return new Response(s, { headers: { "content-type":"text/html; charset=utf-8" } }); }
function jsonResponse(obj, code=200){ return new Response(JSON.stringify(obj), { status: code, headers: { "content-type":"application/json; charset=utf-8" } }); }

async function proxy(req){
  const u = new URL(req.url);
  const originUrl = `https://${ORIGIN_HOST}${u.pathname}${u.search}`;
  const headers = new Headers(req.headers);
  headers.set("Authorization", "Bearer " + ORIGIN_API_TOKEN);
  const init = { method: req.method, headers, redirect: "follow" };
  if(req.method !== "GET" && req.method !== "HEAD") init.body = req.body;
  const r = await fetch(originUrl, init);
  return new Response(r.body, { status: r.status, headers: r.headers });
}

function uiHtml(){
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Xray UI</title>
<style>
body{font-family:system-ui;margin:0;background:#f4f6f8}
.wrap{max-width:720px;margin:18px auto;padding:16px}
.card{background:#fff;padding:14px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.06)}
.row{display:flex;gap:8px;flex-wrap:wrap}
input,button{padding:10px;border-radius:8px;border:1px solid #e3e8ee}
pre{white-space:pre-wrap;word-break:break-all;background:#f0f8ff;padding:10px;border-radius:8px}
.copy{background:#e6f0f6;border:0;padding:8px;border-radius:8px;cursor:pointer}
.small{color:#666;font-size:13px}
</style>
</head><body>
<div class="wrap"><div class="card">
<h2>Xray Account Manager</h2>
<div class="row"><input id="username" placeholder="username"><input id="days" placeholder="days" type="number" min="1" style="width:120px"></div>
<div style="margin-top:8px" class="row">
<button id="create">Create</button><button id="refresh">Refresh</button><button id="set">Set UI Token</button>
</div>
<div id="list" style="margin-top:12px"></div>
<p class="small">Set UI token = same token as worker binding (API_TOKEN) or use the Set UI Token button.</p>
</div></div>
<script>
const key='ui_token';
function getToken(){return localStorage.getItem(key)||''}
function setToken(v){localStorage.setItem(key,v); alert('saved')}
function toast(s){console.log(s)}
async function api(path, opts){
  const token=getToken();
  const headers = opts && opts.headers? opts.headers : {};
  if(token) headers.Authorization='Bearer '+token;
  const res = await fetch('/api/'+path, { method: opts && opts.method || 'GET', headers, body: opts && opts.body });
  try{ return await res.json(); }catch(e){ return {error:'invalid_json', status:res.status, text: await res.text()} }
}
function el(tag){return document.createElement(tag)}
function renderUsers(users){
  const list=document.getElementById('list'); list.innerHTML='';
  if(!users||users.length===0){ list.innerHTML='<div class="small">No accounts</div>'; return;}
  users.forEach(u=>{
    const box=el('div'); box.style.marginBottom='10px';
    const h = el('div'); h.textContent=(u.username||'')+' — Exp: '+(u.expired||''); box.appendChild(h);
    const pre=el('pre');
    let vm = u.vmess_tls || u.vmess_none || '';
    if(!vm && u.client) try{ vm = 'vmess://'+btoa(JSON.stringify(u.client)); }catch(e){}
    pre.textContent = vm;
    box.appendChild(pre);
    const cb = el('button'); cb.className='copy'; cb.textContent='Copy'; cb.onclick=()=>{ navigator.clipboard?.writeText(pre.textContent).then(()=>alert('copied')).catch(()=>prompt('copy',pre.textContent)); };
    box.appendChild(cb);
    list.appendChild(box);
  });
}
document.getElementById('set').onclick=()=>{ const v=prompt('UI token (must match worker binding):', getToken()); if(v!==null) setToken(v) };
document.getElementById('refresh').onclick=async()=>{ const r=await api('list-users?limit=50'); if(r && r.users) renderUsers(r.users); else alert(JSON.stringify(r)); };
document.getElementById('create').onclick=async()=>{
  const u=document.getElementById('username').value.trim(), d=document.getElementById('days').value.trim();
  if(!u||!d){ alert('username & days'); return; }
  const res = await api('create-user', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ username:u, days: Number(d) }) });
  if(res && res.success) { alert('created'); setTimeout(()=>document.getElementById('refresh').click(),800) } else alert(JSON.stringify(res));
};
window.addEventListener('load', ()=>document.getElementById('refresh').click());
</script></body></html>`;
}

async function handleRequest(req){
  const url = new URL(req.url);
  if(url.pathname === '/' || url.pathname === '/index.html') return textResponse(uiHtml());
  if(url.pathname.startsWith('/api/')){
    // require Authorization: Bearer <API_TOKEN> from UI (localStorage) or else reject
    const auth = req.headers.get('authorization')||'';
    if(!auth.startsWith('Bearer ')) return jsonResponse({ error:'unauthorized' },401);
    const token = auth.split(' ')[1];
    if(token !== API_TOKEN) return jsonResponse({ error:'unauthorized' },401);
    // proxy to origin
    try{ return await proxy(req); }catch(e){ return jsonResponse({ error:'proxy_failed', detail: String(e && e.message? e.message : e) },502) }
  }
  return new Response('Not found', { status:404 });
}

async function proxy(req){
  // forward to origin preserving path/query and set origin auth
  const u = new URL(req.url);
  const originUrl = `https://${ORIGIN
