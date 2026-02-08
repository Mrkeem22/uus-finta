const KEY="ticketrise_demo_v3";

const $ = (s)=>document.querySelector(s);
const money = (n)=>new Intl.NumberFormat("et-EE",{style:"currency",currency:"EUR"}).format(n);
const uid = ()=>crypto.getRandomValues(new Uint32Array(4)).join("-")+"-"+Date.now().toString(16);
const fmt = (iso)=>new Date(iso).toLocaleString("et-EE",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
const toLocalInput = (iso)=>{
  const d=new Date(iso);
  const pad=(x)=>String(x).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v)=>{
  // treat as local time -> ISO
  const d=new Date(v);
  return d.toISOString();
};
const ticketCode = ()=>`TR-${Math.random().toString(36).slice(2,6).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

const toastEl=$("#toast");
const toast=(m)=>{
  if(!toastEl) return;
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
    events:[
      {
        id:uid(),
        ownerEmail:"demo@organizer.ee",
        title:"TARTU SUUR SÕBRAPÄEVA REIV | SIMI | LENE MA RUE",
        organizer:"Suvepeod Events",
        city:"tartu",
        time:addDays(10),
        location:"KLUBI GUTENBERG - APARAADITEHAS, TARTU",
        category:"Muusika",
        image:"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=75",
        desc:"Sõbrapäeva erikas: SIMI + Lene Ma Rue + local DJ-s. Uksed 23:00. Vanusepiirang 18+.",
        notes:["Võta ID kaasa (18+).","Sisenemine kuni 01:00 (vaata piletitüübi tingimusi).","Pileteid on piiratud koguses."],
        socials:[{label:"Facebook", url:"#"}],
        tickets:[
          {id:uid(), name:"HILSEM SÕPS", price:15, total:200, sold:0, desc:"Sisenemine kuni 01:00"},
          {id:uid(), name:"PRIORITY", price:25, total:80, sold:0, desc:"Kiirem sisenemine"}
        ]
      },
      {
        id:uid(),
        ownerEmail:"demo@organizer.ee",
        title:"SADU | Valgusetendusega öökontsert Rummu karjääris",
        organizer:"Star Productions",
        city:"tallinn",
        time:addDays(18),
        location:"Rummu karjäär, Vasalemma",
        category:"Festival",
        image:"https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1800&q=75",
        desc:"Eriline öökontsert valgusetendusega. Võta soojad riided ja tule elamust nautima.",
        notes:["Pileteid on piiratud koguses.","Soovitame tulla varem.","Parkimine juhendatud."],
        socials:[{label:"Facebook",url:"#"}],
        tickets:[
          {id:uid(), name:"TAVAPILET", price:49, total:500, sold:0, desc:"Sissepääs üritusele"},
          {id:uid(), name:"LAPSEPILETI", price:20, total:120, sold:0, desc:"Piiratud kogus"}
        ]
      }
    ],
    orders:[],
    issuedTickets:[] // {id, eventId, orderId, buyerEmail, buyerName, ticketName, code, checkedInAt?}
  };
  save(d); return d;
};

let data = load() || seed();

/* ========================= AUTH ========================= */
const authBack=$("#authBack");
const refreshAuth=()=>{
  const logged=!!data.session.email;
  $("#btnDashboard")?.classList.toggle("hidden", !(logged && data.session.role==="organizer"));
  $("#btnCheckin")?.classList.toggle("hidden", !(logged && data.session.role==="organizer"));
  $("#btnLogout")?.classList.toggle("hidden", !logged);
  const btnAuth=$("#btnAuth");
  if(btnAuth) btnAuth.textContent = logged ? "Konto" : "Logi sisse";
};
refreshAuth();

$("#btnAuth")?.addEventListener("click", ()=>authBack?.classList.remove("hidden"));
$("#authClose")?.addEventListener("click", ()=>authBack?.classList.add("hidden"));
authBack?.addEventListener("click",(e)=>{ if(e.target===authBack) authBack.classList.add("hidden"); });

$("#tabLogin")?.addEventListener("click",()=>{
  $("#tabLogin").classList.add("active"); $("#tabRegister").classList.remove("active");
  $("#loginView").classList.remove("hidden"); $("#registerView").classList.add("hidden");
});
$("#tabRegister")?.addEventListener("click",()=>{
  $("#tabRegister").classList.add("active"); $("#tabLogin").classList.remove("active");
  $("#registerView").classList.remove("hidden"); $("#loginView").classList.add("hidden");
});

$("#doRegister")?.addEventListener("click",()=>{
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
});

$("#doLogin")?.addEventListener("click",()=>{
  const email=$("#loginEmail").value.trim().toLowerCase();
  const pass=$("#loginPass").value.trim();
  const role=$("#loginRole").value;
  const u=data.users.find(x=>x.email===email && x.pass===pass && x.role===role);
  if(!u) return toast("Vale andmed või roll.");
  data.session={email:u.email, role:u.role};
  save(data); refreshAuth();
  toast("Sisse logitud ✅");
  authBack.classList.add("hidden");
});

$("#btnLogout")?.addEventListener("click",()=>{
  data.session={email:null, role:null};
  save(data); refreshAuth();
  toast("Logisid välja.");
  location.hash="#home";
});

/* buttons -> routes */
$("#btnDashboard")?.addEventListener("click",()=> location.hash="#org");
$("#btnCheckin")?.addEventListener("click",()=> location.hash="#checkin");

/* ========================= PAGES / ROUTER ========================= */
const pages={
  home:$("#pageHome"),
  event:$("#pageEvent"),
  checkout:$("#pageCheckout"),
  org:$("#pageOrg"),
  checkin:$("#pageCheckin"),
};
const show=(name)=>{
  Object.values(pages).forEach(p=>p?.classList.remove("active"));
  pages[name]?.classList.add("active");
};

let selectedEventId=null;
let cart=null;

const remaining=(t)=>t.total - t.sold;
const minPrice=(ev)=>Math.min(...ev.tickets.map(t=>t.price));

/* ========================= HOME LIST ========================= */
$("#city") && ($("#city").value = data.settings.city || "");

const list=()=>{
  const q=(($("#q")?.value||"").trim().toLowerCase());
  const city=(($("#city")?.value)||"");

  data.settings.city=city; save(data);

  let items=[...data.events];

  if(q){
    items=items.filter(ev =>
      (ev.title+" "+ev.organizer+" "+ev.location+" "+ev.category+" "+(ev.desc||"")).toLowerCase().includes(q)
    );
  }
  if(city && city!=="all"){
    items=items.filter(ev => (ev.city||"").toLowerCase()===city);
  }

  items.sort((a,b)=>new Date(a.time)-new Date(b.time));

  $("#countText") && ($("#countText").textContent = items.length ? `${items.length} tulemust` : `Tulemusi pole`);

  const grid=$("#eventGrid");
  if(!grid) return;
  grid.innerHTML="";

  for(const ev of items){
    const card=document.createElement("div");
    card.className="card";
    card.innerHTML=`
      <div class="thumb"><img src="${ev.image}" alt="${ev.title}"></div>
      <div class="cardBody">
        <h3 class="cardTitle">${ev.title}</h3>
        <div class="cardMeta">${fmt(ev.time)} • ${ev.location}</div>
        <div class="cardBottom">
          <div class="cardPrice">Al. ${money(minPrice(ev))}</div>
          <div class="cardCta">Osta pilet →</div>
        </div>
      </div>
    `;
    card.addEventListener("click",()=>{ location.hash=`#event-${ev.id}`; });
    grid.appendChild(card);
  }

  if(!items.length){
    grid.innerHTML=`<div class="card" style="grid-column:1/-1"><div class="cardBody"><div class="muted" style="font-weight:900">Üritusi ei leitud.</div></div></div>`;
  }
};

$("#doSearch")?.addEventListener("click", list);
$("#q")?.addEventListener("input", list);
$("#city")?.addEventListener("change", list);

/* ========================= EVENT RENDER (light) ========================= */
const renderEvent=(ev)=>{
  const d = new Date(ev.time);
  const day = d.toLocaleString("et-EE", { weekday:"short" }).toUpperCase();
  const date = d.toLocaleDateString("et-EE",{ day:"2-digit", month:"long" }).toUpperCase();
  const time = d.toLocaleTimeString("et-EE",{ hour:"2-digit", minute:"2-digit" });

  $("#evTopMeta").textContent = `${day} ${date} • ${ev.location} • ${time}`;
  $("#evTitle").textContent = ev.title;

  $("#evWhen").textContent = fmt(ev.time);
  $("#evWhere").textContent = ev.location;
  $("#evOrg2").textContent = ev.organizer || "—";
  $("#evDesc").textContent = ev.desc || "";

  const badges = $("#evBadges");
  badges.innerHTML = "";
  const b1 = document.createElement("div"); b1.textContent = `Linn: ${(ev.city||"").toUpperCase()}`;
  const b2 = document.createElement("div"); b2.textContent = `Uksed ${time}`;
  badges.appendChild(b1); badges.appendChild(b2);

  const fb = $("#evLink");
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
        <button class="buyBtn2" ${rem<=0?"disabled":""} title="Osta">→</button>
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
  $("#evMoreBtn").textContent = "Loe edasi →";
};

$("#evBack")?.addEventListener("click",()=>{ location.hash="#home"; });
$("#evMoreBtn")?.addEventListener("click",()=>{
  const more=$("#evMore");
  const open=!more.classList.contains("hidden");
  more.classList.toggle("hidden");
  $("#evMoreBtn").textContent = open ? "Loe edasi →" : "Sulge ×";
});

/* ========================= CHECKOUT ========================= */
const renderCheckout=()=>{
  const ev=data.events.find(e=>e.id===cart?.eventId);
  if(!ev) return;

  $("#coLine").textContent=`${ev.title} • ${fmt(ev.time)} • ${ev.location}`;
  $("#mailHint").textContent="(Demo) Järgmise sammuna: päris email + QR. Praegu genereerime koodid ja näed neid check-in’is.";

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

$("#coBack")?.addEventListener("click",()=>{
  location.hash=`#event-${cart?.eventId||selectedEventId||""}`;
});

$("#payBtn")?.addEventListener("click",()=>{
  if(!cart) return;
  const fn=$("#firstName").value.trim();
  const ln=$("#lastName").value.trim();
  const em=$("#email").value.trim().toLowerCase();
  if(!fn||!ln||!em) return toast("Täida kõik väljad.");
  if(!$("#c1").checked || !$("#c2").checked) return toast("Tee mõlemad nõusolekud.");

  const ev=data.events.find(e=>e.id===cart.eventId);
  if(!ev) return toast("Üritust ei leitud.");

  // inventory check
  for(const it of cart.items){
    const t=ev.tickets.find(x=>x.id===it.ticketId);
    if(!t) return toast("Piletitüüp puudu.");
    if(it.qty>remaining(t)) return toast("Pole piisavalt pileteid.");
  }

  // reduce inventory
  for(const it of cart.items){
    const t=ev.tickets.find(x=>x.id===it.ticketId);
    t.sold += it.qty;
  }

  const orderId=uid();
  const total=cart.items.reduce((s,i)=>s+i.price*i.qty,0);

  data.orders.push({
    id:orderId,
    eventId:ev.id,
    buyerName:`${fn} ${ln}`,
    buyerEmail:em,
    items:cart.items,
    total,
    createdAt:new Date().toISOString()
  });

  // issue ticket instances (codes)
  for(const it of cart.items){
    for(let k=0;k<it.qty;k++){
      data.issuedTickets.push({
        id:uid(),
        eventId:ev.id,
        orderId,
        buyerEmail:em,
        buyerName:`${fn} ${ln}`,
        ticketName:it.name,
        code:ticketCode(),
        checkedInAt:null
      });
    }
  }

  save(data);
  toast("Tellimus tehtud ✅ (demo). Koodid on check-in’is.");
  cart=null;
  location.hash="#home";
  list();
});

/* ========================= ORGANIZER ========================= */
const requireOrganizer=()=>{
  const ok = !!data.session.email && data.session.role==="organizer";
  if(!ok){
    toast("Logi korraldajana sisse.");
    authBack?.classList.remove("hidden");
  }
  return ok;
};

let editingEventId=null;

const myEvents=()=>{
  // simple owner: events created by same email
  const email=data.session.email;
  return data.events.filter(e=>e.ownerEmail===email);
};

const resetForm=()=>{
  editingEventId=null;
  $("#editMeta").textContent="Uus üritus";
  $("#deleteEventBtn").classList.add("hidden");
  $("#f_title").value="";
  $("#f_category").value="";
  $("#f_city").value="tallinn";
  $("#f_time").value="";
  $("#f_location").value="";
  $("#f_image").value="";
  $("#f_desc").value="";
  $("#f_notes").value="";
  $("#ticketEditor").innerHTML="";
};

const addTicketRow=(t=null)=>{
  const row=document.createElement("div");
  row.className="ticketRow";
  row.dataset.id = t?.id || uid();
  row.innerHTML=`
    <div class="ticketRowTop">
      <b>Pilet</b>
      <button class="btn btn-ghost" data-act="remove">Eemalda</button>
    </div>
    <div class="ticketRowGrid">
      <div class="field"><label>Nimi</label><input data-k="name" value="${t?.name||""}" placeholder="Nt Tavapilet"></div>
      <div class="field"><label>Hind (€)</label><input data-k="price" inputmode="decimal" value="${t?.price??""}" placeholder="15"></div>
      <div class="field"><label>Kogus</label><input data-k="total" inputmode="numeric" value="${t?.total??""}" placeholder="200"></div>
    </div>
    <div class="field" style="margin-top:10px">
      <label>Kirjeldus</label>
      <input data-k="desc" value="${t?.desc||""}" placeholder="Sisenemine kuni 01:00">
    </div>
  `;
  row.querySelector('[data-act="remove"]').onclick=()=>row.remove();
  $("#ticketEditor").appendChild(row);
};

const renderOrgList=()=>{
  const listEl=$("#orgList");
  listEl.innerHTML="";

  const items=myEvents();
  if(!items.length){
    listEl.innerHTML=`<div class="muted" style="font-weight:900">Sul pole veel üritusi. Vajuta “Uus üritus”.</div>`;
    return;
  }

  items.sort((a,b)=>new Date(a.time)-new Date(b.time));

  for(const ev of items){
    const sold = ev.tickets.reduce((s,t)=>s+(t.sold||0),0);
    const total = ev.tickets.reduce((s,t)=>s+(t.total||0),0);
    const box=document.createElement("div");
    box.className="orgItem";
    box.innerHTML=`
      <div>
        <b>${ev.title}</b>
        <div class="muted">${fmt(ev.time)} • ${ev.city.toUpperCase()} • ${ev.location}</div>
        <div class="muted">Müüdud: ${sold}/${total}</div>
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
  $("#f_time").value=ev.time ? toLocalInput(ev.time) : "";
  $("#f_location").value=ev.location||"";
  $("#f_image").value=ev.image||"";
  $("#f_desc").value=ev.desc||"";
  $("#f_notes").value=(ev.notes||[]).join("\n");

  $("#ticketEditor").innerHTML="";
  (ev.tickets||[]).forEach(t=>addTicketRow(t));
};

$("#newEventBtn")?.addEventListener("click",()=>{
  if(!requireOrganizer()) return;
  resetForm();
  addTicketRow(); // one default ticket row
  toast("Uus üritus valmis muutmiseks.");
});

$("#addTicketBtn")?.addEventListener("click",()=>{
  if(!requireOrganizer()) return;
  addTicketRow();
});

$("#saveEventBtn")?.addEventListener("click",()=>{
  if(!requireOrganizer()) return;

  const title=$("#f_title").value.trim();
  const category=$("#f_category").value.trim() || "Üritus";
  const city=$("#f_city").value;
  const timeVal=$("#f_time").value;
  const location=$("#f_location").value.trim();
  const image=$("#f_image").value.trim() || "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1800&q=70";
  const desc=$("#f_desc").value.trim();
  const notes=$("#f_notes").value.split("\n").map(x=>x.trim()).filter(Boolean);

  if(!title) return toast("Pane pealkiri.");
  if(!timeVal) return toast("Pane kuupäev ja kellaaeg.");
  if(!location) return toast("Pane asukoht.");

  // tickets collect
  const rows=[...$("#ticketEditor").querySelectorAll(".ticketRow")];
  if(!rows.length) return toast("Lisa vähemalt 1 pilet.");
  const tickets=[];
  for(const r of rows){
    const get=(k)=>r.querySelector(`[data-k="${k}"]`)?.value?.trim() || "";
    const name=get("name");
    const price=Number(get("price").replace(",","."));
    const total=Number(get("total"));
    const descT=get("desc");

    if(!name) return toast("Igal piletireal peab olema nimi.");
    if(!Number.isFinite(price) || price<=0) return toast("Piletihind peab olema number > 0.");
    if(!Number.isFinite(total) || total<=0) return toast("Kogus peab olema number > 0.");

    // preserve sold if editing existing ticket
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

  const organizerName = data.session.email.split("@")[0];

  if(editingEventId){
    const ev=data.events.find(e=>e.id===editingEventId);
    if(!ev) return toast("Ei leidnud üritust.");
    ev.title=title;
    ev.category=category;
    ev.city=city;
    ev.time=fromLocalInput(timeVal);
    ev.location=location;
    ev.image=image;
    ev.desc=desc;
    ev.notes=notes;
    ev.organizer=ev.organizer || organizerName;
    ev.ownerEmail=data.session.email;
    ev.tickets=tickets;
    save(data);
    toast("Salvestatud ✅");
  } else {
    const ev={
      id:uid(),
      ownerEmail:data.session.email,
      organizer: organizerName,
      title,
      category,
      city,
      time:fromLocalInput(timeVal),
      location,
      image,
      desc,
      notes,
      socials:[{label:"Facebook",url:"#"}],
      tickets
    };
    data.events.push(ev);
    save(data);
    toast("Üritus loodud ✅");
    editingEventId=ev.id;
    $("#deleteEventBtn").classList.remove("hidden");
    $("#editMeta").textContent=`Muudad: ${ev.title}`;
  }

  renderOrgList();
  list();
});

$("#deleteEventBtn")?.addEventListener("click",()=>{
  if(!requireOrganizer()) return;
  if(!editingEventId) return;
  const idx=data.events.findIndex(e=>e.id===editingEventId);
  if(idx<0) return;
  data.events.splice(idx,1);

  // also remove issuedTickets + orders for that event (demo cleanup)
  data.issuedTickets = data.issuedTickets.filter(t=>t.eventId!==editingEventId);
  data.orders = data.orders.filter(o=>o.eventId!==editingEventId);

  save(data);
  toast("Kustutatud.");
  resetForm();
  renderOrgList();
  list();
});

/* ========================= CHECK-IN ========================= */
$("#backToOrg")?.addEventListener("click",()=>location.hash="#org");

const showResult=(html)=>{ $("#checkResult").innerHTML=html; };

const checkByCode=(code)=>{
  const t=data.issuedTickets.find(x=>x.code===code);
  if(!t) return showResult(`<div style="color:#ffb4b4">❌ Koodi ei leitud</div>`);

  const ev=data.events.find(e=>e.id===t.eventId);
  const status = t.checkedInAt ? `✅ Juba kasutatud (${fmt(t.checkedInAt)})` : `🟢 Kehtiv`;
  showResult(`
    <div><b>${status}</b></div>
    <div class="muted" style="margin-top:8px">Üritus: <b>${ev?.title||"—"}</b></div>
    <div class="muted">Pilet: <b>${t.ticketName}</b></div>
    <div class="muted">Ostja: <b>${t.buyerName}</b> (${t.buyerEmail})</div>
    <div class="muted">Kood: <b>${t.code}</b></div>
    <div style="margin-top:12px">
      <button class="btn btn-primary" id="markUsedBtn" ${t.checkedInAt?"disabled":""}>Märgi kasutatuks</button>
    </div>
  `);

  $("#markUsedBtn").onclick=()=>{
    t.checkedInAt = new Date().toISOString();
    save(data);
    toast("Check-in tehtud ✅");
    checkByCode(code);
  };
};

$("#scanBtn")?.addEventListener("click",()=>{
  if(!requireOrganizer()) return;
  const code=$("#scanInput").value.trim().toUpperCase();
  if(!code) return toast("Sisesta kood.");
  checkByCode(code);
});

$("#emailBtn")?.addEventListener("click",()=>{
  if(!requireOrganizer()) return;
  const em=$("#emailSearch").value.trim().toLowerCase();
  if(!em) return toast("Sisesta email.");
  const items=data.issuedTickets.filter(t=>t.buyerEmail===em).slice(-10).reverse();
  if(!items.length) return showResult(`<div style="color:#ffb4b4">❌ Ei leitud pileteid selle emailiga</div>`);

  showResult(items.map(t=>{
    const ev=data.events.find(e=>e.id===t.eventId);
    const status = t.checkedInAt ? `✅ kasutatud` : `🟢 kehtiv`;
    return `
      <div style="border:1px solid rgba(255,255,255,.10);border-radius:12px;padding:10px;margin-bottom:10px;background:rgba(7,10,18,.22)">
        <div><b>${status}</b> • ${t.ticketName}</div>
        <div class="muted">${ev?.title||"—"}</div>
        <div class="muted">Kood: <b>${t.code}</b></div>
        <button class="btn btn-ghost" data-code="${t.code}" style="margin-top:8px">Kontrolli</button>
      </div>
    `;
  }).join(""));

  [...$("#checkResult").querySelectorAll("button[data-code]")].forEach(b=>{
    b.onclick=()=>checkByCode(b.getAttribute("data-code"));
  });
});

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
    renderOrgList();
    if(!editingEventId) resetForm();
    return;
  }

  if(h==="checkin"){
    if(!requireOrganizer()){ location.hash="#home"; return; }
    show("checkin");
    showResult("—");
    return;
  }

  location.hash="#home";
};

window.addEventListener("hashchange", route);
list();
route();
