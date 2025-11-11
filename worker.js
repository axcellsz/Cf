  // worker.js (final, safe for wrangler/esbuild)
const API_TOKEN = typeof API_TOKEN_BINDING !== 'undefined' ? API_TOKEN_BINDING : 'axdotnet';
const ORIGIN_HOST = typeof ORIGIN_HOST_BINDING !== 'undefined' ? ORIGIN_HOST_BINDING : 'myxl.me';
const ORIGIN_API_TOKEN = typeof ORIGIN_API_TOKEN_BINDING !== 'undefined' ? ORIGIN_API_TOKEN_BINDING : 'oriaxdotnet';

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function proxyToOrigin(req) {
  const url = new URL(req.url);
  const originUrl = 'https://' + ORIGIN_HOST + url.pathname + (url.search || '');
  const headers = new Headers(req.headers);
  headers.set('Authorization', 'Bearer ' + ORIGIN_API_TOKEN);
  const init = { method: req.method, headers, redirect: 'follow' };
  if (req.method !== 'GET' && req.method !== 'HEAD') init.body = req.body;
  const res = await fetch(originUrl, init);
  const outHeaders = new Headers(res.headers);
  return new Response(res.body, { status: res.status, headers: outHeaders });
}

function uiHtml() {
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
  parts.push('
