const KEY="ticketrise_demo_v1";

/* helpers */
const $ = (s)=>document.querySelector(s);
const money = (n)=>new Intl.NumberFormat("et-EE",{style:"currency",currency:"EUR"}).format(n);
const uid = ()=>crypto.getRandomValues(new Uint32Array(4)).join("-")+"-"+Date.now().toString(16);
const fmt = (iso)=>new Date(iso).toLocaleString("et-EE",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
const toastEl=$("#toast");
const toast=(m)=>{toastEl.textContent=m;toastEl.classList.remove("hidden");setTimeout(()=>toastEl.classList.add("hidden"),2200);};

const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"");}catch{return null;}};
const save=(d)=>localStorage.setItem(KEY, JSON.stringify(d));

/* seed */
const seed=()=>{
  const now=new Date();
  const addDays=(d)=>new Date(now.getTime()+d*86400000).toISOString();
  const d={
    settings:{ city:"" },       // IMPORTANT: no default city
    session:{ email:null, role:null },
    users:[],
    events:[
      {
        id:uid(),
        title:"TARTU SUUR SÕBRAPÄEVA REIV | SIMI | LENE MA RUE",
        organizer:"Suvepeod Events",
        city:"tartu",
        time:addDays(10),
        location:"KLUBI GUTENBERG - APARAADITEHAS",
        category:"Muusika",
        image:"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=70",
        minPrice:15
      },
      {
        id:uid(),
        title:"SADU | Valgusetendusega öökontsert Rummu karjääris",
        organizer:"Star Productions",
        city:"tallinn",
        time:addDays(18),
        location:"Rummu karjäär, Vasalemma",
        category:"Festival",
        image:"https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1600&q=70",
        minPrice:20
      },
      {
        id:uid(),
        title:"Pulse Nights Vol.1",
        organizer:"GateMe",
        city:"tallinn",
        time:addDays(25),
        location:"Club Hollywood, Tallinn",
        category:"Muusika",
        image:"https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?auto=format&fit=crop&w=1600&q=70",
        minPrice:12
      }
    ]
  };
  save(d);
  return d;
};

let data = load() || seed();

/* auth ui */
const authBack=$("#authBack");
const refreshAuth=()=>{
  const logged=!!data.session.email;
  $("#btnDashboard").classList.toggle("hidden", !(logged && data.session.role==="organizer"));
  $("#btnLogout").classList.toggle("hidden", !logged);
  $("#btnAuth").textContent = logged ? "Konto" : "Logi sisse";
};
refreshAuth();

/* modal open/close */
$("#btnAuth").onclick=()=>authBack.classList.remove("hidden");
$("#authClose").onclick=()=>authBack.classList.add("hidden");
authBack.onclick=(e)=>{ if(e.target===authBack) authBack.classList.add("hidden"); };

/* tabs */
$("#tabLogin").onclick=()=>{
  $("#tabLogin").classList.add("active"); $("#tabRegister").classList.remove("active");
  $("#loginView").classList.remove("hidden"); $("#registerView").classList.add("hidden");
};
$("#tabRegister").onclick=()=>{
  $("#tabRegister").classList.add("active"); $("#tabLogin").classList.remove("active");
  $("#registerView").classList.remove("hidden"); $("#loginView").classList.add("hidden");
};

/* register */
$("#doRegister").onclick=()=>{
  const email=$("#regEmail").value.trim().toLowerCase();
  const pass=$("#regPass").value.trim();
  const role=$("#regRole").value;
  if(!email || !pass){toast("Täida email ja parool.");return;}
  if(data.users.some(u=>u.email===email && u.role===role)){toast("See konto juba olemas.");return;}
  data.users.push({id:uid(), email, pass, role});
  data.session={email, role};
  save(data);
  refreshAuth();
  toast("Konto loodud ✅");
  authBack.classList.add("hidden");
};

/* login */
$("#doLogin").onclick=()=>{
  const email=$("#loginEmail").value.trim().toLowerCase();
  const pass=$("#loginPass").value.trim();
  const role=$("#loginRole").value;
  const u=data.users.find(x=>x.email===email && x.pass===pass && x.role===role);
  if(!u){toast("Vale andmed või roll.");return;}
  data.session={email:u.email, role:u.role};
  save(data);
  refreshAuth();
  toast("Sisse logitud ✅");
  authBack.classList.add("hidden");
};

/* logout */
$("#btnLogout").onclick=()=>{
  data.session={email:null, role:null};
  save(data);
  refreshAuth();
  toast("Logisid välja.");
};

/* dashboard placeholder */
$("#btnDashboard").onclick=()=>{
  toast("Dashboard tuleb järgmise sammuna (event + checkout + organizer).");
};

/* filtering + list */
$("#city").value = data.settings.city || "";

const list=()=>{
  const q=($("#q").value||"").trim().toLowerCase();
  const city=$("#city").value || "";
  data.settings.city=city;
  save(data);

  let items=[...data.events];

  if(q){
    items=items.filter(ev =>
      (ev.title+" "+ev.organizer+" "+ev.location+" "+ev.category).toLowerCase().includes(q)
    );
  }

  if(city && city!=="all"){
    items=items.filter(ev => (ev.city||"").toLowerCase()===city);
  }

  items.sort((a,b)=>new Date(a.time)-new Date(b.time));
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
        <div class="cardMeta">${fmt(ev.time)} • ${ev.location}</div>
        <div class="cardBottom">
          <div class="cardPrice">Al. ${money(ev.minPrice||0)}</div>
          <div class="cardCta">Osta pilet →</div>
        </div>
      </div>
    `;
    card.onclick=()=>toast("Event page tuleb järgmise sammuna ✅");
    grid.appendChild(card);
  }

  if(!items.length){
    grid.innerHTML=`<div class="card" style="grid-column:1/-1"><div class="cardBody"><div class="muted" style="font-weight:900">Üritusi ei leitud.</div></div></div>`;
  }
};

$("#doSearch").onclick=list;
$("#q").addEventListener("input", list);
$("#city").addEventListener("change", list);

list();
