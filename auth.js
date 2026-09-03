(() => {
  const cfg = window.LAYER_SUPABASE || {};
  const configured = Boolean(
    window.supabase &&
    cfg.url && cfg.anonKey &&
    !cfg.url.includes("YOUR_") &&
    !cfg.anonKey.includes("YOUR_")
  );

  const client = configured ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
  let currentUser = null;
  let currentProfile = null;

  const $ = id => document.getElementById(id);
  const authDialog = $("authDialog");
  const accountDialog = $("accountDialog");
  const authMessage = $("authMessage");

  const escapeHTML = value => String(value ?? "").replace(/[&<>'"]/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  })[c]);

  function setAuthMessage(message = "", state = "") {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.dataset.state = state;
  }

  function setMode(mode) {
    const login = mode === "login";
    $("authLoginTab")?.classList.toggle("active", login);
    $("authRegisterTab")?.classList.toggle("active", !login);
    $("loginForm")?.classList.toggle("active", login);
    $("registerForm")?.classList.toggle("active", !login);
    setAuthMessage(configured ? "" : "Backend not connected yet. Add your Supabase URL and anon key in supabase-config.js.", configured ? "" : "warn");
  }

  function openAuth(mode = "login", message = "") {
    setMode(mode);
    if (message) setAuthMessage(message, "info");
    if (authDialog && !authDialog.open) authDialog.showModal();
  }

  async function loadProfile() {
    currentProfile = null;
    if (!client || !currentUser) return null;
    const { data, error } = await client.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
    if (!error) currentProfile = data;
    return currentProfile;
  }

  function syncHeader() {
    const loggedIn = Boolean(currentUser);
    $("loginButton")?.toggleAttribute("hidden", loggedIn);
    $("registerButton")?.toggleAttribute("hidden", loggedIn);
    $("myLayerButton")?.toggleAttribute("hidden", !loggedIn);
    if (loggedIn) {
      const name = currentProfile?.full_name || currentUser.user_metadata?.full_name || currentUser.email || "U";
      $("userInitial").textContent = name.trim().charAt(0).toUpperCase();
    }
  }

  async function hydrateUser(user) {
    currentUser = user || null;
    if (currentUser) await loadProfile();
    else currentProfile = null;
    syncHeader();
    prefillFabrication();
  }

  function prefillFabrication() {
    const form = $("fabricationForm");
    if (!form || !currentUser) return;
    const name = form.querySelector('[name="name"]');
    const department = form.querySelector('[name="department"]');
    if (name && !name.value) name.value = currentProfile?.full_name || currentUser.user_metadata?.full_name || "";
    if (department && !department.value) department.value = currentProfile?.department || currentUser.user_metadata?.department || "";
  }

  async function initialize() {
    if (!configured) {
      syncHeader();
      return;
    }
    const { data } = await client.auth.getSession();
    await hydrateUser(data.session?.user || null);
    client.auth.onAuthStateChange(async (_event, session) => {
      await hydrateUser(session?.user || null);
    });
  }

  async function login(email, password) {
    if (!configured) throw new Error("Supabase is not configured yet.");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await hydrateUser(data.user);
    return data.user;
  }

  async function register(values) {
    if (!configured) throw new Error("Supabase is not configured yet.");
    const { data, error } = await client.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.full_name,
          campus_id: values.campus_id,
          user_type: values.user_type,
          department: values.department,
          year_of_study: values.year_of_study,
          mobile: values.mobile
        }
      }
    });
    if (error) throw error;
    if (data.user && data.session) await hydrateUser(data.user);
    return data;
  }

  async function logout() {
    if (client) await client.auth.signOut();
    await hydrateUser(null);
    if (accountDialog?.open) accountDialog.close();
  }

  function requireUser(message = "Login to continue with this campus action.") {
    if (currentUser) return currentUser;
    openAuth("login", message);
    return null;
  }

  function makeNumber(prefix) {
    const d = new Date();
    const stamp = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const tail = Math.random().toString(36).slice(2,6).toUpperCase();
    return `${prefix}-${stamp}-${tail}`;
  }

  async function createCampusOrder(items, total) {
    if (!configured) throw new Error("BACKEND_NOT_CONFIGURED");
    if (!requireUser("Login to place your campus order and track pickup status.")) throw new Error("AUTH_REQUIRED");
    const orderNumber = makeNumber("LYR");
    const { data: order, error } = await client.from("orders").insert({
      order_number: orderNumber,
      user_id: currentUser.id,
      total,
      status: "SUBMITTED",
      pickup_status: "PENDING"
    }).select().single();
    if (error) throw error;

    const rows = items.map(item => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      quantity: item.qty,
      unit_price: item.price
    }));
    const { error: itemError } = await client.from("order_items").insert(rows);
    if (itemError) throw itemError;
    return order;
  }

  async function submitFabrication(values, modelFile) {
    if (!configured) throw new Error("BACKEND_NOT_CONFIGURED");
    if (!requireUser("Login to submit a fabrication job and receive its status updates.")) throw new Error("AUTH_REQUIRED");

    let modelPath = null;
    if (modelFile) {
      const safe = modelFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      modelPath = `${currentUser.id}/${Date.now()}_${safe}`;
      const { error: uploadError } = await client.storage.from("models").upload(modelPath, modelFile, { upsert: false });
      if (uploadError) throw uploadError;
    }

    const requestNumber = makeNumber("LYR-C");
    const { data, error } = await client.from("custom_print_requests").insert({
      request_number: requestNumber,
      user_id: currentUser.id,
      requester_name: values.name,
      department: values.department,
      quantity: Number(values.quantity || 1),
      material: values.material,
      notes: values.notes || null,
      model_path: modelPath,
      original_filename: modelFile?.name || null,
      status: "UNDER REVIEW"
    }).select().single();
    if (error) throw error;
    return data;
  }

  function statusChip(value) {
    return `<span class="account-status">${escapeHTML(value || "SUBMITTED")}</span>`;
  }

  async function refreshDashboard() {
    if (!configured || !currentUser) return;
    await loadProfile();
    syncHeader();

    const [{ data: orders }, { data: prints }] = await Promise.all([
      client.from("orders").select("id,order_number,total,status,pickup_status,created_at").eq("user_id", currentUser.id).order("created_at", { ascending:false }),
      client.from("custom_print_requests").select("id,request_number,material,quantity,status,original_filename,created_at").eq("user_id", currentUser.id).order("created_at", { ascending:false })
    ]);

    const safeOrders = orders || [];
    const safePrints = prints || [];
    $("accountOrderCount").textContent = String(safeOrders.length).padStart(2,"0");
    $("accountPrintCount").textContent = String(safePrints.length).padStart(2,"0");
    $("accountPickupCount").textContent = String(safeOrders.filter(o => o.pickup_status === "READY").length).padStart(2,"0");

    const displayName = currentProfile?.full_name || currentUser.user_metadata?.full_name || currentUser.email || "Campus User";
    $("accountName").textContent = displayName;
    $("accountAvatar").textContent = displayName.charAt(0).toUpperCase();
    $("accountMeta").textContent = [currentProfile?.campus_id, currentProfile?.department].filter(Boolean).join(" / ") || "LAYER MEMBER";

    $("accountOrders").innerHTML = safeOrders.length ? safeOrders.map(o => `
      <article class="account-row">
        <div><span>${escapeHTML(o.order_number)}</span><b>${new Date(o.created_at).toLocaleDateString("en-IN")}</b></div>
        <div><strong>₹${Number(o.total).toLocaleString("en-IN")}</strong>${statusChip(o.status)}</div>
      </article>`).join("") : `<p class="account-empty">No campus orders yet.</p>`;

    $("accountPrints").innerHTML = safePrints.length ? safePrints.map(p => `
      <article class="account-row">
        <div><span>${escapeHTML(p.request_number)}</span><b>${escapeHTML(p.original_filename || "Model pending")}</b></div>
        <div><strong>${escapeHTML(p.material)} × ${p.quantity}</strong>${statusChip(p.status)}</div>
      </article>`).join("") : `<p class="account-empty">No custom fabrication jobs yet.</p>`;

    const feed = [
      ...safeOrders.slice(0,2).map(o => ({label:o.order_number, detail:`Order / ${o.status}`, date:o.created_at})),
      ...safePrints.slice(0,2).map(p => ({label:p.request_number, detail:`Custom / ${p.status}`, date:p.created_at}))
    ].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3);
    $("accountRecent").innerHTML = feed.length ? feed.map(item => `<div><span>${escapeHTML(item.label)}</span><b>${escapeHTML(item.detail)}</b></div>`).join("") : `<p>No activity yet. Your first order will appear here.</p>`;

    const profileRows = [
      ["FULL NAME", displayName],
      ["CAMPUS ID", currentProfile?.campus_id || "—"],
      ["USER TYPE", currentProfile?.user_type || "—"],
      ["DEPARTMENT", currentProfile?.department || "—"],
      ["YEAR", currentProfile?.year_of_study || "—"],
      ["EMAIL", currentUser.email || "—"],
      ["MOBILE", currentProfile?.mobile || "—"]
    ];
    $("accountProfile").innerHTML = profileRows.map(([k,v]) => `<div><span>${k}</span><b>${escapeHTML(v)}</b></div>`).join("");
  }

  async function openAccount() {
    if (!requireUser()) return;
    await refreshDashboard();
    if (accountDialog && !accountDialog.open) accountDialog.showModal();
  }

  $("loginButton")?.addEventListener("click", () => openAuth("login"));
  $("registerButton")?.addEventListener("click", () => openAuth("register"));
  $("myLayerButton")?.addEventListener("click", openAccount);
  $("authDialogClose")?.addEventListener("click", () => authDialog.close());
  $("accountDialogClose")?.addEventListener("click", () => accountDialog.close());
  $("authLoginTab")?.addEventListener("click", () => setMode("login"));
  $("authRegisterTab")?.addEventListener("click", () => setMode("register"));
  $("logoutButton")?.addEventListener("click", logout);

  $("loginForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setAuthMessage("AUTHENTICATING…", "info");
    try {
      await login(fd.get("email"), fd.get("password"));
      setAuthMessage("LOGIN SUCCESSFUL", "success");
      setTimeout(() => authDialog.close(), 350);
    } catch (error) {
      setAuthMessage(error.message || "Unable to log in.", "error");
    }
  });

  $("registerForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setAuthMessage("CREATING CAMPUS ACCOUNT…", "info");
    try {
      const data = await register(Object.fromEntries(fd.entries()));
      if (data.session) {
        setAuthMessage("ACCOUNT CREATED", "success");
        setTimeout(() => authDialog.close(), 450);
      } else {
        setAuthMessage("ACCOUNT CREATED. CHECK YOUR EMAIL TO CONFIRM SIGN-UP.", "success");
      }
    } catch (error) {
      setAuthMessage(error.message || "Unable to register.", "error");
    }
  });

  document.querySelectorAll("[data-account-view]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("[data-account-view]").forEach(b => b.classList.toggle("active", b === button));
    document.querySelectorAll("[data-account-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.accountPanel === button.dataset.accountView));
  }));

  window.LayerAuth = {
    configured,
    client,
    openLogin: message => openAuth("login", message),
    openRegister: () => openAuth("register"),
    openAccount,
    requireUser,
    createCampusOrder,
    submitFabrication,
    refreshDashboard,
    getUser: () => currentUser,
    getProfile: () => currentProfile
  };

  initialize();
})();
