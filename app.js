(() => {
  // =========
  // STORAGE (robust)
  // =========
  const KEYS = {
    USERS: "ticketrise_users_v1",
    SESSION: "ticketrise_session_v1",
    EVENTS: "ticketrise_events_v1",
    ORDERS: "ticketrise_orders_v1",
    ORG_PROFILE: "ticketrise_org_profile_v1"
  };

  const safeJSON = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        console.warn("Storage read failed:", key, e);
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  };

  // =========
  // SEED DATA (auto-restore)
  // =========
  function seedIfNeeded() {
    // Users seed
    const users = safeJSON.get(KEYS.USERS, null);
    if (!Array.isArray(users) || users.length === 0) {
      safeJSON.set(KEYS.USERS, [
        { id: "u_demo_org", email: "demo@ticketrise.ee", password: "Ticketrise123!", canOrganize: true },
        { id: "u_demo_buyer", email: "buyer@ticketrise.ee", password: "Ticketrise123!", canOrganize: false }
      ]);
    }

    // Events seed
    const events = safeJSON.get(KEYS.EVENTS, null);
    if (!Array.isArray(events) || events.length === 0) {
      const now = new Date();
      const y = now.getFullYear();
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
          goodToKnow: ["Tasuline garderoob.", "Sündmusel kehtib vanusepiirang 18+."],
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
          description:
`Öö, mis ei lõpeta vara. Hea heli, kiire energia ja üllatused.`,
          goodToKnow: ["Tule varem – järjekorrad väiksemad.", "Tühjad klaasid ja plasttaara on keelatud."],
          tickets: [
            { id: "t1", name: "Early", price: 13, stock: 65 },
            { id: "t2", name: "Regular", price: 17, stock: 100 }
          ]
        }
      ]);
    }

    // Orders seed
    const orders = safeJSON.get(KEYS.ORDERS, null);
    if (!Array.isArray(orders)) safeJSON.set(KEYS.ORDERS, []);

    // Organizer profile seed (for demo org)
    const prof = safeJSON.get(KEYS.ORG_PROFILE, null);
    if (!prof || typeof prof !== "object") {
      safeJSON.set(KEYS.ORG_PROFILE, {}); // keyed by userId
    }
  }

  seedIfNeeded();

  // =========
  // STATE
  // =========
  const $app = document.getElementById("app");
  const $btnLogin = document.getElementById("btnLogin");
  const $btnSignup = document.getElementById("btnSignup");
  const $btnLogout = document.getElementById("btnLogout");
  const $navOrganizer = document.querySelector(".navOrganizer");

  const authModal = document.getElementById("modalAuth");
  const authClose = document.getElementById("authClose");
  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const formLogin = document.getElementById("formLogin");
  const formSignup = document.getElementById("formSignup");
  const authToast = document.getElementById("authToast");

  const state = {
    location: null, // not selected by default
    query: "",
    session: safeJSON.get(KEYS.SESSION, null),
  };

  function getUsers(){ return safeJSON.get(KEYS.USERS, []); }
  function setUsers(v){ safeJSON.set(KEYS.USERS, v); }
  function getEvents(){ return safeJSON.get(KEYS.EVENTS, []); }
  function setEvents(v){ safeJSON.set(KEYS.EVENTS, v); }
  function getOrders(){ return safeJSON.get(KEYS.ORDERS, []); }
  function setOrders(v){ safeJSON.set(KEYS.ORDERS, v); }

  function toast(msg, type="ok"){
    authToast.hidden = false;
    authToast.textContent = msg;
    authToast.className = "toast " + (type==="bad" ? "isBad" : "isOk");
  }
  function clearToast(){ authToast.hidden = true; authToast.textContent = ""; authToast.className="toast"; }

  // =========
  // AUTH
  // =========
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
      tabLogin.classList.add("isActive");
      tabSignup.classList.remove("isActive");
      formLogin.hidden = false;
      formSignup.hidden = true;
      document.getElementById("authTitle").textContent = "Logi sisse";
    } else {
      tabSignup.classList.add("isActive");
      tabLogin.classList.remove("isActive");
      formLogin.hidden = true;
      formSignup.hidden = false;
      document.getElementById("authTitle").textContent = "Loo konto";
    }
  }

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
  function syncAuthUI(){
    const loggedIn = !!state.session;
    $btnLogin.hidden = loggedIn;
    $btnSignup.hidden = loggedIn;
    $btnLogout.hidden = !loggedIn;

    const canOrg = loggedIn && !!state.session.canOrganize;
    $navOrganizer.hidden = !canOrg;

    // top nav active
    document.querySelectorAll(".navLink").forEach(a => a.classList.remove("isActive"));
    const route = (location.hash || "#home").replace("#","");
    const active = document.querySelector(`[data-nav="${route}"]`);
    if(active) active.classList.add("isActive");
  }

  // =========
  // ROUTER
  // =========
  function go(hash){ location.hash = hash; }
  function currentHash(){ return location.hash || "#home"; }

  window.addEventListener("hashchange", render);

  // =========
  // UI BUILDERS
  // =========
  const fmtDate = (iso) => {
    try{
      const d = new Date(iso);
      return d.toLocaleString("et-EE", { weekday:"short", day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
    }catch{ return iso; }
  };

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
          <article class="card" role="article">
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
                <button class="btnTiny" data-open="${ev.id}">Loe rohkem</button>
                <span class="pill">alates ${minPrice(ev)} €</span>
              </div>
            </div>
          </article>
        `).join("")}
      </div>
    `;
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

  function minPrice(ev){
    const prices = (ev.tickets || []).map(t => Number(t.price)).filter(n => Number.isFinite(n));
    if(prices.length===0) return "—";
    return Math.min(...prices).toFixed(0);
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

    // organizer dashboard placeholder (järgmise sammuna teeme “täismängu”)
    const events = getEvents().filter(e => e.organizerName && state.session);
    const orders = getOrders();
    const totalRevenue = orders.reduce((s,o)=>s + (Number(o.total)||0),0);
    const ticketsSold = orders.reduce((s,o)=>s + (Number(o.qty)||0),0);

    return `
      <section class="hero">
        <div class="heroTop">
          <div>
            <div class="badge">Korraldaja</div>
            <h2>Dashboard (demo)</h2>
            <p>Siit edasi ehitame sinu “täismängu” (firma ankeet, minu üritused, analüütika, check-in).</p>
          </div>
          <div class="pill">Konto: <b>${escapeHtml(state.session.email)}</b></div>
        </div>

        <div style="margin-top:14px" class="grid">
          <div class="card"><div class="cardBody"><div class="meta"><span class="pill">Tulu</span></div><h3>${totalRevenue.toFixed(2)} €</h3><p>Kokku (demo tellimused)</p></div></div>
          <div class="card"><div class="cardBody"><div class="meta"><span class="pill">Piletid</span></div><h3>${ticketsSold}</h3><p>Müüdud (demo)</p></div></div>
          <div class="card"><div class="cardBody"><div class="meta"><span class="pill">Üritusi</span></div><h3>${events.length}</h3><p>Hetkel süsteemis</p></div></div>
        </div>
      </section>

      <div class="sectionTitle"><h2>Kiirtoimingud</h2></div>
      <div class="grid">
        <div class="card"><div class="cardBody">
          <h3>Lisa uus üritus (järgmine samm)</h3>
          <p>Teeme vormi + poster + “loe edasi” vaate nagu su referentsil.</p>
          <button class="btnTiny" disabled>Avan varsti</button>
        </div></div>
        <div class="card"><div class="cardBody">
          <h3>Firma ankeet (järgmine samm)</h3>
          <p>Registrikood, aadress, IBAN, kontaktid, kasutajad jne.</p>
          <button class="btnTiny" disabled>Avan varsti</button>
        </div></div>
        <div class="card"><div class="cardBody">
          <h3>Check-in (järgmine samm)</h3>
          <p>Ainult sisseloginuna. QR-koodiga kontroll.</p>
          <button class="btnTiny" disabled>Avan varsti</button>
        </div></div>
      </div>
    `;
  }

  function escapeHtml(s){ return String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function escapeAttr(s){ return escapeHtml(s).replace(/"/g,"&quot;"); }

  // =========
  // RENDER
  // =========
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
    // default home
    $app.innerHTML = homePage();
    bindCommon();
  }

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

    document.querySelectorAll("[data-open]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-open");
        alert("Event page (loe edasi) teeme järgmisena — praegu fixisime ära ürituste kadumise + konto loomise.");
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

  // =========
  // TOPBAR BUTTONS
  // =========
  $btnLogin.addEventListener("click", ()=> openAuth("login"));
  $btnSignup.addEventListener("click", ()=> openAuth("signup"));
  $btnLogout.addEventListener("click", ()=> { clearSession(); go("#home"); });

  authClose.addEventListener("click", closeAuth);
  authModal.addEventListener("click", (e)=> { if(e.target === authModal) closeAuth(); });
  tabLogin.addEventListener("click", ()=> setAuthMode("login"));
  tabSignup.addEventListener("click", ()=> setAuthMode("signup"));

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

    // demo: "konto loodud" teavitus UI-s (päris e-maili teeme API-ga hiljem)
    toast("Konto loodud! Võid nüüd sisse logida.", "ok");
    setAuthMode("login");
  });

  // =========
  // FIRST RENDER
  // =========
  render();
})();
