// worker.js
// Bindings (set these in Cloudflare dashboard or wrangler.toml as secrets)
// API_TOKEN_BINDING, ORIGIN_HOST_BINDING, ORIGIN_API_TOKEN_BINDING
const API_TOKEN = typeof API_TOKEN_BINDING !== 'undefined' ? API_TOKEN_BINDING : 'axdotnet';
const ORIGIN_HOST = typeof ORIGIN_HOST_BINDING !== 'undefined' ? ORIGIN_HOST_BINDING : 'myxl.me';
const ORIGIN_API_TOKEN = typeof ORIGIN_API_TOKEN_BINDING !== 'undefined' ? ORIGIN_API_TOKEN_BINDING : 'oriaxdotnet';

// helper: JSON response
function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

// proxy to origin (preserve path+query)
async function proxyToOrigin(req) {
  const url = new URL(req.url);
  // construct origin URL (always https)
  const originUrl = 'https://' + ORIGIN_HOST + url.pathname + (url.search || '');
  const headers = new Headers(req.headers);
  // overwrite Authorization for origin
  headers.set('Authorization', 'Bearer ' + ORIGIN_API_TOKEN);
  // we forward method and body (stream)
  const init = {
    method: req.method,
    headers,
    redirect: 'follow'
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body;
  }
  const res = await fetch(originUrl, init);
  // clone response and return directly to client
  const outHeaders = new Headers(res.headers);
  // ensure content-type kept
  return new Response(res.body, { status: res.status, headers: outHeaders });
}

// serve UI html
function uiHtml() {
  // build string via array to avoid nested template literal parsing issues
  const parts = [];
  parts.push('<!doctype html>');
  parts.push('<html>');
  parts.push('<head>');
  parts.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
  parts.push('<title>Xray Account Manager</title>');
  parts.push('<style>');
  parts.push('  body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;margin:0;background:#f4f6f8;}');
  parts.push('  .card{max-width:720px;margin:20px auto;padding:18px;background:white;border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,.06);}');
  parts.push('  h1{margin:0 0 12px;font-size:26px;}');
  parts.push('  input,button{display:block;width:100%;padding:12px;border-radius:10px;border:1px solid #d7dbe0;margin:8px 0;box-sizing:border-box;font-size:15px;}');
  parts.push('  .row{display:flex;gap:8px;}');
  parts.push('  .row input{flex:1;}');
  parts.push('  .row button{flex:0 0 130px;}');
  parts.push('  .note{color:#6b6f76;margin-top:10px;text-align:center;}');
  parts.push('  .list{margin-top:14px;}');
  parts.push('  .user{background:#fbfdff;padding:12px;border-radius:10px;border:1px solid #e7eef7;margin-bottom:12px;}');
  parts.push('  .user-header{display:block;margin-bottom:8px;color:#1f2937;font-weight:600;}');
  parts.push('  pre{white-space:pre-wrap;word-break:break-all;background:#eef6ff;padding:10px;border-radius:8px;overflow:auto;max-height:220px;}');
  parts.push('  .copybtn{margin-top:8px;background:#e7eef7;padding:8px;border-radius:8px;border:0;cursor:pointer;}');
  parts.push('  .controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}');
  parts.push('  .controls button{flex:0 0 auto;}');
  parts.push('  @media (max-width:420px){ .row input,.row button{font-size:14px;padding:10px} .card{margin:12px;padding:14px} }');
  parts.push('</style>');
  parts.push('</head>');
  parts.push('<body>');
  parts.push('<div class="card">');
  parts.push('<h1>Xray Account Manager</h1>');
  parts.push('<div class="row">');
  parts.push('<input id="username" placeholder="Username">');
  parts.push('<input id="days" placeholder="Days">');
  parts.push('</div>');
  parts.push('<div class="controls">');
  parts.push('<button id="createBtn">Create</button>');
  parts.push('<button id="refreshBtn">Refresh</button>');
  parts.push('<button id="setTokenBtn">Set UI Token</button>');
  parts.push('</div>');
  parts.push('<p class="note">Note: UI calls this Worker. Keep tokens secret.</p>');
  parts.push('<div id="list" class="list"></div>');
  parts.push('</div>');
  // client script (no template literals, use concatenation and DOM API)
  parts.push('<script>');
  // localStorage key
  parts.push('const UI_TOKEN_KEY="ui_token";');
  parts.push('function getUiToken(){return localStorage.getItem(UI_TOKEN_KEY)||"";}');
  parts.push('function setUiToken(t){localStorage.setItem(UI_TOKEN_KEY,t); showToast("UI token set");}');
  parts.push('function showToast(s){const el=document.createElement("div");el.textContent=s;el.style.position="fixed";el.style.left="50%";el.style.transform="translateX(-50%)";el.style.bottom="18px";el.style.background="black";el.style.color="white";el.style.padding="8px 14px";el.style.borderRadius="20px";el.style.zIndex=9999;document.body.appendChild(el);setTimeout(()=>el.remove(),2000);}');
  // escape helper
  parts.push('function escapeHtml(s){if(!s) return ""; return String(s).replace(/[&<>"\']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\\\\\"":"&quot;","\\'":"&#39;"}[c];});}');
  // fetch list
  parts.push('async function fetchList(){const token=getUiToken();const headers=token?{Authorization:"Bearer "+token}:{ };try{const r=await fetch("/api/list-users?limit=200",{headers}); if(r.status===401){showToast("unauthorized"); return []; } const j=await r.json(); if(!j || !j.success){showToast("server error"); return []; } return j.users||[];}catch(e){console.error(e);showToast("fetch error");return [];}}');
  // build user card using DOM api
  parts.push('function makeUserCard(u){ const el=document.createElement("div"); el.className="user";');
  parts.push('  const header=document.createElement("div"); header.className="user-header"; header.textContent = (u.username || "") + " — Exp: " + (u.expired || ""); el.appendChild(header);');
  parts.push('  const uuidDiv=document.createElement("div"); uuidDiv.style.marginBottom="8px"; uuidDiv.textContent = "UUID: " + (u.uuid || ""); el.appendChild(uuidDiv);');
  parts.push('  const pre=document.createElement("pre");');
  parts.push('  var vmess = (u.vmess_tls && u.vmess_tls.trim()) ? u.vmess_tls : ((u.vmess_none && u.vmess_none.trim())? u.vmess_none : "");');
  parts.push('  if(!vmess && u.client){ try{ vmess = "vmess://"+btoa(JSON.stringify(u.client)); }catch(e){ vmess = "vmess://"; } }');
  parts.push('  pre.textContent = vmess; el.appendChild(pre);');
  parts.push('  const btn=document.createElement("button"); btn.className="copybtn"; btn.textContent="Copy"; btn.onclick=function(){ navigator.clipboard.writeText(pre.textContent).then(()=>showToast("copied")).catch(()=>{try{prompt("Copy manually:",pre.textContent);}catch(e){showToast("copy failed")} }); }; el.appendChild(btn);');
  parts.push('  return el; }');
  // refresh function
  parts.push('async function refresh(){ const listEl=document.getElementById("list"); listEl.innerHTML=""; const users=await fetchList(); if(!users || users.length===0){ listEl.textContent="No accounts found."; return;} users.forEach(u=>{ listEl.appendChild(makeUserCard(u)); }); }');
  // create user
  parts.push('async function createUser(){ const u=document.getElementById("username").value.trim(); const d=document.getElementById("days").value.trim(); if(!u||!d){ showToast("username and days required"); return; } const token=getUiToken(); const headers = { "Content-Type":"application/json" }; if(token) headers.Authorization="Bearer "+token; try{ const res = await fetch("/api/create-user", { method:"POST", headers, body: JSON.stringify({ username: u, days: Number(d) })}); if(res.status===401){ showToast("unauthorized"); return; } const j=await res.json(); if(j && j.success){ showToast("created"); setTimeout(refresh,800); } else { console.error(j); showToast("create failed"); } }catch(e){ console.error(e); showToast("create error"); } }');
  // UI wiring
  parts.push('document.getElementById("createBtn").addEventListener("click", createUser);');
  parts.push('document.getElementById("refreshBtn").addEventListener("click", refresh);');
  parts.push('document.getElementById("setTokenBtn").addEventListener("click", function(){const t=prompt("Enter UI token (must match worker binding):", getUiToken()||""); if(t!==null) setUiToken(t);});');
  parts.push('// initial load');
  parts.push('window.addEventListener("load", function(){ refresh(); });');
  parts.push('</script>');
  parts.push('</body>');
  parts.push('</html>');
  return parts.join('\n');
}

// request handler
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req) {
  const url = new URL(req.url);
  // serve UI root
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return new Response(uiHtml(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // API endpoints: only allow if valid UI token provided
  if (url.pathname.startsWith('/api/')) {
    // check UI token in Authorization header
    const auth = req.headers.get('authorization') || '';
    if (auth.indexOf('Bearer ') !== 0) {
      return json(401, { error: 'unauthorized' });
    }
    const token = auth.split(' ')[1];
    if (token !== API_TOKEN) {
      return json(401, { error: 'unauthorized' });
    }
    // forward to origin (the origin will perform real operations)
    try {
      return await proxyToOrigin(req);
    } catch (e) {
      return json(502, { error: 'proxy_failed', detail: String(e && e.message ? e.message : e) });
    }
  }

  // static 404 for anything else
  return new Response('Not found', { status: 404 });
}
