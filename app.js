const KEY="ticketrise_full_v1";

const $ = (s)=>document.querySelector(s);
const money = (n)=>new Intl.NumberFormat("et-EE",{style:"currency",currency:"EUR"}).format(n);
const uid = ()=>crypto.getRandomValues(new Uint32Array(4)).join("-")+"-"+Date.now().toString(16);
const fmt = (iso)=>new Date(iso).toLocaleString("et-EE",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
const toLocalInput = (iso)=>{
  const d=new Date(iso);
  const pad=(x)=>String(x).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v)=> new Date(v).toISOString();

const toastEl=$("#toast");
const toast=(m)=>{
  toastEl.textContent=m;
  toastEl.classList.remove("hidden");
  setTimeout(()=>toastEl.classList.add("hidden"),2200);
};

const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"");}catch{return null;}};
const save=(d)=>localStorage.setItem(KEY, JSON.stringify(d));

const seed=()=>{
  const now=new Date();
  const addDays=(d)=>new Date(now.getTime()+d*86400000).toISOString();
  const d={
    settings:{ city:"" },
    session:{ email:null, role:null },
    users:[],
    organizerProfiles:{}, // email -> profile
    events:[
      {
        id:uid(),
        ownerEmail:"demo@organizer.ee",
        organizer:"Suvepeod Events",
        title:"TARTU SUUR SÕBRAPÄEVA REIV | SIMI | LENE MA RUE",
        category:"Muusika",
        city:"tartu",
        start:addDays(10),
        end:null,
        doors:"23:00",
        age:"18+",
        location:"KLUBI GUTENBERG - APARAADITEHAS, TARTU",
        image:"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=75",
        desc:"LINEUP:\n• SIMI\n• LENE MA RUE\n\nUKSED: 23:00\nVANUSEPIIRANG: 18+\n\nTule varakult, pileteid on piiratud koguses!",
        notes:["Võta ID kaasa (18+).","Sisenemine kuni 01:00 (vaata piletitüübi tingimusi).","Pileteid on piiratud koguses."],
        socials:[{label:"Facebook",url:"#"}],
        tickets:[
          {id:uid(), name:"HILSEM SÕPS", price:15, total:200, sold:0, desc:"Sisenemine kuni 01:00"},
          {id:uid(), name:"PRIORITY", price:25, total:80, sold:0, desc:"Kiirem sisenemine"}
        ]
      }
    ],
    orders:[]
  };
  save(d); return d;
};

let data = load() || seed();

/* ========================= AUTH ========================= */
const authBack=$("#authBack");
const refreshAuth=()=>{
  const logged=!!data.session.email;
  $("#btnDashboard").classList.toggle("hidden", !(logged && data.session.role==="organizer"));
  $("#btnLogout").classList.toggle("hidden", !logged);
  $("#btnAuth").textContent = logged ? "Konto" : "Logi sisse";
};
refreshAuth();

$("#btnAuth").onclick=()=>authBack.classList.remove("hidden");
$("#authClose").onclick=()=>authBack.classList.add("hidden");
authBack.onclick=(e)=>{ if(e.target===authBack) authBack.classList.add("hidden"); };

$("#tabLogin").onclick=()=>{
  $("#tabLogin").classList.add("active"); $("#tabRegister").classList.remove("active");
  $("#loginView").classList.remove("hidden"); $("#registerView").classList.add("hidden");
};
$("#tabRegister").onclick=()=>{
  $("#tabRegister").classList.add("active"); $("#tabLogin").classList.remove("active");
  $("#registerView").classList.remove("hidden"); $("#loginView").classList.add("hidden");
};

$("#doRegister").onclick=()=>{
  const email=$("#regEmail").value.trim().toLowerCase();
  const pass=$("#regPass").value.trim();
  const role=$("#regRole").value;
  if(!email||!pass) return toast("Täida email ja parool.");
  if(data.users.some(u=>u.email===email && u.role===role)) return toast("Konto juba olemas.");
  data.users.push({id:uid(), email, pass, role});
  data.session={email, role};
  save(data); refreshAuth();
  toast("Konto loodud ✅");
  authBack.classList.add("hidden");
};

$("#doLogin").onclick=()=>{
  const email=$("#loginEmail").value.trim().toLowerCase();
  const pass=$("#loginPass").value.trim();
  const role=$("#loginRole").value;
  const u=data.users.find(x=>x.email===email && x.pass===pass && x.role===role);
  if(!u) return toast("Vale andmed või roll.");
  data.session={email:u.email, role:u.role};
  save(data); refreshAuth();
  toast("Sisse logitud ✅");
  authBack.classList.add("hidden");
};

$("#btnLogout").onclick=()=>{
  data.session={email:null, role:null};
  save(data); refreshAuth();
  toast("Logisid välja.");
  location.hash="#home";
};

$("#btnDashboard").onclick=()=>location.hash="#org";

/* ========================= PAGES ========================= */
const pages={
  home:$("#pageHome"),
  event:$("#pageEvent"),
  checkout:$("#pageCheckout"),
  org:$("#pageOrg"),
};
const show=(name)=>{
  Object.values(pages).forEach(p=>p.classList.remove("active"));
  pages[name].classList.add("active");
};

let selectedEventId=null;
let cart=null;

const remaining=(t)=>t.total - t.sold;
const minPrice=(ev)=>Math.min(...ev.tickets.map(t=>t.price));

/* ========================= HOME LIST ========================= */
$("#city").value = data.settings.city || "";

const list=()=>{
  const q=($("#q").value||"").trim().toLowerCase();
  const city=$("#city").value || "";
  data.settings.city=city; save(data);

  let items=[...data.events];

  if(q){
    items=items.filter(ev => (ev.title+" "+ev.organizer+" "+ev.location+" "+ev.category+" "+(ev.desc||"")).toLowerCase().includes(q));
  }
  if(city && city!=="all"){
    items=items.filter(ev => (ev.city||"").toLowerCase()===city);
  }

  items.sort((a,b)=>new Date(a.start)-new Date(b.start));
  $("#countText").textContent = items.length ? `${items.length} tulemust` : `Tulemusi pole`;

  const grid=$("#eventGrid");
  grid.innerHTML="";

  for(const ev of items){
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <div class="thumb"><img src="${ev.image}" alt="${ev.title}"></div>
      <div class="cardBody">
        <h3 class="cardTitle">${ev.title}</h3>
        <div class="cardMeta">${fmt(ev.start)} • ${ev.location}</div>
        <div class="cardBottom">
          <div class="cardPrice">Al. ${money(minPrice(ev))}</div>
          <div class="cardCta">Osta pilet</div>
        </div>
      </div>
    `;
    card.onclick=()=>{ location.hash=`#event-${ev.id}`; };
    grid.appendChild(card);
  }

  if(!items.length){
    grid.innerHTML=`<div class="card" style="grid-column:1/-1"><div class="cardBody"><div class="muted" style="font-weight:900">Üritusi ei leitud.</div></div></div>`;
  }
};

$("#doSearch").onclick=list;
$("#q").addEventListener("input", list);
$("#city").addEventListener("change", list);

/* ========================= EVENT RENDER ========================= */
const descToHtml=(text)=>{
  const safe=(text||"").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  return safe
    .split(/\n{2,}/g)
    .map(p=>p.trim())
    .filter(Boolean)
    .map(p=>`<p>${p.replace(/\n/g,"<br>")}</p>`)
    .join("");
};

const renderEvent=(ev)=>{
  $("#evHeroImg").src=ev.image;
  $("#evHeroImg").alt=ev.title;

  const d=new Date(ev.start);
  const day = d.toLocaleString("et-EE", { weekday:"short" }).toUpperCase();
  const date = d.toLocaleDateString("et-EE",{ day:"2-digit", month:"long" }).toUpperCase();
  const time = d.toLocaleTimeString("et-EE",{ hour:"2-digit", minute:"2-digit" });

  $("#evTopMeta").textContent = `${day} ${date} • ${ev.location} • ${time}`;
  $("#evTitle").textContent = ev.title;

  const badges=$("#evBadges");
  badges.innerHTML="";
  const b1=document.createElement("div"); b1.textContent=(ev.city||"").toUpperCase();
  const b2=document.createElement("div"); b2.textContent=`Uksed ${ev.doors || time}`;
  const b3=document.createElement("div"); b3.textContent=`Vanus ${ev.age || "—"}`;
  badges.appendChild(b1); badges.appendChild(b2); badges.appendChild(b3);

  $("#evWhen").textContent = fmt(ev.start);
  $("#evWhere").textContent = ev.location;
  $("#evOrg2").textContent = ev.organizer || "—";
  $("#evAge").textContent = ev.age || "—";
  $("#evDesc").innerHTML = descToHtml(ev.desc);

  const fb=$("#evLink");
  fb.href = (ev.socials && ev.socials[0] && ev.socials[0].url) ? ev.socials[0].url : "#";

  const notes=$("#evNotes");
  notes.innerHTML="";
  (ev.notes||[]).forEach(n=>{
    const li=document.createElement("li");
    li.textContent=n;
    notes.appendChild(li);
  });

  const grid=$("#ticketsGrid");
  grid.innerHTML="";

  ev.tickets.forEach(t=>{
    const rem=remaining(t);

    const box=document.createElement("div");
    box.className="ticketCard";
    box.innerHTML=`
      <div class="ticketTop2">
        <div>
          <div class="ticketType">PILET</div>
          <div class="ticketPrice2">${money(t.price)}</div>
        </div>
      </div>

      <div class="ticketName2">${t.name}</div>
      <div class="ticketFee">${t.desc ? t.desc : ""}</div>
      <div class="ticketLimit">${rem<=0 ? "Välja müüdud" : `${rem} alles`}</div>

      <div class="ticketBottom2">
        <div class="stepper2">
          <button data-act="minus" ${rem<=0?"disabled":""}>−</button>
          <input value="1" inputmode="numeric" ${rem<=0?"disabled":""}>
          <button data-act="plus" ${rem<=0?"disabled":""}>+</button>
        </div>
        <button class="buyBtn2" ${rem<=0?"disabled":""}>Osta</button>
      </div>
    `;

    const input=box.querySelector("input");
    const minus=box.querySelector('[data-act="minus"]');
    const plus=box.querySelector('[data-act="plus"]');
    const buy=box.querySelector(".buyBtn2");

    const clamp=()=>{
      let v=parseInt(input.value||"1",10);
      if(isNaN(v)) v=1;
      v=Math.max(1, Math.min(v, rem));
      input.value=v;
      return v;
    };

    if(rem>0){
      minus.onclick=()=>{input.value=parseInt(input.value||"1",10)-1; clamp();};
      plus.onclick=()=>{input.value=parseInt(input.value||"1",10)+1; clamp();};
      input.oninput=clamp;

      buy.onclick=()=>{
        const qty=clamp();
        cart={ eventId: ev.id, items:[{ticketId:t.id, name:t.name, price:t.price, qty}] };
        location.hash="#checkout";
      };
    }

    grid.appendChild(box);
  });

  $("#evMore").classList.add("hidden");
  $("#evMoreBtn").textContent="Loe rohkem";
};

$("#evBack").onclick=()=>location.hash="#home";
$("#evMoreBtn").onclick=()=>{
  const more=$("#evMore");
  const open=!more.classList.contains("hidden");
  more.classList.toggle("hidden");
  $("#evMoreBtn").textContent = open ? "Loe rohkem" : "Sulge";
};

/* ========================= CHECKOUT ========================= */
const renderCheckout=()=>{
  const ev=data.events.find(e=>e.id===cart?.eventId);
  if(!ev) return;

  $("#coLine").textContent=`${ev.title} • ${fmt(ev.start)} • ${ev.location}`;
  $("#mailHint").textContent="(Demo) Päris QR+email teeme järgmise sammuna.";

  const lines=$("#orderLines");
  lines.innerHTML="";

  const total=cart.items.reduce((s,i)=>s+i.price*i.qty,0);

  cart.items.forEach(i=>{
    const row=document.createElement("div");
    row.className="orderLine";
    row.innerHTML=`<span><b>${i.name}</b><small>${i.qty} × ${money(i.price)}</small></span><span>${money(i.price*i.qty)}</span>`;
    lines.appendChild(row);
  });

  $("#orderTotal").textContent=money(total);
};

$("#coBack").onclick=()=>location.hash=`#event-${cart?.eventId||selectedEventId||""}`;

$("#payBtn").onclick=()=>{
  if(!cart) return;
  const fn=$("#firstName").value.trim();
  const ln=$("#lastName").value.trim();
  const em=$("#email").value.trim();
  if(!fn||!ln||!em) return toast("Täida kõik väljad.");
  if(!$("#c1").checked || !$("#c2").checked) return toast("Tee mõlemad nõusolekud.");

  const ev=data.events.find(e=>e.id===cart.eventId);
  if(!ev) return toast("Üritust ei leitud.");

  for(const it of cart.items){
    const t=ev.tickets.find(x=>x.id===it.ticketId);
    if(!t) return toast("Piletitüüp puudu.");
    if(it.qty>remaining(t)) return toast("Pole piisavalt pileteid.");
  }

  for(const it of cart.items){
    const t=ev.tickets.find(x=>x.id===it.ticketId);
    t.sold += it.qty;
  }

  data.orders.push({
    id:uid(),
    eventId:ev.id,
    buyerName:`${fn} ${ln}`,
    buyerEmail:em,
    items:cart.items,
    total:cart.items.reduce((s,i)=>s+i.price*i.qty,0),
    createdAt:new Date().toISOString()
  });

  save(data);
  toast("Tellimus tehtud ✅ (demo)");
  cart=null;
  location.hash="#home";
  list();
};

/* ========================= ORGANIZER: FULL GAME ========================= */
const requireOrganizer=()=>{
  const ok=!!data.session.email && data.session.role==="organizer";
  if(!ok){
    toast("Logi korraldajana sisse.");
    authBack.classList.remove("hidden");
  }
  return ok;
};

const setOrgTab=(name)=>{
  const tabs=["orgProfile","orgEvents","orgAnalytics"];
  tabs.forEach(id=>$("#"+id).classList.add("hidden"));
  $("#"+name).classList.remove("hidden");
};

$("#tabProfile").onclick=()=>setOrgTab("orgProfile");
$("#tabEvents").onclick=()=>setOrgTab("orgEvents");
$("#tabAnalytics").onclick=()=>{ setOrgTab("orgAnalytics"); renderAnalytics(); };

let editingEventId=null;

const myEvents=()=>{
  const email=data.session.email;
  return data.events.filter(e=>e.ownerEmail===email);
};

const profileFor=()=> data.organizerProfiles[data.session.email] || null;

const profileComplete=(p)=>{
  if(!p) return false;
  const req=["company","reg","country","address","contact","phone","email","iban","terms"];
  return req.every(k=>String(p[k]||"").trim().length>0);
};

const refreshProfileStatus=()=>{
  const p=profileFor();
  $("#profileStatus").textContent = profileComplete(p) ? "Profiil: OK ✅" : "Profiil: puudulik ⚠️";
};

const loadProfileToForm=()=>{
  const p=profileFor() || {};
  $("#p_company").value=p.company||"";
  $("#p_reg").value=p.reg||"";
  $("#p_vat").value=p.vat||"";
  $("#p_country").value=p.country||"Eesti";
  $("#p_address").value=p.address||"";
  $("#p_contact").value=p.contact||"";
  $("#p_phone").value=p.phone||"";
  $("#p_email").value=p.email||"";
  $("#p_iban").value=p.iban||"";
  $("#p_bank").value=p.bank||"";
  $("#p_terms").checked=!!p.terms;
  refreshProfileStatus();
};

$("#saveProfileBtn").onclick=()=>{
  if(!requireOrganizer()) return;

  const p={
    company:$("#p_company").value.trim(),
    reg:$("#p_reg").value.trim(),
    vat:$("#p_vat").value.trim(),
    country:$("#p_country").value.trim(),
    address:$("#p_address").value.trim(),
    contact:$("#p_contact").value.trim(),
    phone:$("#p_phone").value.trim(),
    email:$("#p_email").value.trim(),
    iban:$("#p_iban").value.trim(),
    bank:$("#p_bank").value.trim(),
    terms: $("#p_terms").checked ? "yes" : ""
  };

  data.organizerProfiles[data.session.email]=p;
  save(data);
  refreshProfileStatus();
  toast(profileComplete(p) ? "Profiil salvestatud ✅" : "Profiil salvestatud, aga täida * väljad.");
};

const resetEventForm=()=>{
  editingEventId=null;
  $("#editMeta").textContent="Uus üritus";
  $("#deleteEventBtn").classList.add("hidden");

  $("#f_title").value="";
  $("#f_category").value="";
  $("#f_city").value="tallinn";
  $("#f_start").value="";
  $("#f_end").value="";
  $("#f_doors").value="";
  $("#f_age").value="18+";
  $("#f_organizer").value=(profileFor()?.company || data.session.email.split("@")[0]);
  $("#f_location").value="";
  $("#f_image").value="";
  $("#f_desc").value="";
  $("#f_notes").value="";
  $("#ticketEditor").innerHTML="";
};

const addTicketRow=(t=null)=>{
  const row=document.createElement("div");
  row.className="ticketRow";
  row.dataset.id=t?.id || uid();
  row.innerHTML=`
    <div class="ticketRowTop">
      <b>Pilet</b>
      <button class="btn btn-ghost" data-act="remove">Eemalda</button>
    </div>
    <div class="ticketRowGrid">
      <div class="field"><label>Nimi *</label><input data-k="name" value="${t?.name||""}" placeholder="Tavapilet"></div>
      <div class="field"><label>Hind (€) *</label><input data-k="price" inputmode="decimal" value="${t?.price??""}" placeholder="15"></div>
      <div class="field"><label>Kogus *</label><input data-k="total" inputmode="numeric" value="${t?.total??""}" placeholder="200"></div>
    </div>
    <div class="field" style="margin-top:10px">
      <label>Kirjeldus (valikuline)</label>
      <input data-k="desc" value="${t?.desc||""}" placeholder="Sisenemine kuni 01:00">
    </div>
  `;
  row.querySelector('[data-act="remove"]').onclick=()=>row.remove();
  $("#ticketEditor").appendChild(row);
};

$("#addTicketBtn").onclick=()=>{
  if(!requireOrganizer()) return;
  addTicketRow();
};

const renderOrgList=()=>{
  const listEl=$("#orgList");
  listEl.innerHTML="";

  const items=myEvents().sort((a,b)=>new Date(a.start)-new Date(b.start));
  if(!items.length){
    listEl.innerHTML=`<div class="muted" style="font-weight:900">Sul pole veel üritusi. Vajuta “Uus üritus”.</div>`;
    return;
  }

  for(const ev of items){
    const sold=ev.tickets.reduce((s,t)=>s+(t.sold||0),0);
    const revenue=data.orders.filter(o=>o.eventId===ev.id).reduce((s,o)=>s+(o.total||0),0);

    const box=document.createElement("div");
    box.className="orgItem";
    box.innerHTML=`
      <div>
        <b>${ev.title}</b>
        <div class="muted">${fmt(ev.start)} • ${(ev.city||"").toUpperCase()} • ${ev.location}</div>
        <div class="muted">Müüdud: ${sold} • Tulu: ${money(revenue)}</div>
      </div>
      <div class="orgItemActions">
        <button class="btn btn-ghost" data-act="edit">Muuda</button>
        <button class="btn btn-ghost" data-act="open">Ava</button>
      </div>
    `;
    box.querySelector('[data-act="edit"]').onclick=()=>loadEventToForm(ev.id);
    box.querySelector('[data-act="open"]').onclick=()=>location.hash=`#event-${ev.id}`;
    listEl.appendChild(box);
  }
};

const loadEventToForm=(id)=>{
  const ev=data.events.find(e=>e.id===id);
  if(!ev) return;
  editingEventId=id;

  $("#editMeta").textContent=`Muudad: ${ev.title}`;
  $("#deleteEventBtn").classList.remove("hidden");

  $("#f_title").value=ev.title||"";
  $("#f_category").value=ev.category||"";
  $("#f_city").value=ev.city||"tallinn";
  $("#f_start").value=toLocalInput(ev.start);
  $("#f_end").value=ev.end ? toLocalInput(ev.end) : "";
  $("#f_doors").value=ev.doors || "";
  $("#f_age").value=ev.age || "18+";
  $("#f_organizer").value=ev.organizer || "";
  $("#f_location").value=ev.location||"";
  $("#f_image").value=ev.image||"";
  $("#f_desc").value=ev.desc||"";
  $("#f_notes").value=(ev.notes||[]).join("\n");

  $("#ticketEditor").innerHTML="";
  (ev.tickets||[]).forEach(t=>addTicketRow(t));
};

$("#newEventBtn").onclick=()=>{
  if(!requireOrganizer()) return;

  const p=profileFor();
  if(!profileComplete(p)){
    setOrgTab("orgProfile");
    toast("Enne ürituse loomist täida firma ankeet (* väljad).");
    loadProfileToForm();
    return;
  }

  setOrgTab("orgEvents");
  resetEventForm();
  addTicketRow();
  toast("Uus üritus: täida väljad ja salvesta.");
};

$("#saveEventBtn").onclick=()=>{
  if(!requireOrganizer()) return;

  const p=profileFor();
  if(!profileComplete(p)){
    setOrgTab("orgProfile");
    toast("Täida firma profiil lõpuni enne salvestamist.");
    return;
  }

  const title=$("#f_title").value.trim();
  const category=$("#f_category").value.trim();
  const city=$("#f_city").value;
  const startVal=$("#f_start").value;
  const endVal=$("#f_end").value;
  const doors=$("#f_doors").value.trim();
  const age=$("#f_age").value.trim();
  const organizer=$("#f_organizer").value.trim();
  const location=$("#f_location").value.trim();
  const image=$("#f_image").value.trim();
  const desc=$("#f_desc").value.trim();
  const notes=$("#f_notes").value.split("\n").map(x=>x.trim()).filter(Boolean);

  if(!title||!category||!startVal||!age||!organizer||!location||!image||!desc){
    return toast("Täida kõik * vajalikud väljad (pealkiri, kategooria, algus, vanus, korraldaja, asukoht, pilt, kirjeldus).");
  }

  const rows=[...$("#ticketEditor").querySelectorAll(".ticketRow")];
  if(!rows.length) return toast("Lisa vähemalt 1 piletitüüp.");

  const tickets=[];
  for(const r of rows){
    const get=(k)=>r.querySelector(`[data-k="${k}"]`).value.trim();
    const name=get("name");
    const price=Number(get("price").replace(",","."));
    const total=Number(get("total"));
    const descT=get("desc");

    if(!name) return toast("Piletinimi puudub.");
    if(!Number.isFinite(price) || price<=0) return toast("Piletihind peab olema > 0.");
    if(!Number.isFinite(total) || total<=0) return toast("Piletikogus peab olema > 0.");

    const existingId=r.dataset.id;
    const existingEv=editingEventId ? data.events.find(e=>e.id===editingEventId) : null;
    const existingTicket=existingEv?.tickets?.find(t=>t.id===existingId);

    tickets.push({
      id:existingId || uid(),
      name,
      price,
      total,
      sold: existingTicket?.sold || 0,
      desc: descT
    });
  }

  if(editingEventId){
    const ev=data.events.find(e=>e.id===editingEventId);
    if(!ev) return toast("Üritust ei leitud.");
    Object.assign(ev,{
      title, category, city,
      start: fromLocalInput(startVal),
      end: endVal ? fromLocalInput(endVal) : null,
      doors, age, organizer,
      location, image, desc,
      notes,
      tickets,
      ownerEmail: data.session.email
    });
    toast("Üritus salvestatud ✅");
  } else {
    data.events.push({
      id:uid(),
      ownerEmail:data.session.email,
      title, category, city,
      start: fromLocalInput(startVal),
      end: endVal ? fromLocalInput(endVal) : null,
      doors, age, organizer,
      location, image, desc,
      notes,
      socials:[{label:"Facebook",url:"#"}],
      tickets
    });
    toast("Üritus loodud ✅");
  }

  save(data);
  renderOrgList();
  list();
};

$("#deleteEventBtn").onclick=()=>{
  if(!requireOrganizer()) return;
  if(!editingEventId) return;

  data.events = data.events.filter(e=>e.id!==editingEventId);
  data.orders = data.orders.filter(o=>o.eventId!==editingEventId);
  save(data);

  toast("Üritus kustutatud.");
  resetEventForm();
  renderOrgList();
  list();
};

const renderAnalytics=()=>{
  const events=myEvents();
  const ids=new Set(events.map(e=>e.id));
  const orders=data.orders.filter(o=>ids.has(o.eventId));

  const revenue=orders.reduce((s,o)=>s+(o.total||0),0);
  const sold=events.reduce((s,ev)=>s+ev.tickets.reduce((a,t)=>a+(t.sold||0),0),0);

  $("#kpiRevenue").textContent = money(revenue);
  $("#kpiTickets").textContent = String(sold);
  $("#kpiOrders").textContent = String(orders.length);
  $("#kpiEvents").textContent = String(events.length);

  const tbody=$("#analyticsRows");
  tbody.innerHTML="";

  events
    .sort((a,b)=>new Date(a.start)-new Date(b.start))
    .forEach(ev=>{
      const evOrders=orders.filter(o=>o.eventId===ev.id);
      const evRev=evOrders.reduce((s,o)=>s+(o.total||0),0);
      const evSold=ev.tickets.reduce((s,t)=>s+(t.sold||0),0);

      const tr=document.createElement("tr");
      tr.innerHTML=`
        <td>${ev.title}<div class="muted">${ev.city.toUpperCase()}</div></td>
        <td>${fmt(ev.start)}</td>
        <td>${evSold}</td>
        <td>${money(evRev)}</td>
        <td><button class="btn btn-ghost" data-open="${ev.id}">Ava</button></td>
      `;
      tr.querySelector("button").onclick=()=>location.hash=`#event-${ev.id}`;
      tbody.appendChild(tr);
    });
};

/* ========================= ROUTER ========================= */
const route=()=>{
  const h=(location.hash||"#home").replace("#","");

  if(h==="home" || h==="events" || h===""){
    show("home");
    list();
    return;
  }

  if(h.startsWith("event-")){
    const id=h.replace("event-","");
    selectedEventId=id;
    const ev=data.events.find(e=>e.id===id);
    if(!ev){location.hash="#home";return;}
    show("event");
    renderEvent(ev);
    return;
  }

  if(h==="checkout"){
    if(!cart){toast("Vali enne pilet."); location.hash="#home"; return;}
    show("checkout");
    renderCheckout();
    return;
  }

  if(h==="org"){
    if(!requireOrganizer()){ location.hash="#home"; return; }
    show("org");
    setOrgTab("orgProfile");
    loadProfileToForm();
    renderOrgList();
    renderAnalytics();
    return;
  }

  location.hash="#home";
};

window.addEventListener("hashchange", route);
list();
route();
