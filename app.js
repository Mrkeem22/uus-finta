/* =========================================================
   Ticketrise — SINGLE FILE APP (localStorage demo)
   - Auth: login/register + session
   - Organizer: full profile (company) + payout + events + analytics
   - Events: poster visible, tickets card, "Loe edasi" details view
   - Checkout: buyer details + send email w/ QR via /api/send-email
   ========================================================= */

const LS = {
  USERS: "TR_USERS",
  SESSION: "TR_SESSION",
  EVENTS: "TR_EVENTS",
  ORDERS: "TR_ORDERS",
};

const $$ = (s, el = document) => el.querySelector(s);
const $$$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

const money = (n) => {
  const x = Number(n || 0);
  return x.toFixed(2).replace(".", ",") + " €";
};

const cityName = (c) => ({
  tallinn: "Tallinn",
  tartu: "Tartu",
  parnu: "Pärnu",
  narva: "Narva",
  all: "Kõik linnad",
}[c] || "");

function toast(msg) {
  const t = $$("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(() => t.classList.add("hidden"), 3200);
}

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ===================== SEED DATA ===================== */
function seedIfEmpty() {
  const users = read(LS.USERS, []);
  const events = read(LS.EVENTS, []);
  const orders = read(LS.ORDERS, []);

  if (!users.length) {
    users.push({
      id: uid(),
      email: "organizer@ticketrise.ee",
      pass: "Ticketrise123!",
      first: "Demo",
      last: "Korraldaja",
      lang: "et",
      // organizer fields
      org: {
        enabled: true, // user can access organizer menus
        profileComplete: true,
        payoutComplete: true,
        status: "Kinnitatud",
        company: "Ticketrise Demo OÜ",
        reg: "12345678",
        vat: "",
        country: "Eesti",
        address: "Näidise tn 1, Tallinn",
        contact: "Demo Korraldaja",
        phone: "+372 555 5555",
        email: "organizer@ticketrise.ee",
        terms: true,
        iban: "EE123456789012345678",
        bank: "Demo Bank",
      }
    });

    users.push({
      id: uid(),
      email: "buyer@ticketrise.ee",
      pass: "Ticketrise123!",
      first: "Demo",
      last: "Ostja",
      lang: "et",
      org: { enabled: false, profileComplete: false, payoutComplete: false, status: "—" }
    });

    write(LS.USERS, users);
  }

  if (!events.length) {
    const orgUser = read(LS.USERS, [])[0];

    events.push({
      id: uid(),
      ownerUserId: orgUser.id,
      organizerName: orgUser.org.company,
      title: "TARTU SUUR SÕBRAPÄEVA REIV | SIMI | LENE MA RUE",
      category: "Muusika",
      city: "tartu",
      startISO: new Date(Date.now() + 1000*60*60*24*10).toISOString(),
      doors: "23:00",
      age: "18+",
      location: "Klubi Gutenberg - Aparaaditehas",
      image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=70",
      fb: "https://facebook.com",
      short: "Sõbrapäeva erikas: SIMI + Lene Ma Rue + local DJ-d. Uksed 23:00, vanusepiirang 18+.",
      desc: "Veebruaris ootame lennutada kohale muusika ja bassi sekk. Tule varakult, sest kohapeal võib olla piiratud arv pileteid.\n\nPidu tuleb mõnus ja käib kaua.",
      notes: [
        "Võta ID kaasa (18+).",
        "Sisenemine kuni 01:00 (vaata piletitüübi tingimust).",
        "Tasuline garderoob."
      ],
      forbidden: [
        "iseelikurite, tõuke- ja jalgrattasegad",
        "kaasavõetud söögid ja joogid",
        "lemmikloomad (v.a. abikoerad)",
        "professionaalsed foto-, video- või audiotehnikad (ilma akrediteeringuta)",
        "selja-, kande- ja spordikotid",
        "tuli-, külm- ja muud tüüpi relvad"
      ],
      tickets: [
        { id: uid(), name:"SÕBRAPÄEVA COMBO", price:25, fee:0, limit:120, sold: 0, sub:"Kiirem sisenemine + kombo" },
        { id: uid(), name:"HILISEM SÕPS", price:15, fee:0, limit:200, sold: 0, sub:"Sisenemine kuni 01:00" },
        { id: uid(), name:"PRIORITY", price:25, fee:0, limit:80, sold: 0, sub:"Kiirem sisenemine" },
        { id: uid(), name:"LAUABRONEERING (8p)", price:100, fee:0, limit:20, sold: 0, sub:"Broneering + laud" },
      ],
      createdAt: Date.now(),
      published: true,
    });

    write(LS.EVENTS, events);
  }

  if (!orders.length) write(LS.ORDERS, orders);
}
seedIfEmpty();

/* ===================== GLOBAL STATE ===================== */
let session = read(LS.SESSION, null); // { userId, mode: 'buyer'|'organizer' }
let currentEventId = null;
let checkoutCart = null; // { eventId, items:[{ticketId, qty}] }

/* ===================== DOM REFS ===================== */
const pages = {
  home: $$("#pageHome"),
  event: $$("#pageEvent"),
  checkout: $$("#pageCheckout"),
  account: $$("#pageAccount"),
};

const btnAuth = $$("#btnAuth");
const btnAccount = $$("#btnAccount");
const btnLogout = $$("#btnLogout");

const authBack = $$("#authBack");
const tabLogin = $$("#tabLogin");
const tabRegister = $$("#tabRegister");
const loginView = $$("#loginView");
const registerView = $$("#registerView");
const authClose = $$("#authClose");
const doLoginBtn = $$("#doLogin");
const doRegisterBtn = $$("#doRegister");

const qInput = $$("#q");
const citySelect = $$("#city");
const doSearch = $$("#doSearch");
const eventGrid = $$("#eventGrid");
const countText = $$("#countText");

/* Event page */
const evHeroBg = $$("#evHeroBg");
const evBack = $$("#evBack");
const evTopMeta = $$("#evTopMeta");
const evTitle = $$("#evTitle");
const evBadges = $$("#evBadges");
const evLink = $$("#evLink");
const evMoreBtn = $$("#evMoreBtn");
const evPoster = $$("#evPoster");
const evKicker = $$("#evKicker");
const evShort = $$("#evShort");
const ticketsGrid = $$("#ticketsGrid");

const evDetails = $$("#evDetails");
const evDetailsMeta = $$("#evDetailsMeta");
const evDetailsTitle = $$("#evDetailsTitle");
const evDetailsLead = $$("#evDetailsLead");
const evNotes = $$("#evNotes");
const evForbidden = $$("#evForbidden");
const evDesc = $$("#evDesc");
const evCloseDetails = $$("#evCloseDetails");

/* Checkout */
const coBack = $$("#coBack");
const coLine = $$("#coLine");
const orderLines = $$("#orderLines");
const orderTotal = $$("#orderTotal");
const firstName = $$("#firstName");
const lastName = $$("#lastName");
const email = $$("#email");
const c1 = $$("#c1");
const c2 = $$("#c2");
const payBtn = $$("#payBtn");
const mailHint = $$("#mailHint");

/* Account */
const meEmail = $$("#meEmail");
const meFirst = $$("#meFirst");
const meLast = $$("#meLast");
const meLang = $$("#meLang");
const saveMe = $$("#saveMe");
const modeBuyer = $$("#modeBuyer");
const modeOrganizer = $$("#modeOrganizer");
const modeHint = $$("#modeHint");

const orgStatus = $$("#orgStatus");
const saveProfile = $$("#saveProfile");
const savePayout = $$("#savePayout");

const p_company = $$("#p_company");
const p_reg = $$("#p_reg");
const p_vat = $$("#p_vat");
const p_country = $$("#p_country");
const p_address = $$("#p_address");
const p_contact = $$("#p_contact");
const p_phone = $$("#p_phone");
const p_email = $$("#p_email");
const p_terms = $$("#p_terms");
const p_iban = $$("#p_iban");
const p_bank = $$("#p_bank");

const newEventBtn = $$("#newEventBtn");
const orgList = $$("#orgList");
const editMeta = $$("#editMeta");
const saveEventBtn = $$("#saveEventBtn");
const deleteEventBtn = $$("#deleteEventBtn");
const addTicketBtn = $$("#addTicketBtn");
const ticketEditor = $$("#ticketEditor");

const f_title = $$("#f_title");
const f_category = $$("#f_category");
const f_city = $$("#f_city");
const f_start = $$("#f_start");
const f_doors = $$("#f_doors");
const f_age = $$("#f_age");
const f_location = $$("#f_location");
const f_image = $$("#f_image");
const f_desc = $$("#f_desc");
const f_notes = $$("#f_notes");
const f_forbidden = $$("#f_forbidden");

const kpiRevenue = $$("#kpiRevenue");
const kpiTickets = $$("#kpiTickets");
const kpiOrders = $$("#kpiOrders");
const kpiEvents = $$("#kpiEvents");
const analyticsRows = $$("#analyticsRows");

/* ===================== HELPERS ===================== */
function getUsers(){ return read(LS.USERS, []); }
function setUsers(u){ write(LS.USERS, u); }
function getEvents(){ return read(LS.EVENTS, []); }
function setEvents(e){ write(LS.EVENTS, e); }
function getOrders(){ return read(LS.ORDERS, []); }
function setOrders(o){ write(LS.ORDERS, o); }

function getMe(){
  if (!session?.userId) return null;
  return getUsers().find(u => u.id === session.userId) || null;
}

function requireAuthOrOpenModal() {
  if (!session?.userId) { openAuth(); return false; }
  return true;
}

function setPage(name) {
  Object.values(pages).forEach(p => p.classList.remove("active"));
  pages[name].classList.add("active");
  window.scrollTo({top:0,behavior:"instant"});
}

function setHash(h){ location.hash = h; }

function fmtDateTime(iso){
  const d = new Date(iso);
  // Estonian style: R 27. VEEBRUAR • 22:00
  const wd = ["P","E","T","K","N","R","L"][d.getDay()];
  const day = d.getDate();
  const month = d.toLocaleString("et-EE",{month:"long"}).toUpperCase();
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${wd} ${day}. ${month} • ${hh}:${mm}`;
}

function toLocalInput(iso){
  const d = new Date(iso);
  const pad = (n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function clampText(s, max=140){
  s = (s||"").trim();
  if (s.length<=max) return s;
  return s.slice(0,max-1) + "…";
}

/* ===================== NAV / AUTH UI ===================== */
function refreshTopbar() {
  const me = getMe();
  if (!me) {
    btnAuth.classList.remove("hidden");
    btnAccount.classList.add("hidden");
    btnLogout.classList.add("hidden");
    return;
  }
  btnAuth.classList.add("hidden");
  btnAccount.classList.remove("hidden");
  btnLogout.classList.remove("hidden");
}

function openAuth(){
  authBack.classList.remove("hidden");
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginView.classList.remove("hidden");
  registerView.classList.add("hidden");
}
function closeAuth(){ authBack.classList.add("hidden"); }

tabLogin.onclick = () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginView.classList.remove("hidden");
  registerView.classList.add("hidden");
};
tabRegister.onclick = () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerView.classList.remove("hidden");
  loginView.classList.add("hidden");
};
authClose.onclick = closeAuth;
authBack.addEventListener("click", (e)=>{ if(e.target===authBack) closeAuth(); });

btnAuth.onclick = openAuth;
btnAccount.onclick = () => { if(requireAuthOrOpenModal()) setHash("#account/me"); };
btnLogout.onclick = () => {
  session = null;
  write(LS.SESSION, null);
  toast("Oled välja logitud.");
  refreshTopbar();
  setHash("#home");
};

/* ===================== AUTH ACTIONS ===================== */
async function sendAccountEmail(to, type) {
  // type: 'welcome'
  try{
    const res = await fetch("/api/send-email",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ type, to })
    });
    const j = await res.json();
    if(!j.ok) throw new Error(j.error||"Email error");
    return true;
  }catch(e){
    // Works even without email provider
    return false;
  }
}

doRegisterBtn.onclick = async () => {
  const e = ($$("#regEmail").value||"").trim().toLowerCase();
  const p = ($$("#regPass").value||"").trim();
  if (!e || !p || p.length < 6) return toast("Sisesta korrektne e-mail ja vähemalt 6 tähemärgiga parool.");

  const users = getUsers();
  if (users.some(u => u.email === e)) return toast("See e-mail on juba kasutusel.");

  const u = {
    id: uid(),
    email: e,
    pass: p,
    first: "",
    last: "",
    lang: "et",
    org: { enabled:false, profileComplete:false, payoutComplete:false, status:"—" }
  };
  users.push(u);
  setUsers(users);

  // auto login
  session = { userId: u.id, mode: "buyer" };
  write(LS.SESSION, session);

  closeAuth();
  refreshTopbar();
  toast("Konto loodud ✅");

  const okMail = await sendAccountEmail(e, "welcome");
  if (okMail) toast("Saatsime kinnituse e-mailile ✅");
  else toast("E-mail teavitus: demo-režiim (RESEND puudub).");

  setHash("#account/me");
};

doLoginBtn.onclick = () => {
  const e = ($$("#loginEmail").value||"").trim().toLowerCase();
  const p = ($$("#loginPass").value||"").trim();
  const users = getUsers();
  const u = users.find(x => x.email === e && x.pass === p);
  if (!u) return toast("Vale e-mail või parool.");
  session = { userId: u.id, mode: "buyer" };
  write(LS.SESSION, session);
  closeAuth();
  refreshTopbar();
  toast("Tere tulemast tagasi 👋");
  setHash("#home");
};

/* ===================== HOME / SEARCH ===================== */
function eventMatches(ev, q, city){
  const qq = (q||"").trim().toLowerCase();
  const okQ = !qq || (
    ev.title.toLowerCase().includes(qq) ||
    (ev.organizerName||"").toLowerCase().includes(qq) ||
    (ev.location||"").toLowerCase().includes(qq)
  );
  const okCity = !city || city === "all" || ev.city === city;
  return okQ && okCity && ev.published;
}

function renderHome() {
  const q = qInput.value;
  const city = citySelect.value;

  const evs = getEvents()
    .filter(ev => eventMatches(ev, q, city))
    .sort((a,b)=> new Date(a.startISO)-new Date(b.startISO));

  countText.textContent = evs.length ? `${evs.length} tulemust` : "Tulemusi ei leitud";

  eventGrid.innerHTML = evs.map(ev => {
    const dt = fmtDateTime(ev.startISO);
    return `
      <article class="card" data-id="${ev.id}">
        <div class="cardMedia">
          <img src="${ev.image}" alt="${escapeHtml(ev.title)}">
          <div class="cardShade"></div>
        </div>
        <div class="cardBody">
          <div class="cardMeta">
            <span class="pill">${cityName(ev.city)}</span>
            <span class="pill">${dt}</span>
          </div>
          <div class="cardTitle">${escapeHtml(ev.title)}</div>
          <div class="cardMeta">
            <span>${escapeHtml(ev.location)}</span>
          </div>
        </div>
      </article>
    `;
  }).join("");

  $$$(".card", eventGrid).forEach(el => {
    el.onclick = () => setHash(`#event/${el.dataset.id}`);
  });
}

doSearch.onclick = renderHome;
qInput.addEventListener("keydown",(e)=>{ if(e.key==="Enter") renderHome(); });
citySelect.onchange = renderHome;

/* ===================== EVENT PAGE ===================== */
function availableLeft(ev, t){
  const sold = Number(t.sold||0);
  const limit = Number(t.limit||0);
  if (!limit) return Infinity;
  return Math.max(0, limit - sold);
}

function renderEvent(evId) {
  const ev = getEvents().find(e => e.id === evId);
  if (!ev) { toast("Üritust ei leitud."); return setHash("#home"); }
  currentEventId = ev.id;

  setPage("event");
  evDetails.classList.add("hidden");

  evHeroBg.src = ev.image;
  evHeroBg.alt = ev.title;

  evTitle.textContent = ev.title;
  evTopMeta.textContent = `${fmtDateTime(ev.startISO)} • ${escapeHtml(ev.location)}`;

  evBadges.innerHTML = `
    <span class="pill">Linn: ${cityName(ev.city)}</span>
    <span class="pill">Uksed: ${escapeHtml(ev.doors||"—")}</span>
    <span class="pill">Vanusepiirang: ${escapeHtml(ev.age||"—")}</span>
  `;

  evLink.href = ev.fb || "#";
  evLink.style.pointerEvents = ev.fb ? "auto" : "none";
  evLink.style.opacity = ev.fb ? "1" : ".55";

  evPoster.src = ev.image;
  evPoster.alt = ev.title;

  evKicker.textContent = `${escapeHtml(ev.organizerName||"Korraldaja")} • ${cityName(ev.city)}`;
  evShort.textContent = ev.short || clampText(ev.desc, 180);

  ticketsGrid.innerHTML = ev.tickets.map(t => {
    const left = availableLeft(ev, t);
    const leftText = left === Infinity ? "" : `${left} alles`;
    const disabled = left === 0 ? "disabled" : "";
    return `
      <div class="ticketCard" data-tid="${t.id}">
        <div>
          <div class="ticketK">Pilet</div>
          <div class="ticketPrice">${money(t.price)}</div>
          <div class="ticketName">${escapeHtml(t.name)}</div>
          <div class="ticketSub">${escapeHtml(t.sub||"")}${leftText ? `<div class="muted" style="margin-top:6px">${leftText}</div>` : ""}</div>
        </div>

        <div style="display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px">
          <div class="qtyBox" ${disabled ? 'style="opacity:.55"' : ""}>
            <button class="qtyBtn" data-act="minus" ${disabled}>−</button>
            <div class="qtyVal" data-qty>1</div>
            <button class="qtyBtn" data-act="plus" ${disabled}>+</button>
          </div>
          <button class="buyBtn" data-buy ${disabled}>Osta</button>
        </div>
      </div>
    `;
  }).join("");

  // ticket handlers
  $$$(".ticketCard", ticketsGrid).forEach(card => {
    const qtyEl = $$("[data-qty]", card);
    const minus = $$('[data-act="minus"]', card);
    const plus = $$('[data-act="plus"]', card);
    const buy = $$("[data-buy]", card);

    const ticketId = card.dataset.tid;
    const t = ev.tickets.find(x => x.id === ticketId);
    const left = availableLeft(ev, t);
    let qty = 1;
    const renderQty = () => { qtyEl.textContent = String(qty); };

    minus.onclick = () => { qty = Math.max(1, qty - 1); renderQty(); };
    plus.onclick = () => {
      const max = left === Infinity ? 99 : Math.max(1, left);
      qty = Math.min(max, qty + 1);
      renderQty();
    };

    buy.onclick = () => {
      checkoutCart = { eventId: ev.id, items: [{ ticketId, qty }] };
      setHash("#checkout");
    };

    renderQty();
  });

  evMoreBtn.onclick = () => openDetails(ev);
  evCloseDetails.onclick = () => evDetails.classList.add("hidden");
  evBack.onclick = () => history.length > 1 ? history.back() : setHash("#home");
}

function openDetails(ev){
  evDetailsMeta.textContent = `${fmtDateTime(ev.startISO)} • ${escapeHtml(ev.location)}, ${cityName(ev.city)}`;
  evDetailsTitle.textContent = ev.title;
  evDetailsLead.textContent = ev.short || clampText(ev.desc, 180);

  evNotes.innerHTML = (ev.notes||[]).map(x => `<li>${escapeHtml(x)}</li>`).join("") || `<li>—</li>`;
  evForbidden.innerHTML = (ev.forbidden||[]).map(x => `<li>${escapeHtml(x)}</li>`).join("") || `<li>—</li>`;

  evDesc.innerHTML = nl2p(ev.desc || "");

  evDetails.classList.remove("hidden");
  evDetails.scrollIntoView({behavior:"smooth", block:"start"});
}

/* ===================== CHECKOUT ===================== */
coBack.onclick = () => history.length > 1 ? history.back() : setHash("#home");

function renderCheckout() {
  if (!checkoutCart?.eventId) { toast("Ostukorv on tühi."); return setHash("#home"); }

  const ev = getEvents().find(e => e.id === checkoutCart.eventId);
  if (!ev) return setHash("#home");

  setPage("checkout");
  const items = checkoutCart.items;

  coLine.textContent = ev.title;

  let total = 0;
  orderLines.innerHTML = items.map(it => {
    const t = ev.tickets.find(x => x.id === it.ticketId);
    const line = Number(t.price) * Number(it.qty);
    total += line;
    return `
      <div class="lineRow">
        <div>
          <div style="font-weight:1100">${escapeHtml(t.name)}</div>
          <div class="muted">${it.qty}x</div>
        </div>
        <div style="font-weight:1100">${money(line)}</div>
      </div>
    `;
  }).join("");

  orderTotal.textContent = money(total);

  mailHint.textContent = "Pärast ostu saad e-maili QR-piletiga (demo / päris saatmine sõltub RESEND seadistusest).";
}

payBtn.onclick = async () => {
  if (!checkoutCart?.eventId) return;
  const ev = getEvents().find(e => e.id === checkoutCart.eventId);
  if (!ev) return;

  const fn = (firstName.value||"").trim();
  const ln = (lastName.value||"").trim();
  const em = (email.value||"").trim().toLowerCase();
  if (!fn || !ln || !em.includes("@")) return toast("Täida eesnimi, perenimi ja korrektne e-mail.");
  if (!c1.checked || !c2.checked) return toast("Palun nõustu tingimustega (mõlemad kastid).");

  // availability check
  const events = getEvents();
  const evNow = events.find(x => x.id === ev.id);
  for (const it of checkoutCart.items) {
    const t = evNow.tickets.find(x => x.id === it.ticketId);
    const left = availableLeft(evNow, t);
    if (left !== Infinity && it.qty > left) return toast("Vabandust, pileteid jäi vähemaks. Vähenda kogust.");
  }

  // create tickets
  const ticketInstances = [];
  let total = 0;

  for (const it of checkoutCart.items) {
    const t = evNow.tickets.find(x => x.id === it.ticketId);
    total += Number(t.price) * Number(it.qty);

    // update sold
    t.sold = Number(t.sold||0) + Number(it.qty);

    for (let i=0;i<it.qty;i++){
      ticketInstances.push({
        code: "TR-" + uid().slice(0,10).toUpperCase(),
        ticketName: t.name,
        price: t.price,
      });
    }
  }

  // persist event changes
  setEvents(events);

  const order = {
    id: uid(),
    createdAt: Date.now(),
    eventId: evNow.id,
    eventTitle: evNow.title,
    organizerName: evNow.organizerName,
    buyer: { first: fn, last: ln, email: em },
    total,
    tickets: ticketInstances,
  };

  const orders = getOrders();
  orders.push(order);
  setOrders(orders);

  // send email (serverless)
  payBtn.disabled = true;
  payBtn.textContent = "Saadan…";

  try{
    const res = await fetch("/api/send-email", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        type: "tickets",
        to: em,
        order,
        event: {
          title: evNow.title,
          startISO: evNow.startISO,
          location: evNow.location,
          city: cityName(evNow.city),
          image: evNow.image,
        }
      })
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error||"Email error");

    toast("Ost tehtud ✅ QR-pilet saadeti e-mailile.");
  }catch(e){
    toast("Ost tehtud ✅ (e-mail demo-režiimis / RESEND puudub).");
  }finally{
    payBtn.disabled = false;
    payBtn.textContent = "MAKSMA";
  }

  // reset cart and go home
  checkoutCart = null;
  firstName.value = "";
  lastName.value = "";
  email.value = "";
  c1.checked = false;
  c2.checked = false;
  setHash("#home");
};

/* ===================== ACCOUNT ===================== */
function renderAccount(route = "me") {
  if (!requireAuthOrOpenModal()) return;
  setPage("account");

  const me = getMe();
  meEmail.textContent = me.email;
  meFirst.value = me.first || "";
  meLast.value = me.last || "";
  meLang.value = me.lang || "et";

  // mode
  const isOrgUnlocked = !!me.org?.enabled;
  const isOrgReady = !!me.org?.profileComplete && !!me.org?.payoutComplete;

  modeBuyer.classList.toggle("btn-primary", session?.mode === "buyer");
  modeOrganizer.classList.toggle("btn-primary", session?.mode === "organizer");
  modeHint.textContent = isOrgUnlocked
    ? (isOrgReady ? "Korraldaja vaade on aktiivne ja valmis müügiks." : "Korraldaja vaade on saadaval, kuid enne müüki täida 'Korraldaja andmed' ja 'Väljamaksed'.")
    : "Korraldaja vaade avaneb pärast firma andmete täitmist.";

  // sidebar navigation
  $$$(".accLink").forEach(b => b.classList.remove("active"));
  const map = {
    me: "#accMe",
    orgProfile: "#accOrgProfile",
    orgPayout: "#accOrgPayout",
    orgEvents: "#accOrgEvents",
    orgAnalytics: "#accOrgAnalytics",
  };
  const targetId = map[route] || "#accMe";
  const targetBtn = $$$(".accLink").find(b => b.dataset.acc === route);
  if (targetBtn) targetBtn.classList.add("active");
  $$$(".accPanel").forEach(p => p.classList.add("hidden"));
  $$(targetId).classList.remove("hidden");

  // org status pill
  orgStatus.textContent = me.org?.status || "—";

  // fill organizer profile fields
  p_company.value = me.org?.company || "";
  p_reg.value = me.org?.reg || "";
  p_vat.value = me.org?.vat || "";
  p_country.value = me.org?.country || "Eesti";
  p_address.value = me.org?.address || "";
  p_contact.value = me.org?.contact || "";
  p_phone.value = me.org?.phone || "";
  p_email.value = me.org?.email || me.email;
  p_terms.checked = !!me.org?.terms;

  // payout
  p_iban.value = me.org?.iban || "";
  p_bank.value = me.org?.bank || "";

  if (route === "orgEvents") renderOrganizerEvents();
  if (route === "orgAnalytics") renderAnalytics();
}

saveMe.onclick = () => {
  const me = getMe();
  const users = getUsers();
  const idx = users.findIndex(u => u.id === me.id);
  users[idx].first = meFirst.value.trim();
  users[idx].last = meLast.value.trim();
  users[idx].lang = meLang.value;
  setUsers(users);
  toast("Salvestatud ✅");
};

modeBuyer.onclick = () => {
  if (!requireAuthOrOpenModal()) return;
  session.mode = "buyer";
  write(LS.SESSION, session);
  toast("Ostja vaade ✅");
  renderAccount("me");
};

modeOrganizer.onclick = () => {
  if (!requireAuthOrOpenModal()) return;
  const me = getMe();
  if (!me.org?.enabled) return toast("Täida firma andmed — siis avaneb korraldaja vaade.");
  session.mode = "organizer";
  write(LS.SESSION, session);
  toast("Korraldaja vaade ✅");
  renderAccount("orgEvents");
};

/* ---- Sidebar clicks ---- */
$$$(".accLink").forEach(btn => {
  btn.onclick = () => {
    const route = btn.dataset.acc;
    setHash(`#account/${route}`);
  };
});

/* ---- Organizer Profile Save ---- */
saveProfile.onclick = async () => {
  const me = getMe();
  const users = getUsers();
  const idx = users.findIndex(u => u.id === me.id);

  // validate required
  const required = [
    ["Firma nimi", p_company.value],
    ["Registrikood", p_reg.value],
    ["Riik", p_country.value],
    ["Aadress", p_address.value],
    ["Kontaktisik", p_contact.value],
    ["Telefon", p_phone.value],
    ["Kontakt e-mail", p_email.value],
  ];
  for (const [label,val] of required){
    if(!(val||"").trim()) return toast(`Puudub: ${label}`);
  }
  if(!p_terms.checked) return toast("Palun kinnita tingimused.");

  // enable organizer mode now
  users[idx].org = users[idx].org || {};
  users[idx].org.enabled = true;

  users[idx].org.company = p_company.value.trim();
  users[idx].org.reg = p_reg.value.trim();
  users[idx].org.vat = p_vat.value.trim();
  users[idx].org.country = p_country.value.trim();
  users[idx].org.address = p_address.value.trim();
  users[idx].org.contact = p_contact.value.trim();
  users[idx].org.phone = p_phone.value.trim();
  users[idx].org.email = p_email.value.trim();
  users[idx].org.terms = true;
  users[idx].org.profileComplete = true;
  users[idx].org.status = "Sisestatud";

  setUsers(users);
  toast("Korraldaja andmed salvestatud ✅");

  // optional: email confirm (same endpoint, different template)
  const okMail = await sendAccountEmail(users[idx].email, "organizer_profile");
  if(okMail) toast("Saatsime e-mailile kinnituse ✅");
  else toast("E-mail teavitus: demo-režiim.");

  renderAccount("orgProfile");
};

/* ---- Payout Save ---- */
savePayout.onclick = () => {
  const me = getMe();
  const users = getUsers();
  const idx = users.findIndex(u => u.id === me.id);

  if (!(p_iban.value||"").trim()) return toast("Puudub IBAN.");
  users[idx].org = users[idx].org || {};
  users[idx].org.iban = p_iban.value.trim();
  users[idx].org.bank = p_bank.value.trim();
  users[idx].org.payoutComplete = true;
  users[idx].org.status = users[idx].org.profileComplete ? "Valmis" : (users[idx].org.status||"Sisestatud");

  setUsers(users);
  toast("Väljamaksed salvestatud ✅");
  renderAccount("orgPayout");
};

/* ===================== ORGANIZER EVENTS (CRUD) ===================== */
let editingEventId = null;

function organizerCanPublish(me){
  return !!me.org?.profileComplete && !!me.org?.payoutComplete;
}

function renderOrganizerEvents() {
  const me = getMe();
  if (!me) return;

  // Ensure organizer mode selected visually
  if (session?.mode !== "organizer" && me.org?.enabled) {
    // do not force, but we can allow view
  }

  const events = getEvents().filter(e => e.ownerUserId === me.id);
  orgList.innerHTML = events.length ? events
    .sort((a,b)=>b.createdAt-a.createdAt)
    .map(ev => `
      <div class="orgItem" data-id="${ev.id}">
        <div class="t">${escapeHtml(ev.title)}</div>
        <div class="m">${cityName(ev.city)} • ${fmtDateTime(ev.startISO)} • ${ev.published ? "Avalik" : "Mustand"}</div>
      </div>
    `).join("")
  : `<div class="muted">Pole ühtegi üritust. Vajuta “Uus üritus”.</div>`;

  $$$(".orgItem", orgList).forEach(x => {
    x.onclick = () => loadEventIntoForm(x.dataset.id);
  });

  // if no editing event, show blank
  if (!editingEventId) blankEventForm();
  updateAnalyticsHint();
}

function updateAnalyticsHint(){
  const me = getMe();
  if(!me) return;
  const ready = organizerCanPublish(me);
  const msg = ready
    ? "✅ Korraldaja on valmis. Üritused saab avalikuks panna."
    : "⚠️ Enne müüki täida 'Korraldaja andmed' + 'Väljamaksed'.";
  editMeta.textContent = msg;
}

function blankEventForm() {
  editingEventId = null;
  deleteEventBtn.classList.add("hidden");

  f_title.value = "";
  f_category.value = "";
  f_city.value = "tartu";
  f_start.value = toLocalInput(new Date(Date.now()+1000*60*60*24*7).toISOString());
  f_doors.value = "";
  f_age.value = "18+";
  f_location.value = "";
  f_image.value = "";
  f_desc.value = "";
  f_notes.value = "";
  f_forbidden.value = "";

  ticketEditor.innerHTML = "";
  addTicketRow({ name:"Regular bird", price:17, limit:100, sub:"" });
}

newEventBtn.onclick = () => {
  const me = getMe();
  if(!me) return;
  if(!me.org?.enabled) return toast("Täida firma andmed (Korraldaja andmed).");
  blankEventForm();
  toast("Uus üritus — täida vorm ja salvesta.");
};

function loadEventIntoForm(id){
  const ev = getEvents().find(e => e.id === id);
  if(!ev) return;
  editingEventId = ev.id;
  deleteEventBtn.classList.remove("hidden");

  f_title.value = ev.title;
  f_category.value = ev.category || "";
  f_city.value = ev.city || "tartu";
  f_start.value = toLocalInput(ev.startISO);
  f_doors.value = ev.doors || "";
  f_age.value = ev.age || "";
  f_location.value = ev.location || "";
  f_image.value = ev.image || "";
  f_desc.value = ev.desc || "";
  f_notes.value = (ev.notes||[]).join("\n");
  f_forbidden.value = (ev.forbidden||[]).join("\n");

  ticketEditor.innerHTML = "";
  (ev.tickets||[]).forEach(t => addTicketRow(t));
}

function addTicketRow(t = {}) {
  const rowId = t.id || uid();
  const el = document.createElement("div");
  el.className = "ticketRow";
  el.dataset.rowId = rowId;

  el.innerHTML = `
    <div class="ticketRowTop">
      <div class="field">
        <label>Pileti nimi *</label>
        <input data-k="name" value="${escapeAttr(t.name||"")}" placeholder="nt Regular bird">
      </div>
      <div class="field">
        <label>Hind *</label>
        <input data-k="price" type="number" min="0" step="0.01" value="${Number(t.price||0)}">
      </div>
      <div class="field">
        <label>Limit *</label>
        <input data-k="limit" type="number" min="0" step="1" value="${Number(t.limit||0)}">
      </div>
      <div class="ticketRowActions">
        <button class="btn btn-danger" data-remove>−</button>
      </div>
    </div>

    <div class="field" style="margin-top:10px">
      <label>Alatekst (valikuline)</label>
      <input data-k="sub" value="${escapeAttr(t.sub||"")}" placeholder="nt Sisenemine kuni 01:00">
    </div>
  `;

  $$("[data-remove]", el).onclick = () => el.remove();
  ticketEditor.appendChild(el);
}

addTicketBtn.onclick = () => addTicketRow({ name:"", price:0, limit:0, sub:"" });

function readTicketRows(){
  const rows = $$$(".ticketRow", ticketEditor);
  const out = [];
  for(const r of rows){
    const name = ($$('[data-k="name"]', r).value||"").trim();
    const price = Number($$('[data-k="price"]', r).value||0);
    const limit = Number($$('[data-k="limit"]', r).value||0);
    const sub = ($$('[data-k="sub"]', r).value||"").trim();
    if(!name) continue;
    out.push({
      id: r.dataset.rowId || uid(),
      name, price, limit, sub,
      sold: 0, fee: 0
    });
  }
  return out;
}

saveEventBtn.onclick = () => {
  const me = getMe();
  if(!me) return;

  if(!me.org?.enabled) return toast("Täida firma andmed (Korraldaja andmed).");

  // validate required event fields
  const req = [
    ["Pealkiri", f_title.value],
    ["Kategooria", f_category.value],
    ["Algus", f_start.value],
    ["Vanusepiirang", f_age.value],
    ["Asukoht", f_location.value],
    ["Poster URL", f_image.value],
    ["Kirjeldus", f_desc.value],
  ];
  for(const [label, val] of req){
    if(!(val||"").trim()) return toast(`Puudub: ${label}`);
  }

  const tickets = readTicketRows();
  if(!tickets.length) return toast("Lisa vähemalt 1 piletitüüp.");

  const events = getEvents();
  let ev;
  if(editingEventId){
    ev = events.find(x=>x.id===editingEventId);
    if(!ev) return;
  }

  const startISO = new Date(f_start.value).toISOString();
  const notes = (f_notes.value||"").split("\n").map(x=>x.trim()).filter(Boolean);
  const forbidden = (f_forbidden.value||"").split("\n").map(x=>x.trim()).filter(Boolean);

  const canPublish = organizerCanPublish(me);

  if(!ev){
    ev = {
      id: uid(),
      ownerUserId: me.id,
      organizerName: me.org?.company || "Korraldaja",
      createdAt: Date.now(),
      published: canPublish, // if ready -> auto publish, else draft
      tickets: []
    };
    events.push(ev);
  }

  // preserve sold counters if ticket id matches
  const oldTickets = ev.tickets || [];
  const mergedTickets = tickets.map(t=>{
    const old = oldTickets.find(x=>x.id===t.id) || oldTickets.find(x=>x.name===t.name);
    return { ...t, sold: Number(old?.sold||0) };
  });

  ev.title = f_title.value.trim();
  ev.category = f_category.value.trim();
  ev.city = f_city.value;
  ev.startISO = startISO;
  ev.doors = f_doors.value || "";
  ev.age = f_age.value.trim();
  ev.location = f_location.value.trim();
  ev.image = f_image.value.trim();
  ev.desc = f_desc.value.trim();
  ev.short = clampText(ev.desc.replace(/\s+/g," "), 160);
  ev.notes = notes;
  ev.forbidden = forbidden;
  ev.fb = ev.fb || "";
  ev.tickets = mergedTickets;
  ev.organizerName = me.org?.company || ev.organizerName;
  ev.published = canPublish ? true : false;

  setEvents(events);
  editingEventId = ev.id;

  toast(canPublish ? "Üritus salvestatud ja avalik ✅" : "Üritus salvestatud mustandina (täida väljamaksed) ⚠️");
  renderOrganizerEvents();
};

deleteEventBtn.onclick = () => {
  if(!editingEventId) return;
  const ok = confirm("Kustutame ürituse?");
  if(!ok) return;
  const events = getEvents().filter(e => e.id !== editingEventId);
  setEvents(events);
  editingEventId = null;
  blankEventForm();
  toast("Kustutatud ✅");
  renderOrganizerEvents();
};

/* ===================== ANALYTICS ===================== */
function renderAnalytics(){
  const me = getMe();
  if(!me) return;

  const events = getEvents().filter(e => e.ownerUserId === me.id);
  const orders = getOrders().filter(o => {
    const ev = getEvents().find(e=>e.id===o.eventId);
    return ev?.ownerUserId === me.id;
  });

  let revenue = 0;
  let tickets = 0;

  for(const o of orders){
    revenue += Number(o.total||0);
    tickets += (o.tickets||[]).length;
  }

  kpiRevenue.textContent = money(revenue);
  kpiTickets.textContent = String(tickets);
  kpiOrders.textContent = String(orders.length);
  kpiEvents.textContent = String(events.length);

  analyticsRows.innerHTML = events
    .sort((a,b)=>new Date(a.startISO)-new Date(b.startISO))
    .map(ev=>{
      const evOrders = orders.filter(o=>o.eventId===ev.id);
      const evTickets = evOrders.reduce((sum,o)=>sum+(o.tickets||[]).length,0);
      const evRevenue = evOrders.reduce((sum,o)=>sum+Number(o.total||0),0);
      return `
        <tr>
          <td>${escapeHtml(ev.title)}</td>
          <td>${fmtDateTime(ev.startISO)}</td>
          <td>${evTickets}</td>
          <td>${money(evRevenue)}</td>
          <td><button class="btn btn-ghost" data-open="${ev.id}">Ava</button></td>
        </tr>
      `;
    }).join("");

  $$$('[data-open]', analyticsRows).forEach(b=>{
    b.onclick = () => setHash(`#event/${b.dataset.open}`);
  });
}

/* ===================== ROUTER ===================== */
function route() {
  refreshTopbar();

  const h = (location.hash || "#home").replace("#","");
  const [p, a] = h.split("/");

  if (p === "home" || p === "") {
    setPage("home");
    renderHome();
    return;
  }
  if (p === "events") {
    setPage("home");
    renderHome();
    return;
  }
  if (p === "event") {
    renderEvent(a);
    return;
  }
  if (p === "checkout") {
    renderCheckout();
    return;
  }
  if (p === "account") {
    const tab = a || "me";
    renderAccount(tab);
    return;
  }

  setPage("home");
  renderHome();
}

window.addEventListener("hashchange", route);
route();

/* ===================== UTIL ===================== */
function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s).replaceAll("\n"," "); }
function nl2p(s){
  const safe = escapeHtml(s);
  const parts = safe.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);
  return parts.map(p=>`<p style="margin:0 0 12px">${p.replaceAll("\n","<br>")}</p>`).join("") || "<p>—</p>";
}
