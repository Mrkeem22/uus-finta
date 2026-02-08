(() => {
  const KEYS = {
    USERS: "ticketrise_users_v2",
    SESSION: "ticketrise_session_v2",
    EVENTS: "ticketrise_events_v2",
    ORDERS: "ticketrise_orders_v2"
  };

  const safeJSON = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  };

  function seedIfNeeded() {
    const users = safeJSON.get(KEYS.USERS, null);
    if (!Array.isArray(users) || users.length === 0) {
      safeJSON.set(KEYS.USERS, [
        { id: "u_demo_org", email: "demo@ticketrise.ee", password: "Ticketrise123!", canOrganize: true },
        { id: "u_demo_buyer", email: "buyer@ticketrise.ee", password: "Ticketrise123!", canOrganize: false }
      ]);
    }

    const events = safeJSON.get(KEYS.EVENTS, null);
    if (!Array.isArray(events) || events.length === 0) {
      const y = new Date().getFullYear();
      safeJSON.set(KEYS.EVENTS, [
        {
          id: "ev_1",
          title: "TARTU MASSIVE: YUSSI AU",
          city: "Tartu",
          venue: "Klubi Gutenberg - Aparaaditehas",
          organizerName: "Suvepeod Events",
          startISO: `${y}-02-13T23:00:00`,
          age: "18+",
          posterUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1600&q=60",
          description:
`Veebruaris ootab sind lennutõke kohalike maalimaise peo peatükk.

Mis toimub:
• klubis on muusikat tugevalt (drum & bass, house)
• uksed 23:00
• vanusepiirang 18+`,
          tickets: [
            { id: "t1", name: "Regular Bird", price: 15, stock: 120 },
            { id: "t2", name: "Priority", price: 25, stock: 80 }
          ]
        },
        {
          id: "ev_2",
          title: "Pulse Nights Vol. 1",
          city: "Tallinn",
          venue: "Club Hollywood",
          organizerName: "Pulse Crew",
          startISO: `${y}-03-13T22:00:00`,
          age: "18+",
          posterUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1600&q=60",
          description: "Öö, mis ei lõpeta vara. Hea heli, kiire energia ja üllatused.",
          tickets: [
            { id: "t1", name: "Early", price: 13, stock: 65 },
            { id: "t2", name: "Regular", price: 17, stock: 100 }
          ]
        }
      ]);
    }

    const orders = safeJSON.get(KEYS.ORDERS, null);
    if (!Array.isArray(orders)) safeJSON.set(KEYS.ORDERS, []);
  }

  seedIfNeeded();

  const $app = document.getElementById("app");
  const $btnAuth = document.getElementById("btnAuth");
  const $btnLogout = document.getElementById("btnLogout");
  const $navOrganizer = document.querySelector(".navOrganizer");

  // AUTH MODAL
  const authModal = document.getElementById("modalAuth");
  const authClose = document.getElementById("authClose");
  const formLogin = document.getElementById("formLogin");
  const formSignup = document.getElementById("formSignup");
  const authToast = document.getElementById("authToast");
  const toSignup = document.getElementById("toSignup");
  const toLogin = document.getElementById("toLogin");
  const authTitle = document.getElementById("authTitle");

  // EVENT MODAL
  const eventModal = document.getElementById("modalEvent");
  const eventClose = document.getElementById("eventClose");
  const eventTitle = document.getElementById("eventTitle");
  const eventBody = document.getElementById("eventBody");

  const state = {
    location: null,
    query: "",
    session: safeJSON.get(KEYS.SESSION, null),
  };

  function getUsers(){ return safeJSON.get(KEYS.USERS, []); }
  function setUsers(v){ safeJSON.set(KEYS.USERS, v); }
  function getEvents(){ return safeJSON.get(KEYS.EVENTS, []); }
  function getOrders(){ return safeJSON.get(KEYS.ORDERS, []); }

  function escapeHtml(s){ return String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function escapeAttr(s){ return escapeHtml(s).replace(/"/g,"&quot;"); }

  function toast(msg, type="ok"){
    authToast.hidden = false;
    authToast.textContent = msg;
    authToast.className = "toast " + (type==="bad" ? "isBad" : "isOk");
  }
  function clearToast(){ authToast.hidden = true; authToast.textContent = ""; authToast.className="toast"; }

  function setSession(sess){
    state.session = sess;
    safeJSON.set(KEYS.SESSION, sess);
    syncAuthUI();
  }
  function clearSession(){
    state.session = null;
    localStorage.removeItem(KEYS.SESSION);
    syncAuthUI();
  }

  function openAuth(mode="login"){
    authModal.classList.add("isOpen");
    authModal.setAttribute("aria-hidden","false");
    clearToast();
    setAuthMode(mode);
  }
  function closeAuth(){
    authModal.classList.remove("isOpen");
    authModal.setAttribute("aria-hidden","true");
  }
  function setAuthMode(mode){
    if(mode==="login"){
      authTitle.textContent = "Logi sisse";
      formLogin.hidden = false;
      formSignup.hidden = true;
    } else {
      authTitle.textContent = "Loo konto";
      formLogin.hidden = true;
      formSignup.hidden = false;
    }
  }

  function openEvent(ev){
    eventTitle.textContent = ev.title;
    const minP = minPrice(ev);
    eventBody.innerHTML = `
      <div style="display:grid;gap:10px">
        <div class="pill">${escapeHtml(ev.city)} • ${escapeHtml(fmtDate(ev.startISO))} • ${escapeHtml(ev.age)}</div>
        <div class="poster" style="border-radius:16px;border:1px solid rgba(255,255,255,.08);background-image:url('${escapeAttr(ev.posterUrl)}')"></div>
        <p><b>${escapeHtml(ev.venue)}</b><br/><span style="color:var(--muted)">${escapeHtml(ev.organizerName)}</span></p>
        <p style="white-space:pre-wrap">${escapeHtml(ev.description || "")}</p>
        <div class="row">
          <span class="pill">alates ${minP} €</span>
          <button class="btnTiny" disabled>Osta (järgmine samm)</button>
        </div>
      </div>
    `;
    eventModal.classList.add("isOpen");
    eventModal.setAttribute("aria-hidden","false");
  }
  function closeEvent(){
    eventModal.classList.remove("isOpen");
    eventModal.setAttribute("aria-hidden","true");
    eventBody.innerHTML = "";
  }

  function syncAuthUI(){
    const loggedIn = !!state.session;
    $btnAuth.hidden = loggedIn;
    $btnLogout.hidden = !loggedIn;
    const canOrg = loggedIn && !!state.session.canOrganize;
    $navOrganizer.hidden = !canOrg;

    document.querySelectorAll(".navLink").forEach(a => a.classList.remove("isActive"));
    const route = (location.hash || "#home").replace("#","");
    const active = document.querySelector(`[data-nav="${route}"]`);
    if(active) active.classList.add("isActive");
  }

  const fmtDate = (iso) => {
    try{
      const d = new Date(iso);
      return d.toLocaleString("et-EE", { weekday:"short", day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
    }catch{ return iso; }
  };

  function minPrice(ev){
    const prices = (ev.tickets || []).map(t => Number(t.price)).filter(n => Number.isFinite(n));
    if(prices.length===0) return "—";
    return Math.min(...prices).toFixed(0);
  }

  function filterEvents(events){
    return events.filter(ev => {
      const q = (state.query || "").trim().toLowerCase();
      const loc = state.location;

      const matchLoc = !loc ? true : (loc==="ALL" ? true : ev.city === loc);
      if(!matchLoc) return false;

      if(!q) return true;
      const hay = `${ev.title} ${ev.organizerName} ${ev.venue} ${ev.city}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function heroHTML(){
    return `
      <section class="hero">
        <div class="heroTop">
          <div>
            <div class="badge">⚡ Night-ready piletiplatvorm <span class="kbd">demo</span></div>
            <h1>Leia elamus, mis päriselt loeb</h1>
            <p>Otsi üritusi, vali pilet ja ostmine on super lihtne.</p>
          </div>
          <div class="pill">${state.session ? `Sisse logitud: <b>${escapeHtml(state.session.email)}</b>` : `Pole sisse logitud`}</div>
        </div>

        <div class="heroGrid" role="search">
          <input class="input" id="q" placeholder="Üritus, korraldaja, koht…" value="${escapeAttr(state.query)}" />
          <select class="select" id="loc">
            <option value="">Asukoht: pole valitud</option>
            ${["Tallinn","Tartu","Pärnu","Narva"].map(c => `<option ${state.location===c?"selected":""} value="${c}">${c}</option>`).join("")}
            <option ${state.location==="ALL"?"selected":""} value="ALL">Kõik linnad</option>
          </select>
          <button class="btn" id="btnSearch">Otsi</button>
        </div>
      </section>
    `;
  }

  function listEventsHTML(){
    const events = filterEvents(getEvents());
    if(events.length === 0){
      return `<div class="empty">Üritusi ei leitud. Proovi teist otsingut või vali “Kõik linnad”.</div>`;
    }

    return `
      <div class="grid">
        ${events.map(ev => `
          <article class="card" role="article" data-card-open="${ev.id}" tabindex="0" aria-label="Ava üritus: ${escapeAttr(ev.title)}">
            <div class="poster" style="background-image:url('${escapeAttr(ev.posterUrl)}')"></div>
            <div class="cardBody">
              <div class="meta">
                <span class="pill">${escapeHtml(ev.city)}</span>
                <span class="pill">${escapeHtml(ev.age)}</span>
                <span class="pill">${escapeHtml(fmtDate(ev.startISO))}</span>
              </div>
              <h3>${escapeHtml(ev.title)}</h3>
              <p>${escapeHtml(ev.venue)} • ${escapeHtml(ev.organizerName)}</p>
              <div class="row">
                <span class="pill">Loe rohkem</span>
                <span class="pill">alates ${minPrice(ev)} €</span>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function homePage(){
    return `
      ${heroHTML()}
      <div class="sectionTitle">
        <h2>Üritused</h2>
        <div class="pill">Asukoht: <b>${state.location ? (state.location==="ALL"?"kõik":state.location) : "pole valitud"}</b></div>
      </div>
      ${listEventsHTML()}
    `;
  }

  function eventsPage(){
    return `
      ${heroHTML()}
      <div class="sectionTitle"><h2>Kõik üritused</h2></div>
      ${listEventsHTML()}
    `;
  }

  function organizerGate(){
    if(!state.session){
      return `
        <div class="empty">
          Korraldaja vaate nägemiseks pead sisse logima.
          <div style="margin-top:10px"><button class="btn" id="needLogin">Logi sisse</button></div>
        </div>
      `;
    }
    if(!state.session.canOrganize){
      return `
        <div class="empty">
          Sinu konto on ostja režiimis. Kui soovid üritusi luua, aktiveeri korraldaja režiim.
          <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn" id="enableOrg">Aktiveeri korraldaja</button>
            <button class="btn ghost" id="logout2">Logi välja</button>
          </div>
        </div>
      `;
    }

    const orders = getOrders();
    const totalRevenue = orders.reduce((s,o)=>s + (Number(o.total)||0),0);
    const ticketsSold = orders.reduce((s,o)=>s + (Number(o.qty)||0),0);

    return `
      <section class="hero">
        <div class="heroTop">
          <div>
            <div class="badge">Korraldaja</div>
            <h2>Dashboard (demo)</h2>
            <p>Järgmine samm: firma ankeet, ürituse loomine, analüütika, check-in.</p>
          </div>
          <div class="pill">Konto: <b>${escapeHtml(state.session.email)}</b></div>
        </div>

        <div style="margin-top:14px" class="grid">
          <div class="card" style="cursor:default"><div class="cardBody"><div class="meta"><span class="pill">Tulu</span></div><h3>${totalRevenue.toFixed(2)} €</h3><p>Kokku (demo)</p></div></div>
          <div class="card" style="cursor:default"><div class="cardBody"><div class="meta"><span class="pill">Piletid</span></div><h3>${ticketsSold}</h3><p>Müüdud (demo)</p></div></div>
          <div class="card" style="cursor:default"><div class="cardBody"><div class="meta"><span class="pill">Staatus</span></div><h3>Valmis</h3><p>Login + klikitav event kaart</p></div></div>
        </div>
      </section>
    `;
  }

  function go(hash){ location.hash = hash; }
  function currentHash(){ return location.hash || "#home"; }

  function bindCommon(){
    const q = document.getElementById("q");
    const loc = document.getElementById("loc");
    const btnSearch = document.getElementById("btnSearch");

    if(q) q.addEventListener("input", (e)=> state.query = e.target.value);
    if(loc) loc.addEventListener("change", (e)=> {
      const v = e.target.value;
      state.location = v ? v : null;
      render();
    });
    if(btnSearch) btnSearch.addEventListener("click", ()=> render());

    document.querySelectorAll("[data-card-open]").forEach(card => {
      const id = card.getAttribute("data-card-open");
      const open = () => {
        const ev = getEvents().find(e => e.id === id);
        if(ev) openEvent(ev);
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e)=> {
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          open();
        }
      });
    });
  }

  function bindOrganizer(){
    const needLogin = document.getElementById("needLogin");
    if(needLogin) needLogin.addEventListener("click", ()=> openAuth("login"));

    const enableOrg = document.getElementById("enableOrg");
    if(enableOrg) enableOrg.addEventListener("click", ()=> {
      const users = getUsers();
      const idx = users.findIndex(u => u.id === state.session.userId);
      if(idx >= 0){
        users[idx].canOrganize = true;
        setUsers(users);
        setSession({ ...state.session, canOrganize: true });
        render();
      }
    });

    const logout2 = document.getElementById("logout2");
    if(logout2) logout2.addEventListener("click", ()=> { clearSession(); go("#home"); });
  }

  function render(){
    syncAuthUI();
    const h = currentHash();
    if(h.startsWith("#organizer")){
      $app.innerHTML = organizerGate();
      bindOrganizer();
      return;
    }
    if(h.startsWith("#events")){
      $app.innerHTML = eventsPage();
      bindCommon();
      return;
    }
    $app.innerHTML = homePage();
    bindCommon();
  }

  // Topbar actions
  $btnAuth.addEventListener("click", ()=> openAuth("login"));
  $btnLogout.addEventListener("click", ()=> { clearSession(); go("#home"); });

  // Auth modal controls
  authClose.addEventListener("click", closeAuth);
  authModal.addEventListener("click", (e)=> { if(e.target === authModal) closeAuth(); });

  toSignup.addEventListener("click", ()=> setAuthMode("signup"));
  toLogin.addEventListener("click", ()=> setAuthMode("login"));

  formLogin.addEventListener("submit", (e)=> {
    e.preventDefault();
    clearToast();
    const fd = new FormData(formLogin);
    const email = String(fd.get("email")||"").trim().toLowerCase();
    const password = String(fd.get("password")||"");

    const users = getUsers();
    const u = users.find(x => x.email.toLowerCase()===email && x.password===password);
    if(!u){ toast("Vale e-mail või parool.", "bad"); return; }

    setSession({ userId: u.id, email: u.email, canOrganize: !!u.canOrganize });
    closeAuth();
    render();
  });

  formSignup.addEventListener("submit", (e)=> {
    e.preventDefault();
    clearToast();
    const fd = new FormData(formSignup);
    const email = String(fd.get("email")||"").trim().toLowerCase();
    const password = String(fd.get("password")||"");
    const password2 = String(fd.get("password2")||"");

    if(password !== password2){ toast("Paroolid ei kattu.", "bad"); return; }
    if(password.length < 8){ toast("Parool peab olema vähemalt 8 tähemärki.", "bad"); return; }

    const users = getUsers();
    if(users.some(u => u.email.toLowerCase() === email)){
      toast("Selle e-mailiga konto on juba olemas.", "bad");
      return;
    }

    const id = "u_" + Math.random().toString(16).slice(2);
    users.push({ id, email, password, canOrganize: false });
    setUsers(users);

    toast("Konto loodud! Logi nüüd sisse.", "ok");
    setAuthMode("login");
    formLogin.querySelector('input[name="email"]').value = email;
    formLogin.querySelector('input[name="password"]').focus();
  });

  // Event modal controls
  eventClose.addEventListener("click", closeEvent);
  eventModal.addEventListener("click", (e)=> { if(e.target === eventModal) closeEvent(); });

  // Router
  window.addEventListener("hashchange", render);

  render();
})();
