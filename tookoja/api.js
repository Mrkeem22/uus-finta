'use strict';

const SUPABASE_URL = 'https://c--736888bc-bbe3-43ab-b2e7-b154a7e0cea5-prod.lovable.cloud';
const SUPABASE_KEY = 'sb_publishable_QMnrM1saUHgwYPpGGNx4AQ_seQVyhyh';
const SESSION_KEY = 'tookoja_auth_session_v1';

function loadSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
function saveSession(s){
  if(!s){ localStorage.removeItem(SESSION_KEY); return; }
  const expiresAt = Date.now() + Math.max(30, Number(s.expires_in || 3600) - 30) * 1000;
  localStorage.setItem(SESSION_KEY, JSON.stringify({...s, expires_at_ms: expiresAt}));
}
function clearSession(){ localStorage.removeItem(SESSION_KEY); }

async function jsonFetch(url, options={}){
  const r = await fetch(url, options);
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if(!r.ok){
    const msg = data?.message || data?.msg || data?.error_description || data?.error || data?.hint || `${r.status} ${r.statusText}`;
    const e = new Error(msg); e.status = r.status; e.payload = data; throw e;
  }
  return data;
}

async function authHeaders(publicOnly=false){
  const h = {'apikey': SUPABASE_KEY};
  if(publicOnly) return h;
  let s = loadSession();
  if(s?.refresh_token && (!s.access_token || Number(s.expires_at_ms||0) < Date.now())){
    try { s = await refreshSession(s.refresh_token); } catch { clearSession(); s = null; }
  }
  if(s?.access_token) h['Authorization'] = `Bearer ${s.access_token}`;
  return h;
}

async function signUp(email,password,fullName){
  const data = await jsonFetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method:'POST',
    headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({email:email.trim(),password,data:{full_name:fullName.trim()}})
  });
  if(data?.access_token) saveSession(data);
  return data;
}
async function signIn(email,password){
  const data = await jsonFetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method:'POST', headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({email:email.trim(),password})
  });
  saveSession(data); return data;
}
async function refreshSession(refreshToken){
  const data = await jsonFetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method:'POST', headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({refresh_token:refreshToken})
  });
  saveSession(data); return data;
}

async function requestPasswordReset(email){
  return jsonFetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(location.origin+location.pathname+'?recovery=1')}`, {
    method:'POST', headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({email:email.trim()})
  });
}
async function updatePassword(accessToken,newPassword){
  return jsonFetch(`${SUPABASE_URL}/auth/v1/user`, {
    method:'PUT', headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${accessToken}`,'Content-Type':'application/json'},
    body:JSON.stringify({password:newPassword})
  });
}
function recoveryTokenFromHash(){
  const h=new URLSearchParams((location.hash||'').replace(/^#/,''));
  return h.get('type')==='recovery'?h.get('access_token'):null;
}
async function callAppApi(path,body={}){
  const s=loadSession();
  if(!s?.access_token) throw new Error('Logi uuesti sisse');
  return jsonFetch(path,{method:'POST',headers:{'Authorization':`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
}

async function signOut(){
  const s = loadSession();
  try {
    if(s?.access_token) await fetch(`${SUPABASE_URL}/auth/v1/logout`, {method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':`Bearer ${s.access_token}`}});
  } finally { clearSession(); }
}
async function currentUser(){
  const h = await authHeaders();
  if(!h.Authorization) return null;
  try { return await jsonFetch(`${SUPABASE_URL}/auth/v1/user`, {headers:h}); }
  catch(e){ if(e.status===401){ clearSession(); return null; } throw e; }
}

function buildQuery(params={}){
  const usp = new URLSearchParams();
  for(const [k,v] of Object.entries(params)){
    if(v===undefined || v===null || v==='') continue;
    if(Array.isArray(v)) v.forEach(x=>usp.append(k,x)); else usp.set(k,String(v));
  }
  return usp.toString();
}
async function select(table, params={}){
  const h = await authHeaders();
  const q = buildQuery(params);
  return jsonFetch(`${SUPABASE_URL}/rest/v1/${table}${q?'?'+q:''}`, {headers:{...h,'Accept':'application/json'}});
}
async function insert(table,row, {returning=true}={}){
  const h = await authHeaders();
  return jsonFetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:'POST', headers:{...h,'Content-Type':'application/json','Prefer':returning?'return=representation':'return=minimal'}, body:JSON.stringify(row)
  });
}
async function update(table,filters,row,{returning=true}={}){
  const h = await authHeaders();
  const q = buildQuery(filters);
  return jsonFetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
    method:'PATCH', headers:{...h,'Content-Type':'application/json','Prefer':returning?'return=representation':'return=minimal'}, body:JSON.stringify(row)
  });
}
async function remove(table,filters){
  const h = await authHeaders();
  const q = buildQuery(filters);
  return jsonFetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {method:'DELETE',headers:{...h,'Prefer':'return=representation'}});
}
async function rpc(name,args={}, {publicOnly=false}={}){
  const h = await authHeaders(publicOnly);
  return jsonFetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {method:'POST',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify(args)});
}
async function uploadInspectionPhoto(orgId, workOrderId, inspectionItemId, file){
  const h = await authHeaders();
  const safe = String(file.name||'photo.jpg').replace(/[^a-zA-Z0-9._-]+/g,'-');
  const path = `${orgId}/${workOrderId}/${inspectionItemId}/${Date.now()}-${safe}`;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/inspection-photos/${encodeURI(path)}`, {method:'POST',headers:{...h,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
  const text=await r.text(); if(!r.ok) throw new Error(text||'Foto laadimine ebaõnnestus');
  return path;
}
async function signedPhotoUrl(path, expiresIn=3600){
  const h=await authHeaders();
  const data=await jsonFetch(`${SUPABASE_URL}/storage/v1/object/sign/inspection-photos/${encodeURI(path)}`,{method:'POST',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({expiresIn})});
  const signed=data?.signedURL||data?.signedUrl;
  return signed?.startsWith('http')?signed:`${SUPABASE_URL}/storage/v1${signed||''}`;
}

window.TKAPI={SUPABASE_URL,SUPABASE_KEY,loadSession,clearSession,signUp,signIn,signOut,currentUser,select,insert,update,remove,rpc,uploadInspectionPhoto,signedPhotoUrl,requestPasswordReset,updatePassword,recoveryTokenFromHash,callAppApi};
