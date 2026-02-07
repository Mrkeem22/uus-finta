const KEY = "pulsetickets_full_v2";
const DEMO_PASS = "1234";

const $ = (s)=>document.querySelector(s);
const money = (n)=>new Intl.NumberFormat("et-EE",{style:"currency",currency:"EUR"}).format(n);
const fmt = (iso)=>new Date(iso).toLocaleString("et-EE",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
const uid = ()=>crypto.getRandomValues(new Uint32Array(4)).join("-")+"-"+Date.now().toString(16);

const toastEl=$("#toast");
const toast=(m)=>{toastEl.textContent=m;toastEl.classList.remove("hidden");setTimeout(()=>toastEl.classList.add("hidden"),2200);};

const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"");}catch{return null;}};
const save=(d)=>localStorage.setItem(KEY, JSON.stringify(d));

const seed=()=>{
  const now=new Date();
  const add=(d)=>new Date(now.getTime()+d*86400000).toISOString();
  const data={
    users:[{id:uid(), email:"organizer@demo.ee"}],
    session:{userEmail:null},
    events:[
      {
        id:uid(),
        title:"TARTU MASSIVE: YUSSI AJ",
        time:add(7),
        location:"KLUBI GUTENBERG - APARAADITEHAS",
        category:"Muusika",
        organizer:"Massive Events",
        city:"tartu",
        image:"https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1600&q=70",
        desc:"Suure energiaga öö. Uksed 23:00. Tule varakult.",
        createdBy:"organizer@demo.ee",
        tickets:[
          {id:uid(), name:"REGULAR BIRD", price:15, total:200, sold:0},
          {id:uid(), name:"VIP", price:30, total:60, sold:0}
        ]
      }
    ],
    orders:[],
    issued:[]
  };
  save(data);
  return data;
};

let data = load() || seed();

let activeFilter="all";
let selectedEvent=null;

// checkout state
let cart = { eventId:null, items:[] };

// pages
const pages={
  home: $("#pageHome"),
  event: $("#pageEvent"),
  checkout: $("#pageCheckout"),
  ticket: $("#pageTicket"),
  checkin: $("#pageCheckin")
};
const show=(name)=>{
  Object.values(pages).forEach(p=>p.classList.remove("active"));
  pages[name].classList.add("active");
};

const catMap={
  music:["muusika"],
  theatre:["teater","standup"],
  festival:["festival"],
  family:["kogupere","pere"]
};

const applyTimeFilter=(ev)=>{
  const now=new Date();
  const d=new Date(ev.time);
  const dayMs=86400000;
  const startOfToday=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  const startOfTomorrow=startOfToday+dayMs;
  const startOfDay=(dt)=>new Date(dt.getFullYear(),dt.getMonth(),dt.getDate()).getTime();
  if(activeFilter==="today") return startOfDay(d)===startOfToday;
  if(activeFilter==="tomorrow") return startOfDay(d)===startOfTomorrow;
  if(activeFilter==="weekend"){ const wd=d.getDay(); return wd===6 || wd===0; }
  return true;
};
const applyCatFilter=(ev)=>{
  if(["music","theatre","festival","family"].includes(activeFilter)){
    const cats=catMap[activeFilter]||[];
    const c=(ev.category||"").toLowerCase();
    return cats.some(x=>c.includes(x));
  }
  return true;
};

const minPrice=(ev)=>Math.min(...ev.tickets.map(t=>t.price));
const remainingType=(t)=>t.total-t.sold;

/* HOME */
const list=()=>{
  const q=($("#q").value||"").trim().toLowerCase();
  const city=($("#city").value||"").trim().toLowerCase();

  let items=[...data.events];

  if(q){
    items=items.filter(ev => (ev.title+" "+ev.organizer+" "+ev.location+" "+ev.category+" "+ev.desc).toLowerCase().includes(q));
  }
  if(city){
    items=items.filter(ev => (ev.city||"").toLowerCase().includes(city) || (ev.location||"").toLowerCase().includes(city));
  }

  items=items.filter(applyTimeFilter).filter(applyCatFilter);
  items.sort((a,b)=>new Date(a.time)-new Date(b.time));

  $("#countText").textContent = items.length ? `${items.length} tulemust` : `Tulemusi pole`;

  const grid=$("#eventGrid");
  grid.innerHTML="";

  for(const ev of items){
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <div class="thumb"><img src="${ev.image}" alt="${ev.title}"></div>
      <div class="content">
        <h3 class="title">${ev.title}</h3>
        <div class="meta"><div>${fmt(ev.time)}</div><div>•</div><div>${ev.location}</div></div>
        <div class="priceRow">
          <div class="price">Al. ${money(minPrice(ev))}</div>
          <div class="cta">Osta pilet →</div>
        </div>
      </div>
    `;
    card.onclick=()=>openEvent(ev.id);
    grid.appendChild(card);
  }

  if(!items.length){
    grid.innerHTML=`<div class="panel" style="grid-column:1/-1"><div class="pb" style="color:var(--muted);font-weight:1000">Üritusi ei leitud.</div></div>`;
  }
};

const openEvent=(id)=>{
  const ev=data.events.find(e=>e.id===id);
  if(!ev) return;
  selectedEvent=ev;
  location.hash="#event-"+id;
  renderEvent();
  show("event");
};

const renderEvent=()=>{
  const ev=selectedEvent;
  $("#evTitle").textContent=ev.title;
  $("#evMini").textContent=`${fmt(ev.time)} • ${ev.location}`;
  $("#evImg").src=ev.image;
  $("#evImg").alt=ev.title;
  $("#evCat").textContent=ev.category;
  $("#evDesc").textContent=ev.desc;
  $("#evWhen").textContent=fmt(ev.time);
  $("#evWhere").textContent=ev.location;
  $("#evOrg").textContent=ev.organizer;
  $("#evFrom").textContent=`Al. ${money(minPrice(ev))}`;

  const listEl=$("#ticketList");
  listEl.innerHTML="";

  ev.tickets.forEach(t=>{
    const rem=remainingType(t);
    const wrap=document.createElement("div");
    wrap.className="ticketCard";
    wrap.innerHTML=`
      <div class="left">
        <div class="name">${money(t.price)} • ${t.name}</div>
        <div class="sub2">${rem} alles</div>
      </div>
      <div class="right">
        <div class="stepper">
          <button data-act="minus">−</button>
          <input value="0" inputmode="numeric" />
          <button data-act="plus">+</button>
        </div>
        <button class="btn primary" ${rem<=0?"disabled":""}>Osta pilet</button>
      </div>
    `;

    const input=wrap.querySelector("input");
    const minus=wrap.querySelector('[data-act="minus"]');
    const plus=wrap.querySelector('[data-act="plus"]');
    const buy=wrap.querySelector(".btn.primary");

    const clamp=()=>{ let v=parseInt(input.value||"0",10); if(isNaN(v))v=0; v=Math.max(0, Math.min(v, rem)); input.value=v; return v; };
    minus.onclick=()=>{input.value=Math.max(0,(parseInt(input.value||"0",10)-1)); clamp();};
    plus.onclick=()=>{input.value=(parseInt(input.value||"0",10)+1); clamp();};
    input.oninput=clamp;

    buy.onclick=()=>{
      const qty=clamp();
      if(qty<=0){toast("Vali kogus."); return;}
      cart = { eventId: ev.id, items:[{ticketTypeId:t.id, name:t.name, price:t.price, qty}] };
      location.hash="#checkout";
      renderCheckout();
      show("checkout");
    };

    listEl.appendChild(wrap);
  });
};

/* CHECKOUT */
const renderCheckout=()=>{
  const ev=data.events.find(e=>e.id===cart.eventId);
  if(!ev){toast("Üritust ei leitud."); location.hash="#home"; return;}
  $("#coEventLine").textContent=`${ev.title} • ${fmt(ev.time)} • ${ev.location}`;

  const lines=$("#orderLines");
  lines.innerHTML="";
  const total=cart.items.reduce((s,i)=>s+i.price*i.qty,0);

  cart.items.forEach(i=>{
    const line=document.createElement("div");
    line.className="orderLine";
    line.innerHTML=`<span><b>${i.name}</b><small>${i.qty} × ${money(i.price)}</small></span><span>${money(i.price*i.qty)}</span>`;
    lines.appendChild(line);
  });

  $("#orderTotal").textContent=money(total);
  $("#mailHint").textContent="Kui emaili saatmine pole seadistatud, saad demo piletilehe linki ekraanile.";
};

const payCheckout=async ()=>{
  const ev=data.events.find(e=>e.id===cart.eventId);
  if(!ev) return;

  const firstName=$("#firstName").value.trim();
  const lastName=$("#lastName").value.trim();
  const email=$("#email").value.trim();

  if(!firstName||!lastName||!email){toast("Täida kõik väljad.");return;}
  if(!$("#c1").checked || !$("#c2").checked){toast("Tee mõlemad nõusolekud.");return;}

  // availability check
  for(const item of cart.items){
    const t=ev.tickets.find(x=>x.id===item.ticketTypeId);
    if(!t){toast("Piletitüüp puudu.");return;}
    const rem=remainingType(t);
    if(item.qty>rem){toast("Pole piisavalt pileteid.");return;}
  }

  // deduct
  for(const item of cart.items){
    const t=ev.tickets.find(x=>x.id===item.ticketTypeId);
    t.sold += item.qty;
  }

  const orderId=uid();
  const total=cart.items.reduce((s,i)=>s+i.price*i.qty,0);

  data.orders.push({
    id:orderId,
    eventId:ev.id,
    createdAt:new Date().toISOString(),
    buyerName:firstName+" "+lastName,
    buyerEmail:email,
    items:cart.items,
    total,
    status:"paid_demo"
  });

  // call API for token + email
  const payload={
    buyer:{firstName,lastName,email},
    order:{items:cart.items,total},
    event:{id:ev.id,title:ev.title,when:fmt(ev.time),where:ev.location}
  };

  let token=null;
  let ticketUrl=null;
  let emailed=false;

  try{
    const r=await fetch("/api/send-ticket",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const j=await r.json();
    if(!j.ok) throw new Error(j.error||"Email error");
    token=j.token; ticketUrl=j.ticketUrl; emailed=!!j.emailed;
  }catch(e){
    toast("Email API error: "+(e.message||""));
  }

  // store issued ticket locally so check-in works in demo
  if(token){
    data.issued.push({
      id:uid(),orderId,eventId:ev.id,token,usedAt:null,createdAt:new Date().toISOString(),
      buyerName:firstName+" "+lastName,buyerEmail:email
    });
  }

  save(data);

  if(emailed) toast("Pilet saadetud e-mailile ✅");
  else toast("Demo: e-mail pole seadistatud. Avan piletilehe.");

  if(token){
    location.hash="#ticket-"+token;
    openTicket(token);
  }else if(ticketUrl){
    location.href=ticketUrl;
  }else{
    toast("Piletit ei saanud luua (API).");
  }

  list();
};

/* TICKET */
const openTicket=(tk)=>{
  const it=data.issued.find(x=>x.token===tk);
  if(!it){toast("Piletit ei leitud (demo storage)."); show("home"); return;}
  const ev=data.events.find(e=>e.id===it.eventId);
  $("#ticketLine").textContent = `${ev?.title||""} • ${fmt(it.createdAt)}`;
  $("#ticketToken").textContent=tk;

  const status=$("#ticketStatus");
  status.innerHTML = it.usedAt ? `<span class="dot used"></span> USED` : `<span class="dot"></span> VALID`;

  const url = `${location.origin}${location.pathname}#ticket-${tk}`;
  QRCode.toCanvas($("#qrCanvas"), url, { width: 200, margin: 1 }, ()=>{});
  show("ticket");
};

/* CHECKIN */
const checkin=()=>{
  const tk=$("#checkToken").value.trim();
  const out=$("#checkResult");
  out.textContent="";
  out.style.color="#0b1220";
  if(!tk){out.textContent="Sisesta token."; out.style.color="#b45309"; return;}

  const it=data.issued.find(x=>x.token===tk);
  if(!it){out.textContent="INVALID: piletit ei leitud."; out.style.color="var(--danger)"; return;}
  if(it.usedAt){out.textContent="ALREADY USED: "+fmt(it.usedAt); out.style.color="#b45309"; return;}

  it.usedAt=new Date().toISOString();
  save(data);
  out.textContent="OK: märgitud USED.";
  out.style.color="var(--ok)";
  toast("Check-in OK ✅");
};

/* ORGANIZER */
const orgBack=$("#orgBack");
const orgLoginView=$("#orgLoginView");
const orgDashView=$("#orgDashView");

const openOrg=()=>{orgBack.classList.remove("hidden"); renderOrg();};
const closeOrg=()=>{orgBack.classList.add("hidden");};
const isAuthed=()=>!!data.session.userEmail;

const renderOrg=()=>{
  if(isAuthed()){
    orgLoginView.classList.add("hidden");
    orgDashView.classList.remove("hidden");
    $("#orgWho").textContent=data.session.userEmail;
    renderMyEvents();
    renderMyOrders();
  }else{
    orgDashView.classList.add("hidden");
    orgLoginView.classList.remove("hidden");
  }
};

const createDemoAccount=()=>{
  const email=($("#orgEmail").value||"").trim() || "organizer@demo.ee";
  if(!data.users.some(u=>u.email===email)){ data.users.push({id:uid(), email}); save(data); }
  toast("Demo konto olemas / loodud.");
};

const login=()=>{
  const email=$("#orgEmail").value.trim();
  const pass=$("#orgPass").value.trim();
  if(!email){toast("Sisesta email.");return;}
  if(pass!==DEMO_PASS){toast("Vale parool (1234).");return;}
  if(!data.users.some(u=>u.email===email)){toast("Kontot ei leitud. Loo demo konto.");return;}
  data.session.userEmail=email; save(data); toast("Sisse logitud."); renderOrg();
};

const logout=()=>{data.session.userEmail=null; save(data); toast("Väljusid."); renderOrg();};

const saveEvent=()=>{
  if(!isAuthed()){toast("Logi sisse.");return;}

  const title=$("#aTitle").value.trim();
  const time=$("#aTime").value;
  const city=$("#aCity").value.trim().toLowerCase()||"tartu";
  const loc=$("#aLoc").value.trim();
  const cat=$("#aCat").value.trim()||"Muusika";
  const img=$("#aImg").value.trim() || "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1600&q=70";
  const desc=$("#aDesc").value.trim()||"Kirjeldus puudub.";
  if(!title||!time||!loc){toast("Täida: nimi, aeg, asukoht.");return;}

  const t1={id:uid(), name:($("#t1Name").value||"Tavapilet").trim(), price:+$("#t1Price").value||0, total:+$("#t1Qty").value||0, sold:0};
  const t2={id:uid(), name:($("#t2Name").value||"VIP").trim(), price:+$("#t2Price").value||0, total:+$("#t2Qty").value||0, sold:0};
  const tickets=[t1,t2].filter(t=>t.total>0 && t.name);

  data.events.unshift({
    id:uid(),
    title,
    time:new Date(time).toISOString(),
    location:loc,
    category:cat,
    organizer:data.session.userEmail,
    city,
    image:img,
    desc,
    createdBy:data.session.userEmail,
    tickets
  });

  save(data);
  toast("Üritus lisatud!");
  $("#aTitle").value=""; $("#aTime").value=""; $("#aLoc").value=""; $("#aDesc").value=""; $("#aImg").value="";
  list();
  renderMyEvents();
};

const renderMyEvents=()=>{
  const box=$("#myEvents");
  const mine=data.events.filter(e=>e.createdBy===data.session.userEmail);
  if(!mine.length){box.innerHTML=`<div class="hint">Sul pole veel üritusi.</div>`;return;}

  box.innerHTML = `
    <table class="table">
      ${mine.map(ev=>`
        <tr class="tr">
          <td class="td">
            ${ev.title}
            <small>${fmt(ev.time)} • ${ev.location}</small>
          </td>
          <td class="td" style="text-align:right">
            Al. ${money(minPrice(ev))}
            <small>${ev.category}</small>
          </td>
          <td class="td" style="text-align:right">
            <button class="btn" onclick="window.__openEvent('${ev.id}')">Ava</button>
            <button class="btn danger" onclick="window.__deleteEvent('${ev.id}')">Kustuta</button>
          </td>
        </tr>
      `).join("")}
    </table>
  `;
};
window.__openEvent=(id)=>{closeOrg(); openEvent(id);};
window.__deleteEvent=(id)=>{
  if(!confirm("Kustutan ürituse (demo). Oled kindel?")) return;
  data.events=data.events.filter(e=>e.id!==id);
  data.orders=data.orders.filter(o=>o.eventId!==id);
  data.issued=data.issued.filter(t=>t.eventId!==id);
  save(data); toast("Üritus kustutatud."); list(); renderMyEvents(); renderMyOrders();
};

const renderMyOrders=()=>{
  const box=$("#myOrders");
  const myIds=new Set(data.events.filter(e=>e.createdBy===data.session.userEmail).map(e=>e.id));
  const orders=data.orders.filter(o=>myIds.has(o.eventId)).slice().reverse().slice(0,20);
  if(!orders.length){box.innerHTML=`<div class="hint">Tellimusi pole.</div>`;return;}

  box.innerHTML=`
    <table class="table">
      ${orders.map(o=>`
        <tr class="tr">
          <td class="td">
            ${o.buyerName}
            <small>${o.buyerEmail}</small>
          </td>
          <td class="td">
            ${o.items.map(i=>`${i.name} × ${i.qty}`).join(", ")}
            <small>${fmt(o.createdAt)}</small>
          </td>
          <td class="td" style="text-align:right">
            ${money(o.total)}
            <small>${o.status}</small>
          </td>
        </tr>
      `).join("")}
    </table>
  `;
};

const wipeOrders=()=>{
  if(!confirm("Kustutan tellimused + piletid (demo). Oled kindel?")) return;
  data.orders=[]; data.issued=[];
  data.events.forEach(ev=>ev.tickets.forEach(t=>t.sold=0));
  save(data); toast("Tellimused kustutatud."); renderMyOrders(); list();
};

/* ROUTER */
const route=()=>{
  const h=location.hash||"#home";
  if(h.startsWith("#event-")){
    const id=h.replace("#event-","");
    const ev=data.events.find(e=>e.id===id);
    if(ev){selectedEvent=ev; renderEvent(); show("event"); return;}
  }
  if(h==="#checkout"){ renderCheckout(); show("checkout"); return; }
  if(h.startsWith("#ticket-")){
    const tk=h.replace("#ticket-","");
    openTicket(tk); return;
  }
  if(h==="#checkin"){ show("checkin"); return; }
  show("home"); list();
};

/* BINDINGS */
$("#doSearch").onclick=list;
$("#q").addEventListener("input", list);
$("#city").addEventListener("input", list);

document.querySelectorAll(".pill").forEach(p=>{
  p.onclick=()=>{
    document.querySelectorAll(".pill").forEach(x=>x.classList.remove("active"));
    p.classList.add("active");
    activeFilter=p.dataset.filter;
    list();
  };
});

$("#evBack").onclick=()=>{location.hash="#home";};
$("#coBack").onclick=()=>{location.hash=selectedEvent?("#event-"+selectedEvent.id):"#home";};
$("#payBtn").onclick=payCheckout;

$("#ticketBack").onclick=()=>{location.hash="#home";};
$("#openCheckin").onclick=()=>{location.hash="#checkin"; $("#checkToken").value=$("#ticketToken").textContent;};

$("#checkBack").onclick=()=>{location.hash="#home";};
$("#checkBtn").onclick=checkin;

// organizer
$("#btnOrg").onclick=openOrg;
$("#orgClose").onclick=closeOrg;
$("#orgCreate").onclick=createDemoAccount;
$("#orgLogin").onclick=login;
$("#orgLogout").onclick=logout;
$("#saveEvent").onclick=saveEvent;
$("#wipeOrders").onclick=wipeOrders;
orgBack.addEventListener("click",(e)=>{if(e.target===orgBack) closeOrg();});

// reset
$("#btnReset").onclick=()=>{
  localStorage.removeItem(KEY);
  data=seed();
  toast("Demo reset tehtud.");
  location.hash="#home";
  closeOrg();
  route();
};

window.addEventListener("hashchange", route);
route();
