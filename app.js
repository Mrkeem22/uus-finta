const KEY="ticketrise_demo_v2";

const $ = (s)=>document.querySelector(s);
const money = (n)=>new Intl.NumberFormat("et-EE",{style:"currency",currency:"EUR"}).format(n);
const uid = ()=>crypto.getRandomValues(new Uint32Array(4)).join("-")+"-"+Date.now().toString(16);
const fmt = (iso)=>new Date(iso).toLocaleString("et-EE",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});

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
    settings:{ city:"" }, // empty by default
    session:{ email:null, role:null },
    users:[],
    events:[
      {
        id:uid(),
        title:"TARTU SUUR SÕBRAPÄEVA REIV | SIMI | LENE MA RUE",
        organizer:"Suvepeod Events",
        city:"tartu",
        time:addDays(10),
        location:"KLUBI GUTENBERG - APARAADITEHAS, TARTU",
        category:"Muusika",
        image:"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=75",
        desc:"Sõbrapäeva erikas: SIMI + Lene Ma Rue + local DJ-s. Uksed 23:00. Vanusepiirang 18+.",
        notes:["Võta ID kaasa (18+).","Sisenemine kuni 01:00 (vaata piletitüübi tingimusi).","Pileteid on piiratud koguses."],
        socials:[
          {label:"Facebook", url:"#"},
          {label:"Instagram", url:"#"},
          {label:"Spotify", url:"#"},
          {label:"TikTok", url:"#"}
        ],
        tickets:[
          {id:uid(), name:"SÕBRAPÄEVA COMBO", price:25, total:120, sold:0, desc:"2x pilet soodsamalt"},
          {id:uid(), name:"HILSEM SÕPS", price:15, total:200, sold:0, desc:"Sisenemine kuni 01:00"},
          {id:uid(), name:"PRIORITY", price:25, total:80, sold:0, desc:"Kiirem sisenemine"},
          {id:uid(), name:"LAUABRONEERING", price:100, total:20, sold:0, desc:"Broneering (8p)"}
        ]
      },
      {
        id:uid(),
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
    orders:[]
  };

  save(d);
  return d;
};

let data = load() || seed();

/* =========================
   AUTH
========================= */
const authBack=$("#authBack");

const refreshAuth=()=>{
  const logged=!!data.session.email;
  $("#btnDashboard")?.classList.toggle("hidden", !(logged && data.session.role==="organizer"));
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
});

$("#btnDashboard")?.addEventListener("click",()=>{
  toast("Korraldaja dashboard + check-in tuleb järgmise sammuna ✅");
});

/* =========================
   ROUTING / PAGES
========================= */
const pages={
  home:$("#pageHome"),
  event:$("#pageEvent"),
  checkout:$("#pageCheckout"),
};
const show=(name)=>{
  Object.values(pages).forEach(p=>p?.classList.remove("active"));
  pages[name]?.classList.add("active");
};

let selectedEventId=null;
let cart=null;

const remaining=(t)=>t.total - t.sold;
const minPrice=(ev)=>Math.min(...ev.tickets.map(t=>t.price));

/* =========================
   HOME LIST
========================= */
const citySelect=$("#city");
if(citySelect){
  citySelect.value = data.settings.city || "";
}

const list=()=>{
  const q=(($("#q")?.value||"").trim().toLowerCase());
  const city=(($("#city")?.value)||"");

  data.settings.city=city;
  save(data);

  let items=[...data.events];

  if(q){
    items=items.filter(ev =>
      (ev.title+" "+ev.organizer+" "+ev.location+" "+ev.category+" "+ev.desc).toLowerCase().includes(q)
    );
  }
  if(city && city!=="all"){
    items=items.filter(ev => (ev.city||"").toLowerCase()===city);
  }

  items.sort((a,b)=>new Date(a.time)-new Date(b.time));

  const count=$("#countText");
  if(count) count.textContent = items.length ? `${items.length} tulemust` : `Tulemusi pole`;

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

/* =========================
   EVENT RENDER (Ticketer-like)
========================= */
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
  const b1 = document.createElement("div"); b1.textContent = `Vanusepiirang 18+`;
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
      <div class="ticketLimit">${rem<=0 ? "Välja müüdud" : "Piiratud kogus!"}</div>

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

  // collapsed by default
  $("#evMore").classList.add("hidden");
  $("#evMoreBtn").textContent = "Loe edasi →";
};

/* Back buttons */
$("#evBack")?.addEventListener("click",()=>{ location.hash="#home"; });

/* Expand info */
$("#evMoreBtn")?.addEventListener("click",()=>{
  const more=$("#evMore");
  const open=!more.classList.contains("hidden");
  more.classList.toggle("hidden");
  $("#evMoreBtn").textContent = open ? "Loe edasi →" : "Sulge ×";
});

/* =========================
   CHECKOUT
========================= */
const renderCheckout=()=>{
  const ev=data.events.find(e=>e.id===cart?.eventId);
  if(!ev) return;

  $("#coLine").textContent=`${ev.title} • ${fmt(ev.time)} • ${ev.location}`;
  $("#mailHint").textContent="(Demo) QR + email tuleb päriselt järgmise sammuna (API kaudu).";

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
  const em=$("#email").value.trim();
  if(!fn||!ln||!em) return toast("Täida kõik väljad.");
  if(!$("#c1").checked || !$("#c2").checked) return toast("Tee mõlemad nõusolekud.");

  const ev=data.events.find(e=>e.id===cart.eventId);
  if(!ev) return toast("Üritust ei leitud.");

  // check inventory
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
});

/* =========================
   ROUTER
========================= */
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

  location.hash="#home";
};

window.addEventListener("hashchange", route);
list();
route();
